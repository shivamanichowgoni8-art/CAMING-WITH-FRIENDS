import { Peer } from 'peerjs';

export class PeerNetworkManager {
  constructor() {
    this.peer = null;
    this.isHost = false;
    this.myPeerId = null;
    this.roomName = '';
    this.roomPassword = '';
    this.playerName = '';
    this.characterId = '';

    // Connections
    this.connections = new Map(); // peerId -> DataConnection
    this.mediaConnections = new Map(); // peerId -> MediaConnection
    this.remoteAudioElements = new Map(); // peerId -> HTMLAudioElement

    // Local Audio / Voice
    this.localStream = null;
    this.isMicMuted = false;
    this.hasMicAccess = false;
    this.audioContext = null;
    this.analyser = null;
    this.speakingCheckInterval = null;
    this.isSpeaking = false;

    // Callbacks to external game systems
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerStateReceived = null;
    this.onTreeChopped = null;
    this.onLogDropped = null;
    this.onLogPicked = null;
    this.onCampfireBoosted = null;
    this.onPartyGameSync = null;
    this.onChatMessage = null;
    this.onNotification = null;
    this.onSpeakingState = null;
  }

  // Sanitize room name to valid PeerJS ID characters (alphanumeric + hyphen)
  cleanId(name) {
    return 'campfire-v1-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  // 1. Initialize as Room Host
  async createRoom(roomName, password, playerName, characterId) {
    this.isHost = true;
    this.roomName = roomName;
    this.roomPassword = password;
    this.playerName = playerName;
    this.characterId = characterId;

    const hostPeerId = this.cleanId(roomName);

    return new Promise((resolve, reject) => {
      this.peer = new Peer(hostPeerId, {
        debug: 1
      });

      this.peer.on('open', async (id) => {
        this.myPeerId = id;
        console.log(`[Network] Host initialized with peer ID: ${id}`);

        await this.initLocalVoice();
        this.setupIncomingCalls();
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleHostIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[Network] Peer error:', err);
        if (err.type === 'unavailable-id') {
          reject(new Error(`Room "${roomName}" already exists! Please choose another room name or join it.`));
        } else {
          reject(err);
        }
      });
    });
  }

  // 2. Initialize as Client Joining Room
  async joinRoom(roomName, password, playerName, characterId) {
    this.isHost = false;
    this.roomName = roomName;
    this.roomPassword = password;
    this.playerName = playerName;
    this.characterId = characterId;

    const hostPeerId = this.cleanId(roomName);

    return new Promise((resolve, reject) => {
      // Connect with random client ID
      const clientId = `camper-${Math.random().toString(36).substr(2, 8)}`;
      this.peer = new Peer(clientId, {
        debug: 1
      });

      this.peer.on('open', async (id) => {
        this.myPeerId = id;
        console.log(`[Network] Client initialized with ID: ${id}, connecting to host: ${hostPeerId}`);

        await this.initLocalVoice();
        this.setupIncomingCalls();

        // Connect data connection to host
        const conn = this.peer.connect(hostPeerId, { reliable: true });

        conn.on('open', () => {
          this.connections.set(hostPeerId, conn);

          // Send authentication handshake to host
          conn.send({
            type: 'auth_request',
            name: this.playerName,
            characterId: this.characterId,
            password: this.roomPassword,
            peerId: this.myPeerId
          });
        });

        conn.on('data', (data) => {
          if (data.type === 'auth_accepted') {
            console.log('[Network] Authentication accepted by host!');
            this.handleData(data, hostPeerId);

            // Connect voice call to host if we have audio stream
            this.callPeer(hostPeerId);

            resolve(id);
          } else if (data.type === 'auth_rejected') {
            console.warn('[Network] Authentication rejected:', data.reason);
            reject(new Error(data.reason || 'Failed to join room'));
            conn.close();
          } else {
            this.handleData(data, hostPeerId);
          }
        });

        conn.on('close', () => {
          console.log('[Network] Host disconnected');
          this.connections.delete(hostPeerId);
          if (this.onPlayerLeft) this.onPlayerLeft(hostPeerId);
        });

        conn.on('error', (err) => {
          console.error('[Network] Connection to host error:', err);
          reject(new Error(`Unable to connect to host room "${roomName}". Please verify the room name.`));
        });
      });

      this.peer.on('connection', (conn) => {
        this.setupClientDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[Network] Client peer error:', err);
        reject(err);
      });
    });
  }

  // Host handles incoming client connection
  handleHostIncomingConnection(conn) {
    conn.on('data', (data) => {
      if (data.type === 'auth_request') {
        const clientPeerId = conn.peer;

        // Max 5 players total (host + 4 clients)
        if (this.connections.size >= 4) {
          conn.send({ type: 'auth_rejected', reason: 'Room is full! (Max 5 campers).' });
          conn.close();
          return;
        }

        // Validate password
        if (data.password !== this.roomPassword) {
          conn.send({ type: 'auth_rejected', reason: 'Incorrect room password!' });
          conn.close();
          return;
        }

        // Accept client
        this.connections.set(clientPeerId, conn);

        // Gather existing players list
        const existingPlayers = [];
        this.connections.forEach((c, pid) => {
          if (pid !== clientPeerId && c.playerInfo) {
            existingPlayers.push({
              peerId: pid,
              name: c.playerInfo.name,
              characterId: c.playerInfo.characterId
            });
          }
        });

        // Store player metadata on connection
        conn.playerInfo = {
          name: data.name,
          characterId: data.characterId
        };

        // Send acceptance to new client
        conn.send({
          type: 'auth_accepted',
          hostPlayer: {
            peerId: this.myPeerId,
            name: this.playerName,
            characterId: this.characterId
          },
          existingPlayers
        });

        // Notify existing players about the newcomer
        this.broadcast({
          type: 'player_joined',
          peerId: clientPeerId,
          name: data.name,
          characterId: data.characterId
        }, clientPeerId);

        // Notify host local game
        if (this.onPlayerJoined) {
          this.onPlayerJoined(clientPeerId, data.name, data.characterId);
        }

        // Call the newcomer for WebRTC Voice
        this.callPeer(clientPeerId);
      } else {
        // Forward or handle regular messages
        this.handleData(data, conn.peer);
      }
    });

    conn.on('close', () => {
      const pid = conn.peer;
      this.connections.delete(pid);
      this.closeCall(pid);

      // Broadcast player left to everyone
      this.broadcast({
        type: 'player_left',
        peerId: pid
      });

      if (this.onPlayerLeft) {
        this.onPlayerLeft(pid);
      }
    });
  }

  // Setup connection between peers
  setupClientDataConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      this.handleData(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.closeCall(conn.peer);
      if (this.onPlayerLeft) this.onPlayerLeft(conn.peer);
    });
  }

  // Handle incoming data packets
  handleData(data, senderPeerId) {
    switch (data.type) {
      case 'auth_accepted':
        // Add host player
        if (data.hostPlayer && this.onPlayerJoined) {
          this.onPlayerJoined(data.hostPlayer.peerId, data.hostPlayer.name, data.hostPlayer.characterId);
        }
        // Add existing players in room
        if (data.existingPlayers && this.onPlayerJoined) {
          data.existingPlayers.forEach(p => {
            this.onPlayerJoined(p.peerId, p.name, p.characterId);
            // Connect voice mesh
            this.callPeer(p.peerId);
          });
        }
        break;

      case 'player_joined':
        if (this.onPlayerJoined) {
          this.onPlayerJoined(data.peerId, data.name, data.characterId);
        }
        // Connect voice call
        this.callPeer(data.peerId);
        break;

      case 'player_left':
        if (this.onPlayerLeft) {
          this.onPlayerLeft(data.peerId);
        }
        this.closeCall(data.peerId);
        break;

      case 'player_state':
        if (this.onPlayerStateReceived) {
          this.onPlayerStateReceived(senderPeerId, data.state);
        }
        // If host, relay to other peers
        if (this.isHost) {
          this.broadcast(data, senderPeerId);
        }
        break;

      case 'tree_chopped':
        if (this.onTreeChopped) this.onTreeChopped(data.treeId);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'log_dropped':
        if (this.onLogDropped) this.onLogDropped(data.logId, data.x, data.y, data.z);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'log_picked':
        if (this.onLogPicked) this.onLogPicked(data.logId, data.peerId);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'fire_boosted':
        if (this.onCampfireBoosted) this.onCampfireBoosted(data.amount);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'party_game_sync':
        if (this.onPartyGameSync) this.onPartyGameSync(data.payload);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'chat_message':
        if (this.onChatMessage) this.onChatMessage(data);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;

      case 'speaking_state':
        if (this.onSpeakingState) this.onSpeakingState(senderPeerId, data.isSpeaking, data.level);
        if (this.isHost) this.broadcast(data, senderPeerId);
        break;
    }
  }

  // Broadcast data to all connected peers except excludePeerId
  broadcast(data, excludePeerId = null) {
    this.connections.forEach((conn, pid) => {
      if (pid !== excludePeerId && conn.open) {
        conn.send(data);
      }
    });
  }

  // Send local player position/animation update
  broadcastPlayerState(state) {
    const data = {
      type: 'player_state',
      state
    };
    this.broadcast(data);
  }

  // -------------------------------------------------------------
  // WebRTC Voice Chat (MediaConnection) & Audio Analyser
  // -------------------------------------------------------------
  async initLocalVoice() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.hasMicAccess = true;
      console.log('[Voice] Microphone access granted.');

      // Setup speaking detection via AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.speakingCheckInterval = setInterval(() => {
        if (this.isMicMuted || !this.hasMicAccess) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.broadcastSpeaking(false, 0);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = avg / 128; // 0 to ~1

        const speakingNow = normalized > 0.12; // threshold for voice
        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.broadcastSpeaking(this.isSpeaking, normalized);
        }
      }, 100);

    } catch (err) {
      console.warn('[Voice] Microphone permission denied or not available:', err.message);
      this.hasMicAccess = false;
      if (this.onNotification) {
        this.onNotification('Microphone not detected. Voice chat disabled, but text chat and hearing other campers work fine!');
      }
    }
  }

  broadcastSpeaking(isSpeaking, level) {
    if (this.onSpeakingState) {
      this.onSpeakingState(this.myPeerId, isSpeaking, level);
    }
    this.broadcast({
      type: 'speaking_state',
      isSpeaking,
      level
    });
  }

  toggleMicrophone() {
    if (!this.hasMicAccess || !this.localStream) return false;

    this.isMicMuted = !this.isMicMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMicMuted;
    });

    if (this.isMicMuted && this.isSpeaking) {
      this.isSpeaking = false;
      this.broadcastSpeaking(false, 0);
    }

    return !this.isMicMuted; // returns active status
  }

  setupIncomingCalls() {
    if (!this.peer) return;

    this.peer.on('call', (call) => {
      console.log(`[Voice] Receiving voice call from: ${call.peer}`);

      // Answer call with local stream (if available) or empty stream
      call.answer(this.localStream || undefined);

      call.on('stream', (remoteStream) => {
        this.attachRemoteAudio(call.peer, remoteStream);
      });

      call.on('close', () => {
        this.closeCall(call.peer);
      });

      this.mediaConnections.set(call.peer, call);
    });
  }

  callPeer(targetPeerId) {
    if (!this.peer || targetPeerId === this.myPeerId) return;
    if (this.mediaConnections.has(targetPeerId)) return;

    console.log(`[Voice] Calling peer: ${targetPeerId}`);
    const call = this.peer.call(targetPeerId, this.localStream || undefined);

    if (call) {
      call.on('stream', (remoteStream) => {
        this.attachRemoteAudio(targetPeerId, remoteStream);
      });

      call.on('close', () => {
        this.closeCall(targetPeerId);
      });

      this.mediaConnections.set(targetPeerId, call);
    }
  }

  attachRemoteAudio(peerId, stream) {
    let audio = this.remoteAudioElements.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
      this.remoteAudioElements.set(peerId, audio);
    }
    audio.srcObject = stream;
    audio.play().catch(e => console.log('[Voice] Autoplay blocked, waiting for interaction:', e));
  }

  closeCall(peerId) {
    const call = this.mediaConnections.get(peerId);
    if (call) {
      call.close();
      this.mediaConnections.delete(peerId);
    }
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(peerId);
    }
  }

  disconnect() {
    if (this.speakingCheckInterval) clearInterval(this.speakingCheckInterval);
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    this.mediaConnections.forEach(call => call.close());
    this.connections.forEach(conn => conn.close());
    this.remoteAudioElements.forEach(a => a.remove());

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

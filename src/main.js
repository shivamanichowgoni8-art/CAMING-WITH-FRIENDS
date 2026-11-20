import * as THREE from 'three';
import { CampsiteWorld } from './world/campsite.js';
import { DayNightCycle } from './world/dayNightCycle.js';
import { CharacterModel } from './player/characterModel.js';
import { PlayerController } from './player/playerController.js';
import { RemotePlayerManager } from './player/otherPlayers.js';
import { PeerNetworkManager } from './network/peerManager.js';
import { InteractionManager } from './interactions/interactionManager.js';
import { PartyGameManager } from './games/partyGames.js';
import { LobbyUI } from './ui/lobbyUI.js';
import { HudUI } from './ui/hudUI.js';
import { soundFX } from './utils/soundFX.js';

class CampfireGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.uiRoot = document.getElementById('ui-root');

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.world = null;
    this.dayNight = null;
    this.localPlayerModel = null;
    this.playerController = null;
    this.remotePlayers = null;
    this.network = null;
    this.partyGames = null;
    this.interactions = null;
    this.hud = null;

    this.clock = new THREE.Clock();
    this.isGameRunning = false;
    this.netSyncTimer = 0;

    this.initThree();
    this.initLobby();
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camera.position.set(0, 4, 12);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    // 4. World & Environment
    this.world = new CampsiteWorld(this.scene);
    this.dayNight = new DayNightCycle(this.scene); // 16 min cycle: 10 min day + 6 min night
    this.remotePlayers = new RemotePlayerManager(this.scene);

    // 5. Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start background render loop (renders scenic camera rotation while in lobby)
    this.animate();
  }

  initLobby() {
    this.lobbyContainer = document.createElement('div');
    this.lobbyContainer.id = 'lobby-root';
    this.uiRoot.appendChild(this.lobbyContainer);

    this.lobby = new LobbyUI(this.lobbyContainer, async (lobbyData) => {
      await this.startGame(lobbyData);
    });
  }

  async startGame({ isHost, roomName, password, playerName, characterId }) {
    // 1. Initialize Network
    this.network = new PeerNetworkManager();
    this.partyGames = new PartyGameManager(this.network);

    // 2. Create Local Player Model & Controller
    this.localPlayerModel = new CharacterModel(characterId, playerName);
    this.scene.add(this.localPlayerModel.root);

    this.playerController = new PlayerController(
      this.camera,
      this.renderer.domElement,
      this.world,
      this.localPlayerModel
    );

    // Initial spawn position: near the campfire clearing firmly on the terrain
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 4.2 + Math.random() * 2.0;
    const spawnX = Math.cos(spawnAngle) * spawnDist;
    const spawnZ = Math.sin(spawnAngle) * spawnDist;
    const spawnY = this.world.getGroundHeight(spawnX, spawnZ);
    this.playerController.position.set(spawnX, spawnY, spawnZ);
    this.playerController.isGrounded = true;

    // 3. Interactions Manager
    this.interactions = new InteractionManager(
      this.world,
      this.playerController,
      this.partyGames,
      this.network
    );

    this.playerController.onInteractPressed = () => {
      this.interactions.triggerInteraction();
    };

    // 4. HUD UI
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hud-root';
    this.uiRoot.appendChild(this.hudContainer);

    this.hud = new HudUI(this.hudContainer, {
      network: this.network,
      player: this.playerController,
      interaction: this.interactions,
      partyGames: this.partyGames,
      dayNight: this.dayNight
    });

    // Set Room Name in HUD
    const roomPill = this.hudContainer.querySelector('#hud-room-name');
    if (roomPill) roomPill.textContent = roomName;

    // 5. Connect Network (Host or Join)
    this.setupNetworkCallbacks();

    if (isHost) {
      await this.network.createRoom(roomName, password, playerName, characterId);
      this.hud.showToast(`🔥 Campfire room "${roomName}" created! You are the host.`, 'info');
    } else {
      await this.network.joinRoom(roomName, password, playerName, characterId);
      this.hud.showToast(`🎒 Joined room "${roomName}"! Welcome to the campsite.`, 'info');
    }

    this.isGameRunning = true;
  }

  setupNetworkCallbacks() {
    // When a remote camper connects
    this.network.onPlayerJoined = (peerId, name, charId) => {
      if (peerId === this.network.myPeerId) return;
      console.log(`[Game] Remote player joined: ${name} (${charId})`);
      this.remotePlayers.addPlayer(peerId, name, charId);
      if (this.hud) {
        this.hud.showToast(`👋 ${name} arrived at the campsite!`, 'info');
      }
      this.partyGames.addChatMessage('System', `👋 ${name} arrived at the campfire!`);
    };

    // When a remote camper disconnects
    this.network.onPlayerLeft = (peerId) => {
      const player = this.remotePlayers.players.get(peerId);
      const name = player ? player.name : 'A camper';
      this.remotePlayers.removePlayer(peerId);
      if (this.hud) {
        this.hud.showToast(`💨 ${name} packed up and left.`, 'info');
      }
      this.partyGames.addChatMessage('System', `💨 ${name} left the campsite.`);
    };

    // Real-time remote player state (position, rotation, animation)
    this.network.onPlayerStateReceived = (peerId, state) => {
      this.remotePlayers.updatePlayerState(peerId, state);
    };

    // Remote tree chop sync
    this.network.onTreeChopped = (treeId) => {
      this.world.chopTree(treeId);
    };

    // Remote log drop sync
    this.network.onLogDropped = (logId, x, y, z) => {
      this.world.spawnFirewoodLog(x, y, z);
    };

    // Remote log picked sync
    this.network.onLogPicked = (logId) => {
      this.world.removeDroppedLog(logId);
    };

    // Remote campfire boosted
    this.network.onCampfireBoosted = (amount) => {
      this.world.boostCampfire(amount);
    };

    // Remote speaking wave indicator
    this.network.onSpeakingState = (peerId, isSpeaking, level) => {
      if (peerId === this.network.myPeerId) {
        this.localPlayerModel.setSpeaking(isSpeaking, level);
      } else {
        this.remotePlayers.setSpeaking(peerId, isSpeaking, level);
      }
    };
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update Day/Night cycle & Sun/Moon lighting
    if (this.dayNight) {
      this.dayNight.update(delta);
    }

    // Update Campsite animations (water waves, campfire flicker, ember particles)
    if (this.world) {
      this.world.update(delta);
    }

    if (this.isGameRunning) {
      // 1. Update Local Player Controller & Physics
      if (this.playerController) {
        this.playerController.update(delta);

        // Campfire audio spatial distance volume
        const distToFire = this.playerController.position.distanceTo(this.world.campfirePos);
        const maxDist = 28;
        const normDist = Math.min(1.0, distToFire / maxDist);
        soundFX.setCampfireVolume(normDist);
      }

      // 2. Update Contextual Interactions & Fishing
      if (this.interactions) {
        this.interactions.update(delta);
      }

      // 3. Update Remote Campers (interpolation)
      if (this.remotePlayers) {
        this.remotePlayers.update(delta);
      }

      // 4. Update HUD
      if (this.hud) {
        this.hud.update(delta);
      }

      // 5. Broadcast local player state over WebRTC (~18 Hz)
      this.netSyncTimer += delta;
      if (this.netSyncTimer >= 0.055) {
        this.netSyncTimer = 0;
        if (this.network && this.playerController) {
          const state = this.playerController.getNetworkState();
          this.network.broadcastPlayerState(state);
        }
      }
    } else {
      // Lobby idle camera gentle orbit around the cozy campfire
      const t = Date.now() * 0.00015;
      const camR = 14;
      this.camera.position.set(Math.cos(t) * camR, 5.5, Math.sin(t) * camR);
      this.camera.lookAt(0, 1.2, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Start game instance on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new CampfireGame();
});

import { CHARACTER_PRESETS } from '../player/characterModel.js';
import { soundFX } from '../utils/soundFX.js';

export class LobbyUI {
  constructor(container, onEnterGame) {
    this.container = container;
    this.onEnterGame = onEnterGame;
    this.selectedCharacterId = 'ranger';

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lobby-backdrop">
        <div class="lobby-card glass-panel">
          <div class="lobby-header">
            <div class="brand-badge">
              <span class="fire-icon">🔥</span>
              <span class="brand-title">CAMPFIRE 3D</span>
            </div>
            <p class="brand-subtitle">Cozy Multiplayer Mountain Wilderness & Voice Chat</p>
          </div>

          <div class="lobby-body">
            <!-- 1. Player Name -->
            <div class="form-group">
              <label for="player-name-input">Camper Name</label>
              <div class="input-with-button">
                <input type="text" id="player-name-input" maxlength="14" placeholder="Enter your name..." value="${this.getRandomName()}" />
                <button type="button" id="random-name-btn" class="btn-icon" title="Randomize Name">🎲</button>
              </div>
            </div>

            <!-- 2. Character Select (4 Distinct Avatars) -->
            <div class="form-group">
              <label>Choose Your Camper</label>
              <div class="character-grid">
                ${CHARACTER_PRESETS.map((preset, idx) => `
                  <div class="char-card ${preset.id === this.selectedCharacterId ? 'active' : ''}" data-char-id="${preset.id}">
                    <div class="char-avatar-preview" style="border-color: #${preset.colors.jacket.toString(16).padStart(6, '0')};">
                      <span class="char-hat-badge">${this.getCharIcon(preset.style)}</span>
                    </div>
                    <div class="char-info">
                      <div class="char-name">${preset.name}</div>
                      <div class="char-title">${preset.title}</div>
                    </div>
                    <div class="char-check">✓</div>
                  </div>
                `).join('')}
              </div>
              <div id="char-desc-preview" class="char-desc-box">
                ${CHARACTER_PRESETS.find(p => p.id === this.selectedCharacterId).desc}
              </div>
            </div>

            <!-- 3. Room Details -->
            <div class="room-details-row">
              <div class="form-group flex-1">
                <label for="room-name-input">Room Name</label>
                <input type="text" id="room-name-input" maxlength="20" placeholder="e.g. cozy-haven" value="cozy-pines" />
              </div>
              <div class="form-group flex-1">
                <label for="room-password-input">Room Password</label>
                <input type="password" id="room-password-input" maxlength="20" placeholder="e.g. 1234" value="1234" />
              </div>
            </div>

            <!-- 4. Action Buttons -->
            <div class="lobby-actions">
              <button id="btn-create-room" class="btn btn-primary">
                <span class="btn-icon-label">⛺️</span> Create Campfire Room
              </button>
              <button id="btn-join-room" class="btn btn-secondary">
                <span class="btn-icon-label">🎒</span> Join Existing Room
              </button>
            </div>

            <!-- Status / Error message -->
            <div id="lobby-status" class="lobby-status-msg hidden"></div>

            <div class="lobby-features-strip">
              <span>🎙️ WebRTC Voice Chat</span> • 
              <span>🌲 Wood Chopping</span> • 
              <span>🎣 Fishing</span> • 
              <span>🎯 Campfire Trivia & Q&A</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getCharIcon(style) {
    switch (style) {
      case 'ranger': return '🤠';
      case 'beanie': return '🧣';
      case 'fedora': return '🧭';
      case 'cap': return '🧢';
      default: return '⛺️';
    }
  }

  getRandomName() {
    const names = ['Scout Billie', 'Ranger Finn', 'Hiker Leo', 'Maple Maya', 'River Sam', 'Forest Kai', 'Pine Rowan'];
    return names[Math.floor(Math.random() * names.length)];
  }

  bindEvents() {
    // Character selection cards
    const cards = this.container.querySelectorAll('.char-card');
    const descBox = this.container.querySelector('#char-desc-preview');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedCharacterId = card.getAttribute('data-char-id');

        const preset = CHARACTER_PRESETS.find(p => p.id === this.selectedCharacterId);
        if (descBox && preset) {
          descBox.textContent = preset.desc;
        }
        soundFX.playPop();
      });
    });

    // Randomize name button
    const randomBtn = this.container.querySelector('#random-name-btn');
    const nameInput = this.container.querySelector('#player-name-input');
    randomBtn.addEventListener('click', () => {
      nameInput.value = this.getRandomName();
      soundFX.playPop();
    });

    // Create Room Button
    const createBtn = this.container.querySelector('#btn-create-room');
    createBtn.addEventListener('click', () => {
      this.handleLobbyAction(true);
    });

    // Join Room Button
    const joinBtn = this.container.querySelector('#btn-join-room');
    joinBtn.addEventListener('click', () => {
      this.handleLobbyAction(false);
    });
  }

  async handleLobbyAction(isHost) {
    const nameInput = this.container.querySelector('#player-name-input');
    const roomInput = this.container.querySelector('#room-name-input');
    const passInput = this.container.querySelector('#room-password-input');
    const statusMsg = this.container.querySelector('#lobby-status');

    const playerName = nameInput.value.trim() || 'Camper';
    const roomName = roomInput.value.trim();
    const password = passInput.value.trim();

    if (!roomName) {
      this.showStatus('Please enter a room name!', 'error');
      return;
    }
    if (!password) {
      this.showStatus('Please enter a room password!', 'error');
      return;
    }

    this.showStatus(isHost ? 'Creating campfire room and initializing voice chat...' : 'Connecting to host and validating password...', 'info');

    // Initialize sound engine on first user gesture
    soundFX.init();
    soundFX.resume();

    try {
      await this.onEnterGame({
        isHost,
        roomName,
        password,
        playerName,
        characterId: this.selectedCharacterId
      });

      // Hide lobby UI on success
      this.container.classList.add('hidden');
    } catch (err) {
      console.error('Lobby error:', err);
      this.showStatus(err.message || 'Failed to enter room. Please try again.', 'error');
    }
  }

  showStatus(msg, type = 'info') {
    const el = this.container.querySelector('#lobby-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `lobby-status-msg ${type}`;
    el.classList.remove('hidden');
  }
}

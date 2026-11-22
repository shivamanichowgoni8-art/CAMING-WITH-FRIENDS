import { TRIVIA_PUZZLES, CONVERSATION_DECK } from '../games/partyGames.js';
import { soundFX } from '../utils/soundFX.js';
import { ITEMS } from '../data/items.js';

export class HudUI {
  constructor(container, { network, player, interaction, partyGames, dayNight, craftingUI = null }) {
    this.container = container;
    this.network = network;
    this.player = player;
    this.interaction = interaction;
    this.partyGames = partyGames;
    this.dayNight = dayNight;
    this.craftingUI = craftingUI;

    this.isPartyGameOpen = false;
    this.isMicActive = true;
    this.touchJoystickData = { touchId: null, startX: 0, startY: 0, curX: 0, curY: 0 };

    this.render();
    this.bindEvents();
    this.setupMobileTouch();
  }

  render() {
    this.container.innerHTML = `
      <div id="game-hud" class="game-hud">
        <!-- 1. Top Bar -->
        <header class="hud-top-bar">
          <div class="hud-left-group">
            <div class="hud-pill room-pill">
              <span class="pill-icon">⛺️</span>
              <span id="hud-room-name">cozy-pines</span>
            </div>
            <div class="hud-pill campers-pill">
              <span class="pill-icon">👥</span>
              <span id="hud-camper-count">1 / 5 Campers</span>
            </div>
            <div class="hud-pill clock-pill">
              <span id="hud-clock-icon">☀️</span>
              <span id="hud-clock-time">08:00 AM</span>
              <span id="hud-clock-phase" class="clock-phase-tag">Morning</span>
            </div>
          </div>

          <div class="hud-right-group">
            <!-- Mic Toggle Button with Speaking Wave -->
            <button id="btn-mic-toggle" class="hud-btn btn-mic active" title="Toggle Microphone">
              <span id="mic-icon" class="btn-icon">🎙️</span>
              <span id="mic-label">Mic On</span>
              <span id="mic-speaking-indicator" class="speaking-wave-dot"></span>
            </button>

            <!-- Campfire Party Game Toggle -->
            <button id="btn-party-games" class="hud-btn btn-campfire-glow" title="Campfire Games">
              <span class="btn-icon">🔥</span>
              <span>Campfire Deck</span>
            </button>

            <!-- Audio Mute -->
            <button id="btn-sound-mute" class="hud-btn btn-icon-only" title="Toggle Sound">
              <span id="sound-icon">🔊</span>
            </button>
          </div>
        </header>

        <!-- 2. Inventory & Survival Stats Bar -->
        <div class="hud-stats-inventory-wrapper">
          <!-- Cozy Survival Meters -->
          <div id="survival-meters" class="survival-meters">
            <div class="stat-bar-group" title="Warmth: Stay near campfire or inside cabin!">
              <div class="stat-bar-icon">🔥</div>
              <div class="stat-bar-track warmth-track">
                <div id="bar-warmth" class="stat-bar-fill warmth-fill" style="width: 100%;"></div>
              </div>
              <span id="text-warmth" class="stat-bar-val">100%</span>
            </div>

            <div class="stat-bar-group" title="Energy: Depletes when sprinting and chopping. Eat food to restore!">
              <div class="stat-bar-icon">⚡</div>
              <div class="stat-bar-track energy-track">
                <div id="bar-energy" class="stat-bar-fill energy-fill" style="width: 100%;"></div>
              </div>
              <span id="text-energy" class="stat-bar-val">100%</span>
            </div>

            <div class="stat-bar-group" title="Comfort: Sitting by campfire and relaxing inside cabin increases comfort.">
              <div class="stat-bar-icon">💖</div>
              <div class="stat-bar-track comfort-track">
                <div id="bar-comfort" class="stat-bar-fill comfort-fill" style="width: 100%;"></div>
              </div>
              <span id="text-comfort" class="stat-bar-val">100%</span>
            </div>
          </div>
        </div>

        <!-- 2b. Bottom 9-Slot Minecraft-style Hotbar -->
        <div class="hud-bottom-dock">
          <div class="hotbar-wrapper">
            <button id="btn-open-crafting" class="dock-shortcut-btn" title="Open Crafting Menu [C]">
              <span>🔨</span>
              <span class="dock-shortcut-label">Craft [C]</span>
            </button>

            <div id="hotbar-slots-container" class="hotbar-slots-container">
              <!-- 9 hotbar slots injected dynamically -->
            </div>

            <button id="btn-open-backpack" class="dock-shortcut-btn" title="Open Backpack [B]">
              <span>🎒</span>
              <span class="dock-shortcut-label">Pack [B]</span>
            </button>
          </div>
        </div>

        <!-- 3. Contextual Interaction Banner -->
        <div id="interaction-banner" class="interaction-banner hidden">
          <div class="interaction-key-pill">[E]</div>
          <div id="interaction-label" class="interaction-text">Chop Pine Tree</div>
        </div>

        <!-- 4. Fishing Mini-Game HUD Widget -->
        <div id="fishing-overlay" class="fishing-overlay hidden">
          <div class="fishing-card glass-panel">
            <div class="fishing-header">
              <span class="fishing-icon">🎣</span>
              <span class="fishing-title">Alpine Lake Fishing</span>
            </div>
            <div id="fishing-status-text" class="fishing-status">Casting line... waiting for a bite</div>

            <div id="fishing-bar-container" class="fishing-bar-wrapper">
              <div class="fishing-track">
                <div id="fishing-sweet-spot" class="fishing-sweet-spot"></div>
                <div id="fishing-indicator" class="fishing-indicator"></div>
              </div>
            </div>

            <div class="fishing-actions">
              <button id="btn-strike-fish" class="btn btn-strike">STRIKE! 🎣</button>
              <button id="btn-cancel-fish" class="btn btn-subtle">Cancel</button>
            </div>
          </div>
        </div>

        <!-- 5. Mobile Touch Controls (auto detected or touch devices) -->
        <div id="mobile-controls" class="mobile-controls">
          <!-- Virtual Joystick Zone -->
          <div id="joystick-zone" class="joystick-zone">
            <div id="joystick-base" class="joystick-base">
              <div id="joystick-knob" class="joystick-knob"></div>
            </div>
          </div>

          <!-- Camera Look Touch Drag Zone (Right half of screen) -->
          <div id="camera-touch-zone" class="camera-touch-zone"></div>

          <!-- Action Buttons (Right side) -->
          <div class="mobile-action-buttons">
            <button id="mobile-btn-craft" class="mobile-action-btn btn-craft-mobile">
              <span class="mobile-action-icon">🔨</span>
              <span class="mobile-action-label">Craft</span>
            </button>
            <button id="mobile-btn-action" class="mobile-action-btn btn-interact">
              <span class="mobile-action-icon">✨</span>
              <span id="mobile-action-text" class="mobile-action-label">Interact</span>
            </button>
            <button id="mobile-btn-jump" class="mobile-action-btn btn-jump">
              <span class="mobile-action-icon">⬆️</span>
              <span class="mobile-action-label">Jump</span>
            </button>
          </div>
        </div>

        <!-- 6. Campfire Side Games Synced Modal Overlay -->
        <div id="party-game-modal" class="party-modal-backdrop hidden">
          <div class="party-card glass-panel">
            <div class="party-modal-header">
              <div class="party-title-group">
                <span class="party-icon">🔥</span>
                <h2>Campfire Party Circle</h2>
              </div>
              <div class="party-tabs">
                <button id="tab-btn-trivia" class="party-tab-btn active">🎬 Guess the Movie / Show</button>
                <button id="tab-btn-qa" class="party-tab-btn">💬 Worthwhile Q&A Deck</button>
              </div>
              <button id="btn-close-party" class="party-close-btn" title="Close Panel">✕</button>
            </div>

            <div class="party-modal-body">
              <!-- Content Pane: Trivia -->
              <div id="pane-trivia" class="party-pane active">
                <div class="trivia-display-area">
                  <div class="trivia-meta">
                    <span id="trivia-category" class="category-pill">Movie</span>
                    <span id="trivia-card-num" class="card-counter">Card 1 / 18</span>
                  </div>

                  <div id="trivia-emoji-board" class="trivia-emoji-board">
                    🧙‍♂️ 🧝‍♂️ 💍 🌋
                  </div>

                  <div id="trivia-hint-box" class="trivia-hint-box">
                    <button id="btn-reveal-hint" class="btn btn-hint">💡 Reveal Hint</button>
                    <span id="trivia-hint-text" class="hint-text hidden">One ring to rule them all...</span>
                  </div>

                  <div id="trivia-solved-banner" class="trivia-solved-banner hidden">
                    🎉 <strong id="trivia-winner-name">Camper</strong> guessed correctly: <span id="trivia-answer-text">The Lord of the Rings</span> (+10 pts)
                  </div>

                  <!-- Guess Input -->
                  <form id="trivia-guess-form" class="trivia-guess-row">
                    <input type="text" id="trivia-guess-input" placeholder="Type your guess..." autocomplete="off" />
                    <button type="submit" id="btn-submit-guess" class="btn btn-primary">Guess!</button>
                    <button type="button" id="btn-skip-trivia" class="btn btn-subtle" title="Next Puzzle">Skip ⏭️</button>
                  </form>
                </div>

                <!-- Trivia Leaderboard -->
                <div class="trivia-sidebar">
                  <div class="sidebar-title">🏆 Campfire Leaderboard</div>
                  <div id="trivia-leaderboard-list" class="leaderboard-list">
                    <div class="lb-row"><span class="lb-name">No points yet</span><span class="lb-pts">0</span></div>
                  </div>
                </div>
              </div>

              <!-- Content Pane: Worthwhile Q&A Deck -->
              <div id="pane-qa" class="party-pane hidden">
                <div class="qa-card-wrapper">
                  <div class="qa-card">
                    <div class="qa-topic-tag" id="qa-topic">Wilderness & Wonder</div>
                    <div class="qa-question-text" id="qa-question">
                      "What is the most unusual, hilarious, or unexplainable experience you've ever had outdoors or on a trip?"
                    </div>
                    <div class="qa-footer-meta">
                      <span id="qa-counter">Card 1 of 12</span>
                    </div>
                  </div>

                  <div class="qa-controls">
                    <button id="btn-prev-qa" class="btn btn-secondary">⏮️ Previous Card</button>
                    <button id="btn-next-qa" class="btn btn-primary">Next Card ⏭️</button>
                  </div>
                </div>
              </div>

              <!-- Shared Live Chat Section -->
              <div class="party-chat-section">
                <div class="chat-header">
                  <span>💬 Campers Chat</span>
                </div>
                <div id="party-chat-messages" class="chat-messages-container"></div>
                <form id="party-chat-form" class="chat-input-row">
                  <input type="text" id="party-chat-input" placeholder="Chat with campers..." autocomplete="off" />
                  <button type="submit" class="btn btn-send">Send</button>
                </form>
                <div class="quick-emojis">
                  <button type="button" class="btn-emoji" data-emoji="🔥">🔥</button>
                  <button type="button" class="btn-emoji" data-emoji="🌲">🌲</button>
                  <button type="button" class="btn-emoji" data-emoji="🎣">🎣</button>
                  <button type="button" class="btn-emoji" data-emoji="⛺️">⛺️</button>
                  <button type="button" class="btn-emoji" data-emoji="🎉">🎉</button>
                  <button type="button" class="btn-emoji" data-emoji="😂">😂</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop PC Camera Hint -->
        <div id="camera-hint-pill" class="camera-hint-pill">
          <span class="camera-hint-icon">🖱️</span>
          <span id="camera-hint-text">Click screen to look around with mouse/trackpad • ESC to unlock cursor</span>
        </div>

        <!-- Toast Notifications Container -->
        <div id="hud-toasts" class="hud-toasts"></div>
      </div>
    `;
  }

  bindEvents() {
    // PC Pointer Lock HUD hint listener
    const cameraHintPill = this.container.querySelector('#camera-hint-pill');
    const cameraHintText = this.container.querySelector('#camera-hint-text');

    if (this.player) {
      this.player.onPointerLockChange = (isLocked) => {
        if (!cameraHintPill || !cameraHintText) return;
        if (isLocked) {
          cameraHintPill.classList.add('locked');
          cameraHintText.textContent = '🟢 Look Active (Move mouse/trackpad) • ESC to unlock cursor';
        } else {
          cameraHintPill.classList.remove('locked');
          cameraHintText.textContent = 'Click screen to look around with mouse/trackpad • ESC to unlock cursor';
        }
      };
    }

    // Top Bar Mic Toggle
    const micBtn = this.container.querySelector('#btn-mic-toggle');
    micBtn.addEventListener('click', () => {
      this.isMicActive = this.network.toggleMicrophone();
      this.updateMicVisual();
      soundFX.playPop();
    });

    // Sound FX Mute Toggle
    const soundBtn = this.container.querySelector('#btn-sound-mute');
    soundBtn.addEventListener('click', () => {
      const isMuted = soundFX.toggleMute();
      soundBtn.querySelector('#sound-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    // Campfire Party Games Toggle Button
    const partyBtn = this.container.querySelector('#btn-party-games');
    const partyModal = this.container.querySelector('#party-game-modal');
    const closePartyBtn = this.container.querySelector('#btn-close-party');

    partyBtn.addEventListener('click', () => {
      this.togglePartyModal(true);
      soundFX.playPop();
    });

    closePartyBtn.addEventListener('click', () => {
      this.togglePartyModal(false);
      if (this.player.isSitting) {
        this.player.standUp();
      }
      soundFX.playPop();
    });

    // Tabs inside Party Modal
    const tabTrivia = this.container.querySelector('#tab-btn-trivia');
    const tabQA = this.container.querySelector('#tab-btn-qa');
    const paneTrivia = this.container.querySelector('#pane-trivia');
    const paneQA = this.container.querySelector('#pane-qa');

    tabTrivia.addEventListener('click', () => {
      tabTrivia.classList.add('active');
      tabQA.classList.remove('active');
      paneTrivia.classList.remove('hidden');
      paneQA.classList.add('hidden');
      this.partyGames.activeTab = 'trivia';
      this.partyGames.syncState();
      soundFX.playPop();
    });

    tabQA.addEventListener('click', () => {
      tabQA.classList.add('active');
      tabTrivia.classList.remove('active');
      paneQA.classList.remove('hidden');
      paneTrivia.classList.add('hidden');
      this.partyGames.activeTab = 'qa';
      this.partyGames.syncState();
      soundFX.playPop();
    });

    // Trivia Actions
    const revealHintBtn = this.container.querySelector('#btn-reveal-hint');
    revealHintBtn.addEventListener('click', () => {
      this.partyGames.revealHint();
      soundFX.playPop();
    });

    const skipTriviaBtn = this.container.querySelector('#btn-skip-trivia');
    skipTriviaBtn.addEventListener('click', () => {
      this.partyGames.nextTrivia();
      soundFX.playPop();
    });

    const triviaForm = this.container.querySelector('#trivia-guess-form');
    const triviaInput = this.container.querySelector('#trivia-guess-input');
    triviaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = triviaInput.value.trim();
      if (!val) return;
      const res = this.partyGames.submitGuess(this.player.model.name, val);
      triviaInput.value = '';
      if (!res.correct) {
        this.showToast(res.msg, 'info');
      }
    });

    // Q&A Actions
    const nextQABtn = this.container.querySelector('#btn-next-qa');
    const prevQABtn = this.container.querySelector('#btn-prev-qa');
    nextQABtn.addEventListener('click', () => this.partyGames.nextQA());
    prevQABtn.addEventListener('click', () => this.partyGames.prevQA());

    // Party Chat Actions
    const chatForm = this.container.querySelector('#party-chat-form');
    const chatInput = this.container.querySelector('#party-chat-input');
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      this.partyGames.sendChat(this.player.model.name, text);
      chatInput.value = '';
    });

    // Quick emoji buttons
    this.container.querySelectorAll('.btn-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        this.partyGames.sendChat(this.player.model.name, emoji);
        soundFX.playPop();
      });
    });

    // Fishing Actions
    const strikeBtn = this.container.querySelector('#btn-strike-fish');
    strikeBtn.addEventListener('click', () => {
      this.interaction.strikeFish();
    });

    const cancelFishBtn = this.container.querySelector('#btn-cancel-fish');
    cancelFishBtn.addEventListener('click', () => {
      this.interaction.stopFishing();
    });

    // Register Interaction callbacks
    this.interaction.onPromptChanged = (promptText, interactable) => {
      this.updateInteractionBanner(promptText, interactable);
    };

    this.interaction.onFishingStateChanged = (fishState) => {
      this.updateFishingWidget(fishState);
    };

    this.interaction.onPartyGameOpen = (open) => {
      this.togglePartyModal(open);
    };

    // Crafting & Backpack dock buttons
    const btnCraft = this.container.querySelector('#btn-open-crafting');
    if (btnCraft) {
      btnCraft.addEventListener('click', () => {
        if (this.craftingUI) {
          this.craftingUI.switchTab('crafting');
          this.craftingUI.toggle(true);
        }
      });
    }

    const btnPack = this.container.querySelector('#btn-open-backpack');
    if (btnPack) {
      btnPack.addEventListener('click', () => {
        if (this.craftingUI) {
          this.craftingUI.switchTab('backpack');
          this.craftingUI.toggle(true);
        }
      });
    }

    // Survival Stats listener
    if (this.player) {
      this.player.onStatsChanged = (stats) => {
        this.updateSurvivalStats(stats);
      };

      this.player.onRespawned = (msg) => {
        this.showToast(msg, 'info');
      };
    }

    // Hotbar setup
    this.updateHotbar();
    if (this.player && this.player.inventorySystem) {
      this.player.inventorySystem.onChange = () => {
        this.updateHotbar();
      };
    }

    this.interaction.onInventoryChanged = (inv) => {
      // Legacy counts update
      const woodEl = this.container.querySelector('#inv-wood-count');
      const fishEl = this.container.querySelector('#inv-fish-count');
      if (woodEl) woodEl.textContent = inv.firewood;
      if (fishEl) fishEl.textContent = inv.fish;
    };

    // Register Party game state change callback
    this.partyGames.onStateChanged = () => {
      this.updatePartyModalUI();
    };

    // Register Network notification callback
    this.network.onNotification = (msg) => {
      this.showToast(msg, 'info');
    };

    this.network.onSpeakingState = (peerId, isSpeaking) => {
      if (peerId === this.network.myPeerId) {
        const dot = this.container.querySelector('#mic-speaking-indicator');
        if (dot) {
          if (isSpeaking) dot.classList.add('active');
          else dot.classList.remove('active');
        }
      }
    };
  }

  setupMobileTouch() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileControls = this.container.querySelector('#mobile-controls');
    if (!isTouch) {
      // Keep mobile controls available or hidden on desktop
      mobileControls.style.display = 'none';
      return;
    }

    mobileControls.style.display = 'block';

    // 1. Virtual Joystick
    const joystickZone = this.container.querySelector('#joystick-zone');
    const joystickKnob = this.container.querySelector('#joystick-knob');
    const maxRadius = 45;

    const handleJoystickStart = (e) => {
      const touch = e.changedTouches[0];
      this.touchJoystickData.touchId = touch.identifier;
      const rect = joystickZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      this.touchJoystickData.startX = centerX;
      this.touchJoystickData.startY = centerY;
      this.player.touchJoystick.active = true;
    };

    const handleJoystickMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchJoystickData.touchId) {
          const dx = touch.clientX - this.touchJoystickData.startX;
          const dy = touch.clientY - this.touchJoystickData.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;

          joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

          // Normalized values (-1 to 1)
          this.player.touchJoystick.x = knobX / maxRadius;
          this.player.touchJoystick.y = knobY / maxRadius;
          break;
        }
      }
    };

    const handleJoystickEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchJoystickData.touchId) {
          this.touchJoystickData.touchId = null;
          joystickKnob.style.transform = 'translate(0px, 0px)';
          this.player.touchJoystick.active = false;
          this.player.touchJoystick.x = 0;
          this.player.touchJoystick.y = 0;
          break;
        }
      }
    };

    joystickZone.addEventListener('touchstart', handleJoystickStart, { passive: false });
    window.addEventListener('touchmove', handleJoystickMove, { passive: false });
    window.addEventListener('touchend', handleJoystickEnd, { passive: false });
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

    // 2. Camera Touch Drag Area
    const camZone = this.container.querySelector('#camera-touch-zone');
    let camTouchId = null;
    let lastCamX = 0;
    let lastCamY = 0;

    camZone.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      camTouchId = touch.identifier;
      lastCamX = touch.clientX;
      lastCamY = touch.clientY;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === camTouchId) {
          const dx = touch.clientX - lastCamX;
          const dy = touch.clientY - lastCamY;
          this.player.yaw -= dx * 0.006;
          this.player.pitch -= dy * 0.006;
          this.player.clampPitch();
          lastCamX = touch.clientX;
          lastCamY = touch.clientY;
          break;
        }
      }
    }, { passive: true });

    const handleCamEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === camTouchId) {
          camTouchId = null;
          break;
        }
      }
    };
    window.addEventListener('touchend', handleCamEnd, { passive: true });
    window.addEventListener('touchcancel', handleCamEnd, { passive: true });

    // 3. Mobile Action Buttons
    const mobileCraftBtn = this.container.querySelector('#mobile-btn-craft');
    const mobileActionBtn = this.container.querySelector('#mobile-btn-action');
    const mobileJumpBtn = this.container.querySelector('#mobile-btn-jump');

    if (mobileCraftBtn) {
      mobileCraftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.craftingUI) {
          this.craftingUI.toggle();
        }
      });
    }

    mobileActionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.interaction.triggerInteraction();
      soundFX.playPop();
    });

    mobileJumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.keys.jump = true;
      if (this.player.isSitting) this.player.standUp();
    });

    mobileJumpBtn.addEventListener('touchend', () => {
      this.player.keys.jump = false;
    });
  }

  updateInteractionBanner(text, interactable) {
    const banner = this.container.querySelector('#interaction-banner');
    const label = this.container.querySelector('#interaction-label');
    const mobileLabel = this.container.querySelector('#mobile-action-text');

    if (text) {
      label.textContent = text;
      banner.classList.remove('hidden');
      if (mobileLabel) mobileLabel.textContent = interactable ? interactable.actionText || 'Interact' : 'Interact';
    } else {
      banner.classList.add('hidden');
      if (mobileLabel) mobileLabel.textContent = 'Interact';
    }
  }

  updateFishingWidget(fishState) {
    const overlay = this.container.querySelector('#fishing-overlay');
    const statusText = this.container.querySelector('#fishing-status-text');
    const sweetSpot = this.container.querySelector('#fishing-sweet-spot');
    const indicator = this.container.querySelector('#fishing-indicator');
    const strikeBtn = this.container.querySelector('#btn-strike-fish');

    if (!fishState.active) {
      overlay.classList.add('hidden');
      return;
    }

    overlay.classList.remove('hidden');

    if (fishState.targetZone && sweetSpot) {
      sweetSpot.style.left = `${fishState.targetZone.start * 100}%`;
      sweetSpot.style.width = `${(fishState.targetZone.end - fishState.targetZone.start) * 100}%`;
    }

    if (fishState.meterPos !== undefined && indicator) {
      indicator.style.left = `${fishState.meterPos * 100}%`;
    }

    switch (fishState.state) {
      case 'waiting':
        statusText.textContent = '🎣 Bobber floating in the lake... Waiting for a bite!';
        statusText.style.color = '#cbd5e1';
        strikeBtn.classList.remove('pulse-strike');
        break;

      case 'hooking':
        statusText.textContent = '🚨 FISH ON THE LINE! Hit Strike when in the green zone!';
        statusText.style.color = '#4ade80';
        strikeBtn.classList.add('pulse-strike');
        break;

      case 'caught':
        statusText.textContent = fishState.text || '🎉 Fish Caught!';
        statusText.style.color = '#facc15';
        strikeBtn.classList.remove('pulse-strike');
        break;

      case 'missed':
        statusText.textContent = fishState.text || 'Fish escaped!';
        statusText.style.color = '#ef4444';
        strikeBtn.classList.remove('pulse-strike');
        break;
    }
  }

  togglePartyModal(open) {
    this.isPartyGameOpen = open;
    const modal = this.container.querySelector('#party-game-modal');
    if (open) {
      modal.classList.remove('hidden');
      this.updatePartyModalUI();
    } else {
      modal.classList.add('hidden');
    }
  }

  updatePartyModalUI() {
    if (!this.isPartyGameOpen) return;

    // 1. Update Active Tab
    const tabTrivia = this.container.querySelector('#tab-btn-trivia');
    const tabQA = this.container.querySelector('#tab-btn-qa');
    const paneTrivia = this.container.querySelector('#pane-trivia');
    const paneQA = this.container.querySelector('#pane-qa');

    if (this.partyGames.activeTab === 'trivia') {
      tabTrivia.classList.add('active');
      tabQA.classList.remove('active');
      paneTrivia.classList.remove('hidden');
      paneQA.classList.add('hidden');
    } else {
      tabQA.classList.add('active');
      tabTrivia.classList.remove('active');
      paneQA.classList.remove('hidden');
      paneTrivia.classList.add('hidden');
    }

    // 2. Update Trivia Pane
    const curTrivia = TRIVIA_PUZZLES[this.partyGames.triviaIndex];
    this.container.querySelector('#trivia-category').textContent = curTrivia.category;
    this.container.querySelector('#trivia-card-num').textContent = `Card ${this.partyGames.triviaIndex + 1} / ${TRIVIA_PUZZLES.length}`;
    this.container.querySelector('#trivia-emoji-board').textContent = curTrivia.emoji;

    const hintBtn = this.container.querySelector('#btn-reveal-hint');
    const hintText = this.container.querySelector('#trivia-hint-text');
    if (this.partyGames.revealedHint) {
      hintBtn.classList.add('hidden');
      hintText.textContent = `💡 Hint: ${curTrivia.hint}`;
      hintText.classList.remove('hidden');
    } else {
      hintBtn.classList.remove('hidden');
      hintText.classList.add('hidden');
    }

    const solvedBanner = this.container.querySelector('#trivia-solved-banner');
    if (this.partyGames.triviaSolved) {
      this.container.querySelector('#trivia-winner-name').textContent = this.partyGames.triviaWinner || 'Camper';
      this.container.querySelector('#trivia-answer-text').textContent = curTrivia.answer;
      solvedBanner.classList.remove('hidden');
    } else {
      solvedBanner.classList.add('hidden');
    }

    // Leaderboard
    const lbContainer = this.container.querySelector('#trivia-leaderboard-list');
    const scores = this.partyGames.scores;
    const sortedPlayers = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    if (sortedPlayers.length === 0) {
      lbContainer.innerHTML = '<div class="lb-row"><span class="lb-name">No points yet</span><span class="lb-pts">0</span></div>';
    } else {
      lbContainer.innerHTML = sortedPlayers.map(([name, pts], i) => `
        <div class="lb-row ${i === 0 ? 'leader' : ''}">
          <span class="lb-rank">${i === 0 ? '👑' : `#${i + 1}`}</span>
          <span class="lb-name">${name}</span>
          <span class="lb-pts">${pts} pts</span>
        </div>
      `).join('');
    }

    // 3. Update Q&A Pane
    const curQA = CONVERSATION_DECK[this.partyGames.qaIndex];
    this.container.querySelector('#qa-topic').textContent = curQA.topic;
    this.container.querySelector('#qa-question').textContent = `"${curQA.question}"`;
    this.container.querySelector('#qa-counter').textContent = `Card ${this.partyGames.qaIndex + 1} of ${CONVERSATION_DECK.length}`;

    // 4. Update Chat Log
    const chatContainer = this.container.querySelector('#party-chat-messages');
    chatContainer.innerHTML = this.partyGames.chatLog.map(msg => `
      <div class="chat-bubble ${msg.sender === 'System' ? 'system-bubble' : (msg.sender === this.player.model.name ? 'my-bubble' : 'other-bubble')}">
        <div class="chat-meta">
          <span class="chat-sender">${msg.sender}</span>
          <span class="chat-time">${msg.timeStr}</span>
        </div>
        <div class="chat-text">${msg.text}</div>
      </div>
    `).join('');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  updateMicVisual() {
    const micBtn = this.container.querySelector('#btn-mic-toggle');
    const micIcon = this.container.querySelector('#mic-icon');
    const micLabel = this.container.querySelector('#mic-label');

    if (this.isMicActive) {
      micBtn.className = 'hud-btn btn-mic active';
      micIcon.textContent = '🎙️';
      micLabel.textContent = 'Mic On';
    } else {
      micBtn.className = 'hud-btn btn-mic muted';
      micIcon.textContent = '🔇';
      micLabel.textContent = 'Muted';
    }
  }

  setCraftingUI(craftingUI) {
    this.craftingUI = craftingUI;
  }

  updateSurvivalStats(stats) {
    if (!stats) return;
    const barWarmth = this.container.querySelector('#bar-warmth');
    const textWarmth = this.container.querySelector('#text-warmth');
    if (barWarmth && textWarmth) {
      const w = Math.max(0, Math.min(100, stats.warmth));
      barWarmth.style.width = `${w}%`;
      textWarmth.textContent = `${w}%`;
    }

    const barEnergy = this.container.querySelector('#bar-energy');
    const textEnergy = this.container.querySelector('#text-energy');
    if (barEnergy && textEnergy) {
      const e = Math.max(0, Math.min(100, stats.energy));
      barEnergy.style.width = `${e}%`;
      textEnergy.textContent = `${e}%`;
    }

    const barComfort = this.container.querySelector('#bar-comfort');
    const textComfort = this.container.querySelector('#text-comfort');
    if (barComfort && textComfort) {
      const c = Math.max(0, Math.min(100, stats.comfort));
      barComfort.style.width = `${c}%`;
      textComfort.textContent = `${c}%`;
    }
  }

  updateHotbar() {
    const container = this.container.querySelector('#hotbar-slots-container');
    if (!container) return;

    const inv = this.player ? this.player.inventorySystem : null;
    const hotbarSlots = inv ? inv.hotbar : [];
    const activeIdx = inv ? inv.activeSlotIndex : 0;

    let html = '';
    for (let i = 0; i < 9; i++) {
      const item = hotbarSlots[i];
      const isActive = (i === activeIdx);
      const def = item ? (ITEMS[item.id] || null) : null;
      const icon = def ? def.icon : '';
      const name = def ? def.name : '';
      const count = (item && item.count > 1) ? `<span class="hotbar-badge">${item.count}</span>` : '';

      let durBar = '';
      if (item && def && def.maxDurability && item.durability !== undefined) {
        const pct = Math.max(0, Math.min(100, Math.round((item.durability / def.maxDurability) * 100)));
        const barColor = pct > 50 ? '#22c55e' : (pct > 25 ? '#eab308' : '#ef4444');
        durBar = `<div class="hotbar-durability-track"><div class="hotbar-durability-fill" style="width: ${pct}%; background: ${barColor};"></div></div>`;
      }

      html += `
        <div class="hotbar-slot ${isActive ? 'active' : ''} ${item ? 'has-item' : ''}" data-slot-index="${i}" title="${name || `Slot ${i + 1} [Press ${i + 1}]`}">
          <span class="hotbar-slot-key">${i + 1}</span>
          ${icon ? `<span class="hotbar-item-icon">${icon}</span>` : ''}
          ${count}
          ${durBar}
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click listeners to select slot
    container.querySelectorAll('.hotbar-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        const idx = parseInt(slot.getAttribute('data-slot-index'), 10);
        if (this.player && this.player.selectHotbarSlot) {
          this.player.selectHotbarSlot(idx);
          this.updateHotbar();
          soundFX.playPop();
        }
      });
    });
  }

  showToast(message, type = 'info') {
    const toastContainer = this.container.querySelector('#hud-toasts');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `hud-toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  update(delta) {
    // Update Day/Night clock pill
    if (this.dayNight) {
      const clock = this.dayNight.getClockInfo();
      this.container.querySelector('#hud-clock-icon').textContent = clock.icon;
      this.container.querySelector('#hud-clock-time').textContent = clock.timeStr;
      this.container.querySelector('#hud-clock-phase').textContent = clock.phase;
    }

    // Update camper count
    const totalCampers = 1 + (this.network ? this.network.connections.size : 0);
    this.container.querySelector('#hud-camper-count').textContent = `${totalCampers} / 5 Campers`;
  }
}

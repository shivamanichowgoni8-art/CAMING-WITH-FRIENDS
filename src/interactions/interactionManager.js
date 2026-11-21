import { soundFX } from '../utils/soundFX.js';
import { EVENT_TYPES } from '../net/eventSync.js';

export const FISH_TYPES = [
  { name: 'Rainbow Trout', rarity: 'Common', minWeight: 1.2, maxWeight: 2.8, color: '#60a5fa' },
  { name: 'Brook Charr', rarity: 'Uncommon', minWeight: 1.5, maxWeight: 3.5, color: '#34d399' },
  { name: 'Mountain Salmon', rarity: 'Rare', minWeight: 3.0, maxWeight: 6.2, color: '#f87171' },
  { name: 'Golden Alpine Carp', rarity: 'Legendary', minWeight: 5.5, maxWeight: 9.8, color: '#fbbf24' }
];

export class InteractionManager {
  constructor(world, playerController, partyGameManager, networkManager, eventSync = null) {
    this.world = world;
    this.player = playerController;
    this.partyGames = partyGameManager;
    this.network = networkManager;
    this.eventSync = eventSync;

    // Fishing mini-game active state
    this.isFishing = false;
    this.bobberPos = { x: 23.5, y: -0.05, z: 20.0 };
    this.fishBiteTimer = null;
    this.fishingState = 'idle'; // 'casting', 'waiting', 'hooking', 'caught', 'missed'
    this.fishMeterPos = 0;
    this.fishMeterSpeed = 1.6;
    this.fishTargetZone = { start: 0.35, end: 0.65 };

    // UI callbacks
    this.onPromptChanged = null;
    this.onFishingStateChanged = null;
    this.onPartyGameOpen = null;
    this.onInventoryChanged = null;
  }

  setEventSync(eventSync) {
    this.eventSync = eventSync;
  }

  // Triggered when player presses [E] or touches Interact button
  triggerInteraction() {
    const nearby = this.player.getNearbyInteractable();
    if (!nearby) return;

    switch (nearby.type) {
      case 'tree':
        this.chopNearbyTree(nearby);
        break;

      case 'dropped_log':
        this.pickupLog(nearby);
        break;

      case 'campfire':
        this.feedCampfire();
        break;

      case 'fish_spot':
        this.startFishing();
        break;

      case 'sit_log':
        this.sitAtCampfire(nearby);
        break;

      case 'cabin_door':
        this.toggleCabinDoor();
        break;
    }
  }

  toggleCabinDoor() {
    if (this.eventSync) {
      this.eventSync.dispatch(EVENT_TYPES.DOOR_TOGGLE, {
        isOpen: !this.world.cabinDoorOpen
      });
    } else {
      const isOpen = this.world.toggleCabinDoor();
      if (this.network) {
        this.network.broadcast({
          type: 'cabin_door_toggle',
          isOpen
        });
      }
    }
  }

  chopNearbyTree(treeItem) {
    if (this.player.isSitting) return;

    // Trigger player chop animation
    this.player.model.setAnimation('chop');

    // Return to idle after swing
    setTimeout(() => {
      if (this.player.model.animState === 'chop') {
        this.player.model.setAnimation('idle');
      }
    }, 700);

    if (this.eventSync) {
      this.eventSync.dispatch(EVENT_TYPES.CHOP, { treeId: treeItem.id });
    } else {
      const result = this.world.chopTree(treeItem.id);
      if (!result) return;

      if (this.network) {
        this.network.broadcast({
          type: 'tree_chopped',
          treeId: treeItem.id
        });
      }

      if (result.felled) {
        result.logs.forEach(log => {
          if (this.network) {
            this.network.broadcast({
              type: 'log_dropped',
              logId: log.id,
              x: log.position.x,
              y: log.position.y,
              z: log.position.z
            });
          }
        });
      }
    }
  }

  pickupLog(logItem) {
    if (this.eventSync) {
      this.eventSync.dispatch(EVENT_TYPES.PICKUP, {
        itemId: logItem.id,
        x: logItem.position.x,
        y: logItem.position.y,
        z: logItem.position.z
      });
    } else {
      this.world.removeDroppedLog(logItem.id);
      this.player.inventory.firewood++;
      soundFX.playPop();

      if (this.onInventoryChanged) this.onInventoryChanged(this.player.inventory);

      if (this.network) {
        this.network.broadcast({
          type: 'log_picked',
          logId: logItem.id,
          peerId: this.network.myPeerId
        });
      }
    }
  }

  feedCampfire() {
    if (this.player.inventory.firewood <= 0) return;

    this.player.inventory.firewood--;
    if (this.onInventoryChanged) this.onInventoryChanged(this.player.inventory);

    if (this.eventSync) {
      this.eventSync.dispatch(EVENT_TYPES.ADD_LOG, { amount: 0.6 });
    } else {
      this.world.boostCampfire(0.6);

      if (this.network) {
        this.network.broadcast({
          type: 'fire_boosted',
          amount: 0.6
        });
      }
    }

    if (this.network && this.partyGames) {
      this.partyGames.addChatMessage('System', `🔥 ${this.player.model.name} added firewood to the campfire!`);
    }
  }

  sitAtCampfire(sitItem) {
    this.player.sitDown(sitItem);
    if (this.onPartyGameOpen) {
      this.onPartyGameOpen(true);
    }
  }

  // -------------------------------------------------------------
  // Fishing Mini-Game
  // -------------------------------------------------------------
  startFishing() {
    if (this.isFishing) return;
    this.isFishing = true;
    this.fishingState = 'waiting';
    this.player.model.setAnimation('fish');
    soundFX.playWaterSplash();

    // Randomize target zone size
    const zoneSize = 0.22 + Math.random() * 0.12;
    const zoneStart = 0.2 + Math.random() * (0.6 - zoneSize);
    this.fishTargetZone = { start: zoneStart, end: zoneStart + zoneSize };
    this.fishMeterPos = 0;
    this.fishMeterSpeed = 1.4 + Math.random() * 0.8;

    if (this.onFishingStateChanged) {
      this.onFishingStateChanged({
        active: true,
        state: 'waiting',
        targetZone: this.fishTargetZone
      });
    }

    // Bite happens in 1.5 - 3.5 seconds
    this.fishBiteTimer = setTimeout(() => {
      if (!this.isFishing) return;
      this.fishingState = 'hooking';
      soundFX.playPop();

      if (this.onFishingStateChanged) {
        this.onFishingStateChanged({
          active: true,
          state: 'hooking',
          targetZone: this.fishTargetZone
        });
      }
    }, 1500 + Math.random() * 2000);
  }

  strikeFish() {
    if (!this.isFishing) return;

    if (this.fishingState === 'waiting') {
      // Pulled too early!
      this.fishingState = 'missed';
      soundFX.playPop();
      if (this.onFishingStateChanged) {
        this.onFishingStateChanged({ active: true, state: 'missed', text: 'Too early! The fish swam away.' });
      }
      setTimeout(() => this.stopFishing(), 1800);
      return;
    }

    if (this.fishingState === 'hooking') {
      // Check if indicator is inside green target zone
      const insideZone = (this.fishMeterPos >= this.fishTargetZone.start && this.fishMeterPos <= this.fishTargetZone.end);

      if (insideZone) {
        // Caught!
        this.fishingState = 'caught';
        soundFX.playSuccess();

        // Pick random fish
        const fishType = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
        const weight = (fishType.minWeight + Math.random() * (fishType.maxWeight - fishType.minWeight)).toFixed(1);

        this.player.inventory.fish++;
        if (this.onInventoryChanged) this.onInventoryChanged(this.player.inventory);

        const announcement = `🎣 Reeled in a ${fishType.name} (${weight}kg)! [${fishType.rarity}]`;

        if (this.onFishingStateChanged) {
          this.onFishingStateChanged({
            active: true,
            state: 'caught',
            fish: fishType,
            weight,
            text: announcement
          });
        }

        if (this.network) {
          this.partyGames.addChatMessage('System', `🎣 ${this.player.model.name} caught a ${weight}kg ${fishType.name}!`);
        }

        setTimeout(() => this.stopFishing(), 2400);
      } else {
        // Missed!
        this.fishingState = 'missed';
        soundFX.playPop();
        if (this.onFishingStateChanged) {
          this.onFishingStateChanged({ active: true, state: 'missed', text: 'Missed the strike! Fish escaped.' });
        }
        setTimeout(() => this.stopFishing(), 1800);
      }
    }
  }

  stopFishing() {
    this.isFishing = false;
    this.fishingState = 'idle';
    if (this.fishBiteTimer) clearTimeout(this.fishBiteTimer);
    this.player.model.setAnimation('idle');

    if (this.onFishingStateChanged) {
      this.onFishingStateChanged({ active: false, state: 'idle' });
    }
  }

  update(delta) {
    // Animate fishing meter bouncing back and forth
    if (this.isFishing && this.fishingState === 'hooking') {
      this.fishMeterPos += this.fishMeterSpeed * delta;
      if (this.fishMeterPos > 1.0) {
        this.fishMeterPos = 1.0;
        this.fishMeterSpeed = -Math.abs(this.fishMeterSpeed);
      } else if (this.fishMeterPos < 0.0) {
        this.fishMeterPos = 0.0;
        this.fishMeterSpeed = Math.abs(this.fishMeterSpeed);
      }

      if (this.onFishingStateChanged) {
        this.onFishingStateChanged({
          active: true,
          state: 'hooking',
          meterPos: this.fishMeterPos,
          targetZone: this.fishTargetZone
        });
      }
    }

    // Contextual HUD Prompt detection
    const nearby = this.player.getNearbyInteractable();
    let promptText = null;

    if (nearby) {
      if (nearby.type === 'campfire') {
        if (this.player.inventory.firewood > 0) {
          promptText = `Add Firewood (${this.player.inventory.firewood} available)`;
        } else {
          promptText = `Campfire (Needs Firewood - chop a pine tree!)`;
        }
      } else if (nearby.type === 'dropped_log') {
        promptText = 'Pick Up Firewood Log';
      } else if (nearby.type === 'tree') {
        promptText = `Chop Pine Tree (Health: ${nearby.treeRef.health}/3)`;
      } else if (nearby.type === 'fish_spot') {
        promptText = 'Cast Fishing Line';
      } else if (nearby.type === 'sit_log') {
        promptText = this.player.isSitting ? 'Stand Up' : 'Sit by Campfire';
      } else if (nearby.type === 'cabin_door') {
        promptText = this.world.cabinDoorOpen ? 'Close Cabin Door' : 'Open Cabin Door';
      }
    }

    if (this.onPromptChanged) {
      this.onPromptChanged(promptText, nearby);
    }
  }
}

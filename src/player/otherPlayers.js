import * as THREE from 'three';
import { CharacterModel } from './characterModel.js';

export class RemotePlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // peerId -> { model, targetPos, targetRot, currentPos, lastUpdate }
  }

  addPlayer(peerId, name, characterId) {
    if (this.players.has(peerId)) {
      this.removePlayer(peerId);
    }

    const model = new CharacterModel(characterId, name);
    this.scene.add(model.root);

    const playerData = {
      peerId,
      name,
      characterId,
      model,
      targetPos: new THREE.Vector3(0, 0, 0),
      targetRot: 0,
      currentPos: new THREE.Vector3(0, 0, 0),
      isSpeaking: false,
      lastUpdate: Date.now()
    };

    this.players.set(peerId, playerData);
    return playerData;
  }

  removePlayer(peerId) {
    const player = this.players.get(peerId);
    if (player) {
      this.scene.remove(player.model.root);
      player.model.dispose();
      this.players.delete(peerId);
    }
  }

  updatePlayerState(peerId, state) {
    const player = this.players.get(peerId);
    if (!player) return;

    if (state.pos) {
      player.targetPos.set(state.pos.x, state.pos.y, state.pos.z);
    }
    if (state.rot !== undefined) {
      player.targetRot = state.rot;
    }
    if (state.anim) {
      player.model.setAnimation(state.anim);
    }
    if (state.carryingLog !== undefined) {
      player.model.setCarryingLog(state.carryingLog);
    }
    if (state.isSpeaking !== undefined) {
      player.model.setSpeaking(state.isSpeaking);
    }

    player.lastUpdate = Date.now();
  }

  setSpeaking(peerId, isSpeaking, level = 0.5) {
    const player = this.players.get(peerId);
    if (player) {
      player.isSpeaking = isSpeaking;
      player.model.setSpeaking(isSpeaking, level);
    }
  }

  update(delta) {
    const now = Date.now();
    this.players.forEach(player => {
      // Smooth interpolation towards target position & rotation
      player.currentPos.lerp(player.targetPos, delta * 12);
      player.model.root.position.copy(player.currentPos);

      // Smooth rotation
      let diff = player.targetRot - player.model.root.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      player.model.root.rotation.y += diff * Math.min(1.0, delta * 12);

      player.model.update(delta);
    });
  }

  clear() {
    this.players.forEach((_, peerId) => this.removePlayer(peerId));
    this.players.clear();
  }
}

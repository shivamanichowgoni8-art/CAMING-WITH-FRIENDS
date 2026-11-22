import * as THREE from 'three';

export class PlayerController {
  constructor(camera, domElement, world, characterModel) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    this.model = characterModel;

    // Movement state
    this.position = new THREE.Vector3(0, 1.0, 5.0); // start near campfire
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.isSwimming = false;
    this.isSitting = false;
    this.sittingLogId = null;
    this.inventory = {
      firewood: 0,
      fish: 0
    };

    // Survival Stats (The Living Valley)
    this.warmth = 100;
    this.energy = 100;
    this.comfort = 100;
    this.inventorySystem = null; // Connected InventorySystem instance
    this.onStatsChanged = null;
    this.onRespawned = null;

    // Camera control angles
    this.cameraDistance = 5.2;
    this.cameraHeight = 1.9;
    this.yaw = 0;   // horizontal angle in radians
    this.pitch = 0.22; // vertical angle in radians
    this.cameraTarget = new THREE.Vector3();

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      interact: false
    };

    // Keyboard look orbit keys (Arrow keys & I/J/K/L)
    this.lookKeys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    // Touch / Mobile state
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.touchJoystick = { active: false, startX: 0, startY: 0, moveX: 0, moveY: 0, x: 0, y: 0 };
    this.touchLook = { active: false, lastX: 0, lastY: 0, touchId: null };

    // Pointer lock & mouse drag
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Callbacks
    this.onInteractPressed = null;
    this.onPointerLockChange = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in a text input (e.g. chat or party game)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        // Character Movement: WASD
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;

        // Camera Orbit Look: Arrow Keys & I/J/K/L
        case 'ArrowLeft':  case 'KeyJ': this.lookKeys.left = true; break;
        case 'ArrowRight': case 'KeyL': this.lookKeys.right = true; break;
        case 'ArrowUp':    case 'KeyI': this.lookKeys.up = true; break;
        case 'ArrowDown':  case 'KeyK': this.lookKeys.down = true; break;

        case 'Space':
          this.keys.jump = true;
          if (this.isSitting) this.standUp();
          break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = true; break;
        case 'KeyE':
          if (this.onInteractPressed) this.onInteractPressed();
          break;
        case 'Escape':
          if (this.isSitting) this.standUp();
          break;

        // Hotbar selection 1-9
        case 'Digit1': this.selectHotbarSlot(0); break;
        case 'Digit2': this.selectHotbarSlot(1); break;
        case 'Digit3': this.selectHotbarSlot(2); break;
        case 'Digit4': this.selectHotbarSlot(3); break;
        case 'Digit5': this.selectHotbarSlot(4); break;
        case 'Digit6': this.selectHotbarSlot(5); break;
        case 'Digit7': this.selectHotbarSlot(6); break;
        case 'Digit8': this.selectHotbarSlot(7); break;
        case 'Digit9': this.selectHotbarSlot(8); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;

        case 'ArrowLeft':  case 'KeyJ': this.lookKeys.left = false; break;
        case 'ArrowRight': case 'KeyL': this.lookKeys.right = false; break;
        case 'ArrowUp':    case 'KeyI': this.lookKeys.up = false; break;
        case 'ArrowDown':  case 'KeyK': this.lookKeys.down = false; break;

        case 'Space':                   this.keys.jump = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    // Pointer Lock on Canvas Click (No-Click Mouse & Trackpad Look)
    this.domElement.addEventListener('click', (e) => {
      // Ignore if clicking UI buttons, modals or chat
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      if (document.querySelector('.party-modal-backdrop:not(.hidden), .lobby-card, .fishing-overlay:not(.hidden)')) return;

      if (document.pointerLockElement !== this.domElement) {
        try {
          this.domElement.requestPointerLock();
        } catch (err) {
          console.warn('Pointer lock request error:', err);
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isPointerLocked);
      }
    });

    // 360° Free-Orbit Mouse Drag Fallback
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, input, textarea, a, .btn, .char-card, .party-card, .fishing-card')) return;
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked || document.pointerLockElement === this.domElement) {
        // Free-look with mouse or trackpad movement without holding any button
        this.yaw -= e.movementX * 0.0032;
        this.pitch -= e.movementY * 0.0032;
        this.clampPitch();
      } else if (this.isMouseDown) {
        // Drag fallback
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.yaw -= dx * 0.0042;
        this.pitch -= dy * 0.0042;
        this.clampPitch();
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse wheel & Laptop trackpad gestures
    window.addEventListener('wheel', (e) => {
      if (e.target.closest('.chat-messages-container, .party-modal-body, .character-grid')) return;

      // Laptop Trackpad: smooth two-finger horizontal swipe rotates camera horizontally
      if (Math.abs(e.deltaX) > 0.6 && !e.ctrlKey) {
        this.yaw += e.deltaX * 0.0036;
      }

      // Trackpad vertical scroll or mouse wheel zooms camera in/out
      if (Math.abs(e.deltaY) > 0.6 && !e.ctrlKey) {
        this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.006, 2.5, 9.5);
      }
    }, { passive: true });
  }

  clampPitch() {
    this.pitch = Math.max(-0.35, Math.min(1.25, this.pitch));
  }

  sitDown(sitInteractable) {
    this.isSitting = true;
    this.sittingLogId = sitInteractable.id;
    this.position.copy(sitInteractable.position);
    this.velocity.set(0, 0, 0);

    // Face the campfire
    if (sitInteractable.lookTarget) {
      const dir = new THREE.Vector3().subVectors(sitInteractable.lookTarget, this.position);
      this.model.root.rotation.y = Math.atan2(dir.x, dir.z);
    }
    this.model.setAnimation('sit');
  }

  standUp() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.sittingLogId = null;
    this.position.y = this.world.getGroundHeight(this.position.x, this.position.z);
    this.model.setAnimation('idle');
  }

  update(delta, dayNight = null) {
    // Laptop Keyboard Orbit Look (Arrow keys & I/J/K/L)
    const keyLookSpeed = 2.2;
    if (this.lookKeys.left)  this.yaw -= keyLookSpeed * delta;
    if (this.lookKeys.right) this.yaw += keyLookSpeed * delta;
    if (this.lookKeys.up)    this.pitch += keyLookSpeed * delta;
    if (this.lookKeys.down)  this.pitch -= keyLookSpeed * delta;
    if (this.lookKeys.up || this.lookKeys.down) this.clampPitch();

    if (this.isSitting) {
      // Keep model glued to sitting bench
      this.model.root.position.copy(this.position);
      this.model.update(delta);
      this.updateCamera(delta);
      this.tickSurvivalStats(delta, dayNight);
      return;
    }

    // 1. Gather directional input vector
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) moveZ += 1;
    if (this.keys.backward) moveZ -= 1;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;

    // Apply mobile virtual joystick input if present
    if (this.touchJoystick.active) {
      moveX += this.touchJoystick.x;
      moveZ -= this.touchJoystick.y; // invert Y for standard forward
    }

    const inputMag = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const hasMoveInput = inputMag > 0.05;

    // Determine current speed
    let speed = 5.2;
    const canSprint = this.keys.sprint && this.energy > 5 && !this.isSwimming && hasMoveInput;
    if (canSprint) {
      speed = 8.5;
      this.energy = Math.max(0, this.energy - delta * 4.8);
    } else if (this.isSitting) {
      this.energy = Math.min(100, this.energy + delta * 6.0);
    } else {
      this.energy = Math.min(100, this.energy + delta * 1.2);
    }

    if (this.isSwimming) speed = 3.8;

    // Camera forward and right projected onto ground plane (XZ)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (hasMoveInput) {
      const normX = moveX / Math.max(1, inputMag);
      const normZ = moveZ / Math.max(1, inputMag);
      moveDir.addScaledVector(forward, normZ);
      moveDir.addScaledVector(right, normX);
      moveDir.normalize();

      // Rotate avatar model smoothly towards movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      // Smooth angle interpolation
      let diff = targetAngle - this.model.root.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.model.root.rotation.y += diff * Math.min(1.0, delta * 14);
    }

    // Horizontal movement damping
    const targetVx = moveDir.x * speed * Math.min(1, inputMag);
    const targetVz = moveDir.z * speed * Math.min(1, inputMag);

    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVx, delta * 12);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVz, delta * 12);

    // 2. Vertical Physics & Exact Surface / Dock / Floor Snapping
    const groundY = this.world.getGroundHeight(this.position.x, this.position.z);
    const waterY = this.world.waterLevel;

    // Open water condition: the solid surface beneath the player is below lake water level
    const isOverDeepWater = (groundY < waterY - 0.15);

    if (isOverDeepWater && this.position.y < waterY + 0.35) {
      this.isSwimming = true;
      // Realistically sink/submerge down to chest/neck level (water surface at y = -0.1)
      // Setting target y to (waterY - 0.78) immerses lower body, waist, and lower torso so water line sits at chest/neck
      const waterBob = Math.sin(Date.now() * 0.003) * 0.03;
      const floatTargetY = waterY - 0.78 + waterBob;
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, (floatTargetY - this.position.y) * 4.5, delta * 6);
      this.isGrounded = false;

      // Jump / splash out of water
      if (this.keys.jump) {
        this.velocity.y = 5.2;
      }
    } else {
      this.isSwimming = false;

      if (this.isGrounded) {
        if (this.keys.jump) {
          this.velocity.y = 7.5;
          this.isGrounded = false;
        } else {
          // Firmly snap feet cleanly to the solid surface (terrain, dock planks, or cabin floor)
          this.position.y = groundY;
          this.velocity.y = 0;
        }
      } else {
        // In air (falling or jumping)
        this.velocity.y -= 22 * delta;
      }
    }

    // Apply movement
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Re-evaluate ground collision after movement
    const finalGroundY = this.world.getGroundHeight(this.position.x, this.position.z);
    const finalIsOverWater = (finalGroundY < waterY - 0.15);

    if (!this.isSwimming && !finalIsOverWater) {
      if (this.isGrounded) {
        // When grounded and walking across uneven terrain, dock, or cabin floor, snap cleanly
        this.position.y = finalGroundY;
        this.velocity.y = 0;
      } else {
        // When airborne, check if landed on solid surface
        if (this.position.y <= finalGroundY) {
          this.position.y = finalGroundY;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      }
    }

    // Check Obstacle Colliders (Trees, Cabin Walls, Boulders)
    this.world.colliders.forEach(col => {
      const dx = this.position.x - col.x;
      const dz = this.position.z - col.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = col.radius + 0.45; // player radius
      if (dist < minDist && dist > 0.001) {
        const push = (minDist - dist) / dist;
        this.position.x += dx * push;
        this.position.z += dz * push;
      }
    });

    // Update avatar model position & carrying state
    this.model.root.position.copy(this.position);
    this.model.setCarryingLog(this.inventory.firewood > 0);

    // Update animation state
    if (this.model.animState !== 'chop' && this.model.animState !== 'fish') {
      if (this.isSwimming) {
        this.model.setAnimation('swim');
      } else if (hasMoveInput) {
        this.model.setAnimation(this.keys.sprint ? 'run' : 'walk');
      } else {
        this.model.setAnimation('idle');
      }
    }

    this.model.update(delta);
    this.updateCamera(delta);
    this.tickSurvivalStats(delta, dayNight);
  }

  setInventorySystem(invSystem) {
    this.inventorySystem = invSystem;
    if (this.inventorySystem) {
      this.inventorySystem.onActiveSlotChanged = (item) => {
        if (this.model && this.model.updateHeldItem) {
          this.model.updateHeldItem(item ? item.id : null);
        }
      };
      // Init held item
      const cur = this.inventorySystem.getActiveItem();
      if (this.model && this.model.updateHeldItem) {
        this.model.updateHeldItem(cur ? cur.id : null);
      }
    }
  }

  selectHotbarSlot(index) {
    if (this.inventorySystem) {
      this.inventorySystem.setActiveSlot(index);
      const item = this.inventorySystem.getActiveItem();
      if (this.model && this.model.updateHeldItem) {
        this.model.updateHeldItem(item ? item.id : null);
      }
    }
  }

  eatFood(foodItemId) {
    switch (foodItemId) {
      case 'berry':
        this.energy = Math.min(100, this.energy + 12);
        this.warmth = Math.min(100, this.warmth + 4);
        break;
      case 'mushroom':
        this.energy = Math.min(100, this.energy + 10);
        break;
      case 'fish_cooked':
        this.energy = Math.min(100, this.energy + 40);
        this.warmth = Math.min(100, this.warmth + 22);
        this.comfort = Math.min(100, this.comfort + 18);
        break;
      case 'roasted_mushroom':
        this.energy = Math.min(100, this.energy + 28);
        this.warmth = Math.min(100, this.warmth + 16);
        this.comfort = Math.min(100, this.comfort + 12);
        break;
      case 'berry_tea':
        this.warmth = Math.min(100, this.warmth + 35);
        this.energy = Math.min(100, this.energy + 22);
        this.comfort = Math.min(100, this.comfort + 28);
        break;
      default:
        this.energy = Math.min(100, this.energy + 8);
        break;
    }
    if (this.onStatsChanged) {
      this.onStatsChanged({ warmth: this.warmth, energy: this.energy, comfort: this.comfort });
    }
  }

  tickSurvivalStats(delta, dayNight) {
    // 1. Proximity to heat sources & shelter
    const distFire = this.world && this.world.campfirePos
      ? this.position.distanceTo(this.world.campfirePos)
      : 999;
    const distCabin = Math.sqrt((this.position.x - (-9.2)) ** 2 + (this.position.z - (-6.8)) ** 2);

    const isNearCampfire = distFire < 5.8;
    const isInsideCabin = distCabin < 4.2;

    const activeItem = this.inventorySystem ? this.inventorySystem.getActiveItem() : null;
    const isHoldingTorch = activeItem && activeItem.id === 'torch';
    const isNight = dayNight ? (dayNight.cycleTimer >= dayNight.dayDuration) : false;

    // Warmth updates
    if (isNearCampfire) {
      const heatMultiplier = (this.world.campfireLevel || 1.0);
      this.warmth = Math.min(100, this.warmth + delta * 6.5 * heatMultiplier);
    } else if (isInsideCabin) {
      this.warmth = Math.min(100, this.warmth + delta * 3.8);
    } else if (isHoldingTorch) {
      this.warmth = Math.min(100, this.warmth + delta * 1.5);
    }

    if (this.isSwimming) {
      this.warmth = Math.max(0, this.warmth - delta * 4.2);
    } else if (isNight && !isNearCampfire && !isInsideCabin && !isHoldingTorch) {
      this.warmth = Math.max(0, this.warmth - delta * 1.4);
    }

    // Comfort updates
    if (this.isSitting) {
      this.comfort = Math.min(100, this.comfort + delta * 5.0);
    } else if (isInsideCabin) {
      this.comfort = Math.min(100, this.comfort + delta * 3.2);
    } else if (this.isSwimming || (isNight && !isNearCampfire && !isInsideCabin)) {
      this.comfort = Math.max(0, this.comfort - delta * 0.8);
    }

    // Blackout / Cozy Respawn when freezing cold
    if (this.warmth <= 0) {
      this.respawnAtCampfire();
    }

    if (this.onStatsChanged) {
      this.onStatsChanged({
        warmth: Math.round(this.warmth),
        energy: Math.round(this.energy),
        comfort: Math.round(this.comfort)
      });
    }
  }

  respawnAtCampfire() {
    const groundY = this.world.getGroundHeight(0, 4.5);
    this.position.set(0, groundY, 4.5);
    this.velocity.set(0, 0, 0);
    this.warmth = 65;
    this.energy = 60;
    this.comfort = 50;
    if (this.onRespawned) {
      this.onRespawned('🔥 Warmed up and revived by the cozy campfire embers!');
    }
  }

  updateCamera(delta) {
    // Smooth target tracking character's head/chest
    const targetHeight = this.isSitting ? 0.8 : (this.isSwimming ? 0.88 : 1.15);
    const idealTarget = new THREE.Vector3(
      this.position.x,
      this.position.y + targetHeight,
      this.position.z
    );
    this.cameraTarget.lerp(idealTarget, delta * 14);

    // Calculate spherical camera position
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const cx = this.cameraTarget.x + this.cameraDistance * cosPitch * sinYaw;
    const cy = this.cameraTarget.y + this.cameraDistance * sinPitch;
    const cz = this.cameraTarget.z + this.cameraDistance * cosPitch * cosYaw;

    // Prevent camera from clipping through terrain
    const camGroundY = this.world.getGroundHeight(cx, cz) + 0.45;
    const finalCy = Math.max(camGroundY, cy);

    this.camera.position.set(cx, finalCy, cz);
    this.camera.lookAt(this.cameraTarget);
  }

  // Find nearest interactable object
  getNearbyInteractable() {
    let closest = null;
    let minDist = Infinity;

    for (const item of this.world.interactables) {
      if (item.type === 'tree' && item.treeRef && item.treeRef.isChopped) continue;

      const dist = this.position.distanceTo(item.position);
      if (dist <= item.radius && dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }

    return closest;
  }

  getNetworkState() {
    return {
      pos: {
        x: parseFloat(this.position.x.toFixed(2)),
        y: parseFloat(this.position.y.toFixed(2)),
        z: parseFloat(this.position.z.toFixed(2))
      },
      rot: parseFloat(this.model.root.rotation.y.toFixed(2)),
      anim: this.model.animState,
      carryingLog: this.inventory.firewood > 0,
      isSitting: this.isSitting,
      isSpeaking: this.model.isSpeaking
    };
  }
}

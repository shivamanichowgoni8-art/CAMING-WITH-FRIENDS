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

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in a text input (e.g. chat or party game)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown':  this.keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  this.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
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
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown':  this.keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  this.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        case 'Space':                   this.keys.jump = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    // Pointer Lock & Mouse Look
    this.domElement.addEventListener('click', () => {
      if (!this.isTouchDevice && document.pointerLockElement !== this.domElement) {
        // Can request pointer lock if desired
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.domElement) {
        this.yaw -= e.movementX * 0.003;
        this.pitch -= e.movementY * 0.003;
        this.clampPitch();
      } else if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.yaw -= dx * 0.004;
        this.pitch -= dy * 0.004;
        this.clampPitch();
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse scroll to zoom camera distance
    this.domElement.addEventListener('wheel', (e) => {
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.005, 2.5, 9.0);
    }, { passive: true });
  }

  clampPitch() {
    this.pitch = Math.max(-0.6, Math.min(1.2, this.pitch));
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
    this.position.y += 0.5;
    this.model.setAnimation('idle');
  }

  update(delta) {
    if (this.isSitting) {
      // Keep model glued to sitting bench
      this.model.root.position.copy(this.position);
      this.model.update(delta);
      this.updateCamera(delta);
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
    if (this.keys.sprint) speed = 8.5;
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

    // 2. Vertical Physics & Terrain / Water interaction
    const terrainY = this.world.getTerrainHeight(this.position.x, this.position.z);
    const waterY = this.world.waterLevel;

    // Check if in water
    if (this.position.y < waterY + 0.3 && terrainY < waterY) {
      this.isSwimming = true;
      // Buoyancy in water
      const floatTargetY = waterY - 0.2;
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, (floatTargetY - this.position.y) * 4.0, delta * 5);
      this.isGrounded = false;

      // Jump / splash out of water
      if (this.keys.jump) {
        this.velocity.y = 5.0;
      }
    } else {
      this.isSwimming = false;

      // Regular Gravity on land
      if (!this.isGrounded) {
        this.velocity.y -= 22 * delta; // gravity
      }

      // Jump
      if (this.keys.jump && this.isGrounded) {
        this.velocity.y = 7.5;
        this.isGrounded = false;
      }
    }

    // Apply movement
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // Check Ground Collision
    const updatedTerrainY = this.world.getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= updatedTerrainY + 0.1) {
      this.position.y = updatedTerrainY + 0.1;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Check Obstacle Colliders (Trees, Tents, Boulders)
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
  }

  updateCamera(delta) {
    // Smooth target tracking character's head/chest
    const targetHeight = this.isSitting ? 0.9 : (this.isSwimming ? 0.4 : 1.3);
    const idealTarget = new THREE.Vector3(
      this.position.x,
      this.position.y + targetHeight,
      this.position.z
    );
    this.cameraTarget.lerp(idealTarget, delta * 12);

    // Calculate spherical camera position
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const cx = this.cameraTarget.x + this.cameraDistance * cosPitch * sinYaw;
    const cy = this.cameraTarget.y + this.cameraDistance * sinPitch + 0.5;
    const cz = this.cameraTarget.z + this.cameraDistance * cosPitch * cosYaw;

    // Prevent camera from clipping through ground
    const camGroundY = this.world.getTerrainHeight(cx, cz) + 0.4;
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

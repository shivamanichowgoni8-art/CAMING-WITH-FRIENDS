import * as THREE from 'three';

// 4 Distinct Low-Poly Camper Archetypes
export const CHARACTER_PRESETS = [
  {
    id: 'ranger',
    name: 'Ranger Rick',
    title: 'Park Guardian',
    desc: 'Expert navigator with a wide ranger hat, forest green jacket, and park badge.',
    colors: {
      jacket: 0x2e6f40, // Forest green
      pants: 0x3d312a,  // Dark brown utility pants
      hat: 0x6e4e37,    // Wide-brim ranger felt hat
      hatBand: 0x222222,
      boots: 0x221a14,
      skin: 0xf5c29b,
      hair: 0x4a2c16,
      accessory: 0xf4d03f // Golden badge
    },
    style: 'ranger'
  },
  {
    id: 'cozy',
    name: 'Cozy Billie',
    title: 'Campfire Storyteller',
    desc: 'Warm mustard yellow knit sweater, cherry red pom-pom beanie, and woolen scarf.',
    colors: {
      jacket: 0xe59822, // Mustard warm yellow
      pants: 0x334e68,  // Denim jeans
      hat: 0xc92a2a,    // Red knit beanie
      hatBand: 0xffffff, // White pom-pom
      boots: 0x5b3824,
      skin: 0xffd8b3,
      hair: 0xd97706,   // Auburn hair
      accessory: 0x9b2c2c // Red scarf
    },
    style: 'beanie'
  },
  {
    id: 'explorer',
    name: 'Explorer Ash',
    title: 'Trail Blazer',
    desc: 'Safari adventurer fedora, rolled sleeves, utility vest, and canvas backpack.',
    colors: {
      jacket: 0xd4a373, // Khaki / Sand safari
      pants: 0x586445,  // Olive green cargo pants
      hat: 0xb5835a,    // Safari fedora
      hatBand: 0x3b2512,
      boots: 0x2b2b2b,
      skin: 0x8d5524,   // Deep warm skin
      hair: 0x1a1a1a,   // Dark hair
      accessory: 0xa8dadc // Explorer bedroll
    },
    style: 'fedora'
  },
  {
    id: 'scout',
    name: 'Scout Maya',
    title: 'Wilderness Scout',
    desc: 'Red plaid flannel shirt, denim overalls, backward baseball cap, and scout badge.',
    colors: {
      jacket: 0xb91c1c, // Red flannel
      pants: 0x1e3a8a,  // Blue overalls
      hat: 0x0284c7,    // Blue backward cap
      hatBand: 0x0f172a,
      boots: 0x44403c,
      skin: 0xfcd34d,   // Golden warm skin
      hair: 0x312e81,   // Indigo dark hair
      accessory: 0x10b981 // Canteen bottle
    },
    style: 'cap'
  }
];

export class CharacterModel {
  constructor(presetId = 'ranger', name = 'Camper') {
    this.preset = CHARACTER_PRESETS.find(p => p.id === presetId) || CHARACTER_PRESETS[0];
    this.name = name;
    this.root = new THREE.Group();
    this.root.name = `character_${this.preset.id}`;

    // Animation state
    this.animState = 'idle'; // 'idle', 'walk', 'run', 'swim', 'chop', 'fish', 'sit'
    this.animTime = 0;
    this.isSpeaking = false;
    this.speakingLevel = 0; // 0 to 1

    // Build low-poly body parts
    this.buildMeshes();
    this.buildTools();
    this.buildNametag();
  }

  buildMeshes() {
    const c = this.preset.colors;

    // Materials (flat-shaded low-poly aesthetic)
    const matJacket = new THREE.MeshLambertMaterial({ color: c.jacket, flatShading: true });
    const matPants = new THREE.MeshLambertMaterial({ color: c.pants, flatShading: true });
    const matSkin = new THREE.MeshLambertMaterial({ color: c.skin, flatShading: true });
    const matHat = new THREE.MeshLambertMaterial({ color: c.hat, flatShading: true });
    const matHatBand = new THREE.MeshLambertMaterial({ color: c.hatBand, flatShading: true });
    const matBoots = new THREE.MeshLambertMaterial({ color: c.boots, flatShading: true });
    const matHair = new THREE.MeshLambertMaterial({ color: c.hair, flatShading: true });
    const matAccessory = new THREE.MeshLambertMaterial({ color: c.accessory, flatShading: true });
    const matEye = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Center pivot for whole avatar - calibrated so boot soles sit exactly at y = 0.00
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0.68; // waist height
    this.root.add(this.bodyGroup);

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.35);
    this.torso = new THREE.Mesh(torsoGeo, matJacket);
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.torso.position.y = 0.32;
    this.bodyGroup.add(this.torso);

    // Belt / Waist
    const beltGeo = new THREE.BoxGeometry(0.57, 0.1, 0.37);
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.28;
    this.torso.add(belt);

    // 2. Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.72, 0);
    this.torso.add(this.headGroup);

    // Head cube
    const headGeo = new THREE.BoxGeometry(0.42, 0.44, 0.42);
    const head = new THREE.Mesh(headGeo, matSkin);
    head.castShadow = true;
    this.headGroup.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.44, 0.16, 0.44);
    const hair = new THREE.Mesh(hairGeo, matHair);
    hair.position.y = 0.2;
    this.headGroup.add(hair);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, matEye);
    leftEye.position.set(0.11, 0.04, 0.22);
    const rightEye = new THREE.Mesh(eyeGeo, matEye);
    rightEye.position.set(-0.11, 0.04, 0.22);
    this.headGroup.add(leftEye, rightEye);

    // Cheeks / Smile blush
    const blushGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xe07a5f });
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(0.12, -0.05, 0.215);
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(-0.12, -0.05, 0.215);
    this.headGroup.add(leftBlush, rightBlush);

    // Distinct Hats by style
    this.buildHat(matHat, matHatBand, matAccessory);

    // Distinct Backpacks / Gear
    this.buildGear(matAccessory);

    // 3. Arms (Pivots at shoulders)
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    armGeo.translate(0, -0.22, 0); // pivot at top of arm

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(0.36, 0.26, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, matJacket);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    // Hand
    const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    handGeo.translate(0, -0.48, 0);
    const leftHand = new THREE.Mesh(handGeo, matSkin);
    this.leftArm.add(leftHand);
    this.torso.add(this.leftArm);

    // Right Arm (holds tools!)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(-0.36, 0.26, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, matJacket);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);
    const rightHand = new THREE.Mesh(handGeo, matSkin);
    this.rightArm.add(rightHand);
    this.torso.add(this.rightArm);

    // 4. Legs (Pivots at hips)
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    legGeo.translate(0, -0.32, 0); // pivot at hip

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(0.15, -0.32, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, matPants);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);
    // Boot
    const bootGeo = new THREE.BoxGeometry(0.22, 0.16, 0.28);
    bootGeo.translate(0, -0.6, 0.03);
    const leftBoot = new THREE.Mesh(bootGeo, matBoots);
    this.leftLeg.add(leftBoot);
    this.torso.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(-0.15, -0.32, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, matPants);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);
    const rightBoot = new THREE.Mesh(bootGeo, matBoots);
    this.rightLeg.add(rightBoot);
    this.torso.add(this.rightLeg);
  }

  buildHat(matHat, matHatBand, matAcc) {
    if (this.preset.style === 'ranger') {
      // Wide-brim ranger hat
      const brimGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 8);
      const brim = new THREE.Mesh(brimGeo, matHat);
      brim.position.y = 0.26;
      this.headGroup.add(brim);

      const crownGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.24, 8);
      const crown = new THREE.Mesh(crownGeo, matHat);
      crown.position.y = 0.38;
      this.headGroup.add(crown);

      const bandGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.06, 8);
      const band = new THREE.Mesh(bandGeo, matHatBand);
      band.position.y = 0.29;
      this.headGroup.add(band);

      // Gold badge on hat
      const badgeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
      const badge = new THREE.Mesh(badgeGeo, matAcc);
      badge.position.set(0, 0.35, 0.27);
      this.headGroup.add(badge);
    } else if (this.preset.style === 'beanie') {
      // Warm Beanie with pom-pom
      const beanieGeo = new THREE.SphereGeometry(0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const beanie = new THREE.Mesh(beanieGeo, matHat);
      beanie.position.y = 0.22;
      this.headGroup.add(beanie);

      const pomGeo = new THREE.DodecahedronGeometry(0.09);
      const pom = new THREE.Mesh(pomGeo, matHatBand);
      pom.position.y = 0.49;
      this.headGroup.add(pom);

      // Scarf wrapped around neck
      const scarfGeo = new THREE.BoxGeometry(0.5, 0.12, 0.44);
      const scarf = new THREE.Mesh(scarfGeo, matAcc);
      scarf.position.set(0, -0.06, 0);
      this.headGroup.add(scarf);
    } else if (this.preset.style === 'fedora') {
      // Fedora with crease
      const brimGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.04, 8);
      const brim = new THREE.Mesh(brimGeo, matHat);
      brim.position.y = 0.25;
      this.headGroup.add(brim);

      const crownGeo = new THREE.BoxGeometry(0.36, 0.22, 0.38);
      const crown = new THREE.Mesh(crownGeo, matHat);
      crown.position.y = 0.36;
      this.headGroup.add(crown);

      // Feather
      const featherGeo = new THREE.BoxGeometry(0.03, 0.16, 0.04);
      const featherMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const feather = new THREE.Mesh(featherGeo, featherMat);
      feather.position.set(0.2, 0.4, 0);
      feather.rotation.z = -0.3;
      this.headGroup.add(feather);
    } else if (this.preset.style === 'cap') {
      // Backward baseball cap
      const capGeo = new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const cap = new THREE.Mesh(capGeo, matHat);
      cap.position.y = 0.22;
      this.headGroup.add(cap);

      const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.18);
      const visor = new THREE.Mesh(visorGeo, matHat);
      visor.position.set(0, 0.22, -0.28);
      visor.rotation.x = -0.15;
      this.headGroup.add(visor);
    }
  }

  buildGear(matAcc) {
    // Backpack on back of torso
    const packGeo = new THREE.BoxGeometry(0.4, 0.45, 0.2);
    const packMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.05, -0.25);
    this.torso.add(pack);

    // Bedroll on top of backpack
    const rollGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.46, 6);
    rollGeo.rotateZ(Math.PI / 2);
    const roll = new THREE.Mesh(rollGeo, matAcc);
    roll.position.set(0, 0.32, -0.25);
    this.torso.add(roll);
  }

  buildTools() {
    // 1. Axe (attached to right arm)
    this.axeGroup = new THREE.Group();
    this.axeGroup.position.set(0, -0.5, 0.1);
    this.axeGroup.rotation.x = Math.PI / 2;

    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    this.axeGroup.add(handle);

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.22, 0.18);
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.32, 0.07);
    this.axeGroup.add(blade);
    this.rightArm.add(this.axeGroup);
    this.axeGroup.visible = false;

    // 2. Pickaxe (attached to right arm)
    this.pickaxeGroup = new THREE.Group();
    this.pickaxeGroup.position.set(0, -0.5, 0.1);
    this.pickaxeGroup.rotation.x = Math.PI / 2;

    const pickHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 5), handleMat);
    this.pickaxeGroup.add(pickHandle);

    const pickHeadGeo = new THREE.ConeGeometry(0.08, 0.55, 4);
    pickHeadGeo.rotateZ(Math.PI / 2);
    const pickHead = new THREE.Mesh(pickHeadGeo, bladeMat);
    pickHead.position.set(0, 0.35, 0.02);
    this.pickaxeGroup.add(pickHead);
    this.rightArm.add(this.pickaxeGroup);
    this.pickaxeGroup.visible = false;

    // 3. Torch (attached to right arm, with soft local light)
    this.torchGroup = new THREE.Group();
    this.torchGroup.position.set(0, -0.4, 0.15);
    this.torchGroup.rotation.x = 0.3;

    const torchHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 5), handleMat);
    this.torchGroup.add(torchHandle);

    const torchFlameGeo = new THREE.DodecahedronGeometry(0.09);
    const torchFlameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const torchFlame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
    torchFlame.position.set(0, 0.3, 0);
    this.torchGroup.add(torchFlame);

    this.torchLight = new THREE.PointLight(0xffa040, 1.2, 8, 1.5);
    this.torchLight.position.set(0, 0.35, 0);
    this.torchGroup.add(this.torchLight);

    this.rightArm.add(this.torchGroup);
    this.torchGroup.visible = false;

    // 4. Fishing Rod (attached to right arm)
    this.rodGroup = new THREE.Group();
    this.rodGroup.position.set(0, -0.5, 0.1);
    this.rodGroup.rotation.x = -Math.PI / 4;

    const rodGeo = new THREE.CylinderGeometry(0.015, 0.035, 1.8, 5);
    rodGeo.translate(0, 0.9, 0);
    const rodMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    this.rodGroup.add(rod);

    // Fishing line & bobber
    const bobberGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const bobberMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.bobber = new THREE.Mesh(bobberGeo, bobberMat);
    this.bobber.position.set(0, 1.8, 0.4);
    this.rodGroup.add(this.bobber);

    this.rightArm.add(this.rodGroup);
    this.rodGroup.visible = false;

    // 5. Carried Log (held in front with two hands)
    this.logCarryGroup = new THREE.Group();
    const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true });
    const logMesh = new THREE.Mesh(logGeo, logMat);
    this.logCarryGroup.add(logMesh);
    this.logCarryGroup.position.set(0, 0.1, 0.35);
    this.torso.add(this.logCarryGroup);
    this.logCarryGroup.visible = false;
  }

  updateHeldItem(itemId) {
    if (this.axeGroup) this.axeGroup.visible = false;
    if (this.pickaxeGroup) this.pickaxeGroup.visible = false;
    if (this.torchGroup) this.torchGroup.visible = false;
    if (this.rodGroup) this.rodGroup.visible = false;
    if (this.logCarryGroup) this.logCarryGroup.visible = false;

    switch (itemId) {
      case 'stone_axe':
        if (this.axeGroup) this.axeGroup.visible = true;
        break;
      case 'pickaxe':
        if (this.pickaxeGroup) this.pickaxeGroup.visible = true;
        break;
      case 'torch':
        if (this.torchGroup) this.torchGroup.visible = true;
        break;
      case 'fishing_rod':
        if (this.rodGroup) this.rodGroup.visible = true;
        break;
      case 'log':
        if (this.logCarryGroup) this.logCarryGroup.visible = true;
        break;
    }
  }

  buildNametag() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 80;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false
    });
    this.nametagSprite = new THREE.Sprite(spriteMat);
    this.nametagSprite.scale.set(1.6, 0.5, 1);
    this.nametagSprite.position.set(0, 1.9, 0);
    this.root.add(this.nametagSprite);

    this.updateNametagVisual();
  }

  setSpeaking(isSpeaking, level = 0.5) {
    if (this.isSpeaking !== isSpeaking || Math.abs(this.speakingLevel - level) > 0.15) {
      this.isSpeaking = isSpeaking;
      this.speakingLevel = level;
      this.updateNametagVisual();
    }
  }

  setCarryingLog(carrying) {
    this.logCarryGroup.visible = carrying;
  }

  updateNametagVisual() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 256, 80);

    // Pill background
    ctx.fillStyle = this.isSpeaking ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = this.isSpeaking ? '#4ade80' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(10, 12, 236, 56, 28);
    ctx.fill();
    ctx.stroke();

    // Icon or speaking waves
    if (this.isSpeaking) {
      // Draw animated voice waves
      ctx.fillStyle = '#ffffff';
      const cx = 40;
      const cy = 40;
      const h1 = 10 + Math.sin(Date.now() * 0.02) * 8;
      const h2 = 18 + Math.sin(Date.now() * 0.03 + 1) * 12;
      const h3 = 10 + Math.sin(Date.now() * 0.02 + 2) * 8;

      ctx.fillRect(cx - 10, cy - h1 / 2, 4, h1);
      ctx.fillRect(cx, cy - h2 / 2, 4, h2);
      ctx.fillRect(cx + 10, cy - h3 / 2, 4, h3);
    } else {
      // Small camper icon dot
      ctx.fillStyle = `#${this.preset.colors.jacket.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(38, 40, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Name Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayName = this.name.length > 12 ? this.name.substring(0, 11) + '…' : this.name;
    ctx.fillText(displayName, 64, 40);

    this.texture.needsUpdate = true;
  }

  setAnimation(anim) {
    if (this.animState === anim) return;
    this.animState = anim;
    this.animTime = 0;

    // Reset tool visibility
    this.axeGroup.visible = (anim === 'chop');
    this.rodGroup.visible = (anim === 'fish');
  }

  update(delta) {
    this.animTime += delta;
    const t = this.animTime;

    if (this.isSpeaking) {
      this.updateNametagVisual();
    }

    // Animation pose solver
    switch (this.animState) {
      case 'idle':
        this.bodyGroup.position.y = 0.68;
        this.torso.position.y = 0.32 + Math.sin(t * 2) * 0.012;
        this.torso.rotation.set(0, 0, Math.sin(t * 1.5) * 0.02);
        this.headGroup.rotation.set(Math.sin(t * 1.2) * 0.03, 0, 0);

        if (this.logCarryGroup.visible) {
          // Both arms hold log
          this.leftArm.rotation.set(-0.6, 0.4, 0);
          this.rightArm.rotation.set(-0.6, -0.4, 0);
        } else {
          this.leftArm.rotation.set(Math.sin(t * 2) * 0.05, 0, 0.05);
          this.rightArm.rotation.set(-Math.sin(t * 2) * 0.05, 0, -0.05);
        }
        this.leftLeg.rotation.set(0, 0, 0);
        this.rightLeg.rotation.set(0, 0, 0);
        break;

      case 'walk':
        const walkSpeed = 8;
        this.bodyGroup.position.y = 0.68 + Math.abs(Math.sin(t * walkSpeed)) * 0.035;
        this.torso.rotation.y = Math.sin(t * walkSpeed * 0.5) * 0.08;

        this.leftLeg.rotation.x = Math.sin(t * walkSpeed) * 0.65;
        this.rightLeg.rotation.x = -Math.sin(t * walkSpeed) * 0.65;

        if (this.logCarryGroup.visible) {
          this.leftArm.rotation.set(-0.6, 0.3, 0);
          this.rightArm.rotation.set(-0.6, -0.3, 0);
        } else {
          this.leftArm.rotation.x = -Math.sin(t * walkSpeed) * 0.6;
          this.rightArm.rotation.x = Math.sin(t * walkSpeed) * 0.6;
        }
        break;

      case 'run':
        const runSpeed = 13;
        this.bodyGroup.position.y = 0.68 + Math.abs(Math.sin(t * runSpeed)) * 0.07;
        this.torso.rotation.x = 0.2; // lean forward

        this.leftLeg.rotation.x = Math.sin(t * runSpeed) * 0.95;
        this.rightLeg.rotation.x = -Math.sin(t * runSpeed) * 0.95;

        if (this.logCarryGroup.visible) {
          this.leftArm.rotation.set(-0.7, 0.3, 0);
          this.rightArm.rotation.set(-0.7, -0.3, 0);
        } else {
          this.leftArm.rotation.x = -Math.sin(t * runSpeed) * 0.9;
          this.rightArm.rotation.x = Math.sin(t * runSpeed) * 0.9;
        }
        break;

      case 'swim':
        // Horizontal swimming pose
        this.bodyGroup.position.y = 0.3 + Math.sin(t * 3) * 0.05;
        this.torso.rotation.x = 1.35; // tilt forward like swimming
        this.headGroup.rotation.x = -0.7; // look up

        const swimCycle = t * 4;
        this.leftArm.rotation.set(Math.sin(swimCycle) * 0.8 - 0.5, 0.6, Math.cos(swimCycle) * 0.4);
        this.rightArm.rotation.set(Math.sin(swimCycle + Math.PI) * 0.8 - 0.5, -0.6, -Math.cos(swimCycle) * 0.4);

        this.leftLeg.rotation.x = Math.sin(swimCycle * 1.5) * 0.3;
        this.rightLeg.rotation.x = -Math.sin(swimCycle * 1.5) * 0.3;
        break;

      case 'chop':
        // Axe chopping loop
        this.bodyGroup.position.y = 0.68;
        const chopCycle = (t * 4) % (Math.PI * 2);
        const chopPower = Math.sin(chopCycle);
        if (chopPower > 0) {
          // Raising axe high
          this.rightArm.rotation.set(-Math.PI * 0.7 - chopPower * 0.4, 0, 0);
          this.leftArm.rotation.set(-Math.PI * 0.6 - chopPower * 0.4, 0.2, 0);
          this.torso.rotation.x = -0.15;
        } else {
          // Smashing axe down
          this.rightArm.rotation.set(0.4, 0, 0);
          this.leftArm.rotation.set(0.3, 0.2, 0);
          this.torso.rotation.x = 0.3;
        }
        this.leftLeg.rotation.x = 0.2;
        this.rightLeg.rotation.x = -0.2;
        break;

      case 'fish':
        // Fishing rod hold & slight reel
        this.bodyGroup.position.y = 0.68;
        this.torso.rotation.set(0, 0, 0);
        this.rightArm.rotation.set(-0.8 + Math.sin(t * 2) * 0.08, -0.2, 0);
        this.leftArm.rotation.set(-0.4 + Math.cos(t * 4) * 0.1, 0.3, 0);
        this.leftLeg.rotation.set(0, 0, 0);
        this.rightLeg.rotation.set(0, 0, 0);
        break;

      case 'sit':
        // Seated on log
        this.bodyGroup.position.y = 0.42;
        this.torso.rotation.set(0, 0, 0);
        this.leftLeg.rotation.set(-1.45, 0, 0);
        this.rightLeg.rotation.set(-1.45, 0, 0);
        this.leftArm.rotation.set(-0.35, 0.1, 0);
        this.rightArm.rotation.set(-0.35, -0.1, 0);
        break;
    }
  }

  dispose() {
    if (this.texture) this.texture.dispose();
  }
}

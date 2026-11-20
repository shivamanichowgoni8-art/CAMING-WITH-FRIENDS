import * as THREE from 'three';

export class LakeFishSchool {
  constructor(scene) {
    this.scene = scene;
    this.lakeCenter = new THREE.Vector2(28, 22);
    this.lakeRadius = 18.5;
    this.fishList = [];
    this.count = 14;

    this.initFish();
  }

  initFish() {
    // 4 vibrant alpine freshwater fish palettes
    const speciesData = [
      { name: 'Rainbow Trout', body: 0x38bdf8, fin: 0xf472b6, belly: 0xf8fafc },
      { name: 'Golden Alpine Carp', body: 0xf59e0b, fin: 0xd97706, belly: 0xfef08a },
      { name: 'Mountain Salmon', body: 0xef4444, fin: 0xb91c1c, belly: 0xfca5a5 },
      { name: 'Brook Charr', body: 0x10b981, fin: 0xf97316, belly: 0xa7f3d0 }
    ];

    for (let i = 0; i < this.count; i++) {
      const species = speciesData[i % speciesData.length];
      const fishGroup = new THREE.Group();

      // Fish Scale
      const scale = 0.75 + Math.random() * 0.45;
      fishGroup.scale.set(scale, scale, scale);

      // Materials
      const matBody = new THREE.MeshLambertMaterial({ color: species.body, flatShading: true });
      const matFin = new THREE.MeshLambertMaterial({ color: species.fin, flatShading: true });
      const matBelly = new THREE.MeshLambertMaterial({ color: species.belly, flatShading: true });
      const matEye = new THREE.MeshBasicMaterial({ color: 0x111111 });

      // 1. Tapered Main Body
      const bodyGeo = new THREE.BoxGeometry(0.18, 0.28, 0.65);
      const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
      fishGroup.add(bodyMesh);

      // White belly strip
      const bellyGeo = new THREE.BoxGeometry(0.16, 0.08, 0.55);
      const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
      bellyMesh.position.y = -0.11;
      fishGroup.add(bellyMesh);

      // Head nose wedge
      const noseGeo = new THREE.ConeGeometry(0.12, 0.28, 4);
      noseGeo.rotateX(Math.PI / 2);
      const nose = new THREE.Mesh(noseGeo, matBody);
      nose.position.z = 0.44;
      fishGroup.add(nose);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const leftEye = new THREE.Mesh(eyeGeo, matEye);
      leftEye.position.set(0.1, 0.06, 0.38);
      const rightEye = new THREE.Mesh(eyeGeo, matEye);
      rightEye.position.set(-0.1, 0.06, 0.38);
      fishGroup.add(leftEye, rightEye);

      // Dorsal Fin
      const dorsalGeo = new THREE.BoxGeometry(0.04, 0.16, 0.25);
      dorsalGeo.translate(0, 0.08, -0.05);
      const dorsal = new THREE.Mesh(dorsalGeo, matFin);
      dorsal.position.y = 0.14;
      fishGroup.add(dorsal);

      // Pectoral Fins (side fins)
      const pectGeo = new THREE.BoxGeometry(0.18, 0.03, 0.14);
      const leftPect = new THREE.Mesh(pectGeo, matFin);
      leftPect.position.set(0.14, -0.05, 0.15);
      leftPect.rotation.z = -0.3;
      const rightPect = new THREE.Mesh(pectGeo, matFin);
      rightPect.position.set(-0.14, -0.05, 0.15);
      rightPect.rotation.z = 0.3;
      fishGroup.add(leftPect, rightPect);

      // 2. Animated Caudal Tail Fin (Hinged at back)
      const tailHinge = new THREE.Group();
      tailHinge.position.set(0, 0, -0.32);

      const tailFinGeo = new THREE.ConeGeometry(0.18, 0.35, 3);
      tailFinGeo.rotateX(-Math.PI / 2);
      tailFinGeo.scale(0.2, 1.0, 1.0);
      tailFinGeo.translate(0, 0, -0.16);
      const tailFin = new THREE.Mesh(tailFinGeo, matFin);
      tailHinge.add(tailFin);
      fishGroup.add(tailHinge);

      // Initial Spawn in lake
      const angle = (i / this.count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 4.0 + Math.random() * (this.lakeRadius - 6.0);
      const px = this.lakeCenter.x + Math.cos(angle) * dist;
      const pz = this.lakeCenter.y + Math.sin(angle) * dist;
      const depth = -0.45 - Math.random() * 0.65; // under water surface (-0.1)

      fishGroup.position.set(px, depth, pz);
      this.scene.add(fishGroup);

      this.fishList.push({
        id: i,
        group: fishGroup,
        tailHinge,
        position: new THREE.Vector3(px, depth, pz),
        baseDepth: depth,
        heading: angle + Math.PI / 2,
        speed: 1.2 + Math.random() * 0.9,
        turnRate: 0,
        turnTimer: Math.random() * 3.0,
        wigglePhase: Math.random() * Math.PI * 2,
        isStartled: false,
        startleTimer: 0
      });
    }
  }

  update(delta, playerPos, isFishing, bobberPos) {
    const time = Date.now() * 0.001;

    this.fishList.forEach(fish => {
      // 1. Startle Check from Swimming Player
      const distToPlayer = fish.position.distanceTo(playerPos);
      if (distToPlayer < 3.2 && playerPos.y < 0.2) {
        fish.isStartled = true;
        fish.startleTimer = 1.8;
        // Turn directly away from player
        const fleeDir = new THREE.Vector2(fish.position.x - playerPos.x, fish.position.z - playerPos.z).normalize();
        fish.heading = Math.atan2(fleeDir.x, fleeDir.y);
      }

      if (fish.isStartled) {
        fish.startleTimer -= delta;
        if (fish.startleTimer <= 0) {
          fish.isStartled = false;
        }
      }

      // 2. React to Fishing Line Bobber at Dock
      let targetHeading = fish.heading;
      let targetSpeed = fish.isStartled ? 3.4 : (1.2 + (fish.id % 4) * 0.25);

      if (isFishing && bobberPos && !fish.isStartled && (fish.id % 3 === 0)) {
        const distToBobber = fish.position.distanceTo(bobberPos);
        if (distToBobber < 10.0 && distToBobber > 1.4) {
          // Slowly cruise towards the bobber
          const bobberDir = new THREE.Vector2(bobberPos.x - fish.position.x, bobberPos.z - fish.position.z).normalize();
          targetHeading = Math.atan2(bobberDir.x, bobberDir.y);
          targetSpeed = 1.1; // curious cautious swim
        }
      }

      // 3. Lake Boundary Clamping (keep fish inside the deep water of the lake)
      const distToCenter = Math.sqrt((fish.position.x - this.lakeCenter.x) ** 2 + (fish.position.z - this.lakeCenter.y) ** 2);
      if (distToCenter > this.lakeRadius - 2.5) {
        const centerDir = new THREE.Vector2(this.lakeCenter.x - fish.position.x, this.lakeCenter.y - fish.position.z).normalize();
        targetHeading = Math.atan2(centerDir.x, centerDir.y);
      } else {
        // Natural gentle wandering
        fish.turnTimer -= delta;
        if (fish.turnTimer <= 0) {
          fish.turnTimer = 2.0 + Math.random() * 3.5;
          fish.turnRate = (Math.random() - 0.5) * 1.2;
        }
        targetHeading += fish.turnRate * delta;
      }

      // Smooth heading interpolation
      let diff = targetHeading - fish.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      fish.heading += diff * Math.min(1.0, delta * 3.5);

      // Forward velocity
      const vx = Math.sin(fish.heading) * targetSpeed;
      const vz = Math.cos(fish.heading) * targetSpeed;

      fish.position.x += vx * delta;
      fish.position.z += vz * delta;

      // Vertical gentle bobbing
      fish.position.y = fish.baseDepth + Math.sin(time * 2.0 + fish.wigglePhase) * 0.05;

      // Update Mesh Group Transform
      fish.group.position.copy(fish.position);
      fish.group.rotation.y = fish.heading;
      // Slight pitch up/down with swim wave
      fish.group.rotation.x = Math.sin(time * 3.0 + fish.wigglePhase) * 0.06;

      // 4. Animate Caudal Tail Fin Wiggle
      const wagFreq = fish.isStartled ? 18 : 8;
      const wagAmp = fish.isStartled ? 0.65 : 0.38;
      fish.tailHinge.rotation.y = Math.sin(time * wagFreq + fish.wigglePhase) * wagAmp;
    });
  }
}

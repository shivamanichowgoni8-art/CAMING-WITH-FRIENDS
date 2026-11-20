import * as THREE from 'three';
import { soundFX } from '../utils/soundFX.js';

export class CampsiteWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // objects with radius / bounding box for collision
    this.interactables = []; // trees, logs, campfire, fishing dock, sit logs
    this.trees = [];
    this.droppedLogs = [];
    this.campfireLevel = 1.0; // 0.5 to 2.5 (fed with firewood)
    this.campfireTargetLevel = 1.0;

    this.waterMesh = null;
    this.waterTime = 0;
    this.waterLevel = -0.1; // y elevation of lake surface

    // Campfire position
    const campY = this.getTerrainHeight(0, 0);
    this.campfirePos = new THREE.Vector3(0, campY, 0);

    // Downward terrain surface raycaster for exact ground snapping
    this.downRay = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.downDir = new THREE.Vector3(0, -1, 0);

    this.buildTerrain();
    this.buildLake();
    this.buildCampfireArea();
    this.buildMountainPeakAndTrail();
    this.buildForest();
    this.buildScenicDecorations();
  }

  // Exact terrain surface height at (x, z) using terrain mesh raycasting with mathematical fallback
  getGroundHeight(x, z) {
    if (this.terrainMesh) {
      this.rayOrigin.set(x, 40, z);
      this.downRay.set(this.rayOrigin, this.downDir);
      const hits = this.downRay.intersectObject(this.terrainMesh, false);
      if (hits.length > 0) {
        return hits[0].point.y;
      }
    }
    return this.getTerrainHeight(x, z);
  }

  // Procedural heightmap function for the terrain
  getTerrainHeight(x, z) {
    // Distance from center
    const distCenter = Math.sqrt(x * x + z * z);

    // Lake depression (located towards +X, +Z quadrant, e.g. center at (28, 22))
    const lakeDx = x - 28;
    const lakeDz = z - 22;
    const distLake = Math.sqrt(lakeDx * lakeDx + lakeDz * lakeDz);
    if (distLake < 24) {
      // Depression below water level (-0.1) down to -2.5
      const lakeProfile = (distLake / 24);
      const lakeDepth = Math.sin(lakeProfile * Math.PI * 0.5) * 3 - 2.8;
      return lakeDepth;
    }

    // Mountain Ridge Peak located towards -X, -Z quadrant, e.g. center at (-45, -35)
    const mtnDx = x - (-45);
    const mtnDz = z - (-35);
    const distMtn = Math.sqrt(mtnDx * mtnDx + mtnDz * mtnDz);
    if (distMtn < 40) {
      // Ascends smoothly up to 14 units high peak
      const mtnFactor = 1 - (distMtn / 40);
      const mtnHeight = Math.pow(mtnFactor, 1.4) * 15.0;
      // Add subtle craggy variations
      const crag = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.8;
      return Math.max(0.2, mtnHeight + crag);
    }

    // Background mountain perimeter walls to frame the campsite
    const distBoundary = Math.sqrt(x * x + z * z);
    if (distBoundary > 55) {
      const wallFactor = (distBoundary - 55) / 35;
      return Math.min(22, Math.pow(wallFactor, 1.8) * 18 + Math.sin(x * 0.2) * 2);
    }

    // Subtle natural ground undulation in campsite
    const groundNoise = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.4 +
                        Math.sin(x * 0.05 + z * 0.08) * 0.3;

    // Hiking Trail gentle ridge from campsite (0,0) to peak (-45, -35)
    // Trail path curve
    const t = THREE.MathUtils.clamp((x) / -45, 0, 1);
    const trailIdealZ = t * -35 + Math.sin(t * Math.PI * 3) * 6; // winding switchback
    const distToTrail = Math.abs(z - trailIdealZ);
    if (x < 0 && x > -45 && distToTrail < 4.5) {
      const trailElev = t * 13.5;
      return THREE.MathUtils.lerp(groundNoise + 0.2, trailElev, 1 - (distToTrail / 4.5) * 0.5);
    }

    return Math.max(0.1, groundNoise + 0.2);
  }

  buildTerrain() {
    const size = 160;
    const segments = 120;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = [];

    // Color palette for low-poly terrain
    const colorGrassCamp = new THREE.Color(0x4a7c59); // lush green
    const colorDirtTrail = new THREE.Color(0x8d6e63); // warm dirt path
    const colorSandBeach = new THREE.Color(0xd7c49e); // lake sand
    const colorRockMtn   = new THREE.Color(0x607274); // slate mountain rock
    const colorSnowPeak  = new THREE.Color(0xedf2f7); // snow top

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      // Color mapping based on height & location
      const tempColor = new THREE.Color();
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distLake = Math.sqrt((x - 28) ** 2 + (z - 22) ** 2);

      if (y < 0.2) {
        // Sand / Lake shoreline
        tempColor.copy(colorSandBeach);
      } else if (y > 11.0) {
        // Snow capped summit
        tempColor.copy(colorSnowPeak);
      } else if (y > 4.5) {
        // Mountain rock
        tempColor.lerpColors(colorRockMtn, colorSnowPeak, (y - 4.5) / 6.5);
      } else {
        // Trail check
        const t = THREE.MathUtils.clamp(x / -45, 0, 1);
        const trailIdealZ = t * -35 + Math.sin(t * Math.PI * 3) * 6;
        const distTrail = Math.abs(z - trailIdealZ);

        if (x < -2 && x > -44 && distTrail < 3.2) {
          // Trail dirt color
          tempColor.copy(colorDirtTrail);
        } else if (distFromCenter < 12) {
          // Campsite clearing dirt/grass blend
          tempColor.lerpColors(colorDirtTrail, colorGrassCamp, (distFromCenter - 4) / 8);
        } else {
          // Grass with gentle shade variations
          const shade = (Math.sin(x * 0.5) * Math.cos(z * 0.5)) * 0.08;
          tempColor.copy(colorGrassCamp).offsetHSL(0, 0, shade);
        }
      }

      colors.push(tempColor.r, tempColor.g, tempColor.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.85
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  buildLake() {
    // Stylized low-poly animated lake water
    const waterGeo = new THREE.CylinderGeometry(24, 24, 1.2, 32, 4);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x228be6,
      transparent: true,
      opacity: 0.78,
      flatShading: true
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(28, this.waterLevel - 0.4, 22);
    this.scene.add(this.waterMesh);

    // Fishing Pier / Wooden Dock extending into the lake
    const dockGroup = new THREE.Group();
    dockGroup.position.set(16, 0.45, 13);
    dockGroup.rotation.y = -Math.PI / 4.2;

    const plankGeo = new THREE.BoxGeometry(2.4, 0.15, 8.5);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78533b, flatShading: true });
    const dockPlanks = new THREE.Mesh(plankGeo, woodMat);
    dockPlanks.castShadow = true;
    dockGroup.add(dockPlanks);

    // Dock support stilts / posts
    const stiltGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 6);
    const stiltMat = new THREE.MeshLambertMaterial({ color: 0x4a3525, flatShading: true });

    [-1.0, 1.0].forEach(px => {
      [-3.5, 0, 3.5].forEach(pz => {
        const stilt = new THREE.Mesh(stiltGeo, stiltMat);
        stilt.position.set(px, -1.2, pz);
        dockGroup.add(stilt);
      });
    });

    // Fishing bench / crate at the end of the dock
    const crateGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.set(0.6, 0.35, 3.2);
    dockGroup.add(crate);

    // Fishing rod leaning on the crate
    const rodPropGeo = new THREE.CylinderGeometry(0.02, 0.04, 2.2, 5);
    const rodPropMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const rodProp = new THREE.Mesh(rodPropGeo, rodPropMat);
    rodProp.position.set(0.8, 0.8, 3.3);
    rodProp.rotation.x = 0.5;
    dockGroup.add(rodProp);

    // Hanging lantern on dock post
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 5), woodMat);
    lanternPost.position.set(-1.0, 1.0, 3.6);
    dockGroup.add(lanternPost);

    const dockLantern = this.createLantern();
    dockLantern.position.set(-1.0, 1.8, 3.3);
    dockGroup.add(dockLantern);

    this.scene.add(dockGroup);

    // Register Fishing Dock interactable
    // World position of end of dock is around (21.5, 0.5, 18.5)
    const dockWorldPos = new THREE.Vector3(21.5, 0.5, 18.5);
    this.interactables.push({
      type: 'fish_spot',
      name: 'Fishing Pier',
      position: dockWorldPos,
      radius: 3.5,
      actionText: 'Cast Fishing Line'
    });

    // Reeds & Water Lilies
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const r = 21 + Math.random() * 2.5;
      const rx = 28 + Math.cos(angle) * r;
      const rz = 22 + Math.sin(angle) * r;
      const ry = this.getTerrainHeight(rx, rz);
      if (ry < 0.2) {
        this.createReeds(rx, 0, rz);
      }
    }
  }

  createReeds(x, y, z) {
    const reedGroup = new THREE.Group();
    reedGroup.position.set(x, y, z);
    const reedMat = new THREE.MeshLambertMaterial({ color: 0x3d7041, flatShading: true });
    for (let j = 0; j < 5; j++) {
      const reedGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.2 + Math.random() * 0.8, 4);
      const reed = new THREE.Mesh(reedGeo, reedMat);
      reed.position.set((Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4);
      reed.rotation.set((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2);
      reedGroup.add(reed);
    }
    this.scene.add(reedGroup);
  }

  buildCampfireArea() {
    this.campfireGroup = new THREE.Group();
    this.campfireGroup.position.copy(this.campfirePos);

    // 1. Fire Pit Stone Ring
    const stoneCount = 14;
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x555555, flatShading: true });
    for (let i = 0; i < stoneCount; i++) {
      const a = (i / stoneCount) * Math.PI * 2;
      const r = 1.2 + (Math.random() - 0.5) * 0.15;
      const stoneGeo = new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.08, 0);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      this.campfireGroup.add(stone);
    }

    // 2. Charred Ash Base
    const ashGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.1, 10);
    const ashMat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f, flatShading: true });
    const ash = new THREE.Mesh(ashGeo, ashMat);
    ash.position.y = 0.05;
    this.campfireGroup.add(ash);

    // 3. Firewood Logs inside pit
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a2e1b, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const logGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6);
      logGeo.rotateZ(Math.PI / 2);
      const log = new THREE.Mesh(logGeo, woodMat);
      log.rotation.y = (i / 6) * Math.PI;
      log.rotation.x = (i % 2 === 0 ? 0.25 : -0.25);
      log.position.y = 0.25 + (i * 0.06);
      this.campfireGroup.add(log);
    }

    // 4. Stylized Low-Poly Dynamic Flame
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.y = 0.35;

    // Inner bright yellow flame
    const innerFlameGeo = new THREE.ConeGeometry(0.35, 1.2, 5);
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xfff3a1 });
    this.innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    this.innerFlame.position.y = 0.6;
    this.flameGroup.add(this.innerFlame);

    // Middle warm orange flame
    const midFlameGeo = new THREE.ConeGeometry(0.55, 1.5, 6);
    const midFlameMat = new THREE.MeshBasicMaterial({ color: 0xff7b00, transparent: true, opacity: 0.85 });
    this.midFlame = new THREE.Mesh(midFlameGeo, midFlameMat);
    this.midFlame.position.y = 0.7;
    this.flameGroup.add(this.midFlame);

    // Outer crimson ember flame
    const outerFlameGeo = new THREE.ConeGeometry(0.75, 1.8, 6);
    const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0xdf2935, transparent: true, opacity: 0.5 });
    this.outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
    this.outerFlame.position.y = 0.85;
    this.flameGroup.add(this.outerFlame);

    this.campfireGroup.add(this.flameGroup);

    // 5. Dynamic Warm Point Light
    this.fireLight = new THREE.PointLight(0xff8c00, 2.8, 18, 1.2);
    this.fireLight.position.set(0, 1.2, 0);
    this.fireLight.castShadow = true;
    this.campfireGroup.add(this.fireLight);

    // 6. Floating Campfire Embers Particle System
    const emberCount = 35;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    this.emberData = [];

    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3]     = (Math.random() - 0.5) * 0.8;
      emberPos[i * 3 + 1] = Math.random() * 2.5;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      this.emberData.push({
        x: emberPos[i * 3],
        y: emberPos[i * 3 + 1],
        z: emberPos[i * 3 + 2],
        speed: 0.8 + Math.random() * 1.2,
        sway: Math.random() * Math.PI * 2
      });
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.16,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.emberParticles = new THREE.Points(emberGeo, emberMat);
    this.campfireGroup.add(this.emberParticles);

    this.scene.add(this.campfireGroup);

    // Register Campfire as interactable (Feed Firewood)
    this.interactables.push({
      type: 'campfire',
      name: 'Central Campfire',
      position: this.campfirePos.clone(),
      radius: 2.8,
      actionText: 'Add Firewood to Campfire'
    });

    // 7. Wooden Sitting Logs arranged in a ring around fire
    this.sittingLogs = [];
    const sittingAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    const logDistance = 3.2;

    sittingAngles.forEach((angle, idx) => {
      const logGroup = new THREE.Group();
      const lx = Math.cos(angle) * logDistance;
      const lz = Math.sin(angle) * logDistance;
      const ly = this.getGroundHeight(lx, lz);

      logGroup.position.set(lx, ly + 0.22, lz);
      logGroup.rotation.y = angle + Math.PI / 2;

      // Rustic chopped log bench
      const benchLogGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.4, 6);
      benchLogGeo.rotateZ(Math.PI / 2);
      const benchLog = new THREE.Mesh(benchLogGeo, woodMat);
      benchLog.castShadow = true;
      logGroup.add(benchLog);

      // Log legs extended into ground
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.65, 5);
      const leg1 = new THREE.Mesh(legGeo, woodMat);
      leg1.position.set(-0.7, -0.22, 0);
      const leg2 = new THREE.Mesh(legGeo, woodMat);
      leg2.position.set(0.7, -0.22, 0);
      logGroup.add(leg1, leg2);

      this.scene.add(logGroup);

      // Register Sitting Spot interactable
      const sitWorldPos = new THREE.Vector3(lx, ly + 0.32, lz);
      this.interactables.push({
        type: 'sit_log',
        id: `sit_${idx}`,
        name: `Campfire Log #${idx + 1}`,
        position: sitWorldPos,
        lookTarget: this.campfirePos.clone(),
        radius: 1.8,
        actionText: 'Sit by Campfire'
      });
    });

    // 8. Cozy Camping Tents in the clearing
    this.createTent(-6.5, 0, -4.5, 0.4, 0xf97316); // Orange tent
    this.createTent(6.2, 0, -5.2, -0.6, 0x0284c7); // Blue tent
    this.createTent(-5.8, 0, 5.5, 2.2, 0x10b981);  // Green tent
  }

  createTent(x, y, z, rotationY, colorHex) {
    const tentGroup = new THREE.Group();
    const groundY = this.getGroundHeight(x, z);
    tentGroup.position.set(x, groundY, z);
    tentGroup.rotation.y = rotationY;

    // A-frame canvas tent geometry with skirt extending slightly below ground level
    const tentGeo = new THREE.ConeGeometry(2.2, 2.5, 4);
    tentGeo.rotateY(Math.PI / 4);
    tentGeo.translate(0, 1.05, 0); // extends -0.2m into ground so no gap on slopes
    const tentMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.castShadow = true;
    tentGroup.add(tent);

    // Tent door entrance flap (dark interior)
    const doorGeo = new THREE.PlaneGeometry(1.2, 1.5);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.75, 1.1);
    tentGroup.add(door);

    // Lantern beside tent entrance
    const lantern = this.createLantern();
    lantern.position.set(1.4, 0.3, 1.0);
    tentGroup.add(lantern);

    // Sleeping mat inside
    const matGeo = new THREE.BoxGeometry(1.2, 0.08, 2.0);
    const matMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const sleepMat = new THREE.Mesh(matGeo, matMat);
    sleepMat.position.set(0, 0.04, 0);
    tentGroup.add(sleepMat);

    this.scene.add(tentGroup);

    // Collider for tent so players don't walk through it
    this.colliders.push({
      x,
      z,
      radius: 1.8
    });
  }

  createLantern() {
    const lGroup = new THREE.Group();
    const bronzeMat = new THREE.MeshLambertMaterial({ color: 0x3b2d1d, flatShading: true });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffea79 });

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 6), bronzeMat);
    lGroup.add(base);

    // Glowing glass bulb
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 6), glassMat);
    bulb.position.y = 0.14;
    lGroup.add(bulb);

    // Top cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 6), bronzeMat);
    cap.position.y = 0.3;
    lGroup.add(cap);

    // Soft warm point light
    const pl = new THREE.PointLight(0xffd166, 0.6, 6);
    pl.position.y = 0.16;
    lGroup.add(pl);

    return lGroup;
  }

  buildMountainPeakAndTrail() {
    // Summit observation deck at (-45, 15, -35)
    const peakX = -45;
    const peakZ = -35;
    const peakY = this.getTerrainHeight(peakX, peakZ);

    const summitGroup = new THREE.Group();
    summitGroup.position.set(peakX, peakY, peakZ);

    // Wooden scenic observation deck platform
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78533b, flatShading: true });
    const deckGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.4, 8);
    const deck = new THREE.Mesh(deckGeo, woodMat);
    deck.castShadow = true;
    summitGroup.add(deck);

    // Railing posts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 5), woodMat);
      post.position.set(Math.cos(a) * 3.8, 0.7, Math.sin(a) * 3.8);
      summitGroup.add(post);
    }

    // Mountain Lookout Pennant Flag / Banner
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 5.0, 5);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 2.5, 0);
    summitGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(1.4, 0.8);
    const flagMat = new THREE.MeshLambertMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.75, 4.4, 0);
    flag.rotation.y = 0.3;
    summitGroup.add(flag);

    // Scenic Mountain Bench overlooking the campsite valley
    const benchGeo = new THREE.BoxGeometry(2.0, 0.15, 0.6);
    const bench = new THREE.Mesh(benchGeo, woodMat);
    bench.position.set(0, 0.5, 2.2);
    bench.rotation.y = Math.PI;
    summitGroup.add(bench);

    // Trail signpost at peak
    this.createSignpost(summitGroup, 2.5, 0.2, 1.0, 'Eagle Peak Elev: 2,400m');

    this.scene.add(summitGroup);

    // Trail Markers / Wooden Cairns along the switchback path
    const trailSteps = 6;
    for (let i = 1; i < trailSteps; i++) {
      const t = i / trailSteps;
      const tx = THREE.MathUtils.lerp(0, peakX, t);
      const tz = t * -35 + Math.sin(t * Math.PI * 3) * 6;
      const ty = this.getTerrainHeight(tx, tz);

      // Wooden trail sign / cairn
      const cairnGroup = new THREE.Group();
      cairnGroup.position.set(tx + 1.2, ty, tz + 0.8);

      const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5), woodMat);
      signPost.position.y = 0.7;
      cairnGroup.add(signPost);

      const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.06), woodMat);
      board.position.set(0, 1.1, 0);
      board.rotation.z = 0.1;
      cairnGroup.add(board);

      this.scene.add(cairnGroup);
    }
  }

  createSignpost(parent, x, y, z, text) {
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b, flatShading: true });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 5), woodMat);
    post.position.set(x, y + 0.8, z);
    parent.add(post);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.08), woodMat);
    sign.position.set(x, y + 1.3, z);
    sign.rotation.y = -Math.PI / 4;
    parent.add(sign);
  }

  buildForest() {
    // Choppable Pine Trees in forest clusters
    // We place ~35 trees across the map avoiding the lake, campfire center, and hiking trail
    const treePositions = [
      // East woods
      { x: 14, z: -12 }, { x: 19, z: -16 }, { x: 23, z: -8 }, { x: 15, z: -24 },
      { x: 28, z: -20 }, { x: 34, z: -14 }, { x: 25, z: -32 }, { x: 38, z: -28 },
      // North / Ridge woods
      { x: -14, z: -20 }, { x: -22, z: -16 }, { x: -10, z: -30 }, { x: -18, z: -34 },
      { x: -28, z: -25 }, { x: -35, z: -18 }, { x: -6, z: -22 }, { x: 4, z: -32 },
      // South-West woods
      { x: -18, z: 12 }, { x: -24, z: 18 }, { x: -14, z: 22 }, { x: -28, z: 26 },
      { x: -32, z: 14 }, { x: -10, z: 28 }, { x: -20, z: 32 }, { x: -36, z: 28 },
      // South-East near riverbank
      { x: 12, z: 30 }, { x: 18, z: 36 }, { x: 8, z: 24 }, { x: 5, z: 36 },
      { x: -2, z: 24 }, { x: -6, z: 34 }
    ];

    treePositions.forEach((pos, idx) => {
      const y = this.getGroundHeight(pos.x, pos.z);
      if (y > 0.3 && y < 11.0) {
        this.createPineTree(idx, pos.x, y, pos.z);
      }
    });
  }

  createPineTree(id, x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    // Randomize slight tree scale & tint
    const scale = 0.85 + Math.random() * 0.45;
    treeGroup.scale.set(scale, scale, scale);

    // Trunk extending down into ground to prevent floating on slopes
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033, flatShading: true });
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.48, 2.6, 6);
    trunkGeo.translate(0, 0.9, 0); // extends -0.4m into ground
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage cones (3 tiers of needles)
    const foliageMat = new THREE.MeshLambertMaterial({
      color: (id % 2 === 0 ? 0x2d6a4f : 0x1b4332),
      flatShading: true
    });

    const tierHeights = [2.2, 3.4, 4.5];
    const tierRadii = [1.8, 1.4, 0.95];

    tierHeights.forEach((th, i) => {
      const coneGeo = new THREE.ConeGeometry(tierRadii[i], 1.8, 6);
      coneGeo.translate(0, 0.9, 0);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = th;
      cone.castShadow = true;
      cone.rotation.y = i * 0.5;
      treeGroup.add(cone);
    });

    this.scene.add(treeGroup);

    // Tree metadata & interactable data
    const treeObj = {
      id: `tree_${id}`,
      group: treeGroup,
      basePos: new THREE.Vector3(x, y, z),
      health: 3, // 3 chops to fell
      isChopped: false,
      wobbleTimer: 0,
      respawnTimer: 0
    };
    this.trees.push(treeObj);

    // Register interactable
    this.interactables.push({
      type: 'tree',
      id: treeObj.id,
      treeRef: treeObj,
      name: 'Pine Tree',
      position: treeObj.basePos,
      radius: 2.4,
      actionText: 'Chop Tree'
    });

    // Add collider
    this.colliders.push({
      x,
      z,
      radius: 0.7 * scale
    });
  }

  chopTree(treeId) {
    const tree = this.trees.find(t => t.id === treeId);
    if (!tree || tree.isChopped) return null;

    tree.health--;
    soundFX.playChopWood();

    // Trigger visual wobble
    tree.wobbleTimer = 0.4;

    if (tree.health <= 0) {
      // Tree felled!
      tree.isChopped = true;
      tree.respawnTimer = 45; // respawns in 45 seconds
      tree.group.visible = false;
      soundFX.playPop();

      // Spawn 2-3 firewood logs on the ground
      const dropped = [];
      const numLogs = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numLogs; i++) {
        const offsetAngle = (i / numLogs) * Math.PI * 2;
        const lx = tree.basePos.x + Math.cos(offsetAngle) * 1.4;
        const lz = tree.basePos.z + Math.sin(offsetAngle) * 1.4;
        const ly = this.getTerrainHeight(lx, lz);

        const logItem = this.spawnFirewoodLog(lx, ly, lz);
        dropped.push(logItem);
      }
      return { felled: true, logs: dropped };
    }

    return { felled: false, healthRemaining: tree.health };
  }

  spawnFirewoodLog(x, y, z) {
    const groundY = this.getGroundHeight(x, z);
    const logGroup = new THREE.Group();
    logGroup.position.set(x, groundY + 0.08, z);

    const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 6);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x6f4e37, flatShading: true });
    const logMesh = new THREE.Mesh(logGeo, logMat);
    logMesh.castShadow = true;
    logGroup.add(logMesh);

    // Subtle yellow pulsing halo ring around the log
    const haloGeo = new THREE.RingGeometry(0.2, 0.35, 12);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.05;
    logGroup.add(halo);

    this.scene.add(logGroup);

    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const logItem = {
      id: logId,
      group: logGroup,
      halo,
      position: new THREE.Vector3(x, groundY + 0.08, z),
      time: 0
    };
    this.droppedLogs.push(logItem);

    // Register interactable
    this.interactables.push({
      type: 'dropped_log',
      id: logId,
      logRef: logItem,
      name: 'Firewood Log',
      position: logItem.position,
      radius: 2.0,
      actionText: 'Pick up Firewood'
    });

    return logItem;
  }

  removeDroppedLog(logId) {
    const idx = this.droppedLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const log = this.droppedLogs[idx];
      this.scene.remove(log.group);
      this.droppedLogs.splice(idx, 1);
    }
    const intIdx = this.interactables.findIndex(i => i.id === logId);
    if (intIdx !== -1) {
      this.interactables.splice(intIdx, 1);
    }
  }

  boostCampfire(amount = 0.5) {
    this.campfireTargetLevel = Math.min(2.8, this.campfireTargetLevel + amount);
    soundFX.playPop();
  }

  buildScenicDecorations() {
    // Scattered low-poly granite boulders embedded flush in terrain
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x78716c, flatShading: true });
    for (let i = 0; i < 25; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const rz = (Math.random() - 0.5) * 90;
      // Don't place rocks directly in lake or center fire
      if (Math.sqrt(rx * rx + rz * rz) > 4 && Math.sqrt((rx - 28) ** 2 + (rz - 22) ** 2) > 22) {
        const ry = this.getGroundHeight(rx, rz);
        const rockScale = 0.5 + Math.random() * 1.2;
        const rockGeo = new THREE.DodecahedronGeometry(rockScale, 0);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(rx, ry + rockScale * 0.25, rz);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        this.scene.add(rock);

        if (rockScale > 0.9) {
          this.colliders.push({ x: rx, z: rz, radius: rockScale * 0.8 });
        }
      }
    }
  }

  update(delta) {
    this.waterTime += delta;

    // 1. Lake water gentle low-poly bobbing & waves
    if (this.waterMesh) {
      this.waterMesh.rotation.y = this.waterTime * 0.04;
      this.waterMesh.position.y = (this.waterLevel - 0.4) + Math.sin(this.waterTime * 1.5) * 0.04;
    }

    // 2. Campfire flame animation & flickering light
    this.campfireLevel = THREE.MathUtils.lerp(this.campfireLevel, this.campfireTargetLevel, delta * 2.0);
    // Natural slow decay of campfire level back to 1.0
    if (this.campfireTargetLevel > 1.0) {
      this.campfireTargetLevel = Math.max(1.0, this.campfireTargetLevel - delta * 0.015);
    }

    const t = Date.now() * 0.006;
    const flameFlicker = Math.sin(t * 3.5) * 0.08 + Math.cos(t * 5.2) * 0.06;
    const fireScale = this.campfireLevel * (1.0 + flameFlicker);

    this.flameGroup.scale.set(fireScale, fireScale, fireScale);
    this.innerFlame.rotation.y = t * 1.5;
    this.midFlame.rotation.y = -t * 1.2;
    this.outerFlame.rotation.y = t * 0.8;

    // Dynamic flickering point light intensity
    this.fireLight.intensity = (2.4 + Math.sin(t * 7) * 0.6 + (Math.random() - 0.5) * 0.2) * this.campfireLevel;
    this.fireLight.distance = 16 * Math.sqrt(this.campfireLevel);

    // 3. Campfire Embers animation
    if (this.emberParticles) {
      const pos = this.emberParticles.geometry.attributes.position;
      for (let i = 0; i < this.emberData.length; i++) {
        const d = this.emberData[i];
        d.y += d.speed * delta * (0.8 + this.campfireLevel * 0.4);
        d.sway += delta * 2;
        d.x += Math.sin(d.sway) * 0.01;
        d.z += Math.cos(d.sway) * 0.01;

        if (d.y > 3.2 * this.campfireLevel) {
          d.y = 0.2;
          d.x = (Math.random() - 0.5) * 0.8;
          d.z = (Math.random() - 0.5) * 0.8;
        }

        pos.setXYZ(i, d.x, d.y, d.z);
      }
      pos.needsUpdate = true;
    }

    // 4. Tree wobbles & respawn timers
    this.trees.forEach(tree => {
      if (tree.wobbleTimer > 0) {
        tree.wobbleTimer -= delta;
        const wobble = Math.sin(tree.wobbleTimer * 28) * 0.12;
        tree.group.rotation.z = wobble;
        if (tree.wobbleTimer <= 0) {
          tree.group.rotation.z = 0;
        }
      }

      if (tree.isChopped && tree.respawnTimer > 0) {
        tree.respawnTimer -= delta;
        if (tree.respawnTimer <= 0) {
          tree.isChopped = false;
          tree.health = 3;
          tree.group.visible = true;
          tree.group.scale.set(0.1, 0.1, 0.1);
        }
      } else if (!tree.isChopped && tree.group.scale.x < 1.0) {
        // Growth animation when respawning
        const s = Math.min(1.0, tree.group.scale.x + delta * 0.5);
        tree.group.scale.set(s, s, s);
      }
    });

    // 5. Dropped logs halo pulse
    this.droppedLogs.forEach(log => {
      log.time += delta;
      if (log.halo) {
        log.halo.material.opacity = 0.4 + Math.sin(log.time * 4) * 0.3;
        log.halo.rotation.z += delta * 0.5;
      }
    });
  }
}

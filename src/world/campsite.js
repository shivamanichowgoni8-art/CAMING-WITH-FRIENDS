import * as THREE from 'three';
import { soundFX } from '../utils/soundFX.js';
import { LakeFishSchool } from './lakeFish.js';
import { createPRNG } from '../utils/prng.js';

export class CampsiteWorld {
  constructor(scene, seed = 1337) {
    this.scene = scene;
    this.seed = seed;
    this.prng = createPRNG(seed);

    this.colliders = []; // objects with radius / bounding box for collision
    this.interactables = []; // trees, logs, campfire, fishing dock, sit logs, cabin door
    this.walkableObjects = []; // terrain, dock planks, cabin floor, porch, steps
    this.trees = [];
    this.droppedLogs = [];
    this.boulders = []; // Mineable stone/flint boulders
    this.berryBushes = []; // Foragable berry bushes
    this.mushrooms = []; // Foragable mushroom patches
    this.droppedItems = []; // Universal dropped item entities
    this.campfireLevel = 1.0; // 0.5 to 2.5 (fed with firewood)
    this.campfireTargetLevel = 1.0;

    this.waterMesh = null;
    this.waterTime = 0;
    this.waterLevel = -0.1; // y elevation of lake surface

    // Cabin House properties
    this.cabinDoorHinge = null;
    this.cabinDoorOpen = false;
    this.cabinDoorAngle = 0;
    this.cabinDoorTargetAngle = 0;
    this.doorCollider = null;
    this.cabinDoorInteractable = null;
    this.cabinWindowMat = null;
    this.cabinInteriorLight = null;
    this.chimneySmoke = null;
    this.smokePuffs = [];

    // Campfire position
    const campY = this.getTerrainHeight(0, 0);
    this.campfirePos = new THREE.Vector3(0, campY, 0);

    // Downward terrain & surface raycaster for exact ground/dock/floor snapping
    this.downRay = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.downDir = new THREE.Vector3(0, -1, 0);

    this.buildTerrain();
    this.buildLake();
    this.buildCampfireArea();
    this.buildMountainPeakAndTrail();
    this.buildForest();
    this.buildScenicDecorations();

    // Animated swimming fish school in alpine lake
    this.fishSchool = new LakeFishSchool(this.scene);
  }

  // Exact surface height at (x, z) using walkable meshes (terrain, solid dock, cabin floor/porch)
  getGroundHeight(x, z) {
    if (this.walkableObjects && this.walkableObjects.length > 0) {
      this.rayOrigin.set(x, 40, z);
      this.downRay.set(this.rayOrigin, this.downDir);
      const hits = this.downRay.intersectObjects(this.walkableObjects, true);
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
    this.walkableObjects.push(this.terrainMesh);
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

    // Make dock planks solidly walkable
    dockGroup.updateMatrixWorld(true);
    this.walkableObjects.push(dockPlanks);

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

    // 8. Spacious Low-Poly Wooden Log Cabin House
    this.buildLogCabin();
  }

  buildLogCabin() {
    const cabinX = -9.2;
    const cabinZ = -6.8;
    const groundY = this.getTerrainHeight(cabinX, cabinZ);
    const cabinAngle = Math.PI * 0.22; // angled towards the campfire clearing

    this.cabinGroup = new THREE.Group();
    this.cabinGroup.position.set(cabinX, groundY, cabinZ);
    this.cabinGroup.rotation.y = cabinAngle;

    // Palette & Materials
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const floorWoodMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
    const porchWoodMat = new THREE.MeshLambertMaterial({ color: 0x713f12, flatShading: true });
    const logWallMat = new THREE.MeshLambertMaterial({ color: 0x5a341e, flatShading: true });
    const logBeamMat = new THREE.MeshLambertMaterial({ color: 0x3d2314, flatShading: true });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2b1810, flatShading: true });
    const doorPlankMat = new THREE.MeshLambertMaterial({ color: 0x542b14, flatShading: true });
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const furnitureWoodMat = new THREE.MeshLambertMaterial({ color: 0x9a5b28, flatShading: true });

    // Cozy Glowing Glass Material (lights up softly at night)
    this.cabinWindowMat = new THREE.MeshLambertMaterial({
      color: 0xffe082,
      emissive: 0xff9800,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });

    // 1. Solid Stone Foundation (sunk flush into the uneven terrain)
    const foundationGeo = new THREE.BoxGeometry(8.2, 0.75, 8.4);
    const foundation = new THREE.Mesh(foundationGeo, stoneMat);
    foundation.position.set(0, -0.22, 0.4);
    foundation.receiveShadow = true;
    this.cabinGroup.add(foundation);

    // 2. Interior Wooden Floor (Solid & Walkable)
    const floorGeo = new THREE.BoxGeometry(7.6, 0.16, 5.8);
    const floorMesh = new THREE.Mesh(floorGeo, floorWoodMat);
    floorMesh.position.set(0, 0.16, -0.6);
    floorMesh.receiveShadow = true;
    this.cabinGroup.add(floorMesh);

    // 3. Front Porch (Solid & Walkable)
    const porchGeo = new THREE.BoxGeometry(7.6, 0.16, 2.4);
    const porchMesh = new THREE.Mesh(porchGeo, porchWoodMat);
    porchMesh.position.set(0, 0.16, 3.5);
    porchMesh.receiveShadow = true;
    this.cabinGroup.add(porchMesh);

    // Porch Steps (Solid & Walkable)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.6), porchWoodMat);
    step1.position.set(0, 0.08, 4.95);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.6), porchWoodMat);
    step2.position.set(0, 0.02, 5.5);
    this.cabinGroup.add(step1, step2);

    // 4. Porch Pillars & Railings
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.0, 6);
    [-3.5, 0, 3.5].forEach(px => {
      const pillar = new THREE.Mesh(pillarGeo, logBeamMat);
      pillar.position.set(px, 1.6, 4.6);
      this.cabinGroup.add(pillar);
    });

    // Top Porch Lintel Beam
    const porchBeam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.22, 0.24), logBeamMat);
    porchBeam.position.set(0, 3.1, 4.6);
    this.cabinGroup.add(porchBeam);

    // Side Railings
    [-3.7, 3.7].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 2.2), porchWoodMat);
      rail.position.set(rx, 0.68, 3.5);
      this.cabinGroup.add(rail);
    });

    // Porch Hanging Lantern
    const porchLantern = this.createLantern();
    porchLantern.position.set(1.2, 2.7, 4.5);
    this.cabinGroup.add(porchLantern);

    // 5. Solid Log Walls (3.0 units high)
    const cornerPostGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.2, 6);
    [[-3.7, -3.4], [3.7, -3.4], [-3.7, 2.3], [3.7, 2.3]].forEach(([cx, cz]) => {
      const cPost = new THREE.Mesh(cornerPostGeo, logBeamMat);
      cPost.position.set(cx, 1.66, cz);
      this.cabinGroup.add(cPost);
    });

    // Back Solid Log Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.0, 0.36), logWallMat);
    backWall.position.set(0, 1.66, -3.4);
    backWall.castShadow = true;
    this.cabinGroup.add(backWall);

    // Left Wall with glowing window
    const leftWallBottom = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.1, 5.8), logWallMat);
    leftWallBottom.position.set(-3.7, 0.71, -0.55);
    const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.8, 5.8), logWallMat);
    leftWallTop.position.set(-3.7, 2.76, -0.55);
    const leftWallPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.2, 2.1), logWallMat);
    leftWallPost1.position.set(-3.7, 1.76, -2.4);
    const leftWallPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.2, 2.1), logWallMat);
    leftWallPost2.position.set(-3.7, 1.76, 1.3);
    this.cabinGroup.add(leftWallBottom, leftWallTop, leftWallPost1, leftWallPost2);

    // Left Window Glass
    const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.6), this.cabinWindowMat);
    leftGlass.position.set(-3.7, 1.76, -0.55);
    this.cabinGroup.add(leftGlass);

    // Right Wall with glowing window
    const rightWallBottom = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.1, 5.8), logWallMat);
    rightWallBottom.position.set(3.7, 0.71, -0.55);
    const rightWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.8, 5.8), logWallMat);
    rightWallTop.position.set(3.7, 2.76, -0.55);
    const rightWallPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.2, 2.1), logWallMat);
    rightWallPost1.position.set(3.7, 1.76, -2.4);
    const rightWallPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.2, 2.1), logWallMat);
    rightWallPost2.position.set(3.7, 1.76, 1.3);
    this.cabinGroup.add(rightWallBottom, rightWallTop, rightWallPost1, rightWallPost2);

    // Right Window Glass
    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.6), this.cabinWindowMat);
    rightGlass.position.set(3.7, 1.76, -0.55);
    this.cabinGroup.add(rightGlass);

    // Front Wall with Doorway Opening in center (width 1.5, height 2.28)
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3.05, 3.0, 0.36), logWallMat);
    frontWallLeft.position.set(-2.28, 1.66, 2.3);
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(3.05, 3.0, 0.36), logWallMat);
    frontWallRight.position.set(2.28, 1.66, 2.3);
    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.72, 0.36), logWallMat);
    frontWallTop.position.set(0, 2.8, 2.3);
    this.cabinGroup.add(frontWallLeft, frontWallRight, frontWallTop);

    // Front Windows Glass
    const frontLeftGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.12), this.cabinWindowMat);
    frontLeftGlass.position.set(-2.28, 1.7, 2.35);
    const frontRightGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.12), this.cabinWindowMat);
    frontRightGlass.position.set(2.28, 1.7, 2.35);
    this.cabinGroup.add(frontLeftGlass, frontRightGlass);

    // 6. Functional Hinged Front Door
    this.cabinDoorHinge = new THREE.Group();
    this.cabinDoorHinge.position.set(-0.74, 0.16, 2.3);

    const doorPanelGeo = new THREE.BoxGeometry(1.44, 2.24, 0.12);
    const doorPanel = new THREE.Mesh(doorPanelGeo, doorPlankMat);
    doorPanel.position.set(0.72, 1.12, 0);
    doorPanel.castShadow = true;
    this.cabinDoorHinge.add(doorPanel);

    // Rustic Z-brace planks on door
    const doorBrace = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.04), logBeamMat);
    doorBrace.position.set(0.72, 0.6, 0.08);
    const doorBrace2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.04), logBeamMat);
    doorBrace2.position.set(0.72, 1.65, 0.08);
    this.cabinDoorHinge.add(doorBrace, doorBrace2);

    // Brass Door Knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), brassMat);
    knob.position.set(1.3, 1.1, 0.1);
    this.cabinDoorHinge.add(knob);

    // Iron hinges on pivot
    const hinge1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.08), stoneMat);
    hinge1.position.set(0.03, 0.45, 0.04);
    const hinge2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.08), stoneMat);
    hinge2.position.set(0.03, 1.8, 0.04);
    this.cabinDoorHinge.add(hinge1, hinge2);

    this.cabinGroup.add(this.cabinDoorHinge);

    // 7. Pitched Wooden Gable Roof
    const makeGable = (zPos) => {
      const gableGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -3.8, 3.16, 0,
         3.8, 3.16, 0,
         0.0, 4.8,  0
      ]);
      gableGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      gableGeo.computeVertexNormals();
      const gable = new THREE.Mesh(gableGeo, logWallMat);
      gable.position.set(0, 0, zPos);
      gable.material.side = THREE.DoubleSide;
      return gable;
    };
    this.cabinGroup.add(makeGable(2.3));
    this.cabinGroup.add(makeGable(-3.4));

    // Roof Slope Panels
    const roofSlopeGeo = new THREE.BoxGeometry(4.7, 0.18, 8.8);
    const leftRoof = new THREE.Mesh(roofSlopeGeo, roofMat);
    leftRoof.position.set(-2.0, 4.05, 0.55);
    leftRoof.rotation.z = 0.42;
    leftRoof.castShadow = true;

    const rightRoof = new THREE.Mesh(roofSlopeGeo, roofMat);
    rightRoof.position.set(2.0, 4.05, 0.55);
    rightRoof.rotation.z = -0.42;
    rightRoof.castShadow = true;
    this.cabinGroup.add(leftRoof, rightRoof);

    // Ridge cap log
    const ridgeLog = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.0, 6), logBeamMat);
    ridgeLog.rotateX(Math.PI / 2);
    ridgeLog.position.set(0, 4.86, 0.55);
    this.cabinGroup.add(ridgeLog);

    // 8. Stone Chimney with Smoke
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.4, 0.9), stoneMat);
    chimney.position.set(2.4, 2.7, -2.4);
    chimney.castShadow = true;
    this.cabinGroup.add(chimney);

    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.1), stoneMat);
    chimneyCap.position.set(2.4, 5.4, -2.4);
    this.cabinGroup.add(chimneyCap);

    // Floating Low-Poly Smoke Puffs
    this.smokeGroup = new THREE.Group();
    this.smokeGroup.position.set(2.4, 5.5, -2.4);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d8, transparent: true, opacity: 0.55 });
    const smokePuffGeo = new THREE.DodecahedronGeometry(0.18, 0);

    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(smokePuffGeo, smokeMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.2,
        i * 0.45,
        (Math.random() - 0.5) * 0.2
      );
      this.smokeGroup.add(puff);
      this.smokePuffs.push({
        mesh: puff,
        baseY: i * 0.45,
        speed: 0.5 + Math.random() * 0.4,
        swayOffset: i * 1.2
      });
    }
    this.cabinGroup.add(this.smokeGroup);

    // 9. Cozy Interior Rustic Furniture
    // Rustic Red Braided Rug
    const rugGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.02, 16);
    const rugMat = new THREE.MeshLambertMaterial({ color: 0x991b1b, flatShading: true });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.25, -0.6);
    this.cabinGroup.add(rug);

    // Rustic Dining Table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 1.1), furnitureWoodMat);
    tableTop.position.set(-1.4, 0.82, -0.6);
    this.cabinGroup.add(tableTop);
    [[-2.1, -1.0], [-0.7, -1.0], [-2.1, -0.2], [-0.7, -0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), furnitureWoodMat);
      leg.position.set(lx, 0.44, lz);
      this.cabinGroup.add(leg);
    });

    // 2 Benches beside table
    const benchGeo = new THREE.BoxGeometry(1.6, 0.08, 0.4);
    const bench1 = new THREE.Mesh(benchGeo, furnitureWoodMat);
    bench1.position.set(-1.4, 0.48, 0.2);
    const bench2 = new THREE.Mesh(benchGeo, furnitureWoodMat);
    bench2.position.set(-1.4, 0.48, -1.4);
    this.cabinGroup.add(bench1, bench2);

    // Stone Fireplace & Hearth on back wall
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.7), stoneMat);
    hearth.position.set(0, 0.85, -3.0);
    this.cabinGroup.add(hearth);

    // Glowing fireplace embers
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
    embers.position.set(0, 0.32, -2.8);
    this.cabinGroup.add(embers);

    const hearthLight = new THREE.PointLight(0xff4500, 1.2, 6);
    hearthLight.position.set(0, 0.6, -2.7);
    this.cabinGroup.add(hearthLight);

    // Cozy Sleeping Bunk Bed in corner
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 2.3), furnitureWoodMat);
    bedFrame.position.set(2.4, 0.33, -1.8);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.8), new THREE.MeshLambertMaterial({ color: 0x1e3a8a, flatShading: true }));
    blanket.position.set(2.4, 0.48, -1.6);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.45), new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true }));
    pillow.position.set(2.4, 0.52, -2.6);
    this.cabinGroup.add(bedFrame, blanket, pillow);

    // Hanging Ceiling Lantern (Warm Interior Light)
    this.cabinInteriorLight = new THREE.PointLight(0xffb703, 1.8, 12, 1.2);
    this.cabinInteriorLight.position.set(0, 2.6, -0.6);
    this.cabinGroup.add(this.cabinInteriorLight);

    const intLantern = this.createLantern();
    intLantern.position.set(0, 2.5, -0.6);
    this.cabinGroup.add(intLantern);

    this.scene.add(this.cabinGroup);

    // 10. Update Matrix World & Register Walkable Objects
    this.cabinGroup.updateMatrixWorld(true);
    this.walkableObjects.push(floorMesh, porchMesh, step1, step2);

    // 11. Solid Wall Colliders (Perimeter obstacle circles)
    const addWallCollider = (lx, lz, radius = 0.55) => {
      const wp = new THREE.Vector3(lx, 0, lz).applyMatrix4(this.cabinGroup.matrixWorld);
      this.colliders.push({ x: wp.x, z: wp.z, radius });
    };

    // Back Wall Colliders
    for (let lx = -3.2; lx <= 3.2; lx += 1.4) {
      addWallCollider(lx, -3.4, 0.58);
    }
    // Left Wall Colliders
    for (let lz = -3.0; lz <= 2.0; lz += 1.2) {
      addWallCollider(-3.7, lz, 0.58);
    }
    // Right Wall Colliders
    for (let lz = -3.0; lz <= 2.0; lz += 1.2) {
      addWallCollider(3.7, lz, 0.58);
    }
    // Front Left Wall Colliders
    addWallCollider(-2.0, 2.3, 0.6);
    addWallCollider(-3.1, 2.3, 0.6);

    // Front Right Wall Colliders
    addWallCollider(2.0, 2.3, 0.6);
    addWallCollider(3.1, 2.3, 0.6);

    // Chimney Outer Wall Collider
    const chimneyWp = new THREE.Vector3(2.4, 0, -2.4).applyMatrix4(this.cabinGroup.matrixWorld);
    this.colliders.push({ x: chimneyWp.x, z: chimneyWp.z, radius: 0.8 });

    // Table Collider
    const tableWp = new THREE.Vector3(-1.4, 0, -0.6).applyMatrix4(this.cabinGroup.matrixWorld);
    this.colliders.push({ x: tableWp.x, z: tableWp.z, radius: 0.75 });

    // Bed Collider
    const bedWp = new THREE.Vector3(2.4, 0, -1.8).applyMatrix4(this.cabinGroup.matrixWorld);
    this.colliders.push({ x: bedWp.x, z: bedWp.z, radius: 0.85 });

    // 12. Door Collider (Blocks doorway when door is closed; allows entry when open)
    const doorCenterWorld = new THREE.Vector3(0, 0, 2.3).applyMatrix4(this.cabinGroup.matrixWorld);
    this.doorCollider = {
      x: doorCenterWorld.x,
      z: doorCenterWorld.z,
      radius: 0.82
    };
    this.colliders.push(this.doorCollider);

    // 13. Register Door Interactable
    const doorInteractWorld = new THREE.Vector3(0, 1.2, 2.7).applyMatrix4(this.cabinGroup.matrixWorld);
    this.cabinDoorInteractable = {
      type: 'cabin_door',
      id: 'cabin_front_door',
      name: 'Cabin Door',
      position: doorInteractWorld,
      radius: 2.5,
      actionText: 'Open Cabin Door'
    };
    this.interactables.push(this.cabinDoorInteractable);
  }

  toggleCabinDoor() {
    this.cabinDoorOpen = !this.cabinDoorOpen;
    this.cabinDoorTargetAngle = this.cabinDoorOpen ? (Math.PI * 0.55) : 0;
    soundFX.playDoorCreak(this.cabinDoorOpen);
    this.updateCabinDoorCollider();
    if (this.cabinDoorInteractable) {
      this.cabinDoorInteractable.actionText = this.cabinDoorOpen ? 'Close Cabin Door' : 'Open Cabin Door';
    }
    return this.cabinDoorOpen;
  }

  setCabinDoorState(isOpen) {
    if (this.cabinDoorOpen === isOpen) return;
    this.cabinDoorOpen = isOpen;
    this.cabinDoorTargetAngle = isOpen ? (Math.PI * 0.55) : 0;
    soundFX.playDoorCreak(isOpen);
    this.updateCabinDoorCollider();
    if (this.cabinDoorInteractable) {
      this.cabinDoorInteractable.actionText = isOpen ? 'Close Cabin Door' : 'Open Cabin Door';
    }
  }

  updateCabinDoorCollider() {
    if (this.doorCollider) {
      // When door is open, remove collision radius so player can freely walk inside!
      // When closed, restore solid collision radius.
      this.doorCollider.radius = this.cabinDoorOpen ? 0.0 : 0.82;
    }
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

  reseed(seed) {
    if (this.seed === seed) return;
    this.seed = seed;
    this.prng = createPRNG(seed);

    // Remove existing trees from scene
    this.trees.forEach(t => {
      this.scene.remove(t.group);
    });
    this.trees = [];

    // Remove existing scenic boulders, bushes, mushrooms
    this.boulders.forEach(b => this.scene.remove(b.group || b.mesh));
    this.boulders = [];
    this.berryBushes.forEach(b => this.scene.remove(b.group));
    this.berryBushes = [];
    this.mushrooms.forEach(m => this.scene.remove(m.group));
    this.mushrooms = [];

    this.interactables = this.interactables.filter(i => 
      i.type !== 'tree' && i.type !== 'boulder' && i.type !== 'berry_bush' && i.type !== 'mushroom_patch'
    );
    this.colliders = this.colliders.filter(c => !c.isTreeCollider && !c.isBoulderCollider);

    // Rebuild forest and resources with new seed
    this.buildForest();
    this.buildScenicDecorations();
  }

  buildForest() {
    // Choppable Pine Trees in forest clusters
    // We place ~30 trees across the map avoiding the lake, campfire center, and hiking trail
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

    // Deterministic tree scale & tint from PRNG
    const scale = 0.85 + this.prng.next() * 0.45;
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

    // Add collider marked as tree
    this.colliders.push({
      x,
      z,
      radius: 0.7 * scale,
      isTreeCollider: true
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

      // Spawn 2 firewood logs plus sticks and chance of seed
      const dropped = [];
      const numLogs = 2;
      for (let i = 0; i < numLogs; i++) {
        const offsetAngle = (i / numLogs) * Math.PI * 2;
        const lx = tree.basePos.x + Math.cos(offsetAngle) * 1.4;
        const lz = tree.basePos.z + Math.sin(offsetAngle) * 1.4;
        const ly = this.getTerrainHeight(lx, lz);
        const logItem = this.spawnFirewoodLog(lx, ly, lz);
        dropped.push(logItem);
      }

      // Bonus sticks & seed
      const numSticks = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numSticks; i++) {
        const sx = tree.basePos.x + (Math.random() - 0.5) * 2.2;
        const sz = tree.basePos.z + (Math.random() - 0.5) * 2.2;
        const sy = this.getTerrainHeight(sx, sz);
        this.spawnGroundResource('stick', sx, sy, sz, 1);
      }
      if (Math.random() < 0.45) {
        const sx = tree.basePos.x + (Math.random() - 0.5) * 1.8;
        const sz = tree.basePos.z + (Math.random() - 0.5) * 1.8;
        const sy = this.getTerrainHeight(sx, sz);
        this.spawnGroundResource('tree_seed', sx, sy, sz, 1);
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

  // Universal Ground Resource Drop (sticks, stones, flint, seeds, berries, mushrooms)
  spawnGroundResource(itemId, x, y, z, count = 1) {
    const groundY = this.getGroundHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, groundY + 0.1, z);

    let meshGeo;
    let meshMat;

    switch (itemId) {
      case 'stick':
        meshGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4);
        meshGeo.rotateZ(Math.PI / 3);
        meshMat = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
        break;
      case 'stone':
        meshGeo = new THREE.DodecahedronGeometry(0.14);
        meshMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
        break;
      case 'flint':
        meshGeo = new THREE.ConeGeometry(0.12, 0.22, 4);
        meshMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
        break;
      case 'coal':
        meshGeo = new THREE.DodecahedronGeometry(0.13);
        meshMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
        break;
      case 'tree_seed':
        meshGeo = new THREE.SphereGeometry(0.08, 5, 5);
        meshMat = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
        break;
      case 'berry':
        meshGeo = new THREE.SphereGeometry(0.09, 6, 6);
        meshMat = new THREE.MeshLambertMaterial({ color: 0xe11d48, flatShading: true });
        break;
      case 'mushroom':
        meshGeo = new THREE.ConeGeometry(0.14, 0.16, 6);
        meshMat = new THREE.MeshLambertMaterial({ color: 0xa855f7, flatShading: true });
        break;
      default:
        meshGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        meshMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true });
        break;
    }

    const mesh = new THREE.Mesh(meshGeo, meshMat);
    mesh.castShadow = true;
    group.add(mesh);

    // Subtle beacon ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.28, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    this.scene.add(group);

    const resId = `drop_${itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const resourceObj = {
      id: resId,
      itemId,
      count,
      group,
      position: new THREE.Vector3(x, groundY + 0.1, z),
      time: 0
    };
    this.droppedItems.push(resourceObj);

    // Register interactable
    this.interactables.push({
      type: 'dropped_resource',
      id: resId,
      itemId,
      count,
      resourceRef: resourceObj,
      name: `${count}x ${itemId.replace('_', ' ')}`,
      position: resourceObj.position,
      radius: 1.8,
      actionText: `Pick up ${itemId.replace('_', ' ')}`
    });

    return resourceObj;
  }

  removeGroundResource(resId) {
    const idx = this.droppedItems.findIndex(i => i.id === resId);
    if (idx !== -1) {
      const item = this.droppedItems[idx];
      this.scene.remove(item.group);
      this.droppedItems.splice(idx, 1);
    }
    const intIdx = this.interactables.findIndex(i => i.id === resId);
    if (intIdx !== -1) {
      this.interactables.splice(intIdx, 1);
    }
  }

  boostCampfire(amount = 0.5) {
    this.campfireTargetLevel = Math.min(2.8, this.campfireTargetLevel + amount);
    soundFX.playPop();
  }

  buildScenicDecorations() {
    const rockPRNG = this.prng.fork('boulders');
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x78716c, flatShading: true });
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x166534, flatShading: true });
    const berryMat = new THREE.MeshLambertMaterial({ color: 0xe11d48, flatShading: true });
    const shroomCapMat = new THREE.MeshLambertMaterial({ color: 0x9333ea, flatShading: true });
    const shroomStemMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9, flatShading: true });

    // 1. Mineable Boulders (20 boulders)
    for (let i = 0; i < 20; i++) {
      const rx = (rockPRNG.next() - 0.5) * 95;
      const rz = (rockPRNG.next() - 0.5) * 95;
      // Keep clear of lake center and campfire
      if (Math.sqrt(rx * rx + rz * rz) > 4.5 && Math.sqrt((rx - 28) ** 2 + (rz - 22) ** 2) > 22) {
        const ry = this.getGroundHeight(rx, rz);
        const rockScale = 0.7 + rockPRNG.next() * 0.9;

        const rockGroup = new THREE.Group();
        rockGroup.position.set(rx, ry + rockScale * 0.25, rz);

        const rockGeo = new THREE.DodecahedronGeometry(rockScale, 0);
        const rockMesh = new THREE.Mesh(rockGeo, rockMat);
        rockMesh.rotation.set(rockPRNG.next() * Math.PI, rockPRNG.next() * Math.PI, rockPRNG.next() * Math.PI);
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        rockGroup.add(rockMesh);

        this.scene.add(rockGroup);

        const boulderId = `boulder_${i}`;
        const boulderObj = {
          id: boulderId,
          group: rockGroup,
          mesh: rockMesh,
          position: new THREE.Vector3(rx, ry, rz),
          health: 4,
          maxHealth: 4,
          isMined: false,
          respawnTimer: 0
        };
        this.boulders.push(boulderObj);

        this.interactables.push({
          type: 'boulder',
          id: boulderId,
          boulderRef: boulderObj,
          name: 'Granite Boulder',
          position: boulderObj.position,
          radius: 2.2,
          actionText: 'Mine Boulder [Pickaxe]'
        });

        const coll = { x: rx, z: rz, radius: rockScale * 0.75, isBoulderCollider: true };
        this.colliders.push(coll);
      }
    }

    // 2. Foragable Berry Bushes (14 bushes)
    const bushPRNG = this.prng.fork('bushes');
    for (let i = 0; i < 14; i++) {
      const bx = (bushPRNG.next() - 0.5) * 80;
      const bz = (bushPRNG.next() - 0.5) * 80;
      if (Math.sqrt(bx * bx + bz * bz) > 5 && Math.sqrt((bx - 28) ** 2 + (bz - 22) ** 2) > 20) {
        const by = this.getGroundHeight(bx, bz);
        if (by > 0.2 && by < 11) {
          const bushGroup = new THREE.Group();
          bushGroup.position.set(bx, by, bz);

          // Foliage dome
          const foliageGeo = new THREE.DodecahedronGeometry(0.75, 1);
          const foliage = new THREE.Mesh(foliageGeo, bushMat);
          foliage.position.y = 0.55;
          foliage.castShadow = true;
          bushGroup.add(foliage);

          // 5-6 red berries on surface
          const berriesGroup = new THREE.Group();
          for (let b = 0; b < 6; b++) {
            const berry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), berryMat);
            const a = (b / 6) * Math.PI * 2;
            berry.position.set(Math.cos(a) * 0.65, 0.55 + (b % 2) * 0.2, Math.sin(a) * 0.65);
            berriesGroup.add(berry);
          }
          bushGroup.add(berriesGroup);

          this.scene.add(bushGroup);

          const bushId = `bush_${i}`;
          const bushObj = {
            id: bushId,
            group: bushGroup,
            berriesGroup,
            position: new THREE.Vector3(bx, by, bz),
            hasBerries: true,
            respawnTimer: 0
          };
          this.berryBushes.push(bushObj);

          this.interactables.push({
            type: 'berry_bush',
            id: bushId,
            bushRef: bushObj,
            name: 'Wild Berry Bush',
            position: bushObj.position,
            radius: 2.0,
            actionText: 'Forage Berries'
          });
        }
      }
    }

    // 3. Foragable Mushroom Patches (10 patches)
    const shroomPRNG = this.prng.fork('mushrooms');
    for (let i = 0; i < 10; i++) {
      const mx = (shroomPRNG.next() - 0.5) * 70;
      const mz = (shroomPRNG.next() - 0.5) * 70;
      if (Math.sqrt(mx * mx + mz * mz) > 3.5 && Math.sqrt((mx - 28) ** 2 + (mz - 22) ** 2) > 18) {
        const my = this.getGroundHeight(mx, mz);
        if (my > 0.2 && my < 9) {
          const mGroup = new THREE.Group();
          mGroup.position.set(mx, my, mz);

          // 2-3 mushrooms in cluster
          for (let s = 0; s < 3; s++) {
            const ox = (s - 1) * 0.22;
            const oz = (s === 1 ? 0.15 : -0.1);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), shroomStemMat);
            stem.position.set(ox, 0.11, oz);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 6), shroomCapMat);
            cap.position.set(ox, 0.22, oz);
            mGroup.add(stem, cap);
          }

          this.scene.add(mGroup);

          const shroomId = `shroom_${i}`;
          const shroomObj = {
            id: shroomId,
            group: mGroup,
            position: new THREE.Vector3(mx, my, mz),
            picked: false,
            respawnTimer: 0
          };
          this.mushrooms.push(shroomObj);

          this.interactables.push({
            type: 'mushroom_patch',
            id: shroomId,
            shroomRef: shroomObj,
            name: 'Forest Mushrooms',
            position: shroomObj.position,
            radius: 1.8,
            actionText: 'Gather Mushrooms'
          });
        }
      }
    }
  }

  mineBoulder(boulderId, damage = 1) {
    const boulder = this.boulders.find(b => b.id === boulderId);
    if (!boulder || boulder.isMined) return null;

    boulder.health -= damage;
    soundFX.playPop();

    if (boulder.health <= 0) {
      boulder.isMined = true;
      boulder.respawnTimer = 60; // 60s respawn
      boulder.group.visible = false;

      // Drop 2-3 stones + chance of flint + chance of coal
      const drops = [];
      const numStones = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numStones; i++) {
        const sx = boulder.position.x + (Math.random() - 0.5) * 1.5;
        const sz = boulder.position.z + (Math.random() - 0.5) * 1.5;
        const sy = this.getTerrainHeight(sx, sz);
        this.spawnGroundResource('stone', sx, sy, sz, 1);
      }
      if (Math.random() < 0.45) {
        const fx = boulder.position.x + (Math.random() - 0.5) * 1.2;
        const fz = boulder.position.z + (Math.random() - 0.5) * 1.2;
        const fy = this.getTerrainHeight(fx, fz);
        this.spawnGroundResource('flint', fx, fy, fz, 1);
      }
      if (Math.random() < 0.35) {
        const cx = boulder.position.x + (Math.random() - 0.5) * 1.2;
        const cz = boulder.position.z + (Math.random() - 0.5) * 1.2;
        const cy = this.getTerrainHeight(cx, cz);
        this.spawnGroundResource('coal', cx, cy, cz, 1);
      }

      return { mined: true };
    }

    return { mined: false, healthRemaining: boulder.health };
  }

  harvestBush(bushId) {
    const bush = this.berryBushes.find(b => b.id === bushId);
    if (!bush || !bush.hasBerries) return false;

    bush.hasBerries = false;
    bush.respawnTimer = 50;
    if (bush.berriesGroup) bush.berriesGroup.visible = false;
    soundFX.playPop();

    // Drop berries and fiber
    const bx = bush.position.x;
    const bz = bush.position.z;
    const by = bush.position.y;
    this.spawnGroundResource('berry', bx + 0.5, by, bz, 2);
    this.spawnGroundResource('fiber', bx - 0.4, by, bz + 0.3, 1);

    return true;
  }

  pickMushroom(mushroomId) {
    const shroom = this.mushrooms.find(m => m.id === mushroomId);
    if (!shroom || shroom.picked) return false;

    shroom.picked = true;
    shroom.respawnTimer = 65;
    shroom.group.visible = false;
    soundFX.playPop();

    // Drop mushrooms
    this.spawnGroundResource('mushroom', shroom.position.x, shroom.position.y, shroom.position.z, 2);
    return true;
  }

  // -------------------------------------------------------------
  // Late-Join Snapshot Gathering & Hydration
  // -------------------------------------------------------------
  getSnapshotData() {
    return {
      seed: this.seed,
      trees: this.trees.map(t => ({
        id: t.id,
        health: t.health,
        isChopped: t.isChopped,
        respawnTimer: Math.ceil(t.respawnTimer || 0)
      })),
      boulders: this.boulders.map(b => ({
        id: b.id,
        health: b.health,
        isMined: b.isMined,
        respawnTimer: Math.ceil(b.respawnTimer || 0)
      })),
      berryBushes: this.berryBushes.map(b => ({
        id: b.id,
        hasBerries: b.hasBerries,
        respawnTimer: Math.ceil(b.respawnTimer || 0)
      })),
      mushrooms: this.mushrooms.map(m => ({
        id: m.id,
        picked: m.picked,
        respawnTimer: Math.ceil(m.respawnTimer || 0)
      })),
      droppedLogs: this.droppedLogs.map(l => ({
        id: l.id,
        x: l.position.x,
        y: l.position.y,
        z: l.position.z
      })),
      droppedItems: this.droppedItems.map(i => ({
        id: i.id,
        itemId: i.itemId,
        count: i.count,
        x: i.position.x,
        y: i.position.y,
        z: i.position.z
      })),
      fireFuel: this.campfireLevel,
      cabinDoorOpen: this.cabinDoorOpen
    };
  }

  applySnapshot(snapshot) {
    if (!snapshot) return;

    if (snapshot.seed && snapshot.seed !== this.seed) {
      this.reseed(snapshot.seed);
    }

    if (snapshot.trees && Array.isArray(snapshot.trees)) {
      snapshot.trees.forEach(st => {
        const tree = this.trees.find(t => t.id === st.id);
        if (tree) {
          tree.health = st.health;
          tree.isChopped = st.isChopped;
          tree.respawnTimer = st.respawnTimer;
          tree.group.visible = !st.isChopped;
        }
      });
    }

    if (snapshot.boulders && Array.isArray(snapshot.boulders)) {
      snapshot.boulders.forEach(sb => {
        const boulder = this.boulders.find(b => b.id === sb.id);
        if (boulder) {
          boulder.health = sb.health;
          boulder.isMined = sb.isMined;
          boulder.respawnTimer = sb.respawnTimer;
          boulder.group.visible = !sb.isMined;
        }
      });
    }

    if (snapshot.berryBushes && Array.isArray(snapshot.berryBushes)) {
      snapshot.berryBushes.forEach(sb => {
        const bush = this.berryBushes.find(b => b.id === sb.id);
        if (bush) {
          bush.hasBerries = sb.hasBerries;
          bush.respawnTimer = sb.respawnTimer;
          if (bush.berriesGroup) bush.berriesGroup.visible = sb.hasBerries;
        }
      });
    }

    if (snapshot.mushrooms && Array.isArray(snapshot.mushrooms)) {
      snapshot.mushrooms.forEach(sm => {
        const shroom = this.mushrooms.find(m => m.id === sm.id);
        if (shroom) {
          shroom.picked = sm.picked;
          shroom.respawnTimer = sm.respawnTimer;
          shroom.group.visible = !sm.picked;
        }
      });
    }

    if (snapshot.fireFuel !== undefined) {
      this.campfireLevel = snapshot.fireFuel;
      this.campfireTargetLevel = snapshot.fireFuel;
    }

    if (snapshot.cabinDoorOpen !== undefined) {
      this.setCabinDoorState(snapshot.cabinDoorOpen);
    }
  }

  update(delta, playerPos, isFishing, bobberPos, dayNight) {
    this.waterTime += delta;

    // 1. Lake water gentle low-poly bobbing & waves
    if (this.waterMesh) {
      this.waterMesh.rotation.y = this.waterTime * 0.04;
      this.waterMesh.position.y = (this.waterLevel - 0.4) + Math.sin(this.waterTime * 1.5) * 0.04;
    }

    // 2. Animated Swimming Fish in the Lake
    if (this.fishSchool) {
      this.fishSchool.update(delta, playerPos || new THREE.Vector3(0, 0, 0), isFishing || false, bobberPos || null);
    }

    // 3. Cabin Door Smooth Swing Animation
    if (this.cabinDoorHinge) {
      this.cabinDoorAngle = THREE.MathUtils.lerp(this.cabinDoorAngle, this.cabinDoorTargetAngle, delta * 6.5);
      this.cabinDoorHinge.rotation.y = this.cabinDoorAngle;
    }

    // 4. Cabin Chimney Smoke Puffs
    if (this.smokePuffs && this.smokePuffs.length > 0) {
      const st = Date.now() * 0.001;
      this.smokePuffs.forEach((puff) => {
        puff.mesh.position.y += puff.speed * delta;
        puff.mesh.position.x = Math.sin(st * 1.8 + puff.swayOffset) * 0.16;
        puff.mesh.position.z = Math.cos(st * 1.4 + puff.swayOffset) * 0.16;
        const prog = puff.mesh.position.y / 2.6;
        puff.mesh.scale.setScalar(0.8 + prog * 1.4);
        if (puff.mesh.material) {
          puff.mesh.material.opacity = Math.max(0, 0.55 - prog * 0.55);
        }
        if (puff.mesh.position.y > 2.6) {
          puff.mesh.position.y = 0.05;
          puff.mesh.scale.setScalar(0.8);
          if (puff.mesh.material) puff.mesh.material.opacity = 0.55;
        }
      });
    }

    // 5. Cabin Windows & Interior Warm Glow (soft by day, bright cozy glow at night)
    if (dayNight && this.cabinWindowMat) {
      const isNight = (dayNight.cycleTimer >= dayNight.dayDuration);
      const targetEmissive = isNight ? 1.3 : 0.4;
      const targetLight = isNight ? 2.6 : 1.3;
      this.cabinWindowMat.emissiveIntensity = THREE.MathUtils.lerp(
        this.cabinWindowMat.emissiveIntensity,
        targetEmissive,
        delta * 2.0
      );
      if (this.cabinInteriorLight) {
        this.cabinInteriorLight.intensity = THREE.MathUtils.lerp(
          this.cabinInteriorLight.intensity,
          targetLight,
          delta * 2.0
        );
      }
    }

    // 6. Campfire flame animation & flickering light
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

    // 7. Campfire Embers animation
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

    // 8. Tree wobbles & respawn timers
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

    // 9. Boulder respawn timers
    this.boulders.forEach(boulder => {
      if (boulder.isMined && boulder.respawnTimer > 0) {
        boulder.respawnTimer -= delta;
        if (boulder.respawnTimer <= 0) {
          boulder.isMined = false;
          boulder.health = boulder.maxHealth || 4;
          boulder.group.visible = true;
        }
      }
    });

    // 10. Berry Bush respawn timers
    this.berryBushes.forEach(bush => {
      if (!bush.hasBerries && bush.respawnTimer > 0) {
        bush.respawnTimer -= delta;
        if (bush.respawnTimer <= 0) {
          bush.hasBerries = true;
          if (bush.berriesGroup) bush.berriesGroup.visible = true;
        }
      }
    });

    // 11. Mushroom patch respawn timers
    this.mushrooms.forEach(shroom => {
      if (shroom.picked && shroom.respawnTimer > 0) {
        shroom.respawnTimer -= delta;
        if (shroom.respawnTimer <= 0) {
          shroom.picked = false;
          shroom.group.visible = true;
        }
      }
    });

    // 12. Dropped logs & items halo pulse & hover
    this.droppedLogs.forEach(log => {
      log.time += delta;
      if (log.halo) {
        log.halo.material.opacity = 0.4 + Math.sin(log.time * 4) * 0.3;
        log.halo.rotation.z += delta * 0.5;
      }
    });

    this.droppedItems.forEach(item => {
      item.time += delta;
      if (item.group) {
        item.group.rotation.y += delta * 1.5;
        item.group.position.y = (this.getGroundHeight(item.position.x, item.position.z) + 0.12) + Math.sin(item.time * 3) * 0.05;
      }
    });
  }
}

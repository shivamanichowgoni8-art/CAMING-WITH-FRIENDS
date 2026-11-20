import * as THREE from 'three';

export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;
    // Exactly 10 real minutes Day (600s) + 6 real minutes Night (360s) = 16 minutes Total (960s)
    this.dayDuration = 600;   // 10 minutes
    this.nightDuration = 360; // 6 minutes
    this.totalDuration = 960; // 16 minutes total
    this.cycleTimer = 60;     // Starts in early morning light (~7:24 AM)
    this.orbitRadius = 75;

    // Atmospheric elements
    this.setupLighting();
    this.setupSunAndMoon();
    this.setupStarField();

    // Scene Fog
    this.scene.fog = new THREE.FogExp2(0x52a5db, 0.006);
  }

  setupLighting() {
    // Ambient / Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Sun directional light (casts soft shadows)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    const d = 45;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Moon directional light (cool pale-blue fill during night)
    this.moonLight = new THREE.DirectionalLight(0x8ab4f8, 0.0);
    this.scene.add(this.moonLight);
  }

  setupSunAndMoon() {
    // Sun visual orb
    const sunGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff099 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon visual orb
    const moonGeo = new THREE.SphereGeometry(2.4, 12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);
  }

  setupStarField() {
    const starCount = 700;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Upper celestial hemisphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.5;

      const r = 90 + Math.random() * 20;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.max(10, r * Math.cos(phi));
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.3,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true
    });
    this.starField = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starField);
  }

  update(delta) {
    this.cycleTimer = (this.cycleTimer + delta) % this.totalDuration;

    const skyColor = new THREE.Color();
    const groundColor = new THREE.Color();
    let fogDensity = 0.006;

    if (this.cycleTimer < this.dayDuration) {
      // -------------------------------------------------------------
      // DAYTIME (0s to 600s = exactly 10 real-world minutes)
      // -------------------------------------------------------------
      const dayProgress = this.cycleTimer / this.dayDuration; // 0.0 to 1.0
      // Sun moves from eastern horizon (0) to zenith (0.5) to western horizon (1.0)
      const sunAngle = dayProgress * Math.PI;

      // Position Sun
      const sunX = Math.cos(sunAngle) * -this.orbitRadius;
      const sunY = Math.sin(sunAngle) * this.orbitRadius;
      const sunZ = Math.sin(sunAngle * 0.5) * (this.orbitRadius * 0.35);
      this.sunLight.position.set(sunX, sunY, sunZ);
      this.sunMesh.position.set(sunX, sunY, sunZ);

      // Moon below horizon during day
      this.moonLight.position.set(-sunX, -sunY, -sunZ);
      this.moonMesh.position.set(-sunX, -sunY, -sunZ);
      this.moonLight.intensity = 0.0;
      this.starMat.opacity = 0.0;

      if (this.cycleTimer < 50) {
        // Sunrise / Dawn (first 50 seconds)
        const t = this.cycleTimer / 50;
        const dawnSky = new THREE.Color(0xfdba74); // soft peach / rose
        const daySky = new THREE.Color(0x52a5db);  // bright alpine blue
        skyColor.copy(dawnSky).lerp(daySky, t);
        groundColor.setHex(0x2d3a24);

        this.sunLight.color.setHex(0xffedd5);
        this.sunLight.intensity = THREE.MathUtils.lerp(0.3, 1.45, t);
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.35, 0.85, t);
        fogDensity = 0.007;
      } else if (this.cycleTimer > 530) {
        // Sunset / Golden Hour (last 70 seconds of day)
        const t = (this.cycleTimer - 530) / 70;
        const daySky = new THREE.Color(0x52a5db);
        const sunsetSky = new THREE.Color(0xea580c); // rich amber sunset
        skyColor.copy(daySky).lerp(sunsetSky, t);
        groundColor.setHex(0x272e1e);

        this.sunLight.color.setHex(0xf97316);
        this.sunLight.intensity = THREE.MathUtils.lerp(1.45, 0.15, t);
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.85, 0.35, t);
        fogDensity = 0.0065;
      } else {
        // Full Bright Day (over 8 minutes of pristine daylight)
        skyColor.setHex(0x52a5db); // Crisp mountain sky
        groundColor.setHex(0x3a5a40);
        this.sunLight.color.setHex(0xfffaed);
        this.sunLight.intensity = 1.45;
        this.hemiLight.intensity = 0.85;
        fogDensity = 0.0055;
      }
    } else {
      // -------------------------------------------------------------
      // NIGHTTIME (600s to 960s = exactly 6 real-world minutes)
      // -------------------------------------------------------------
      const nightElapsed = this.cycleTimer - this.dayDuration; // 0s to 360s
      const nightProgress = nightElapsed / this.nightDuration; // 0.0 to 1.0
      // Moon moves from horizon (0) to zenith (0.5) to horizon (1.0)
      const moonAngle = nightProgress * Math.PI;

      // Position Moon in sky
      const moonX = Math.cos(moonAngle) * -this.orbitRadius;
      const moonY = Math.sin(moonAngle) * this.orbitRadius;
      const moonZ = Math.sin(moonAngle * 0.5) * (this.orbitRadius * 0.35);
      this.moonLight.position.set(moonX, moonY, moonZ);
      this.moonMesh.position.set(moonX, moonY, moonZ);

      // Sun below horizon
      this.sunLight.position.set(-moonX, -moonY, -moonZ);
      this.sunMesh.position.set(-moonX, -moonY, -moonZ);
      this.sunLight.intensity = 0.0;

      // True Dark Night Colors:
      const deepNightSky = new THREE.Color(0x02050e); // deep midnight navy-black
      const twilightSky = new THREE.Color(0x1e1b4b);   // dusk violet

      if (nightElapsed < 50) {
        // Dusk into Deep Night (first 50 seconds)
        const t = nightElapsed / 50;
        skyColor.copy(twilightSky).lerp(deepNightSky, t);
        groundColor.setHex(0x060912);

        this.moonLight.intensity = THREE.MathUtils.lerp(0.02, 0.16, t);
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.3, 0.10, t);
        this.starMat.opacity = THREE.MathUtils.lerp(0.1, 0.95, t);
        fogDensity = 0.007;
      } else if (nightElapsed > 310) {
        // Pre-Dawn Twilight (last 50 seconds of night)
        const t = (nightElapsed - 310) / 50;
        const dawnRose = new THREE.Color(0x2d1b38);
        skyColor.copy(deepNightSky).lerp(dawnRose, t);
        groundColor.setHex(0x070c18);

        this.moonLight.intensity = THREE.MathUtils.lerp(0.16, 0.04, t);
        this.hemiLight.intensity = THREE.MathUtils.lerp(0.10, 0.25, t);
        this.starMat.opacity = THREE.MathUtils.lerp(0.95, 0.2, t);
        fogDensity = 0.0072;
      } else {
        // True Starry Night (deep dark sky, visible stars, dimmed ambient light)
        skyColor.copy(deepNightSky);
        groundColor.setHex(0x020409);

        // Dimmed ambient / directional moonlight so campfire & lanterns shine!
        this.moonLight.color.setHex(0x8ab4f8);
        this.moonLight.intensity = 0.16;
        this.hemiLight.color.copy(skyColor);
        this.hemiLight.groundColor.copy(groundColor);
        this.hemiLight.intensity = 0.09;

        // Twinkling brilliant starry night
        const twinkle = 0.88 + Math.sin(Date.now() * 0.0025) * 0.12;
        this.starMat.opacity = 0.98 * twinkle;
        fogDensity = 0.0075;
      }
    }

    // Apply colors to Scene, Fog, and Hemisphere Light
    this.scene.background = skyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.density = fogDensity;
    }
    this.hemiLight.color.copy(skyColor);
    this.hemiLight.groundColor.copy(groundColor);
  }

  getClockInfo() {
    let totalMinutes;
    let icon = '☀️';
    let phase = 'Day';

    if (this.cycleTimer < this.dayDuration) {
      // Daytime (600s) -> maps from 6:00 AM (360m) to 8:00 PM (1200m)
      const dayFraction = this.cycleTimer / this.dayDuration;
      totalMinutes = 6 * 60 + dayFraction * 14 * 60;

      if (this.cycleTimer < 50) {
        icon = '🌅';
        phase = 'Dawn';
      } else if (this.cycleTimer > 530) {
        icon = '🌇';
        phase = 'Sunset';
      } else {
        icon = '☀️';
        phase = 'Day';
      }
    } else {
      // Nighttime (360s) -> maps from 8:00 PM (1200m) to 6:00 AM (360m)
      const nightFraction = (this.cycleTimer - this.dayDuration) / this.nightDuration;
      totalMinutes = (20 * 60 + nightFraction * 10 * 60) % (24 * 60);

      const nightElapsed = this.cycleTimer - this.dayDuration;
      if (nightElapsed < 50) {
        icon = '🌆';
        phase = 'Dusk';
      } else if (nightElapsed > 310) {
        icon = '🌌';
        phase = 'Twilight';
      } else {
        icon = '🌙';
        phase = 'Night';
      }
    }

    let hours = Math.floor(totalMinutes / 60);
    let minutes = Math.floor(totalMinutes % 60);

    const isPM = hours >= 12;
    const dispHours = hours % 12 === 0 ? 12 : hours % 12;
    const dispMinutes = minutes.toString().padStart(2, '0');
    const ampm = isPM ? 'PM' : 'AM';

    return {
      timeStr: `${dispHours}:${dispMinutes} ${ampm}`,
      icon,
      phase,
      rawTime: this.cycleTimer / this.totalDuration,
      isNight: this.cycleTimer >= this.dayDuration
    };
  }
}

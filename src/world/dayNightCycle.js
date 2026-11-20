import * as THREE from 'three';

export class DayNightCycle {
  constructor(scene, durationSeconds = 180) {
    this.scene = scene;
    this.duration = durationSeconds; // full 24h cycle duration
    this.time = 0.2; // starts at early morning / morning glow (0.2 = ~8:00 AM)
    this.orbitRadius = 75;

    // Atmospheric elements
    this.setupLighting();
    this.setupSunAndMoon();
    this.setupStarField();

    // Scene Fog
    this.scene.fog = new THREE.FogExp2(0x70c1b3, 0.0075);
  }

  setupLighting() {
    // Ambient / Hemisphere light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Sun directional light (casts shadows)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
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

    // Moon directional light (subtle cool blue fill at night)
    this.moonLight = new THREE.DirectionalLight(0x8ab4f8, 0.2);
    this.scene.add(this.moonLight);
  }

  setupSunAndMoon() {
    // Sun visual orb
    const sunGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff099 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Moon visual orb (crescent / cratered look)
    const moonGeo = new THREE.SphereGeometry(2.4, 12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);
  }

  setupStarField() {
    const starCount = 650;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Hemisphere distribution above the world
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.5; // only upper hemisphere

      const r = 90 + Math.random() * 20;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.max(12, r * Math.cos(phi));
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true
    });
    this.starField = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starField);
  }

  update(delta) {
    // Advance time
    this.time = (this.time + (delta / this.duration)) % 1.0;

    // Angle: 0.0 = 6 AM, 0.25 = 12 PM (Zenith), 0.5 = 6 PM, 0.75 = 12 AM (Midnight)
    const sunAngle = (this.time - 0.25) * Math.PI * 2;
    const moonAngle = sunAngle + Math.PI;

    // Position Sun
    const sunX = Math.cos(sunAngle) * this.orbitRadius;
    const sunY = Math.sin(sunAngle) * this.orbitRadius;
    const sunZ = Math.sin(sunAngle * 0.5) * (this.orbitRadius * 0.4);

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    // Position Moon
    const moonX = Math.cos(moonAngle) * this.orbitRadius;
    const moonY = Math.sin(moonAngle) * this.orbitRadius;
    const moonZ = Math.sin(moonAngle * 0.5) * (this.orbitRadius * 0.4);

    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonMesh.position.set(moonX, moonY, moonZ);

    // Sun altitude factor (-1 to 1)
    const sunAlt = Math.sin(sunAngle);

    // Colors and Intensity calculations
    const skyColor = new THREE.Color();
    const groundColor = new THREE.Color();

    if (sunAlt > 0.3) {
      // Midday
      skyColor.setHex(0x5ca8d6); // Crisp bright mountain sky
      groundColor.setHex(0x3a5a40);
      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = THREE.MathUtils.lerp(0.8, 1.4, (sunAlt - 0.3) / 0.7);
      this.moonLight.intensity = 0.0;
      this.starMat.opacity = 0.0;
    } else if (sunAlt > -0.1 && sunAlt <= 0.3) {
      // Golden Hour / Sunrise / Sunset
      const t = (sunAlt - (-0.1)) / 0.4;
      // Interpolate between Sunset Orange and Daylight Blue
      const sunsetSky = new THREE.Color(0xf97316); // Amber Sunset
      const daySky = new THREE.Color(0x5ca8d6);
      skyColor.copy(sunsetSky).lerp(daySky, t);

      groundColor.setHex(0x2d3a24);
      this.sunLight.color.setHex(0xff7b00);
      this.sunLight.intensity = Math.max(0.1, t * 0.8);
      this.moonLight.intensity = 0.05;
      this.starMat.opacity = Math.max(0, (1 - t) * 0.3);
    } else {
      // Night / Twilight
      const nightSky = new THREE.Color(0x070b19); // Midnight dark blue
      const twilightSky = new THREE.Color(0x1e1e38);
      const nightFactor = Math.min(1.0, (-sunAlt - 0.1) / 0.5);

      skyColor.copy(twilightSky).lerp(nightSky, nightFactor);
      groundColor.setHex(0x0a0e14);
      this.sunLight.intensity = 0.0;
      this.moonLight.intensity = 0.35;

      // Stars shine brightly with gentle shimmer
      this.starMat.opacity = THREE.MathUtils.lerp(0.2, 0.95, nightFactor) * (0.85 + Math.sin(Date.now() * 0.003) * 0.15);
    }

    // Apply colors to Scene, Fog, and Hemisphere Light
    this.scene.background = skyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
    }

    this.hemiLight.color.copy(skyColor);
    this.hemiLight.groundColor.copy(groundColor);
    this.hemiLight.intensity = Math.max(0.25, Math.sin(sunAngle) * 0.6 + 0.4);
  }

  getClockInfo() {
    // Convert this.time (0 to 1) to 24h clock string
    // 0 = 6:00 AM
    let totalMinutes = ((this.time * 24 + 6) % 24) * 60;
    let hours = Math.floor(totalMinutes / 60);
    let minutes = Math.floor(totalMinutes % 60);

    const isPM = hours >= 12;
    const dispHours = hours % 12 === 0 ? 12 : hours % 12;
    const dispMinutes = minutes.toString().padStart(2, '0');
    const ampm = isPM ? 'PM' : 'AM';

    let icon = '☀️';
    let phase = 'Day';

    if (hours >= 5 && hours < 8) {
      icon = '🌅';
      phase = 'Dawn';
    } else if (hours >= 8 && hours < 17) {
      icon = '☀️';
      phase = 'Day';
    } else if (hours >= 17 && hours < 20) {
      icon = '🌇';
      phase = 'Golden Hour';
    } else if (hours >= 20 || hours < 5) {
      icon = '🌙';
      phase = 'Night';
    }

    return {
      timeStr: `${dispHours}:${dispMinutes} ${ampm}`,
      icon,
      phase,
      rawTime: this.time
    };
  }
}

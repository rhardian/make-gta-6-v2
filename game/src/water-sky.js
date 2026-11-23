// Dynamic golden-hour / twilight / day-night sky dome shader, real-time PCFSoftShadowMap sun,
// atmospheric fog, and animated turquoise-to-cobalt ocean water with sun glints and surf foam.

import * as THREE from 'three';

const SKY_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTopColor;
uniform vec3 uMidColor;
uniform vec3 uHorizonColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uTime;
varying vec3 vWorldDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float h = clamp(dir.y, 0.0, 1.0);

  vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
  col = mix(col, uTopColor, smoothstep(0.22, 0.85, h));

  // Sun glow & crisp solar disc
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sunDot, 10.0) * 0.42;
  col += uSunColor * pow(sunDot, 90.0) * 0.85;
  col += vec3(1.0, 0.96, 0.88) * smoothstep(0.9985, 0.9996, sunDot) * 1.4;

  // Soft sunlit coastal clouds
  if (dir.y > 0.03) {
    vec2 uv = dir.xz / (dir.y + 0.24) * 1.6 + vec2(uTime * 0.012, -uTime * 0.006);
    float c = fbm(uv * 2.2);
    float cloudMask = smoothstep(0.47, 0.78, c) * smoothstep(0.03, 0.22, dir.y) * smoothstep(0.92, 0.28, dir.y);
    vec3 cloudLit = mix(uHorizonColor * 1.15, vec3(1.0, 0.92, 0.82), 0.55 + 0.45 * pow(sunDot, 4.0));
    col = mix(col, cloudLit, cloudMask * 0.62);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const WATER_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying float vWave;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float w1 = sin(wp.x * 0.048 + uTime * 1.55 + wp.z * 0.025) * 0.26;
  float w2 = cos(wp.z * 0.062 - uTime * 1.25 + wp.x * 0.032) * 0.18;
  float w3 = sin((wp.x - wp.z) * 0.11 + uTime * 2.2) * 0.08;
  float wave = w1 + w2 + w3;
  wp.y += wave;
  vWave = wave;
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec3 vWorldPos;
varying float vWave;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  // Procedural animated surface normal for sparkling sun glints
  float nx = cos(vWorldPos.x * 0.08 + uTime * 1.8) * 0.12 + sin(vWorldPos.z * 0.16 - uTime * 2.4) * 0.07;
  float nz = sin(vWorldPos.z * 0.09 - uTime * 1.5) * 0.12 + cos(vWorldPos.x * 0.15 + uTime * 2.1) * 0.07;
  vec3 N = normalize(vec3(nx, 1.0, nz));

  // Shallow turquoise near Coral Promenade shoreline (x ~ 318) and around Starlight Isle (x ~ 520..760, z ~ -210..210)
  float dMain = max(0.0, vWorldPos.x - 318.0);
  vec2 isleBox = max(abs(vWorldPos.xz - vec2(640.0, 0.0)) - vec2(122.0, 212.0), vec2(0.0));
  float dIsle = length(isleBox);
  float coastDist = min(dMain, dIsle);
  float depthFactor = smoothstep(0.0, 95.0, coastDist);

  vec3 waterCol = mix(uShallowColor, uDeepColor, depthFactor);

  // Fresnel sky reflection
  float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.6);
  waterCol = mix(waterCol, uSkyTint, clamp(fresnel * 0.62, 0.0, 0.68));

  // Crisp sun specular glints across ripples
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + viewDir);
  float specBroad = pow(max(dot(N, H), 0.0), 42.0) * 0.45;
  float specSharp = pow(max(dot(N, H), 0.0), 280.0) * 1.65;
  waterCol += uSunColor * (specBroad + specSharp);

  // Shoreline animated white surf foam
  float surfWave = sin(coastDist * 0.55 - uTime * 2.8 + sin(vWorldPos.z * 0.07) * 2.2);
  float surfMask = (1.0 - smoothstep(0.0, 14.0, coastDist)) * smoothstep(0.25, 0.72, surfWave);
  float shoreLine = 1.0 - smoothstep(0.0, 3.8, coastDist);
  float crestFoam = smoothstep(0.32, 0.50, vWave) * 0.18;
  waterCol = mix(waterCol, vec3(0.96, 0.99, 1.0), clamp(surfMask * 0.68 + shoreLine * 0.78 + crestFoam, 0.0, 0.92));

  // Exponential fog matching Three.js FogExp2
  float dist = length(cameraPosition - vWorldPos);
  float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
  waterCol = mix(waterCol, uFogColor, clamp(fogFactor, 0.0, 1.0));

  gl_FragColor = vec4(waterCol, 0.96);
}
`;

export function createWaterAndSky(scene) {
  const skyUniforms = {
    uTopColor: { value: new THREE.Color('#2563eb') },
    uMidColor: { value: new THREE.Color('#f472b6') },
    uHorizonColor: { value: new THREE.Color('#ffba6b') },
    uSunDir: { value: new THREE.Vector3(0.68, 0.24, 0.68).normalize() },
    uSunColor: { value: new THREE.Color('#ffd38a') },
    uTime: { value: 0 },
  };
  const skyGeo = new THREE.SphereGeometry(1850, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Real-time sun directional light with soft PCF shadows
  const sunLight = new THREE.DirectionalLight('#ffdfb0', 2.8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 560;
  const d = 155;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.04;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight('#ffd5b8', '#2c4a6b', 0.95);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight('#ffe8d6', 0.32);
  scene.add(ambientLight);

  const fog = new THREE.FogExp2('#f6b48c', 0.00115);
  scene.fog = fog;

  // Animated shimmering ocean surface
  const waterUniforms = {
    uTime: { value: 0 },
    uSunDir: { value: skyUniforms.uSunDir.value.clone() },
    uSunColor: { value: new THREE.Color('#ffd896') },
    uShallowColor: { value: new THREE.Color('#19d4c7') },
    uDeepColor: { value: new THREE.Color('#094a8c') },
    uSkyTint: { value: new THREE.Color('#f6b28f') },
    uFogColor: { value: fog.color.clone() },
    uFogDensity: { value: fog.density },
  };
  const waterGeo = new THREE.PlaneGeometry(2800, 2800, 110, 110);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: waterUniforms,
    transparent: true,
  });
  const oceanMesh = new THREE.Mesh(waterGeo, waterMat);
  oceanMesh.position.set(360, -0.35, 0);
  scene.add(oceanMesh);

  return {
    skyDome,
    skyUniforms,
    oceanMesh,
    waterUniforms,
    sunLight,
    hemiLight,
    ambientLight,
    fog,
  };
}

export function updateWaterAndSky(env, timeOfDay, elapsed, focusX, focusZ) {
  env.skyUniforms.uTime.value = elapsed;
  env.waterUniforms.uTime.value = elapsed;
  env.skyDome.position.set(focusX, 0, focusZ);

  // Presets interpolated by timeOfDay:
  // 12.0 = crisp tropical noon, 17.65 = iconic golden hour sunset, 19.6 = neon twilight dusk, 22.5 = night
  const t = ((timeOfDay % 24) + 24) % 24;
  let top, mid, hor, sunCol, fogCol, sunElev, sunAzim, sunInt, hemiInt, shallow, deep, fogDen;

  if (t >= 16.5 && t < 18.8) {
    // Sun-soaked luminous golden-hour coastal sky (azure-cerulean zenith -> warm apricot/coral horizon!)
    const k = (t - 16.5) / 2.3;
    top = new THREE.Color('#1976d2').lerp(new THREE.Color('#2d59a8'), k);
    mid = new THREE.Color('#f7b586').lerp(new THREE.Color('#f28b8c'), k);
    hor = new THREE.Color('#ffe4ad').lerp(new THREE.Color('#ffb87a'), k);
    sunCol = new THREE.Color('#fff0c2').lerp(new THREE.Color('#ffc478'), k);
    fogCol = new THREE.Color('#fad6b0').lerp(new THREE.Color('#f0b294'), k);
    shallow = new THREE.Color('#1ee3d5').lerp(new THREE.Color('#19c7c4'), k);
    deep = new THREE.Color('#0c5aa8').lerp(new THREE.Color('#0d4485'), k);
    sunElev = THREE.MathUtils.lerp(0.34, 0.19, k);
    sunAzim = 0.68; // Over southeast turquoise ocean for bright sparkling water glints!
    sunInt = THREE.MathUtils.lerp(3.2, 2.7, k);
    hemiInt = THREE.MathUtils.lerp(1.25, 1.05, k);
    fogDen = 0.00088;
  } else if (t >= 18.8 && t < 21.2) {
    // Neon twilight / dusk (2-heist.jpg)
    const k = (t - 18.8) / 2.4;
    top = new THREE.Color('#1b2556').lerp(new THREE.Color('#0b1026'), k);
    mid = new THREE.Color('#7c3a7a').lerp(new THREE.Color('#2b1e4d'), k);
    hor = new THREE.Color('#eb6b76').lerp(new THREE.Color('#6a2d66'), k);
    sunCol = new THREE.Color('#ff8c69').lerp(new THREE.Color('#818cf8'), k);
    fogCol = new THREE.Color('#4a2d5a').lerp(new THREE.Color('#1a1632'), k);
    shallow = new THREE.Color('#0ea5a8').lerp(new THREE.Color('#0d5f78'), k);
    deep = new THREE.Color('#0d2654').lerp(new THREE.Color('#07142b'), k);
    sunElev = THREE.MathUtils.lerp(0.14, 0.25, k);
    sunAzim = 0.72;
    sunInt = THREE.MathUtils.lerp(1.45, 0.88, k);
    hemiInt = THREE.MathUtils.lerp(0.75, 0.56, k);
    fogDen = 0.00155;
  } else if (t >= 21.2 || t < 5.5) {
    // Coastal midnight
    top = new THREE.Color('#070b1a');
    mid = new THREE.Color('#131b38');
    hor = new THREE.Color('#23274a');
    sunCol = new THREE.Color('#93c5fd');
    fogCol = new THREE.Color('#11162b');
    shallow = new THREE.Color('#0b4f6c');
    deep = new THREE.Color('#051024');
    sunElev = 0.38;
    sunAzim = 0.45;
    sunInt = 0.75;
    hemiInt = 0.48;
    fogDen = 0.0017;
  } else {
    // Bright sun-soaked coastal daytime
    top = new THREE.Color('#1d6fd6');
    mid = new THREE.Color('#66b5f5');
    hor = new THREE.Color('#cfeaff');
    sunCol = new THREE.Color('#fff4d6');
    fogCol = new THREE.Color('#bdddf5');
    shallow = new THREE.Color('#1ee0cf');
    deep = new THREE.Color('#0b5ca8');
    sunElev = 0.62;
    sunAzim = 0.52;
    sunInt = 3.0;
    hemiInt = 1.15;
    fogDen = 0.00085;
  }

  const sunDir = new THREE.Vector3(
    Math.cos(sunElev) * Math.cos(sunAzim),
    Math.sin(sunElev),
    Math.cos(sunElev) * Math.sin(sunAzim),
  ).normalize();

  env.skyUniforms.uTopColor.value.copy(top);
  env.skyUniforms.uMidColor.value.copy(mid);
  env.skyUniforms.uHorizonColor.value.copy(hor);
  env.skyUniforms.uSunDir.value.copy(sunDir);
  env.skyUniforms.uSunColor.value.copy(sunCol);

  env.sunLight.color.copy(sunCol);
  env.sunLight.intensity = sunInt;
  env.sunLight.position.set(focusX + sunDir.x * 230, sunDir.y * 230, focusZ + sunDir.z * 230);
  env.sunLight.target.position.set(focusX, 0, focusZ);
  env.sunLight.target.updateMatrixWorld();

  env.hemiLight.color.copy(hor);
  env.hemiLight.intensity = hemiInt;
  env.fog.color.copy(fogCol);
  env.fog.density = fogDen;

  env.waterUniforms.uSunDir.value.copy(sunDir);
  env.waterUniforms.uSunColor.value.copy(sunCol);
  env.waterUniforms.uShallowColor.value.copy(shallow);
  env.waterUniforms.uDeepColor.value.copy(deep);
  env.waterUniforms.uSkyTint.value.copy(hor);
  env.waterUniforms.uFogColor.value.copy(fogCol);
  env.waterUniforms.uFogDensity.value = fogDen;
}

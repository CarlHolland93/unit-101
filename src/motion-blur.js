import {ShaderPass} from './assets/addons/postprocessing/ShaderPass.js';

// Current-frame camera blur: depth supplies per-pixel camera velocity, while all
// colour samples come from this frame. No history texture or temporal trails.
export function createCameraMotionBlur(THREE, camera, depthTexture) {
  const pass = new ShaderPass({
    name: 'SubtleCameraMotionBlur',
    uniforms: {
      tDiffuse: {value: null},
      tDepth: {value: null},
      inverseViewProjection: {value: new THREE.Matrix4()},
      previousViewProjection: {value: new THREE.Matrix4()},
      resolution: {value: new THREE.Vector2(1, 1)},
      cameraNear: {value: camera.near},
      cameraFar: {value: camera.far},
      shutterScale: {value: .5},
      maxBlurPixels: {value: 6},
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform highp sampler2D tDepth;
      uniform mat4 inverseViewProjection;
      uniform mat4 previousViewProjection;
      uniform vec2 resolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform float shutterScale;
      uniform float maxBlurPixels;
      varying vec2 vUv;

      float viewDistance(float depth) {
        return cameraNear * cameraFar / (cameraFar - depth * (cameraFar - cameraNear));
      }
      void main() {
        vec4 centre = texture2D(tDiffuse, vUv);
        float depth = texture2D(tDepth, vUv).x;
        if (depth >= .99999) { gl_FragColor = centre; return; }
        vec4 world = inverseViewProjection * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        world /= world.w;
        vec4 previousClip = previousViewProjection * world;
        if (previousClip.w <= 0.0) { gl_FragColor = centre; return; }
        vec2 previousUv = previousClip.xy / previousClip.w * .5 + .5;
        vec2 velocityPixels = (vUv - previousUv) * resolution * shutterScale;
        float span = length(velocityPixels);
        if (span < .08) { gl_FragColor = centre; return; }
        velocityPixels *= min(1.0, maxBlurPixels / span);
        vec2 velocity = velocityPixels / resolution;
        float centreDistance = viewDistance(depth);
        float depthTolerance = max(.025, centreDistance * .018);
        vec4 accumulated = centre;
        float totalWeight = 1.0;
        // Seven centred taps, at most a six-pixel full trail (three each side).
        for (int tap = -3; tap <= 3; tap++) {
          if (tap == 0) continue;
          float offset = float(tap) / 6.0;
          vec2 sampleUv = vUv + velocity * offset;
          if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) continue;
          float sampleDepth = texture2D(tDepth, sampleUv).x;
          if (sampleDepth >= .99999) continue;
          float separation = abs(viewDistance(sampleDepth) - centreDistance);
          float edgeWeight = 1.0 - smoothstep(depthTolerance * .4, depthTolerance, separation);
          float weight = (1.0 - abs(offset)) * edgeWeight;
          accumulated += texture2D(tDiffuse, sampleUv) * weight;
          totalWeight += weight;
        }
        gl_FragColor = accumulated / totalWeight;
      }
    `,
  });
  // Keep GTAO's live depth attachment; UniformsUtils must not clone this texture.
  pass.uniforms.tDepth.value = depthTexture;
  pass.material.depthTest = false;
  pass.material.depthWrite = false;
  pass.enabled = false;
  const currentViewProjection = new THREE.Matrix4();
  const previousViewProjection = new THREE.Matrix4();
  const previousWorld = new THREE.Matrix4();
  const previousProjection = new THREE.Matrix4();
  const position = new THREE.Vector3(), previousPosition = new THREE.Vector3();
  const quaternion = new THREE.Quaternion(), previousQuaternion = new THREE.Quaternion();
  let hasPrevious = false;
  let requestedPreviously = false;
  let prepared = false;
  const matrixDifference = (a, b) => {
    let greatest = 0;
    for (let i = 0; i < 16; i++) greatest = Math.max(greatest, Math.abs(a.elements[i] - b.elements[i]));
    return greatest;
  };
  function reset() {
    hasPrevious = false;
    requestedPreviously = false;
    prepared = false;
    pass.enabled = false;
  }
  return {
    pass,
    prepare(enabled = false, dt = 1 / 60) {
      camera.updateMatrixWorld();
      currentViewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      position.setFromMatrixPosition(camera.matrixWorld);
      quaternion.setFromRotationMatrix(camera.matrixWorld);
      const validDelta = Number.isFinite(dt) && dt > 0 && dt <= .1;
      const moved = hasPrevious && matrixDifference(camera.matrixWorld, previousWorld) > 1e-7;
      const projectionChanged = hasPrevious && matrixDifference(camera.projectionMatrix, previousProjection) > 1e-7;
      // Defensive reset for a teleport or a long suspended tab, even if the
      // caller forgets to resetMotion() around a room jump or focus change.
      const jumped = hasPrevious && (position.distanceTo(previousPosition) > .5 || quaternion.angleTo(previousQuaternion) > .22);
      pass.enabled = Boolean(enabled && requestedPreviously && hasPrevious && moved && validDelta && !projectionChanged && !jumped);
      if (pass.enabled) {
        pass.uniforms.inverseViewProjection.value.copy(currentViewProjection).invert();
        pass.uniforms.previousViewProjection.value.copy(previousViewProjection);
        pass.uniforms.cameraNear.value = camera.near;
        pass.uniforms.cameraFar.value = camera.far;
        // A 1/120-second shutter gives mild, frame-rate-independent blur.
        pass.uniforms.shutterScale.value = Math.min(.75, (1 / 120) / dt);
      }
      requestedPreviously = Boolean(enabled);
      prepared = true;
    },
    commit() {
      if (!prepared) return;
      previousViewProjection.copy(currentViewProjection);
      previousWorld.copy(camera.matrixWorld);
      previousProjection.copy(camera.projectionMatrix);
      previousPosition.copy(position);
      previousQuaternion.copy(quaternion);
      hasPrevious = true;
      prepared = false;
    },
    reset,
    setSize(width, height) {
      pass.uniforms.resolution.value.set(Math.max(1, width), Math.max(1, height));
      reset();
    },
    get active() { return pass.enabled; },
  };
}

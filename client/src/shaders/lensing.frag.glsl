uniform sampler2D uStarmap;
uniform float uTime;
uniform float uMass;          // black hole mass (normalized 0-1)
uniform float uSpin;          // Kerr spin parameter 0-1
uniform float uShadowRadius;  // in shader units
uniform vec2  uResolution;

varying vec2 vUv;
varying vec3 vPosition;

// ─── Constants ───────────────────────────────────────────────────────────────
const float PI        = 3.14159265359;
const float TWO_PI    = 6.28318530718;
const float RS        = 0.08;         // Schwarzschild radius in UV space
const float DISK_INNER= 0.10;
const float DISK_OUTER= 0.28;

// ─── Utilities ───────────────────────────────────────────────────────────────
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// smooth HSV → RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ─── Gravitational Lensing ────────────────────────────────────────────────────
// Deflects UV coordinates using Schwarzschild lensing approximation.
// theta_deflect = 2*Rs / b  (weak field)
// Near the photon sphere we boost the deflection dramatically.
vec2 lens(vec2 uv, vec2 center) {
  vec2  delta = uv - center;
  float r     = length(delta);
  float rs    = RS * (0.3 + uMass * 0.7);   // scale with mass

  if (r < rs * 0.5) return center;           // inside horizon — return black

  // Deflection strength — diverges near photon sphere (1.5 * Rs)
  float photon_r  = rs * 1.5;
  float b         = max(r, photon_r * 1.001);
  float deflect   = (2.0 * rs) / b;

  // Kerr frame-dragging adds asymmetric twist
  float twist     = uSpin * 0.15 * rs / (b * b);
  vec2  tangent   = vec2(-delta.y, delta.x) / b;

  vec2 deflected  = delta + deflect * (-delta / b) + twist * tangent;
  return center + deflected;
}

// ─── Einstein Ring ────────────────────────────────────────────────────────────
float einsteinRing(vec2 uv, vec2 center) {
  float r         = length(uv - center);
  float rs        = RS * (0.3 + uMass * 0.7);
  float ring_r    = rs * 2.6;               // photon sphere projection
  float ring_w    = rs * 0.06;
  float ring      = smoothstep(ring_w, 0.0, abs(r - ring_r));
  // Pulse slightly
  ring           *= 0.7 + 0.3 * sin(uTime * 0.8);
  return ring;
}

// ─── Accretion Disk ──────────────────────────────────────────────────────────
vec4 accretionDisk(vec2 uv, vec2 center) {
  vec2  delta   = uv - center;
  float r       = length(delta);
  float angle   = atan(delta.y, delta.x);   // -PI to PI

  float rs      = RS * (0.3 + uMass * 0.7);
  float inner   = rs * 1.4;
  float outer   = rs * 3.8;

  // Disk mask — ring shaped
  float inDisk  = smoothstep(inner - 0.005, inner + 0.005, r)
                * smoothstep(outer + 0.005, outer - 0.005, r);

  if (inDisk < 0.001) return vec4(0.0);

  // Keplerian rotation — inner disk spins faster
  float omega   = pow(inner / max(r, inner), 1.5);
  float rot     = angle + uTime * omega * 0.4;

  // Radial temperature gradient — blue-white inside, orange-red outside
  float t       = (r - inner) / (outer - inner);   // 0=inner, 1=outer
  t             = clamp(t, 0.0, 1.0);

  // Temperature → color (blackbody approximation)
  vec3 innerCol = vec3(0.9, 0.95, 1.0);            // blue-white (hot)
  vec3 midCol   = vec3(1.0, 0.75, 0.3);            // yellow-orange
  vec3 outerCol = vec3(0.8, 0.2, 0.05);            // deep red (cool)

  vec3 diskCol  = t < 0.5
    ? mix(innerCol, midCol,   t * 2.0)
    : mix(midCol,   outerCol, (t - 0.5) * 2.0);

  // Doppler effect — approaching side (left) brighter+bluer, receding redder
  float doppler = sin(angle) * uSpin * 0.5 + 1.0;  // simplified projection
  diskCol      *= doppler;
  diskCol.b    += doppler * 0.15 * uSpin;

  // Brightness falloff + subtle flicker
  float bright  = (1.0 - t) * 0.9 + 0.1;
  bright       *= 0.85 + 0.15 * sin(rot * 8.0 + uTime * 2.0);

  // Disk opacity — thinner at edges
  float alpha   = inDisk * bright * (0.7 + 0.3 * sin(rot * 3.0));

  return vec4(diskCol * bright, alpha);
}

// ─── Event Horizon Glow ──────────────────────────────────────────────────────
vec3 horizonGlow(vec2 uv, vec2 center) {
  float r       = length(uv - center);
  float rs      = RS * (0.3 + uMass * 0.7);
  float glow    = smoothstep(rs * 3.0, rs * 0.9, r);
  glow         *= glow;

  // Cold blue-white corona
  vec3  col     = mix(
    vec3(0.05, 0.1, 0.3),
    vec3(0.2, 0.4, 1.0),
    glow * 0.6
  );
  return col * glow * 0.4;
}

// ─── Jet (relativistic) ──────────────────────────────────────────────────────
float relativisticJet(vec2 uv, vec2 center) {
  vec2  delta = uv - center;
  float rs    = RS * (0.3 + uMass * 0.7);

  // Narrow cone above and below
  float angle = abs(atan(delta.x, delta.y));       // angle from vertical
  float cone  = smoothstep(0.15, 0.0, angle);
  float dist  = abs(delta.y);
  float fade  = smoothstep(rs * 8.0, rs * 1.5, dist)
              * smoothstep(0.0, rs * 2.0, dist);

  return cone * fade * uSpin * 0.6;
}

// ─── Star Field Distortion ───────────────────────────────────────────────────
vec3 distortedStarfield(vec2 uv, vec2 center) {
  // Apply lensing to UV before sampling starmap
  vec2  lensed    = lens(uv, center);
  float r         = length(uv - center);
  float rs        = RS * (0.3 + uMass * 0.7);

  // Sample the starmap texture with lensed coordinates
  vec3  stars     = texture2D(uStarmap, fract(lensed)).rgb;

  // Amplify stars near photon sphere (gravitational brightening)
  float boost     = smoothstep(rs * 4.0, rs * 1.6, r);
  stars          += stars * boost * 1.5;

  return stars;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
void main() {
  vec2  uv      = vUv;
  vec2  center  = vec2(0.5, 0.5);
  float rs      = RS * (0.3 + uMass * 0.7);

  float r       = length(uv - center);

  // 1. Distorted starfield background
  vec3  col     = distortedStarfield(uv, center);

  // 2. Horizon glow corona
  col          += horizonGlow(uv, center);

  // 3. Relativistic jet
  float jet     = relativisticJet(uv, center);
  col          += vec3(0.4, 0.6, 1.0) * jet;

  // 4. Accretion disk
  vec4  disk    = accretionDisk(uv, center);
  col           = mix(col, disk.rgb, disk.a);

  // 5. Einstein ring
  float ring    = einsteinRing(uv, center);
  col          += vec3(0.6, 0.8, 1.0) * ring * 0.5;

  // 6. Event horizon — pure black circle
  float horizon = smoothstep(rs * 1.02, rs * 0.98, r);
  col           = mix(col, vec3(0.0), horizon);

  // 7. Subtle vignette
  float vignette = smoothstep(0.9, 0.3, length(uv - center) * 1.4);
  col           *= 0.6 + 0.4 * vignette;

  // Tone mapping
  col           = col / (col + vec3(1.0));          // Reinhard
  col           = pow(col, vec3(1.0 / 2.2));        // gamma correct

  gl_FragColor  = vec4(col, 1.0);
}
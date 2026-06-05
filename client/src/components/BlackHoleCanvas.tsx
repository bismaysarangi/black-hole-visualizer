import { useRef, useEffect } from "react";
import { useSimulationStore } from "../store/simulationStore";

export default function BlackHoleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { config, analysis } = useSimulationStore();

  const stateRef = useRef({
    config,
    analysis,
    animId: 0,
    startTime: 0,
  });

  useEffect(() => {
    stateRef.current.config = config;
    stateRef.current.analysis = analysis;
  }, [config, analysis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas ref not available");
      return;
    }

    if (stateRef.current.startTime === 0) {
      stateRef.current.startTime = Date.now();
    }

    const glOpts = { preserveDrawingBuffer: true, alpha: false };
    const gl = (
      canvas.getContext("webgl2", glOpts) ||
      canvas.getContext("webgl", glOpts) ||
      canvas.getContext("experimental-webgl", glOpts)
    ) as WebGLRenderingContext | null;
    if (!gl) {
      console.error("WebGL not supported in this browser");
      return;
    }

    // ── Resize ──────────────────────────────────────────────────
    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Vertex Shader ────────────────────────────────────────────
    const vertSrc = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    // ── Fragment Shader ──────────────────────────────────────────
    const fragSrc = `
      precision highp float;
      uniform sampler2D uStarmap;
      uniform float uTime;
      uniform float uMass;
      uniform float uSpin;
      uniform float uAccretion;
      uniform float uInclination;
      uniform float uHawking;
      uniform vec2  uResolution;
      varying vec2 vUv;

      const float PI = 3.14159265359;

      vec2 lensUV(vec2 uv, vec2 center, float rs) {
        vec2  d = uv - center;
        float r = length(d);
        if (r < rs * 0.5) return center;
        float photon = rs * 1.5;
        float b      = max(r, photon * 1.001);
        float defl   = (2.0 * rs) / b;
        float twist  = uSpin * 0.12 * rs / (b * b);
        vec2  tang   = vec2(-d.y, d.x) / b;
        return center + d + defl * (-d / b) + twist * tang;
      }

      vec4 accretionDisk(vec2 uv, vec2 center, float rs) {
        vec2  d    = uv - center;

        // Inclination squishes disk vertically
        float inc  = uInclination * PI / 180.0;
        float cosI = cos(inc);
        float sinI = sin(inc);

        vec2  dT   = vec2(d.x, d.y / max(cosI, 0.15));
        float r    = length(dT);
        float angle= atan(d.y, d.x);

        float inner = rs * 1.4;
        float outer = rs * (2.8 + uAccretion * 2.4);

        float mask  = smoothstep(inner - 0.003, inner + 0.003, r)
                    * smoothstep(outer + 0.003, outer - 0.003, r);

        // Edge-on fade
        float edgeFade = mix(1.0, abs(sin(angle + PI * 0.5)) * 0.5 + 0.5, sinI * 0.7);
        mask *= edgeFade;

        if (mask < 0.001) return vec4(0.0);

        float omega = pow(inner / max(r, inner), 1.5);
        float rot   = angle + uTime * omega * 0.5;
        float t     = clamp((r - inner) / (outer - inner), 0.0, 1.0);

        // Temperature colors scale with accretion rate
        vec3 c0 = vec3(0.95, 0.98, 1.0);
        vec3 c1 = mix(vec3(1.0, 0.75, 0.3), vec3(1.0, 0.9, 0.6), uAccretion);
        vec3 c2 = mix(vec3(0.7, 0.15, 0.02), vec3(0.9, 0.3, 0.05), uAccretion);
        vec3 col = t < 0.5
          ? mix(c0, c1, t * 2.0)
          : mix(c1, c2, (t - 0.5) * 2.0);

        // Doppler — projected onto inclination
        float doppler = sin(angle) * uSpin * sinI * 0.8 + 1.0;
        col *= doppler;
        col.b += (doppler - 1.0) * 0.2 * uSpin;

        float bright = (1.0 - t * 0.7)
                     * (0.7 + 0.3 * sin(rot * 6.0 + uTime * 1.5))
                     * (0.5 + uAccretion * 0.8);

        float alpha = mask * bright * (0.75 + 0.25 * sin(rot * 3.0));
        return vec4(col * bright * (1.2 + uAccretion * 0.6), alpha);
      }

      vec3 horizonGlow(vec2 uv, vec2 center, float rs) {
        float r    = length(uv - center);
        float glow = smoothstep(rs * 3.5, rs * 0.95, r);
        glow      *= glow;
        float intensity = 0.3 + uAccretion * 0.4;
        vec3 col = mix(
          vec3(0.03, 0.06, 0.2),
          vec3(0.15, 0.35, 1.0),
          glow * 0.7
        );
        return col * glow * intensity;
      }

      float einsteinRing(vec2 uv, vec2 center, float rs) {
        vec2  d    = uv - center;
        float inc  = uInclination * PI / 180.0;
        float cosI = cos(inc);
        vec2  dT   = vec2(d.x, d.y / max(cosI, 0.15));
        float r    = length(dT);
        float ring_r = rs * 2.6;
        float ring_w = rs * 0.05;
        float ring   = smoothstep(ring_w, 0.0, abs(r - ring_r));
        return ring * (0.6 + 0.4 * sin(uTime * 0.9));
      }

      float jet(vec2 uv, vec2 center, float rs) {
        vec2  d    = uv - center;
        float ang  = abs(atan(d.x, d.y));
        float cone = smoothstep(0.18, 0.0, ang);
        float dist = abs(d.y);
        float fade = smoothstep(rs * 9.0, rs * 2.0, dist)
                   * smoothstep(0.0, rs * 2.5, dist);
        float inc    = uInclination * PI / 180.0;
        float jetVis = (1.0 - sin(inc) * 0.9) * uSpin;
        return cone * fade * jetVis * 0.7;
      }

      float hawkingParticles(vec2 uv, vec2 center, float rs) {
        vec2  d    = uv - center;
        float r    = length(d);
        float angle= atan(d.y, d.x);

        float zone = smoothstep(rs * 3.0, rs * 1.1, r)
                   * smoothstep(rs * 0.9, rs * 1.5, r);
        if (zone < 0.001) return 0.0;

        float n = 0.0;
        n += sin(angle * 7.0  + uTime * 3.1 + r * 20.0) * 0.5 + 0.5;
        n += sin(angle * 13.0 - uTime * 2.3 + r * 35.0) * 0.5 + 0.5;
        n += sin(angle * 23.0 + uTime * 4.7 + r * 15.0) * 0.5 + 0.5;
        n /= 3.0;
        n  = pow(n, 4.0);

        return n * zone * 0.6;
      }

      void main() {
        vec2  uv     = vUv;
        vec2  center = vec2(0.5, 0.5);
        float aspect = uResolution.x / uResolution.y;
        vec2  uvA    = vec2((uv.x - 0.5) * aspect + 0.5, uv.y);

        float rs     = 0.07 + uMass * 0.06;

        // 1. Lensed starmap
        vec2  lensed = lensUV(uvA, center, rs);
        lensed.x     = (lensed.x - 0.5) / aspect + 0.5;
        vec3  stars  = texture2D(uStarmap, fract(lensed + uTime * 0.002)).rgb;

        float distC  = length(uvA - center);
        float boost  = smoothstep(rs * 4.0, rs * 1.7, distC);
        stars       += stars * boost * 2.0;

        vec3 col = stars;

        // 2. Horizon glow
        col += horizonGlow(uvA, center, rs);

        // 3. Relativistic jet
        float j = jet(uvA, center, rs);
        col    += vec3(0.3, 0.55, 1.0) * j;

        // 4. Accretion disk
        vec4 disk = accretionDisk(uvA, center, rs);
        col       = mix(col, disk.rgb, disk.a);

        // 5. Einstein ring
        float ring = einsteinRing(uvA, center, rs);
        col       += vec3(0.5, 0.75, 1.0) * ring * 0.6;

        // 6. Hawking radiation
        if (uHawking > 0.5) {
          float hw = hawkingParticles(uvA, center, rs);
          vec3 hwCol = mix(
            vec3(0.3, 0.6, 1.0),
            vec3(1.0, 0.5, 0.1),
            hw
          );
          col += hwCol * hw * 0.8;
        }

        // 7. Event horizon — pure black
        float horizon = smoothstep(rs * 1.02, rs * 0.97, distC);
        col           = mix(col, vec3(0.0), horizon);

        // 8. Vignette
        float vig = smoothstep(1.0, 0.3, length(uv - center) * 1.6);
        col      *= 0.5 + 0.5 * vig;

        // Tone map + gamma correct
        col = col / (col + vec3(1.0));
        col = pow(col, vec3(1.0 / 2.2));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    // ── Compile ──────────────────────────────────────────────────
    function compile(type: number, src: string) {
      if (!gl) throw new Error("WebGL context not available");
      const s = gl.createShader(type)!;
      if (!s) {
        throw new Error("Failed to create shader");
      }
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(s);
        console.error(
          `Shader compilation error (${type === gl.VERTEX_SHADER ? "vertex" : "fragment"}):`,
          err,
        );
        throw new Error(`Shader compilation failed: ${err}`);
      }
      return s;
    }

    const prog = gl.createProgram()!;
    if (!prog) {
      console.error("Failed to create WebGL program");
      return;
    }
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(prog);
      console.error("Program linking error:", err);
      return;
    }
    gl.useProgram(prog);

    // ── Full-screen quad ─────────────────────────────────────────
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // ── Uniform locations ────────────────────────────────────────
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMass = gl.getUniformLocation(prog, "uMass");
    const uSpin = gl.getUniformLocation(prog, "uSpin");
    const uAccretion = gl.getUniformLocation(prog, "uAccretion");
    const uInclination = gl.getUniformLocation(prog, "uInclination");
    const uHawking = gl.getUniformLocation(prog, "uHawking");
    const uResolution = gl.getUniformLocation(prog, "uResolution");
    const uStarmap = gl.getUniformLocation(prog, "uStarmap");

    // ── Starmap texture ──────────────────────────────────────────
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([5, 5, 15, 255]),
    );

    const img = new Image();
    img.src = "/starmap.png";
    img.onload = () => {
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
        console.log("Starmap texture loaded successfully");
      } catch (e) {
        console.error("Error loading starmap texture:", e);
      }
    };
    img.onerror = () => {
      console.warn("Failed to load /starmap.png - will use fallback colors");
    };

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uStarmap, 0);

    // ── Render loop ──────────────────────────────────────────────
    const loop = () => {
      try {
        const t = (Date.now() - stateRef.current.startTime) / 1000;
        const cfg = stateRef.current.config;
        const mass = Math.log10(cfg.mass + 1) / Math.log10(1e7 + 1);

        if (Math.floor(t) % 3 === 0 && t % 1 < 0.02) {
          console.log(
            "canvas cfg:",
            cfg.accretion_rate,
            cfg.inclination,
            cfg.hawking_on,
          );
        }

        gl.uniform1f(uTime, t);
        gl.uniform1f(uMass, mass);
        gl.uniform1f(uSpin, cfg.spin);
        gl.uniform1f(uAccretion, cfg.accretion_rate);
        gl.uniform1f(uInclination, cfg.inclination);
        gl.uniform1f(uHawking, cfg.hawking_on ? 1.0 : 0.0);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        stateRef.current.animId = requestAnimationFrame(loop);
      } catch (e) {
        console.error("Render loop error:", e);
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-blackhole-canvas
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

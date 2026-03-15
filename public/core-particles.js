/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║   SENTINAL ARC REACTOR — PREMIUM CORE v7.0                       ║
 * ║   True 3D · Orbital Physics · Sparse Particles · Clean Depth   ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

class SentinalCore3D {
    constructor(containerId) {
        this.el = document.getElementById(containerId);
        if (!this.el || !window.THREE) { console.error('[Core] Missing el or Three.js'); return; }

        this.clock = new THREE.Clock();
        this.t = 0;
        this.state = 'idle';
        this.audio = 0;
        this.audioTgt = 0;
        this.mouse = { x: 0, y: 0 };
        this.currQ = new THREE.Quaternion();
        this.tgtQ = new THREE.Quaternion();
        this.emotionColor = new THREE.Color(0x00eeff);
        this.stateColor = new THREE.Color(0x00eeff);
        this.spectralColor = new THREE.Color(0x00eeff);
        this._hsl = { h: 0, s: 0, l: 0 };
        this._tmpV = new THREE.Vector3();
        this._prevState = this.state;
        this.thunder = 0;
        this.thunderPhase = Math.random() * Math.PI * 2;
        this.statePalette = {
            idle: new THREE.Color(0x00eeff),
            listening: new THREE.Color(0x4dffd0),
            processing: new THREE.Color(0xffd779),
            speaking: new THREE.Color(0xffad78),
        };

        // -- PALETTE --
        this.P = {
            cyan: new THREE.Color(0x00eeff),
            brightCyan: new THREE.Color(0x88ffff),
            deepCyan: new THREE.Color(0x006688),
            white: new THREE.Color(0xffffff),
            teal: new THREE.Color(0x00ccbb),
            dimCyan: new THREE.Color(0x002233),
        };

        this._build();
    }

    // ─────────────────────────────────────────────────────────
    _build() {
        this._scene();
        this._glowTex();
        this._innerCore();
        this._lightning();
        // Particles disabled for a cleaner, more premium core silhouette.
        this._bind();
        this.animate = this.animate.bind(this);
        this.animate();
        console.log('[SentinalCore v7.0] ONLINE');
    }

    // ─────────────────────────────────────────────────────────
    _scene() {
        this.scene = new THREE.Scene();

        // No fog — dark transparent background
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
        this.camera.position.set(0, 0, 8.0);

        this.ren = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        this.ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.ren.setClearColor(0x000000, 0);
        if (THREE.sRGBEncoding) this.ren.outputEncoding = THREE.sRGBEncoding;
        if (THREE.ACESFilmicToneMapping !== undefined) {
            this.ren.toneMapping = THREE.ACESFilmicToneMapping;
            // Lower exposure to avoid "blown out" highlights in the core.
            this.ren.toneMappingExposure = 0.64;
        }

        const w = this.el.clientWidth || 300;
        const h = this.el.clientHeight || 300;
        this.ren.setSize(w, h);

        this.el.innerHTML = '';
        this.el.appendChild(this.ren.domElement);
        Object.assign(this.ren.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
        if (getComputedStyle(this.el).position === 'static') this.el.style.position = 'relative';

        // Lights
        this.ptLight = new THREE.PointLight(0x00eeff, 5, 28);
        this.ptLight.position.set(0, 0, 1.5);
        this.scene.add(this.ptLight);
        // Accent warm-teal rim from above
        const fill = new THREE.PointLight(0x00aacc, 2.4, 30);
        fill.position.set(4, 5, 6);
        this.scene.add(fill);
        // Blue-purple counter-rim
        const fill2 = new THREE.PointLight(0x0033aa, 1.2, 20);
        fill2.position.set(-4, -3, 3);
        this.scene.add(fill2);
        // Warm accent makes highlights feel more premium than pure cyan-only lighting.
        this.warmLight = new THREE.PointLight(0xffc07a, 1.2, 26);
        this.warmLight.position.set(-3.5, 2.2, 4.8);
        this.scene.add(this.warmLight);
        this.scene.add(new THREE.AmbientLight(0x001022, 0.85));
    }

    // ─────────────────────────────────────────────────────────
    _glowTex() {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const cx = cv.getContext('2d');
        const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0.00, 'rgba(255,255,255,0.92)');
        g.addColorStop(0.10, 'rgba(180,255,255,0.82)');
        g.addColorStop(0.35, 'rgba(0,220,255,0.50)');
        g.addColorStop(0.70, 'rgba(0,100,180,0.15)');
        g.addColorStop(1.00, 'rgba(0,0,0,0)');
        cx.fillStyle = g;
        cx.fillRect(0, 0, 64, 64);
        this.glowTex = new THREE.CanvasTexture(cv);

        // Ring + sweep textures for additional HUD-style FX.
        const rv = document.createElement('canvas');
        rv.width = rv.height = 128;
        const rx = rv.getContext('2d');
        rx.translate(64, 64);
        const rg = rx.createRadialGradient(0, 0, 0, 0, 0, 64);
        rg.addColorStop(0.00, 'rgba(0,0,0,0)');
        rg.addColorStop(0.56, 'rgba(0,0,0,0)');
        rg.addColorStop(0.62, 'rgba(255,255,255,0.95)');
        rg.addColorStop(0.72, 'rgba(0,220,255,0.30)');
        rg.addColorStop(1.00, 'rgba(0,0,0,0)');
        rx.fillStyle = rg;
        rx.beginPath();
        rx.arc(0, 0, 64, 0, Math.PI * 2);
        rx.fill();
        this.ringTex = new THREE.CanvasTexture(rv);

        const sv = document.createElement('canvas');
        sv.width = sv.height = 128;
        const sx = sv.getContext('2d');
        sx.translate(64, 64);
        const sg = sx.createRadialGradient(0, 0, 0, 0, 0, 64);
        sg.addColorStop(0.00, 'rgba(255,255,255,0)');
        sg.addColorStop(0.50, 'rgba(255,255,255,0.12)');
        sg.addColorStop(1.00, 'rgba(255,255,255,0)');
        sx.fillStyle = sg;
        sx.beginPath();
        sx.moveTo(0, 0);
        sx.arc(0, 0, 64, -0.28, 0.28);
        sx.closePath();
        sx.fill();
        sx.strokeStyle = 'rgba(120,245,255,0.35)';
        sx.lineWidth = 2;
        sx.beginPath();
        sx.arc(0, 0, 52, -0.28, 0.28);
        sx.stroke();
        this.sweepTex = new THREE.CanvasTexture(sv);
    }

    // ─────────────────────────────────────────────────────────
    _innerCore() {
        this.coreGrp = new THREE.Group();
        // New look: aggressive prismatic nucleus.
        this.coreMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x9ef8ff) },
                uPulse: { value: 0.70 },
            },
            vertexShader: `
        varying vec3 vPos;
        varying vec3 vNormal;
        void main() {
          vPos = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
            fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uPulse;
        varying vec3 vPos;
        varying vec3 vNormal;
        void main() {
          float r = length(vPos);
          float shell = smoothstep(0.55, 0.05, r);
          float lattice = abs(sin((vPos.x * 1.4 + vPos.y * 1.1 + vPos.z) * 11.0 + uTime * 2.6));
          lattice = smoothstep(0.25, 0.95, lattice);
          float bands = 0.5 + 0.5 * sin(uTime * 3.2 + r * 18.0);
          float fres = pow(1.0 - max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.9);
          float a = (0.18 + lattice * 0.30 + bands * 0.14 + fres * 0.30) * uPulse * shell;
          vec3 col = mix(uColor, vec3(1.0), 0.26 + lattice * 0.30 + fres * 0.28);
          gl_FragColor = vec4(col, a);
        }`,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.50, 64, 64), this.coreMat);
        this.coreGrp.add(this.coreSphere);

        this.coreCrystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.30, 2),
            new THREE.MeshStandardMaterial({
                color: 0xc7fbff,
                emissive: 0x3ae6ff,
                emissiveIntensity: 1.15,
                metalness: 0.25,
                roughness: 0.12,
                transparent: true,
                opacity: 0.88,
                flatShading: true,
                depthWrite: false,
            })
        );
        this.coreGrp.add(this.coreCrystal);

        this.coreWire = new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.74, 0)),
            new THREE.LineBasicMaterial({
                color: 0x8fefff,
                transparent: true,
                opacity: 0.22,
                blending: THREE.AdditiveBlending,
            })
        );
        this.coreGrp.add(this.coreWire);

        // Fresnel "glass" shell adds depth and premium rim-light without postprocessing.
        const fresnelMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00eeff) },
                uIntensity: { value: 0.12 },
                uPower: { value: 2.2 },
            },
            vertexShader: `
        varying float vF;
        varying vec2 vUv;
        uniform float uPower;
        void main(){
          vUv = uv;
          vec3 n = normalize(normalMatrix * normal);
          vec3 v = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
          vF = pow(1.0 - max(0.0, dot(n, v)), uPower);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
            fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vF;
        varying vec2 vUv;
        void main(){
          float scan = 0.6 + 0.4*sin((vUv.y + uTime*0.18) * 18.0);
          float a = vF * uIntensity * (0.85 + 0.15*scan);
          gl_FragColor = vec4(uColor, a);
        }`,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.fresnelShell = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 48), fresnelMat);
        this.fresnelShell.material.side = THREE.FrontSide;
        this.fresnelShell.renderOrder = 5;
        this.fresnelMat = fresnelMat;
        this.coreGrp.add(this.fresnelShell);

        this.scene.add(this.coreGrp);
    }

    _haloLayers() {
        this.haloGrp = new THREE.Group();

        this.crownRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.15, 0.012, 8, 160),
            new THREE.MeshBasicMaterial({
                color: 0x86fbff,
                transparent: true,
                opacity: 0.24,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            })
        );
        this.crownRing.rotation.x = Math.PI / 2;
        this.haloGrp.add(this.crownRing);

        this.scene.add(this.haloGrp);
    }

    // ─────────────────────────────────────────────────────────
    _fxLayers() {
        this.fxGrp = new THREE.Group();

        this.scanSweep = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: this.sweepTex,
                color: 0x7af5ff,
                transparent: true,
                opacity: 0.08,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        this.scanSweep.scale.set(4.8, 4.8, 1);
        this.fxGrp.add(this.scanSweep);

        this.coreSpark = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: this.glowTex,
                color: 0xffffff,
                transparent: true,
                opacity: 0.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        this.coreSpark.scale.set(1.1, 1.1, 1);
        this.coreSpark.userData = { active: false, life: 0 };
        this.fxGrp.add(this.coreSpark);

        this.shockwaves = [];
        for (let i = 0; i < 5; i++) {
            const sw = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: this.ringTex,
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            );
            sw.scale.set(1, 1, 1);
            sw.material.rotation = Math.random() * Math.PI * 2;
            sw.userData = { active: false, life: 0, speed: 0.8 + i * 0.1, intensity: 1 };
            this.shockwaves.push(sw);
            this.fxGrp.add(sw);
        }

        // Lens flares removed: they read as a "background plate" behind the rings.
        this.flares = null;

        this.scene.add(this.fxGrp);
    }

    _spawnShockwave(intensity = 1) {
        if (!this.shockwaves || this.shockwaves.length === 0) return;

        const sw = this.shockwaves.find(s => !s.userData.active) || this.shockwaves[0];
        sw.userData.active = true;
        sw.userData.life = 0;
        sw.userData.intensity = Math.max(0.15, Math.min(2.0, intensity));
        sw.material.opacity = 0.0;
        sw.material.color.copy(this.P.white).lerp(this.stateColor, 0.72);
        sw.material.rotation = Math.random() * Math.PI * 2;
        sw.scale.set(1.15, 1.15, 1);

        if (this.coreSpark) {
            this.coreSpark.userData.active = true;
            this.coreSpark.userData.life = 0;
            this.coreSpark.material.opacity = 0.55 * sw.userData.intensity;
            const sc = 1.0 + sw.userData.intensity * 0.45;
            this.coreSpark.scale.set(sc, sc, 1);
            this.coreSpark.material.color.copy(this.P.white).lerp(this.stateColor, 0.4);
        }
    }

    _rings() {
        this.ringGrp = new THREE.Group();
        this.rings = [];

        const defs = [
            // r, tube, segs, opacity, color, axis, speed, scale, rotation
            [2.12, 0.024, 180, 0.56, 0x7ff3ff, new THREE.Vector3(0, 1, 0), 0.45, [1.04, 0.92, 1.0], [0, 0, 0]],
            [2.12, 0.018, 180, 0.50, 0x9df9ff, new THREE.Vector3(1, 0, 0), -0.38, [0.94, 1.06, 1.0], [0.08, 0.18, 0]],
            [2.48, 0.013, 160, 0.36, 0x00c8d6, new THREE.Vector3(0.55, 0.75, 0.2).normalize(), 0.28, [1.06, 0.94, 1.0], [0.22, 0, 0.42]],
            [1.54, 0.009, 140, 0.30, 0xffd6a6, new THREE.Vector3(-0.6, 0.35, 0.7).normalize(), -0.22, [0.96, 1.04, 1.0], [0.28, -0.18, 0.2]],
            [2.88, 0.01, 160, 0.24, 0x6bbaff, new THREE.Vector3(0.2, -0.7, 0.6).normalize(), 0.18, [1.08, 0.94, 1.0], [-0.12, 0.26, 0]],
        ];

        defs.forEach(([r, tube, segs, op, col, ax, spd, scale, rot]) => {
            const geo = new THREE.TorusGeometry(r, tube, 8, segs);
            const mat = new THREE.MeshBasicMaterial({
                color: col,
                transparent: true,
                opacity: op,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.set(rot[0], rot[1], rot[2]);
            ring.scale.set(scale[0], scale[1], scale[2]);
            ring.userData = { ax, spd, base: op, baseColor: new THREE.Color(col) };
            this.rings.push(ring);
            this.ringGrp.add(ring);
        });

        this.scene.add(this.ringGrp);
    }

    // ─────────────────────────────────────────────────────────
    _segments() {
        this.segGrp = new THREE.Group();
        this.segs = [];

        // 14 data-segment nodes on the primary equatorial ring
        const segGeo = new THREE.BoxGeometry(0.06, 0.20, 0.06);
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const mat = new THREE.MeshBasicMaterial({
                color: 0x88ffff, transparent: true, opacity: 0.68,
                blending: THREE.AdditiveBlending
            });
            const seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(Math.cos(a) * 1.90, Math.sin(a) * 1.90, 0);
            seg.lookAt(0, 0, 0);
            seg.userData = {
                baseAngle: a,
                r: 1.90,
                spd: 0.55,
                plane: 'xy',
                offset: i * 0.4,
                baseColor: new THREE.Color(0x88ffff),
            };
            this.segs.push(seg);
            this.segGrp.add(seg);
        }

        // 10 segment nodes on the XZ ring
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00eeff, transparent: true, opacity: 0.60,
                blending: THREE.AdditiveBlending
            });
            const seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(Math.cos(a) * 1.90, 0, Math.sin(a) * 1.90);
            seg.lookAt(0, 0, 0);
            seg.userData = {
                baseAngle: a,
                r: 1.90,
                spd: -0.42,
                plane: 'xz',
                offset: i * 0.5,
                baseColor: new THREE.Color(0x00eeff),
            };
            this.segs.push(seg);
            this.segGrp.add(seg);
        }

        this.scene.add(this.segGrp);
    }

    // ─────────────────────────────────────────────────────────
    // SPARSE INNER PARTICLE CLOUD — 600 points, distinct sparkles
    _sparseParticles() {
        const N = 600;
        const positions = new Float32Array(N * 3);
        const sizes = new Float32Array(N);
        const phases = new Float32Array(N);

        for (let i = 0; i < N; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            // Most between r=1.3 and r=2.6
            const r = 1.3 + Math.pow(Math.random(), 0.5) * 1.3;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            sizes[i] = Math.random() * 3.5 + 1.0;
            phases[i] = Math.random() * Math.PI * 2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uAudio: { value: 0 },
                uGlow: { value: this.glowTex },
                uTint: { value: new THREE.Color(0x00eeff) },
            },
            vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uAudio;
        varying float vAlpha;
        void main(){
          float pulse = 0.85 + 0.15*sin(uTime*2.8 + aPhase) + uAudio*0.3;
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          vAlpha = 0.12 + 0.28*abs(sin(uTime*1.8 + aPhase));
          gl_PointSize = aSize * pulse * (60.0 / -mvp.z);
          gl_Position  = projectionMatrix * mvp;
        }`,
            fragmentShader: `
        uniform sampler2D uGlow;
        uniform vec3 uTint;
        varying float vAlpha;
        void main(){
          vec4 tex = texture2D(uGlow, gl_PointCoord);
          if(tex.a < 0.01) discard;
          // Bright cyan-white sparkle
          vec3 coreCol = mix(vec3(0.0, 0.92, 1.0), vec3(1.0,1.0,1.0), tex.r);
          vec3 col = mix(coreCol, uTint, 0.45);
          gl_FragColor = vec4(col, tex.a * vAlpha);
        }`,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.innerCloud = new THREE.Points(geo, mat);
        this.innerCloudMat = mat;
        this.scene.add(this.innerCloud);
    }

    // ─────────────────────────────────────────────────────────
    // OUTER DOTS — 400 scattered sparkles further out
    _outerDots() {
        const N = 400;
        const pos = new Float32Array(N * 3);
        const phases = new Float32Array(N);
        const sizes = new Float32Array(N);

        for (let i = 0; i < N; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2.7 + Math.random() * 1.8;
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
            sizes[i] = Math.random() * 2.2 + 0.5;
            phases[i] = Math.random() * Math.PI * 2;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uAudio: { value: 0 },
                uGlow: { value: this.glowTex },
                uTint: { value: new THREE.Color(0x00eeff) },
            },
            vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uAudio;
        varying float vAlpha;
        void main(){
          float pulse = 1.0 + uAudio*0.5;
          vec4 mvp = modelViewMatrix * vec4(position, 1.0);
          vAlpha = 0.08 + 0.20*abs(sin(uTime*1.2 + aPhase));
          gl_PointSize = aSize * pulse * (55.0 / -mvp.z);
          gl_Position  = projectionMatrix * mvp;
        }`,
            fragmentShader: `
        uniform sampler2D uGlow;
        uniform vec3 uTint;
        varying float vAlpha;
        void main(){
          vec4 tex = texture2D(uGlow, gl_PointCoord);
          if(tex.a < 0.01) discard;
          vec3 col = mix(vec3(0.0, 0.85, 1.0), uTint, 0.60);
          gl_FragColor = vec4(col, tex.a * vAlpha);
        }`,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.outerDots = new THREE.Points(geo, mat);
        this.outerDotsMat = mat;
        this.scene.add(this.outerDots);
    }

    // ─────────────────────────────────────────────────────────
    _lightning() {
        this.bolts = [];
        this.boltGrp = new THREE.Group();

        for (let i = 0; i < 14; i++) {
            const geo = new THREE.BufferGeometry().setFromPoints(this._zapPath(
                new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6),
                new THREE.Vector3((Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6),
                7
            ));
            const mat = new THREE.LineBasicMaterial({
                color: i % 4 === 0 ? 0xffffff : 0x00eeff,
                transparent: true, opacity: 0, blending: THREE.AdditiveBlending
            });
            const line = new THREE.Line(geo, mat);
            line.userData = { cd: Math.random() * 2.5 };
            this.bolts.push(line);
            this.boltGrp.add(line);
        }

        this.scene.add(this.boltGrp);
    }

    _zapPath(a, b, n) {
        const pts = [a.clone()];
        const dir = b.clone().sub(a);
        for (let i = 1; i < n; i++) {
            const p = a.clone().add(dir.clone().multiplyScalar(i / n));
            p.x += (Math.random() - 0.5) * 1.0;
            p.y += (Math.random() - 0.5) * 1.0;
            p.z += (Math.random() - 0.5) * 1.0;
            pts.push(p);
        }
        pts.push(b.clone());
        return pts;
    }

    // ─────────────────────────────────────────────────────────
    _bind() {
        window.addEventListener('resize', () => this._resize());
        this._resize();

        window.addEventListener('sentinal-state', e => {
            const s = e.detail?.state;
            if (['idle', 'listening', 'processing', 'speaking'].includes(s)) this.state = s;
        });
        window.addEventListener('sentinal-emotion-color', e => {
            const hex = e.detail?.color;
            if (typeof hex === 'string') this.emotionColor.set(hex);
        });

        // Also pick up the CSS theme color (set by the feelings UI) as a fallback.
        const readCssEmotion = () => {
            const css = getComputedStyle(document.documentElement)
                .getPropertyValue('--sentinal-emotion-color')
                .trim();
            if (css) this.emotionColor.set(css);
        };
        readCssEmotion();
        this._cssEmotionTimer = window.setInterval(readCssEmotion, 900);
        window.addEventListener('beforeunload', () => clearInterval(this._cssEmotionTimer));

        const panel = this.el.closest('.left-panel') || document.body;
        panel.addEventListener('mousemove', e => {
            const r = panel.getBoundingClientRect();
            this.mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            this.mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        });
    }

    _resize() {
        const w = this.el.clientWidth, h = this.el.clientHeight;
        if (!w || !h) return;
        this.ren.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    setState(s) {
        if (['idle', 'listening', 'processing', 'speaking'].includes(s)) this.state = s;
    }

    // ─────────────────────────────────────────────────────────
    animate() {
        requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.t += delta;
        const t = this.t;

        // State speed multiplier
        const sm = { idle: 1.0, listening: 1.7, processing: 3.0, speaking: 2.1 }[this.state] || 1.0;
        const energyBoost = { idle: 1.0, listening: 1.15, processing: 1.42, speaking: 1.28 }[this.state] || 1.0;

        // Simulated audio
        if (this.state === 'processing') this.audioTgt = 0.5 + Math.sin(t * 16) * 0.30;
        else if (this.state === 'speaking') this.audioTgt = 0.2 + Math.sin(t * 8) * 0.18;
        else if (this.state === 'listening') this.audioTgt = 0.1 + Math.abs(Math.sin(t * 5)) * 0.10;
        else this.audioTgt = 0.02 + Math.abs(Math.sin(t * 0.8)) * 0.03;
        this.audio += (this.audioTgt - this.audio) * Math.min(1, delta * 8);
        const au = this.audio;
        this.stateColor.copy(this.statePalette[this.state] || this.statePalette.idle).lerp(this.emotionColor, 0.36);

        this.thunder = Math.max(0, this.thunder - delta * 2.6);
        const thunderF = this.thunder * (0.6 + Math.sin(t * 28 + this.thunderPhase) * 0.4);

        // Subtle hue drift makes the core feel more "alive" without looking rainbow-noisy.
        this.spectralColor.copy(this.stateColor);
        this.spectralColor.getHSL(this._hsl);
        const hueShift = Math.sin(t * 0.18) * (this.state === 'processing' ? 0.035 : this.state === 'speaking' ? 0.025 : 0.015);
        this.spectralColor.setHSL(
            (this._hsl.h + hueShift + 1) % 1,
            Math.min(1, this._hsl.s * 1.08 + 0.02),
            Math.min(1, this._hsl.l * 1.04 + 0.01)
        );

        if (this._prevState !== this.state) {
            this._prevState = this.state;
            this._spawnShockwave(0.9 + au * 1.1);
        }
        if ((this.state === 'processing' || this.state === 'speaking') && Math.random() < delta * (this.state === 'processing' ? 0.85 : 0.55)) {
            this._spawnShockwave(0.55 + au * 1.2);
        }

        this.camera.position.z = 8.0 - au * 0.38 - (energyBoost - 1) * 0.12 + Math.sin(t * 0.45) * 0.08;

        // ── Shader time ─────────────────────────────────
        if (this.innerCloudMat) {
            this.innerCloudMat.uniforms.uTime.value += delta * sm;
            this.innerCloudMat.uniforms.uAudio.value = au;
            this.innerCloudMat.uniforms.uTint.value.lerp(this.spectralColor, 0.08);
        }
        if (this.outerDotsMat) {
            this.outerDotsMat.uniforms.uTime.value += delta * 0.5;
            this.outerDotsMat.uniforms.uAudio.value = au;
            this.outerDotsMat.uniforms.uTint.value.lerp(this.spectralColor, 0.06);
        }

        if (this.scanSweep) {
            const sweepBase = this.state === 'processing' ? 0.14 : this.state === 'speaking' ? 0.11 : this.state === 'listening' ? 0.10 : 0.08;
            this.scanSweep.material.opacity = Math.min(0.42, sweepBase + au * 0.16 + Math.abs(Math.sin(t * 0.6)) * 0.03);
            this.scanSweep.material.color.lerp(this.spectralColor, 0.08);
            this.scanSweep.material.rotation += delta * (0.55 * sm);
            const sc = 4.8 + Math.sin(t * 1.2) * 0.10 + au * 0.55;
            this.scanSweep.scale.set(sc, sc, 1);
        }

        if (this.coreSpark && this.coreSpark.userData && this.coreSpark.userData.active) {
            this.coreSpark.userData.life += delta * 2.4;
            const p = this.coreSpark.userData.life;
            const fade = Math.max(0, 1 - p);
            this.coreSpark.material.opacity = (this.coreSpark.userData.maxOp || this.coreSpark.material.opacity) * fade;
            const baseScale = this.coreSpark.userData.baseScale || this.coreSpark.scale.x;
            const s = baseScale * (1 + p * 0.35);
            this.coreSpark.scale.set(s, s, 1);
            this.coreSpark.material.color.lerp(this.spectralColor, 0.08);
            if (p >= 1) {
                this.coreSpark.userData.active = false;
                this.coreSpark.material.opacity = 0.0;
            }
        }

        if (this.shockwaves) {
            this.shockwaves.forEach((sw) => {
                if (!sw.userData.active) return;
                sw.userData.life += delta * sw.userData.speed;
                const p = sw.userData.life;
                const eased = 1 - Math.pow(1 - Math.min(1, p), 2.4);
                const s = 1.15 + eased * (3.8 + sw.userData.intensity * 0.6);
                sw.scale.set(s, s, 1);
                const swOp = (1 - p) * (0.32 + au * 0.26) * sw.userData.intensity;
                sw.material.opacity = Math.min(0.55, Math.max(0, swOp));
                sw.material.color.copy(this.P.white).lerp(this.spectralColor, 0.66);
                sw.material.rotation += delta * (0.35 + sw.userData.speed * 0.12);
                if (p >= 1) {
                    sw.userData.active = false;
                    sw.material.opacity = 0.0;
                }
            });
        }

        if (this.flares) {
            // Keep the core visually aligned; outer DOM wrapper handles parallax tilt.
            const px = 0.0;
            const py = 0.0;
            this.flares.forEach((sp, i) => {
                const wob = Math.sin(t * (0.65 + i * 0.18) + i * 1.7) * 0.04;
                const par = 0.65 + i * 0.18;
                sp.position.set(sp.userData.baseX + px * par, sp.userData.baseY + py * par, 0);
                const fScale = sp.userData.baseScale * (1 + au * (0.22 + i * 0.06) + wob * 0.25);
                sp.scale.set(fScale, fScale, 1);
                const stateBoost = this.state === 'processing' ? 0.06 : this.state === 'speaking' ? 0.04 : 0.0;
                sp.material.opacity = sp.userData.baseOp + au * (0.10 + i * 0.05) + stateBoost;
                sp.material.color.lerp(this.spectralColor, 0.06);
            });
        }

        // ── Particle clouds drift ─────────────────────────
        if (this.innerCloud) {
            this.innerCloud.rotation.y -= delta * 0.06 * sm;
            this.innerCloud.rotation.x = Math.sin(t * 0.18) * 0.05;
        }
        if (this.outerDots) {
            this.outerDots.rotation.y += delta * 0.03;
            this.outerDots.rotation.z -= delta * 0.02;
        }

        // ── Inner Core ────────────────────────────────────
        if (this.coreGrp) {
            const breathe = 1.0 + Math.sin(t * 1.8) * 0.02 + au * 0.10;
            this.coreGrp.scale.setScalar(breathe);
            this.coreGrp.rotation.x = Math.sin(t * 18) * 0.02 * this.thunder;
            this.coreGrp.rotation.y = Math.cos(t * 20) * 0.02 * this.thunder;

            if (this.coreMat) {
                this.coreMat.uniforms.uTime.value += delta * (1.6 * sm);
                this.coreMat.uniforms.uPulse.value = 0.62 + au * 0.55 + thunderF * 0.35;
                this.coreMat.uniforms.uColor.value.lerp(this.spectralColor, 0.10);
            }

            if (this.coreSphere) {
                const s = 1.0 + Math.sin(t * 3.8) * 0.05 + au * 0.14 + thunderF * 0.08;
                this.coreSphere.scale.setScalar(s);
            }

            if (this.coreCrystal) {
                this.coreCrystal.rotation.y += delta * 0.85 * sm;
                this.coreCrystal.rotation.x -= delta * 0.65 * sm;
                const crystalOp = 0.65 + au * 0.28 + Math.sin(t * 3.2) * 0.06;
                this.coreCrystal.material.opacity = Math.min(0.95, Math.max(0.3, crystalOp));
                this.coreCrystal.material.color.lerp(this.spectralColor, 0.22);
                if (this.coreCrystal.material.emissive) {
                    this.coreCrystal.material.emissive.lerp(this.spectralColor, 0.18);
                    this.coreCrystal.material.emissiveIntensity = 0.95 + au * 0.6 + thunderF * 1.1;
                }
            }

            if (this.coreWire) {
                this.coreWire.rotation.y += delta * 0.65 * sm;
                this.coreWire.rotation.x += delta * 0.45 * sm;
                const wireOp = 0.12 + Math.sin(t * 3.2) * 0.06 + au * 0.18;
                this.coreWire.material.opacity = Math.min(0.42, Math.max(0.06, wireOp));
                this.coreWire.material.color.lerp(this.spectralColor, 0.10);
            }


            if (this.fresnelMat && this.fresnelShell) {
                this.fresnelMat.uniforms.uTime.value += delta * sm;
                this.fresnelMat.uniforms.uColor.value.lerp(this.spectralColor, 0.08);
                const ib = this.state === 'processing' ? 0.16 : this.state === 'speaking' ? 0.15 : this.state === 'listening' ? 0.14 : 0.12;
                this.fresnelMat.uniforms.uIntensity.value = Math.min(0.24, ib + au * 0.16);
                this.fresnelMat.uniforms.uPower.value = 1.9 + Math.abs(Math.sin(t * 0.85)) * 0.45 + au * 0.28;
                const s = 1.05 + au * 0.05 + Math.sin(t * 1.1) * 0.01;
                this.fresnelShell.scale.set(s, s, s);
            }
        }

        if (this.haloGrp && this.crownRing) {
            this.haloGrp.rotation.z -= delta * 0.06 * sm;
            this.crownRing.rotation.y += delta * 0.6 * sm;
            this.crownRing.rotation.x += delta * 0.2 * sm;
            const crownOp = 0.12 + Math.abs(Math.sin(t * 2.4)) * 0.10 + au * 0.10;
            this.crownRing.material.opacity = Math.min(0.36, Math.max(0.05, crownOp));
            this.crownRing.material.color.lerp(this.stateColor, 0.07);
        }

        // ── Point light pulse ─────────────────────────────
        if (this.ptLight) {
            this.ptLight.intensity = (3.4 + au * 4.8 + Math.sin(t * 2.8) * 0.65 + thunderF * 6.2) * (energyBoost * 0.85);
            this.ptLight.color.lerp(this.stateColor, 0.08);
        }
        if (this.warmLight) {
            this.warmLight.intensity = 0.8 + Math.max(0, Math.sin(t * 1.2)) * 0.25 + (this.state === 'speaking' ? 0.45 : this.state === 'processing' ? 0.34 : 0.16);
            this.warmLight.color.setHex(this.state === 'processing' ? 0xffdc8a : this.state === 'speaking' ? 0xffb07c : 0xffc07a);
        }

        // ── Orbital Rings ─────────────────────────────────

        // ── Segment Nodes orbit ───────────────────────────
        if (this.segs) {
            this.segs.forEach(seg => {
                const d = seg.userData;
                const a = d.baseAngle + t * d.spd;
                if (d.plane === 'xy') seg.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, 0);
                else seg.position.set(Math.cos(a) * d.r, 0, Math.sin(a) * d.r);
                seg.lookAt(0, 0, 0);
                seg.material.opacity = 0.60 + Math.sin(t * 5 + d.offset) * 0.35 + au * 0.4;
                seg.material.color.copy(d.baseColor).lerp(this.stateColor, 0.42);
                const ns = 1.0 + Math.sin(t * 6 + d.offset) * 0.15 + au * 0.5;
                seg.scale.setScalar(Math.max(0.1, ns));
            });
        }

        // ── Arc Lightning ─────────────────────────────────
        if (this.bolts) {
            const fProb = this.state === 'processing' ? 0.16
                : this.state === 'speaking' ? 0.09
                    : this.state === 'listening' ? 0.04 : 0.012;

            this.bolts.forEach(b => {
                b.userData.cd -= delta;
                if (b.material.opacity > 0) b.material.opacity -= delta * 6;
                b.material.color.lerp(this.stateColor, 0.12);
                if (b.userData.cd <= 0 && Math.random() < fProb) {
                    b.material.opacity = 0.7 + Math.random() * 0.3;
                    b.userData.cd = 1.0 + Math.random() * 2.5;
                    this.thunder = Math.min(1.2, Math.max(this.thunder, 0.7 + Math.random() * 0.6));
                    const pts = this._zapPath(
                        new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6),
                        new THREE.Vector3((Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 2.6),
                        7
                    );
                    b.geometry.setFromPoints(pts);
                    b.geometry.attributes.position.needsUpdate = true;
                }
            });
        }

        // ── Keep the core aligned (no internal mouse tilt) ───────────
        this.tgtQ.identity();
        this.currQ.slerp(this.tgtQ, 0.06);
        this.scene.quaternion.copy(this.currQ);

        this.ren.render(this.scene, this.camera);
    }
}

// ══════════════════════════════════════════════════════════════
// AUTO-INIT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const tryInit = () => {
        if (!window.THREE) { setTimeout(tryInit, 100); return; }
        const container = document.getElementById('tesseract-container');
        if (!container) return;
        window.sentinalCore3D = new SentinalCore3D('tesseract-container');
    };
    tryInit();
});

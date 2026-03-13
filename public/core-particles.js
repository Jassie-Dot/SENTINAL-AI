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
        this._rings();
        this._segments();
        this._sparseParticles();
        this._outerDots();
        this._lightning();
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

        const w = this.el.clientWidth || 300;
        const h = this.el.clientHeight || 300;
        this.ren.setSize(w, h);

        this.el.innerHTML = '';
        this.el.appendChild(this.ren.domElement);
        Object.assign(this.ren.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
        if (getComputedStyle(this.el).position === 'static') this.el.style.position = 'relative';

        // Lights
        this.ptLight = new THREE.PointLight(0x00eeff, 6, 28);
        this.ptLight.position.set(0, 0, 1.5);
        this.scene.add(this.ptLight);
        // Accent warm-teal rim from above
        const fill = new THREE.PointLight(0x00aacc, 3, 30);
        fill.position.set(4, 5, 6);
        this.scene.add(fill);
        // Blue-purple counter-rim
        const fill2 = new THREE.PointLight(0x0033aa, 1.5, 20);
        fill2.position.set(-4, -3, 3);
        this.scene.add(fill2);
        this.scene.add(new THREE.AmbientLight(0x001022, 1.0));
    }

    // ─────────────────────────────────────────────────────────
    _glowTex() {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const cx = cv.getContext('2d');
        const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0.00, 'rgba(255,255,255,1)');
        g.addColorStop(0.10, 'rgba(180,255,255,0.95)');
        g.addColorStop(0.35, 'rgba(0,220,255,0.60)');
        g.addColorStop(0.70, 'rgba(0,100,180,0.15)');
        g.addColorStop(1.00, 'rgba(0,0,0,0)');
        cx.fillStyle = g;
        cx.fillRect(0, 0, 64, 64);
        this.glowTex = new THREE.CanvasTexture(cv);
    }

    // ─────────────────────────────────────────────────────────
    _innerCore() {
        this.coreGrp = new THREE.Group();

        // ── Hot white plasma ball ──────────────────────────────
        this.plasmaMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.plasmaMesh);

        // ── Inner coronal ring ─────────────────────────────────
        this.coronalRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.52, 0.035, 16, 80),
            new THREE.MeshBasicMaterial({ color: 0x00eeff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
        );
        this.coreGrp.add(this.coronalRing);

        // ── Icosahedron wireframe A (primary lattice) ──────────
        this.latticeA = new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.9, 2)),
            new THREE.LineBasicMaterial({ color: 0x00eeff, transparent: true, opacity: 0.70, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.latticeA);

        // ── Icosahedron wireframe B (counter spin, larger) ─────
        this.latticeB = new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.22, 1)),
            new THREE.LineBasicMaterial({ color: 0x0099bb, transparent: true, opacity: 0.40, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.latticeB);

        // ── Octahedron frame (tumbles diagonally) ─────────────
        this.latticeC = new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.75, 1)),
            new THREE.LineBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.latticeC);

        // ── Dodecahedron wireframe D (slow tumble, outermost lattice) ─
        this.latticeD = new THREE.LineSegments(
            new THREE.WireframeGeometry(new THREE.DodecahedronGeometry(1.55, 0)),
            new THREE.LineBasicMaterial({ color: 0x004455, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.latticeD);

        // ── Second coronal ring (perpendicular axis, tilted 90°) ───────
        this.coronalRing2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.60, 0.020, 12, 80),
            new THREE.MeshBasicMaterial({ color: 0x44ffee, transparent: true, opacity: 0.60, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
        );
        this.coronalRing2.rotation.x = Math.PI / 2;
        this.coreGrp.add(this.coronalRing2);

        // ── Equatorial energy disc (flat thin ring that pulses) ────────
        this.energyDisc = new THREE.Mesh(
            new THREE.TorusGeometry(0.78, 0.008, 6, 120),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.50, blending: THREE.AdditiveBlending })
        );
        this.coreGrp.add(this.energyDisc);

        this.scene.add(this.coreGrp);
    }

    // ─────────────────────────────────────────────────────────
    _rings() {
        this.ringGrp = new THREE.Group();
        this.rings = [];

        const defs = [
            // r,   tube,  segs, opacity, color,      ax,                                    speed
            [2.05, 0.025, 180, 0.92, 0x00eeff, new THREE.Vector3(0, 1, 0), 0.55],
            [2.05, 0.018, 180, 0.82, 0x88ffff, new THREE.Vector3(1, 0, 0), -0.42],
            [2.35, 0.013, 160, 0.65, 0x00ccbb, new THREE.Vector3(0.7, 0.7, 0).normalize(), 0.30],
            [1.75, 0.011, 140, 0.52, 0x00eeff, new THREE.Vector3(0, 0, 1), -0.25],
            [2.68, 0.008, 120, 0.38, 0x006688, new THREE.Vector3(0.5, -0.5, 0.7).normalize(), 0.20],
            [1.55, 0.006, 100, 0.30, 0x00eeff, new THREE.Vector3(-1, 0.4, 0).normalize(), -0.18],
        ];

        defs.forEach(([r, tube, segs, op, col, ax, spd]) => {
            const geo = new THREE.TorusGeometry(r, tube, 8, segs);
            const mat = new THREE.MeshBasicMaterial({
                color: col, transparent: true, opacity: op,
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.userData = { ax, spd, base: op };
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
                color: 0x88ffff, transparent: true, opacity: 0.85,
                blending: THREE.AdditiveBlending
            });
            const seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(Math.cos(a) * 1.90, Math.sin(a) * 1.90, 0);
            seg.lookAt(0, 0, 0);
            seg.userData = { baseAngle: a, r: 1.90, spd: 0.55, plane: 'xy', offset: i * 0.4 };
            this.segs.push(seg);
            this.segGrp.add(seg);
        }

        // 10 segment nodes on the XZ ring
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00eeff, transparent: true, opacity: 0.75,
                blending: THREE.AdditiveBlending
            });
            const seg = new THREE.Mesh(segGeo, mat);
            seg.position.set(Math.cos(a) * 1.90, 0, Math.sin(a) * 1.90);
            seg.lookAt(0, 0, 0);
            seg.userData = { baseAngle: a, r: 1.90, spd: -0.42, plane: 'xz', offset: i * 0.5 };
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
        varying float vAlpha;
        void main(){
          vec4 tex = texture2D(uGlow, gl_PointCoord);
          if(tex.a < 0.01) discard;
          // Bright cyan-white sparkle
          vec3 col = mix(vec3(0.0, 0.92, 1.0), vec3(1.0,1.0,1.0), tex.r);
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
        varying float vAlpha;
        void main(){
          vec4 tex = texture2D(uGlow, gl_PointCoord);
          if(tex.a < 0.01) discard;
          gl_FragColor = vec4(0.0, 0.85, 1.0, tex.a * vAlpha);
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

        for (let i = 0; i < 12; i++) {
            const geo = new THREE.BufferGeometry().setFromPoints(this._zapPath(
                new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2),
                new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4),
                7
            ));
            const mat = new THREE.LineBasicMaterial({
                color: i % 4 === 0 ? 0xffffff : 0x00eeff,
                transparent: true, opacity: 0, blending: THREE.AdditiveBlending
            });
            const line = new THREE.Line(geo, mat);
            line.userData = { cd: Math.random() * 3 };
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

        // Simulated audio
        if (this.state === 'processing') this.audioTgt = 0.5 + Math.sin(t * 16) * 0.30;
        else if (this.state === 'speaking') this.audioTgt = 0.2 + Math.sin(t * 8) * 0.18;
        else if (this.state === 'listening') this.audioTgt = 0.1 + Math.abs(Math.sin(t * 5)) * 0.10;
        else this.audioTgt = 0.02 + Math.abs(Math.sin(t * 0.8)) * 0.03;
        this.audio += (this.audioTgt - this.audio) * Math.min(1, delta * 8);
        const au = this.audio;

        // ── Shader time ─────────────────────────────────
        if (this.innerCloudMat) {
            this.innerCloudMat.uniforms.uTime.value += delta * sm;
            this.innerCloudMat.uniforms.uAudio.value = au;
        }
        if (this.outerDotsMat) {
            this.outerDotsMat.uniforms.uTime.value += delta * 0.5;
            this.outerDotsMat.uniforms.uAudio.value = au;
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
            const breathe = 1.0 + Math.sin(t * 2.4) * 0.04 + au * 0.18;
            this.coreGrp.scale.setScalar(breathe);

            // Plasma pulsing
            this.plasmaMesh.material.opacity = 0.80 + au * 0.20;
            this.coronalRing.rotation.z += delta * 0.8 * sm;
            this.coronalRing.material.opacity = 0.65 + Math.sin(t * 3) * 0.20 + au * 0.30;

            // Lattice A spins forward
            this.latticeA.rotation.y += delta * 0.42 * sm;
            this.latticeA.rotation.x += delta * 0.20 * sm;
            this.latticeA.material.opacity = 0.50 + Math.sin(t * 4) * 0.18 + au * 0.35;

            // Lattice B counter-spins
            this.latticeB.rotation.y -= delta * 0.30 * sm;
            this.latticeB.rotation.z += delta * 0.15 * sm;
            this.latticeB.material.opacity = 0.28 + Math.sin(t * 2.5) * 0.10 + au * 0.22;

            // Lattice C tumbles
            this.latticeC.rotation.x += delta * 0.25 * sm;
            this.latticeC.rotation.y -= delta * 0.18 * sm;
            this.latticeC.material.opacity = 0.22 + Math.sin(t * 5) * 0.10 + au * 0.18;

            // Lattice D (dodecahedron) — slow majestic tumble
            if (this.latticeD) {
                this.latticeD.rotation.x += delta * 0.08 * sm;
                this.latticeD.rotation.y += delta * 0.06 * sm;
                this.latticeD.rotation.z -= delta * 0.04 * sm;
                this.latticeD.material.opacity = 0.12 + Math.sin(t * 1.5) * 0.08 + au * 0.15;
            }

            // Second coronal ring — spins on X (perpendicular)
            if (this.coronalRing2) {
                this.coronalRing2.rotation.y += delta * 1.1 * sm;
                this.coronalRing2.material.opacity = 0.50 + Math.sin(t * 4.5) * 0.25 + au * 0.35;
            }

            // Energy disc — thin equatorial flash ring
            if (this.energyDisc) {
                this.energyDisc.rotation.z -= delta * 0.4 * sm;
                // Dramatic flash pulse
                const flash = 0.30 + Math.pow(Math.abs(Math.sin(t * 2.2)), 3) * 0.60 + au * 0.40;
                this.energyDisc.material.opacity = Math.min(0.95, flash);
            }
        }

        // ── Point light pulse ─────────────────────────────
        if (this.ptLight) {
            this.ptLight.intensity = 4.0 + au * 6.0 + Math.sin(t * 2.8) * 0.9;
            // Color shift: cyan → white at high audio
            this.ptLight.color.lerp(au > 0.3 ? this.P.brightCyan : this.P.cyan, 0.05);
        }

        // ── Orbital Rings ─────────────────────────────────
        if (this.rings) {
            this.rings.forEach(ring => {
                ring.rotateOnAxis(ring.userData.ax, delta * ring.userData.spd * sm);
                const op = ring.userData.base + au * 0.30 + Math.sin(t * 2.5 + ring.userData.spd) * 0.05;
                ring.material.opacity = Math.min(1.0, Math.max(0.05, op));
            });
        }

        // ── Segment Nodes orbit ───────────────────────────
        if (this.segs) {
            this.segs.forEach(seg => {
                const d = seg.userData;
                const a = d.baseAngle + t * d.spd;
                if (d.plane === 'xy') seg.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, 0);
                else seg.position.set(Math.cos(a) * d.r, 0, Math.sin(a) * d.r);
                seg.lookAt(0, 0, 0);
                seg.material.opacity = 0.60 + Math.sin(t * 5 + d.offset) * 0.35 + au * 0.4;
                const ns = 1.0 + Math.sin(t * 6 + d.offset) * 0.15 + au * 0.5;
                seg.scale.setScalar(Math.max(0.1, ns));
            });
        }

        // ── Arc Lightning ─────────────────────────────────
        if (this.bolts) {
            const fProb = this.state === 'processing' ? 0.10
                : this.state === 'speaking' ? 0.05
                    : this.state === 'listening' ? 0.02 : 0.006;

            this.bolts.forEach(b => {
                b.userData.cd -= delta;
                if (b.material.opacity > 0) b.material.opacity -= delta * 6;
                if (b.userData.cd <= 0 && Math.random() < fProb) {
                    b.material.opacity = 0.7 + Math.random() * 0.3;
                    b.userData.cd = 1.0 + Math.random() * 2.5;
                    const pts = this._zapPath(
                        new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2),
                        new THREE.Vector3((Math.random() - 0.5) * 4.0, (Math.random() - 0.5) * 4.0, (Math.random() - 0.5) * 4.0),
                        7
                    );
                    b.geometry.setFromPoints(pts);
                    b.geometry.attributes.position.needsUpdate = true;
                }
            });
        }

        // ── Mouse parallax ────────────────────────────────
        this.tgtQ.setFromEuler(new THREE.Euler(-this.mouse.y * 0.14, this.mouse.x * 0.14, 0, 'XYZ'));
        this.currQ.slerp(this.tgtQ, 0.035);
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

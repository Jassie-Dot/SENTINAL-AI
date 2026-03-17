/**
 * SENTINAL PRO - Quantum Reactor 3D Core
 * Three.js powered toroidal plasma reactor with holographic rings,
 * particle aurora, energy field, and state reactivity.
 */

class SentinalCore3D {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) return;

        this.width = this.container.clientWidth || 400;
        this.height = this.container.clientHeight || 400;
        this.state = 'idle'; // idle, listening, processing, speaking
        this.emotionColor = new THREE.Color(0x00eaff);
        this.targetColor = new THREE.Color(0x00eaff);
        this.time = 0;
        this.disposed = false;
        this.mouseX = 0;
        this.mouseY = 0;

        this._initScene();
        this._createCore();
        this._createParticles();
        this._createLightning();
        this._animate();

        // Mouse parallax
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            this.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        });

        // Resize
        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(this.container);
    }

    _initScene() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
        this.camera.position.set(0, 0, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Ambient light
        const ambient = new THREE.AmbientLight(0x112244, 0.5);
        this.scene.add(ambient);

        // Point light at core
        this.coreLight = new THREE.PointLight(0x00eaff, 2, 10);
        this.scene.add(this.coreLight);
    }

    _createCore() {
        // Central Icosahedron Core (Highly detailed geometric plasma)
        const innerGeo = new THREE.IcosahedronGeometry(0.3, 2);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x00eaff,
            emissive: 0x00eaff,
            emissiveIntensity: 0.8,
            wireframe: false,
            transparent: true,
            opacity: 0.95
        });
        this.core = new THREE.Mesh(innerGeo, innerMat);
        this.scene.add(this.core);

        // Wireframe geometric shell
        const wireGeo = new THREE.IcosahedronGeometry(0.45, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xa855f7,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        this.wireCore = new THREE.Mesh(wireGeo, wireMat);
        this.scene.add(this.wireCore);

        // Core glow outer shell
        const glowGeo = new THREE.SphereGeometry(0.55, 64, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00eaff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.coreGlow = new THREE.Mesh(glowGeo, glowMat);
        this.scene.add(this.coreGlow);

        // Pulsing Energy Halo
        const haloGeo = new THREE.SphereGeometry(0.9, 64, 64);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0x00eaff,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.halo = new THREE.Mesh(haloGeo, haloMat);
        this.scene.add(this.halo);
    }



    _createParticles() {
        const count = 1500; // Extremely dense particle system
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const dynamics = new Float32Array(count * 3); // For swirling math

        const cyan = new THREE.Color(0x00eaff);
        const purple = new THREE.Color(0xa855f7);
        const white = new THREE.Color(0xffffff);

        for (let i = 0; i < count; i++) {
            // Spherical volume distribution with higher density near the rings
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 0.5 + Math.random() * 2.2;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Give each particle custom orbital frequencies
            dynamics[i * 3] = r; // base radius
            dynamics[i * 3 + 1] = theta; // base angle
            dynamics[i * 3 + 2] = phi; // base elevation

            let color;
            const rand = Math.random();
            if (rand > 0.4) color = cyan;
            else if (rand > 0.05) color = purple;
            else color = white;

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('dynamics', new THREE.BufferAttribute(dynamics, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.015,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    _createLightning() {
        this.bolts = [];
        // Massive thunderstorm effect around the core
        const numBolts = 60;
        for (let i = 0; i < numBolts; i++) {
            const points = [];
            const segs = 15; // Extremely jagged electric look
            for (let j = 0; j <= segs; j++) {
                points.push(new THREE.Vector3(0, 0, 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: Math.random() > 0.3 ? 0x00eaff : 0xffffff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                linewidth: Math.random() > 0.8 ? 3 : 2 // varying thickness
            });
            const bolt = new THREE.Line(geo, mat);
            this.scene.add(bolt);
            this.bolts.push({
                line: bolt,
                geo: geo,
                timer: Math.random() * 30, // fire more rapidly
                active: false,
                segs: segs,
            });
        }
    }

    _updateLightning() {
        // State-based lightning intensity
        const intensityMult = {
            idle: 1,
            listening: 2,
            processing: 4,  // Intense shocks when thinking
            speaking: 2,
        }[this.state] || 1;

        this.bolts.forEach((bolt) => {
            bolt.timer -= 0.016 * intensityMult * 2.5; // Thunders storm faster
            if (bolt.timer <= 0 && !bolt.active) {
                bolt.active = true;
                bolt.timer = 0.02 + Math.random() * 0.08; // Flash duration extremely short for snap-like thunder

                // Random chaotic direction from core
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.random() - 0.5) * Math.PI;
                const len = 0.7 + Math.random() * 1.8; // Huge long electric arcs

                const positions = bolt.geo.attributes.position.array;
                let currentX = 0, currentY = 0, currentZ = 0;
                
                for (let i = 0; i <= bolt.segs; i++) {
                    const t = i / bolt.segs;
                    // Extreme Jagged random walk for true heavy thunder shock effect
                    const jaggedness = 0.35;
                    currentX = t * len * Math.cos(phi) * Math.cos(theta) + (Math.random() - 0.5) * jaggedness;
                    currentY = t * len * Math.sin(phi) + (Math.random() - 0.5) * jaggedness;
                    currentZ = t * len * Math.cos(phi) * Math.sin(theta) + (Math.random() - 0.5) * jaggedness;
                    
                    // Add forks in the lightning by disturbing specific points more
                    if (i > 0 && i < bolt.segs && Math.random() > 0.7) {
                        currentX += (Math.random() - 0.5) * 0.5;
                        currentY += (Math.random() - 0.5) * 0.5;
                        currentZ += (Math.random() - 0.5) * 0.5;
                    }

                    positions[i * 3] = currentX;
                    positions[i * 3 + 1] = currentY;
                    positions[i * 3 + 2] = currentZ;
                }
                bolt.geo.attributes.position.needsUpdate = true;
                
                // Extremely bright flash
                bolt.line.material.opacity = (0.8 + Math.random() * 0.4) * (intensityMult > 1 ? 1.2 : 0.8);
                
                // Color variation for electric shocks
                if (Math.random() > 0.7) {
                    bolt.line.material.color.setHex(0xa855f7); // Purple arcs
                } else {
                    bolt.line.material.color.copy(this.emotionColor);
                }
            }

            if (bolt.active) {
                bolt.line.material.opacity *= 0.65; // Ultra Fast snap dissipation
                // Extreme jittering during active flash
                if (bolt.line.material.opacity > 0.1) {
                    const positions = bolt.geo.attributes.position.array;
                    for(let i=3; i < positions.length - 3; i++) {
                        positions[i] += (Math.random() - 0.5) * 0.15;
                    }
                    bolt.geo.attributes.position.needsUpdate = true;
                }

                if (bolt.line.material.opacity < 0.01) {
                    bolt.active = false;
                    bolt.timer = (0.1 + Math.random() * 1.5) / intensityMult;
                    bolt.line.material.opacity = 0;
                }
            }
        });
    }

    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());

        this.time += 0.016;

        // Extremely dynamic state-based speed multipliers
        const speedMult = {
            idle: 1,
            listening: 2.5,
            processing: 6.0,
            speaking: 3.0,
        }[this.state] || 1;

        // Smooth color lerp
        this.emotionColor.lerp(this.targetColor, 0.05);
        if (this.core?.material?.color) this.core.material.color.copy(this.emotionColor);
        if (this.wireCore?.material?.color) this.wireCore.material.color.copy(this.emotionColor);
        if (this.coreGlow?.material?.color) this.coreGlow.material.color.copy(this.emotionColor);
        if (this.coreLight?.color) this.coreLight.color.copy(this.emotionColor);

        // Complex core pulse and rotation
        const p1 = Math.sin(this.time * 2 * speedMult);
        const p2 = Math.cos(this.time * 3 * speedMult);
        const pulse = 1 + (p1 * 0.08) + (p2 * 0.04);
        
        if (this.core) {
            this.core.scale.setScalar(pulse);
            this.core.rotation.x += 0.01 * speedMult;
            this.core.rotation.y += 0.02 * speedMult;
        }
        if (this.wireCore) {
            this.wireCore.scale.setScalar(pulse * 1.05);
            this.wireCore.rotation.x -= 0.02 * speedMult;
            this.wireCore.rotation.z += 0.01 * speedMult;
        }
        if (this.coreGlow) this.coreGlow.scale.setScalar(pulse * 1.2);
        if (this.halo) this.halo.scale.setScalar(pulse * 1.5 + Math.sin(this.time * 4) * 0.06);

        // Core glow intensity
        if (this.coreGlow) this.coreGlow.material.opacity = 0.15 + Math.sin(this.time * 5) * 0.08;
        if (this.coreLight) this.coreLight.intensity = 2.0 + Math.sin(this.time * 3) * 0.8;
        if (this.particles && this.particles.geometry.attributes.dynamics) {
            const pos = this.particles.geometry.attributes.position.array;
            const dyn = this.particles.geometry.attributes.dynamics.array;
            
            for (let i = 0; i < pos.length; i += 3) {
                const baseR = dyn[i];
                const baseTheta = dyn[i + 1];
                const basePhi = dyn[i + 2];
                
                // Dynamic shifting
                const t = this.time * 0.2 * speedMult;
                const shiftAngle = baseTheta + (t * (2.0 / baseR)); // Inner ones spin faster
                const swell = Math.sin(t * 3 + i) * 0.1; // Pulsing radius
                
                const currentR = baseR + swell;
                
                // Vertical swirling (tornado effect mixed with spheres)
                const currentPhi = basePhi + Math.sin(t * 2 + i * 0.01) * 0.2;
                
                pos[i] = currentR * Math.sin(currentPhi) * Math.cos(shiftAngle);
                pos[i + 1] = currentR * Math.sin(currentPhi) * Math.sin(shiftAngle) * 0.5 + Math.cos(t * 4 + i)*0.05;
                pos[i + 2] = currentR * Math.cos(currentPhi);
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Lightning
        this._updateLightning();

        // Mouse parallax
        const targetRotX = this.mouseY * 0.4;
        const targetRotY = this.mouseX * 0.4;
        this.scene.rotation.x += (targetRotX - this.scene.rotation.x) * 0.1;
        this.scene.rotation.y += (targetRotY - this.scene.rotation.y) * 0.1;

        this.renderer.render(this.scene, this.camera);
    }

    setState(state) {
        this.state = state;
        const stateColors = {
            idle: 0x00eaff,
            listening: 0x22d3ee,
            processing: 0xa855f7,
            speaking: 0x00eaff,
        };
        this.targetColor = new THREE.Color(stateColors[state] || 0x00eaff);
    }

    setEmotion(valence) {
        // -1 to 1 range
        if (valence > 0.3) {
            this.targetColor = new THREE.Color(0x22d3ee); // positive
        } else if (valence < -0.3) {
            this.targetColor = new THREE.Color(0xef4444); // negative
        } else {
            this.targetColor = new THREE.Color(0x00eaff); // neutral
        }
    }

    _onResize() {
        if (this.disposed) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    dispose() {
        this.disposed = true;
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
    }
}

// Export for script.js
window.SentinalCore3D = SentinalCore3D;

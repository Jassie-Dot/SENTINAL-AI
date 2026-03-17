/**
 * SENTINAL Neural Thinking Display
 * Dynamic 2D Canvas Neural Network Visualization
 */
class NeuralThinking {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.nodes = [];
        this.links = [];
        this.nodeCount = 40;
        this.sectors = ['Logic', 'Memory', 'Vision', 'Emotion'];
        this.activeSpikes = [];

        this._setupCanvas();
        this._initNetwork();
        this._animate();

        window.addEventListener('resize', () => this._setupCanvas());
    }

    _setupCanvas() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    _initNetwork() {
        // Create nodes in sector clusters
        const sectorCenters = [
            { x: this.width * 0.25, y: this.height * 0.25 },
            { x: this.width * 0.75, y: this.height * 0.25 },
            { x: this.width * 0.25, y: this.height * 0.75 },
            { x: this.width * 0.75, y: this.height * 0.75 }
        ];

        for (let i = 0; i < this.nodeCount; i++) {
            const sectorIdx = i % 4;
            const center = sectorCenters[sectorIdx];
            const node = {
                x: center.x + (Math.random() - 0.5) * (this.width * 0.3),
                y: center.y + (Math.random() - 0.5) * (this.height * 0.3),
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                sector: this.sectors[sectorIdx],
                pulse: 0,
                baseSize: 2 + Math.random() * 3
            };
            this.nodes.push(node);
        }

        // Create links
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dist = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
                if (dist < 120) {
                    this.links.push({ source: this.nodes[i], target: this.nodes[j], opacity: 1 - (dist / 120) });
                }
            }
        }
    }

    spike() {
        // Randomly pick a few nodes to brighten
        const count = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            node.pulse = 1;
        }
    }

    _animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Links
        this.ctx.beginPath();
        this.links.forEach(link => {
            const alpha = link.opacity * (0.1 + (link.source.pulse + link.target.pulse) * 0.5);
            this.ctx.strokeStyle = `rgba(0, 234, 255, ${alpha})`;
            this.ctx.lineWidth = 0.5 + (link.source.pulse + link.target.pulse);
            this.ctx.moveTo(link.source.x, link.source.y);
            this.ctx.lineTo(link.target.x, link.target.y);
        });
        this.ctx.stroke();

        // Draw Nodes
        this.nodes.forEach(node => {
            // Update position
            node.x += node.vx;
            node.y += node.vy;

            // Bounce
            if (node.x < 0 || node.x > this.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.height) node.vy *= -1;

            // Draw
            const size = node.baseSize + node.pulse * 5;
            const alpha = 0.2 + node.pulse * 0.8;
            
            const gradient = this.ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2);
            gradient.addColorStop(0, `rgba(0, 234, 255, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0, 234, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Decay pulse
            node.pulse *= 0.92;
        });

        requestAnimationFrame(() => this._animate());
    }
}

window.NeuralThinking = NeuralThinking;

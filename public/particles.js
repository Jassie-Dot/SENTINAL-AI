class ParticleNetwork {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.mouse = { x: null, y: null, radius: 150 };

        this.config = {
            particleColor: 'rgba(0, 239, 255, 0.7)',
            lineColor: 'rgba(0, 239, 255, 0.15)',
            particleAmount: 80, // Number of nodes
            defaultSpeed: 0.5,
            variantSpeed: 1,
            defaultRadius: 2,
            variantRadius: 2,
            linkRadius: 120, // Distance to connect
        };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });

        this.createParticles();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    createParticles() {
        this.particles = [];
        const quantity = (this.width * this.height) / 15000; // Density based on screen size
        for (let i = 0; i < quantity; i++) {
            this.particles.push(new Particle(this));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update();
            this.particles[i].draw();
            this.linkParticles(this.particles[i], this.particles);
        }

        requestAnimationFrame(this.animate.bind(this));
    }

    linkParticles(particle, particles) {
        for (let i = 0; i < particles.length; i++) {
            const dx = particle.x - particles[i].x;
            const dy = particle.y - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.config.linkRadius) {
                const opacity = 1 - (distance / this.config.linkRadius);
                this.ctx.strokeStyle = `rgba(0, 239, 255, ${opacity * 0.2})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(particles[i].x, particles[i].y);
                this.ctx.stroke();
            }
        }
    }
}

class Particle {
    constructor(network) {
        this.network = network;
        this.x = Math.random() * this.network.width;
        this.y = Math.random() * this.network.height;
        this.vx = (Math.random() - 0.5) * this.network.config.defaultSpeed;
        this.vy = (Math.random() - 0.5) * this.network.config.defaultSpeed;
        this.size = Math.random() * this.network.config.variantRadius + this.network.config.defaultRadius;
    }

    draw() {
        this.network.ctx.beginPath();
        this.network.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.network.ctx.fillStyle = this.network.config.particleColor;
        this.network.ctx.fill();
    }

    update() {
        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Mouse Interaction (Repulsion/Attraction)
        if (this.network.mouse.x != null) {
            let dx = this.network.mouse.x - this.x;
            let dy = this.network.mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.network.mouse.radius) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (this.network.mouse.radius - distance) / this.network.mouse.radius;
                const directionX = forceDirectionX * force * 3; // Strength
                const directionY = forceDirectionY * force * 3;

                this.x -= directionX;
                this.y -= directionY;
            }
        }

        // Boundary Check
        if (this.x < 0 || this.x > this.network.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > this.network.height) this.vy = -this.vy;
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Create canvas if not exists
    if (!document.getElementById('neuro-canvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'neuro-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0'; // Behind everything but above background
        canvas.style.pointerEvents = 'none'; // Click through

        // Insert as first child of body or before specific element
        const bg = document.querySelector('.grid-background');
        if (bg) {
            bg.parentNode.insertBefore(canvas, bg.nextSibling);
        } else {
            document.body.prepend(canvas);
        }

        new ParticleNetwork('neuro-canvas');
    }
});

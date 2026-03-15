/**
 * SENTINAL PROCEDURAL SOUND SYSTEM
 * Shared between Main Interface and Repair Popup
 */
export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.unlocked = false;
        this.allowStart = false;
    }

    _initContext() {
        if (this.ctx) return true;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Default volume
        this.masterGain.connect(this.ctx.destination);
        return true;
    }

    _ensureReady() {
        if (!this.allowStart) return false;
        if (this.unlocked) return true;
        if (!this._initContext()) return false;
        if (this.ctx.state === 'suspended') {
            // Resume after a user gesture; ignore errors silently.
            this.ctx.resume().then(() => { this.unlocked = true; }).catch(() => { });
            return false;
        }
        this.unlocked = true;
        return true;
    }

    unlock() {
        this.allowStart = true;
        return this._ensureReady();
    }

    playTone(freq, type, duration, vol = 1) {
        if (!this._ensureReady()) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHover() {
        // High pitch chirp
        this.playTone(2000, 'sine', 0.05, 0.1);
        this.playTone(3000, 'triangle', 0.05, 0.05);
    }

    playClick() {
        // Mechanical click
        this.playTone(800, 'square', 0.05, 0.2);
        this.playTone(100, 'sawtooth', 0.1, 0.3);
    }

    playProcess() {
        // Computing chatter
        const count = 5;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.playTone(1000 + Math.random() * 2000, 'sine', 0.03, 0.1);
            }, i * 50);
        }
    }

    playAlert() {
        this.playTone(400, 'sawtooth', 0.5, 0.5);
        setTimeout(() => this.playTone(400, 'sawtooth', 0.5, 0.5), 600);
    }

    playStartup() {
        if (!this._ensureReady()) return;
        // Cinematic Bass Drop / Swell
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 2);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 3);

        // High shimmer
        setTimeout(() => {
            this.playTone(3000, 'sine', 1.5, 0.2);
        }, 500);
    }
}

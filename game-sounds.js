// Simple Game Sound Effects Library (Web Audio API)

class GameSounds {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
        
        // Lazy initialization
        this.init();
    }
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    // 기본 톤 생성
    playTone(frequency, duration = 0.1, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // 효과음들
    click() {
        this.playTone(800, 0.05, 'square');
    }
    
    success() {
        const now = this.audioContext.currentTime;
        this.playTone(523, 0.1); // C
        setTimeout(() => this.playTone(659, 0.1), 50); // E
        setTimeout(() => this.playTone(784, 0.15), 100); // G
    }
    
    error() {
        this.playTone(200, 0.2, 'sawtooth');
    }
    
    pop() {
        this.playTone(1000, 0.08, 'sine');
        setTimeout(() => this.playTone(800, 0.08, 'sine'), 40);
    }
    
    coin() {
        this.playTone(988, 0.1);
        setTimeout(() => this.playTone(1319, 0.15), 50);
    }
    
    powerup() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(400 + i * 100, 0.08), i * 30);
        }
    }
    
    gameover() {
        const freqs = [330, 294, 262, 220];
        freqs.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'triangle'), i * 100);
        });
    }
    
    victory() {
        const melody = [523, 587, 659, 784, 880];
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15), i * 80);
        });
    }
    
    // 복합 효과음
    match() {
        this.playTone(660, 0.1);
        setTimeout(() => this.playTone(880, 0.12), 60);
    }
    
    flip() {
        this.playTone(500, 0.05);
        setTimeout(() => this.playTone(700, 0.05), 30);
    }
    
    wrong() {
        this.playTone(200, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.15, 'sawtooth'), 100);
    }
    
    // 볼륨 설정
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
    
    // 음소거 토글
    toggleMute() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// 파티클 효과 시스템
class ParticleEffect {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }
    
    emit(x, y, options = {}) {
        const defaults = {
            count: 10,
            color: '#FFD700',
            size: 4,
            speed: 3,
            gravity: 0.2,
            life: 1
        };
        
        const opts = { ...defaults, ...options };
        
        for (let i = 0; i < opts.count; i++) {
            const angle = (Math.PI * 2 * i) / opts.count;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * opts.speed * (0.5 + Math.random()),
                vy: Math.sin(angle) * opts.speed * (0.5 + Math.random()),
                color: opts.color,
                size: opts.size * (0.5 + Math.random() * 0.5),
                life: opts.life,
                maxLife: opts.life,
                gravity: opts.gravity
            });
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= 0.02;
            
            const alpha = p.life / p.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            
            return p.life > 0;
        });
    }
    
    clear() {
        this.particles = [];
    }
}

// 진동 효과 (모바일)
function vibrate(pattern = 50) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// 화면 흔들기 효과
function shakeScreen(element, intensity = 5, duration = 200) {
    const originalTransform = element.style.transform || '';
    const startTime = Date.now();
    
    function shake() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            element.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        } else {
            element.style.transform = originalTransform;
        }
    }
    
    shake();
}

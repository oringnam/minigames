// Mobile Virtual Controls Library

// 컨트롤 패널 생성
function createControlPanel() {
    const existing = document.getElementById('mobile-control-panel');
    if (existing) return existing;
    
    const panel = document.createElement('div');
    panel.id = 'mobile-control-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 0;
        right: 0;
        height: 120px;
        background: transparent;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
        touch-action: none;
        pointer-events: none;
    `;
    
    document.body.appendChild(panel);
    return panel;
}

class VirtualJoystick {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            radius: options.radius || 70,
            innerRadius: options.innerRadius || 35,
            color: options.color || 'rgba(100, 100, 100, 0.8)',
            innerColor: options.innerColor || 'rgba(200, 200, 200, 0.9)',
            position: options.position || 'bottom-left',
            deadzone: options.deadzone || 0.2,
            ...options
        };
        
        this.active = false;
        this.centerX = 0;
        this.centerY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.direction = { x: 0, y: 0 };
        
        this.createJoystick();
        this.bindEvents();
    }
    
    createJoystick() {
        // 컨트롤 패널 생성
        const panel = createControlPanel();
        
        // Container
        this.joystickContainer = document.createElement('div');
        this.joystickContainer.style.cssText = `
            position: relative;
            width: ${this.options.radius * 2}px;
            height: ${this.options.radius * 2}px;
            z-index: 1001;
            opacity: 0.9;
            touch-action: none;
            pointer-events: auto;
        `;
        
        // Base
        this.base = document.createElement('div');
        this.base.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, 
                rgba(80,80,80,0.9) 0%, 
                rgba(40,40,40,0.95) 100%);
            border: 4px solid rgba(60,60,60,0.8);
            box-shadow: 
                inset 0 -5px 15px rgba(0,0,0,0.5),
                0 5px 20px rgba(0,0,0,0.4);
        `;
        
        // Stick
        this.stick = document.createElement('div');
        this.stick.style.cssText = `
            position: absolute;
            width: ${this.options.innerRadius * 2}px;
            height: ${this.options.innerRadius * 2}px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, 
                rgba(220,220,220,1) 0%, 
                rgba(160,160,160,1) 100%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 
                0 5px 15px rgba(0, 0, 0, 0.5),
                inset 0 2px 5px rgba(255,255,255,0.5);
            border: 2px solid rgba(100,100,100,0.6);
        `;
        
        this.joystickContainer.appendChild(this.base);
        this.joystickContainer.appendChild(this.stick);
        panel.appendChild(this.joystickContainer);
    }
    
    bindEvents() {
        const startHandler = (e) => {
            e.preventDefault();
            this.active = true;
            this.joystickContainer.style.opacity = '1';
            
            const rect = this.joystickContainer.getBoundingClientRect();
            this.centerX = rect.left + rect.width / 2;
            this.centerY = rect.top + rect.height / 2;
            
            this.updatePosition(e);
        };
        
        const moveHandler = (e) => {
            if (!this.active) return;
            e.preventDefault();
            this.updatePosition(e);
        };
        
        const endHandler = (e) => {
            if (!this.active) return;
            e.preventDefault();
            
            this.active = false;
            this.joystickContainer.style.opacity = '0';
            this.stick.style.transform = 'translate(-50%, -50%)';
            this.direction = { x: 0, y: 0 };
            
            if (this.options.onEnd) {
                this.options.onEnd(this.direction);
            }
        };
        
        this.joystickContainer.addEventListener('touchstart', startHandler);
        this.joystickContainer.addEventListener('touchmove', moveHandler);
        this.joystickContainer.addEventListener('touchend', endHandler);
        
        // Mouse events for desktop testing
        this.joystickContainer.addEventListener('mousedown', startHandler);
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', endHandler);
    }
    
    updatePosition(e) {
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - this.centerX;
        const dy = touch.clientY - this.centerY;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = this.options.radius - this.options.innerRadius;
        
        let finalX = dx;
        let finalY = dy;
        
        if (distance > maxDistance) {
            finalX = (dx / distance) * maxDistance;
            finalY = (dy / distance) * maxDistance;
        }
        
        this.stick.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
        
        // Normalize direction (-1 to 1)
        this.direction = {
            x: finalX / maxDistance,
            y: finalY / maxDistance
        };
        
        if (this.options.onChange) {
            this.options.onChange(this.direction);
        }
    }
    
    getDirection() {
        return this.direction;
    }
    
    destroy() {
        this.joystickContainer.remove();
    }
}

class VirtualButton {
    constructor(options = {}) {
        this.options = {
            label: options.label || '🔥',
            position: options.position || 'bottom-right',
            size: options.size || 70,
            color: options.color || 'rgba(200, 50, 50, 0.9)',
            ...options
        };
        
        this.createButton();
        this.bindEvents();
    }
    
    createButton() {
        const panel = createControlPanel();
        
        // 버튼 컨테이너 생성 (오른쪽 영역)
        let buttonArea = panel.querySelector('.button-area');
        if (!buttonArea) {
            buttonArea = document.createElement('div');
            buttonArea.className = 'button-area';
            buttonArea.style.cssText = `
                display: flex;
                gap: 15px;
                align-items: center;
            `;
            panel.appendChild(buttonArea);
        }
        
        this.button = document.createElement('div');
        this.button.style.cssText = `
            position: relative;
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, 
                ${this.options.color.replace('0.9', '1')} 0%, 
                ${this.options.color.replace('0.9', '0.8')} 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${this.options.size * 0.45}px;
            color: white;
            user-select: none;
            touch-action: none;
            box-shadow: 
                0 6px 20px rgba(0, 0, 0, 0.6), 
                inset 0 -4px 12px rgba(0,0,0,0.4),
                inset 0 2px 8px rgba(255,255,255,0.2);
            transition: transform 0.1s, box-shadow 0.1s;
            border: 4px solid rgba(0, 0, 0, 0.3);
        `;
        this.button.textContent = this.options.label;
        buttonArea.appendChild(this.button);
    }
    
    bindEvents() {
        const pressHandler = (e) => {
            e.preventDefault();
            this.button.style.transform = 'scale(0.88) translateY(3px)';
            this.button.style.boxShadow = `
                0 2px 8px rgba(0, 0, 0, 0.4), 
                inset 0 2px 10px rgba(0,0,0,0.6)
            `;
            
            if (this.options.onPress) {
                this.options.onPress();
            }
        };
        
        const releaseHandler = (e) => {
            e.preventDefault();
            this.button.style.transform = 'scale(1) translateY(0)';
            this.button.style.boxShadow = `
                0 6px 20px rgba(0, 0, 0, 0.6), 
                inset 0 -4px 12px rgba(0,0,0,0.4),
                inset 0 2px 8px rgba(255,255,255,0.2)
            `;
            
            if (this.options.onRelease) {
                this.options.onRelease();
            }
        };
        
        this.button.addEventListener('touchstart', pressHandler);
        this.button.addEventListener('touchend', releaseHandler);
        this.button.addEventListener('mousedown', pressHandler);
        this.button.addEventListener('mouseup', releaseHandler);
    }
    
    destroy() {
        this.button.remove();
    }
}

// Detect if mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768;
}

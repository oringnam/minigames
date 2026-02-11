// Mobile Virtual Controls Library
class VirtualJoystick {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            radius: options.radius || 60,
            innerRadius: options.innerRadius || 30,
            color: options.color || 'rgba(255, 255, 255, 0.5)',
            innerColor: options.innerColor || 'rgba(255, 255, 255, 0.8)',
            position: options.position || 'bottom-left',
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
        // Container
        this.joystickContainer = document.createElement('div');
        this.joystickContainer.style.cssText = `
            position: fixed;
            width: ${this.options.radius * 2}px;
            height: ${this.options.radius * 2}px;
            ${this.getPositionStyle()}
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s;
            touch-action: none;
        `;
        
        // Base
        this.base = document.createElement('div');
        this.base.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: ${this.options.color};
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        // Stick
        this.stick = document.createElement('div');
        this.stick.style.cssText = `
            position: absolute;
            width: ${this.options.innerRadius * 2}px;
            height: ${this.options.innerRadius * 2}px;
            border-radius: 50%;
            background: ${this.options.innerColor};
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        `;
        
        this.joystickContainer.appendChild(this.base);
        this.joystickContainer.appendChild(this.stick);
        document.body.appendChild(this.joystickContainer);
    }
    
    getPositionStyle() {
        const margin = 30;
        switch(this.options.position) {
            case 'bottom-left':
                return `bottom: ${margin}px; left: ${margin}px;`;
            case 'bottom-right':
                return `bottom: ${margin}px; right: ${margin}px;`;
            case 'top-left':
                return `top: ${margin}px; left: ${margin}px;`;
            case 'top-right':
                return `top: ${margin}px; right: ${margin}px;`;
            default:
                return `bottom: ${margin}px; left: ${margin}px;`;
        }
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
            color: options.color || 'rgba(255, 100, 100, 0.7)',
            ...options
        };
        
        this.createButton();
        this.bindEvents();
    }
    
    createButton() {
        this.button = document.createElement('div');
        this.button.style.cssText = `
            position: fixed;
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            ${this.getPositionStyle()}
            z-index: 1000;
            border-radius: 50%;
            background: ${this.options.color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${this.options.size * 0.5}px;
            color: white;
            user-select: none;
            touch-action: none;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            transition: transform 0.1s, box-shadow 0.1s;
            border: 3px solid rgba(255, 255, 255, 0.3);
        `;
        this.button.textContent = this.options.label;
        document.body.appendChild(this.button);
    }
    
    getPositionStyle() {
        const margin = 30;
        switch(this.options.position) {
            case 'bottom-left':
                return `bottom: ${margin}px; left: ${margin}px;`;
            case 'bottom-right':
                return `bottom: ${margin}px; right: ${margin}px;`;
            case 'top-left':
                return `top: ${margin}px; left: ${margin}px;`;
            case 'top-right':
                return `top: ${margin}px; right: ${margin}px;`;
            case 'bottom-center':
                return `bottom: ${margin}px; left: 50%; transform: translateX(-50%);`;
            default:
                return `bottom: ${margin}px; right: ${margin}px;`;
        }
    }
    
    bindEvents() {
        const pressHandler = (e) => {
            e.preventDefault();
            this.button.style.transform = 'scale(0.9)';
            this.button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
            
            if (this.options.onPress) {
                this.options.onPress();
            }
        };
        
        const releaseHandler = (e) => {
            e.preventDefault();
            this.button.style.transform = 'scale(1)';
            this.button.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
            
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

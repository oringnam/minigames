/**
 * game-utils.js - 미니게임 공통 유틸리티
 * 모든 게임에서 공통으로 사용하는 헬퍼 함수들
 */

class GameUtils {
    /**
     * LocalStorage 헬퍼
     */
    static saveScore(gameId, key, value) {
        try {
            localStorage.setItem(`${gameId}_${key}`, value);
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }
    
    static getScore(gameId, key, defaultValue = 0) {
        try {
            const value = localStorage.getItem(`${gameId}_${key}`);
            return value !== null ? parseInt(value) : defaultValue;
        } catch (e) {
            console.error('Failed to get score:', e);
            return defaultValue;
        }
    }
    
    static clearScore(gameId, key) {
        try {
            localStorage.removeItem(`${gameId}_${key}`);
        } catch (e) {
            console.error('Failed to clear score:', e);
        }
    }
    
    /**
     * 모달 관리
     */
    static createModal(options = {}) {
        const {
            title = '게임 종료',
            message = '',
            stats = [],
            buttons = [],
            onClose = null
        } = options;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('game-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 모달 HTML 생성
        const modal = document.createElement('div');
        modal.id = 'game-modal';
        modal.className = 'game-modal';
        modal.innerHTML = `
            <div class="game-modal-content">
                <h2>${title}</h2>
                ${message ? `<p class="game-modal-message">${message}</p>` : ''}
                ${stats.length > 0 ? `
                    <div class="game-modal-stats">
                        ${stats.map(stat => `<p>${stat.label}: <strong>${stat.value}</strong></p>`).join('')}
                    </div>
                ` : ''}
                <div class="game-modal-buttons">
                    ${buttons.map((btn, i) => `
                        <button class="btn game-modal-btn" data-action="${i}">${btn.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 버튼 이벤트 바인딩
        buttons.forEach((btn, i) => {
            const button = modal.querySelector(`[data-action="${i}"]`);
            button.addEventListener('click', () => {
                if (btn.action) btn.action();
                if (btn.closeModal !== false) {
                    GameUtils.closeModal();
                }
            });
        });
        
        // 모달 표시
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 닫기 콜백
        if (onClose) {
            modal.dataset.onClose = 'true';
            modal._onCloseCallback = onClose;
        }
        
        return modal;
    }
    
    static closeModal() {
        const modal = document.getElementById('game-modal');
        if (!modal) return;
        
        modal.classList.remove('show');
        
        setTimeout(() => {
            if (modal.dataset.onClose && modal._onCloseCallback) {
                modal._onCloseCallback();
            }
            modal.remove();
        }, 300);
    }
    
    /**
     * 텍스트 복사 (카톡 공유)
     */
    static copyToClipboard(text, successMsg = '📋 결과가 복사되었습니다!\n카톡에 붙여넣기 하세요.') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert(successMsg);
            }).catch(() => {
                // Fallback
                GameUtils.fallbackCopyToClipboard(text, successMsg);
            });
        } else {
            GameUtils.fallbackCopyToClipboard(text, successMsg);
        }
    }
    
    static fallbackCopyToClipboard(text, successMsg) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert(successMsg);
        } catch (err) {
            alert(text);
        }
        
        document.body.removeChild(textArea);
    }
    
    /**
     * 숫자 포맷팅
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    /**
     * 시간 포맷팅 (초 → MM:SS)
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * 랜덤 정수 (min 이상 max 미만)
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    
    /**
     * 배열 섞기 (Fisher-Yates)
     */
    static shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    /**
     * 배열에서 랜덤 요소
     */
    static randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

/**
 * 모달 기본 스타일 (자동 주입)
 */
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        .game-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .game-modal.show {
            display: flex;
            opacity: 1;
        }
        
        .game-modal-content {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: modalSlide 0.3s ease-out;
        }
        
        @keyframes modalSlide {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .game-modal-content h2 {
            margin: 0 0 20px 0;
            font-size: 1.8em;
        }
        
        .game-modal-message {
            margin-bottom: 20px;
            font-size: 1.1em;
        }
        
        .game-modal-stats {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
        }
        
        .game-modal-stats p {
            margin: 10px 0;
            font-size: 1.2em;
        }
        
        .game-modal-buttons {
            display: flex;
            gap: 10px;
            flex-direction: column;
        }
        
        .game-modal-btn {
            width: 100%;
        }
    `;
    document.head.appendChild(style);
}

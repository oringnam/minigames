// 망치 피하기 게임
(() => {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const sounds = new GameSounds();
    const messageEl = document.getElementById('message');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // 게임 상태
    let gameState = 'ready'; // ready, playing, gameover
    let score = 0;
    let highScore = GameUtils.getScore('hammer-dodge', 'highScore', 0);
    let gameTime = 0;
    let lastTime = 0;

    // 점수판 생성
    const scoreBoard = GameUI.createScoreBoard({
        items: [
            { id: 'score', label: '점수', value: 0 },
            { id: 'highScore', label: '최고', value: highScore }
        ],
        containerId: 'scoreBoard'
    });

    // 플레이어
    const player = {
        x: WIDTH / 2,
        y: HEIGHT - 80,
        width: 50,
        height: 50,
        baseWidth: 50,
        baseHeight: 50,
        speed: 6,
        moveLeft: false,
        moveRight: false
    };

    // 망치 배열
    let hammers = [];
    let hammerSpawnTimer = 0;
    let hammerSpawnInterval = 1.2; // 초
    let hammerSpeed = 4;
    let patternAttackTimer = 0;

    // 입력 처리
    const keys = {};

    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (gameState === 'ready' || gameState === 'gameover') {
                startGame();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // 터치/마우스 입력
    let touchStartX = 0;
    let isTouching = false;

    canvas.addEventListener('pointerdown', (e) => {
        if (gameState === 'ready' || gameState === 'gameover') {
            startGame();
            return;
        }

        const rect = canvas.getBoundingClientRect();
        touchStartX = e.clientX - rect.left;
        isTouching = true;
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isTouching || gameState !== 'playing') return;

        const rect = canvas.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const scaledX = (touchX / rect.width) * WIDTH;
        
        player.x = Math.max(player.width / 2, Math.min(WIDTH - player.width / 2, scaledX));
    });

    canvas.addEventListener('pointerup', () => {
        isTouching = false;
    });

    canvas.addEventListener('pointercancel', () => {
        isTouching = false;
    });

    // 게임 시작
    function startGame() {
        gameState = 'playing';
        score = 0;
        gameTime = 0;
        player.x = WIDTH / 2;
        player.width = player.baseWidth;
        player.height = player.baseHeight;
        hammers = [];
        hammerSpawnTimer = 0;
        hammerSpeed = 4;
        hammerSpawnInterval = 1.2;
        patternAttackTimer = 0;
        
        updateUI();
        sounds.play('start');
        messageEl.textContent = '';
    }

    // 망치 생성 (특수 타입 포함)
    function spawnHammer(forceType = null) {
        const rand = Math.random();
        let type = forceType;
        
        if (!type) {
            if (rand < 0.05) type = 'golden'; // 5% 황금 망치 (보너스)
            else if (rand < 0.15) type = 'big'; // 10% 큰 망치 (위험)
            else if (rand < 0.3) type = 'small'; // 15% 작은 망치 (빠름)
            else type = 'normal'; // 70% 일반
        }
        
        let size, speed, color;
        
        switch (type) {
            case 'golden':
                size = 35;
                speed = hammerSpeed * 0.7;
                color = '#ffd700';
                break;
            case 'big':
                size = 65;
                speed = hammerSpeed * 0.6;
                color = '#ff1744';
                break;
            case 'small':
                size = 28;
                speed = hammerSpeed * 1.5;
                color = '#ff6b9d';
                break;
            default: // normal
                size = 40 + Math.random() * 15;
                speed = hammerSpeed + Math.random() * 2;
                color = '#ff4d6d';
        }
        
        hammers.push({
            x: size / 2 + Math.random() * (WIDTH - size),
            y: -size,
            width: size,
            height: size,
            speed: speed,
            type: type,
            color: color
        });
    }
    
    // 패턴 공격 (여러 망치 동시에)
    function spawnPattern() {
        const patterns = [
            // 3개 가로줄
            () => {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => spawnHammer('normal'), i * 100);
                }
            },
            // 양쪽에서
            () => {
                const size = 45;
                hammers.push({
                    x: size / 2 + 30,
                    y: -size,
                    width: size,
                    height: size,
                    speed: hammerSpeed * 1.2,
                    type: 'normal',
                    color: '#ff4d6d'
                });
                hammers.push({
                    x: WIDTH - size / 2 - 30,
                    y: -size,
                    width: size,
                    height: size,
                    speed: hammerSpeed * 1.2,
                    type: 'normal',
                    color: '#ff4d6d'
                });
            },
            // 큰 망치 + 작은 망치들
            () => {
                spawnHammer('big');
                setTimeout(() => {
                    spawnHammer('small');
                    spawnHammer('small');
                }, 300);
            }
        ];
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        pattern();
        sounds.play('powerup');
    }

    // 충돌 감지
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 업데이트
    function update(deltaTime) {
        if (gameState !== 'playing') return;

        gameTime += deltaTime;
        score = Math.floor(gameTime * 10);

        // 난이도 증가 (더 가파르게)
        const difficulty = Math.floor(gameTime / 5); // 5초마다 증가
        hammerSpeed = 4 + difficulty * 0.8;
        hammerSpawnInterval = Math.max(0.25, 1.2 - difficulty * 0.12);

        // 플레이어 크기 증가 (시간 지날수록 커져서 피하기 어려워짐)
        const sizeIncrease = Math.min(20, gameTime * 0.5);
        player.width = player.baseWidth + sizeIncrease;
        player.height = player.baseHeight + sizeIncrease;

        // 플레이어 이동 (키보드)
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.x -= player.speed;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.x += player.speed;
        }

        // 플레이어 경계 체크
        player.x = Math.max(player.width / 2, Math.min(WIDTH - player.width / 2, player.x));

        // 망치 생성
        hammerSpawnTimer += deltaTime;
        if (hammerSpawnTimer >= hammerSpawnInterval) {
            spawnHammer();
            hammerSpawnTimer = 0;
        }

        // 패턴 공격 (15초마다)
        patternAttackTimer += deltaTime;
        if (patternAttackTimer >= 15) {
            spawnPattern();
            patternAttackTimer = 0;
        }

        // 망치 업데이트
        for (let i = hammers.length - 1; i >= 0; i--) {
            const hammer = hammers[i];
            hammer.y += hammer.speed;

            // 충돌 체크
            if (checkCollision(player, hammer)) {
                if (hammer.type === 'golden') {
                    // 황금 망치 - 보너스 점수!
                    score += 100;
                    hammers.splice(i, 1);
                    sounds.play('powerup');
                    continue;
                } else {
                    // 일반/큰/작은 망치 - 게임 오버
                    gameOver();
                    return;
                }
            }

            // 화면 밖으로 나간 망치 제거
            if (hammer.y > HEIGHT) {
                hammers.splice(i, 1);
                sounds.play('pop');
            }
        }

        updateUI();
    }

    // 게임 오버
    function gameOver() {
        gameState = 'gameover';
        sounds.play('gameover');
        
        const isNewRecord = GameUtils.updateHighScore('hammer-dodge', score);
        if (isNewRecord) {
            highScore = score;
        }
        
        updateUI();
        
        // 모달 표시
        setTimeout(() => {
            GameUtils.createModal({
                title: isNewRecord ? '🎉 신기록!' : '💀 게임 오버!',
                stats: [
                    { label: '점수', value: score },
                    { label: '최고점수', value: highScore },
                    { label: '생존시간', value: `${gameTime.toFixed(1)}초` }
                ],
                buttons: [
                    {
                        text: '📱 카톡 공유',
                        action: () => {
                            const text = `🔨 망치 피하기\n\n점수: ${score}\n최고: ${highScore}\n생존: ${gameTime.toFixed(1)}초\n\nhttps://oringnam.github.io/minigames/`;
                            GameUtils.copyToClipboard(text);
                        }
                    },
                    {
                        text: '다시 하기',
                        action: () => {
                            startGame();
                        }
                    }
                ]
            });
        }, 500);
    }

    // UI 업데이트
    function updateUI() {
        scoreBoard.update('score', score);
        scoreBoard.update('highScore', highScore);
    }

    // 렌더링
    function draw() {
        // 배경
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // 그리드 패턴 (장식)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < WIDTH; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i < HEIGHT; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(WIDTH, i);
            ctx.stroke();
        }

        // 플레이어
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-player.width / 2 + 2, -player.height / 2 + 2, player.width, player.height);
        
        // 몸체
        ctx.fillStyle = '#56f0c2';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        
        // 테두리
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);
        
        // 얼굴
        ctx.fillStyle = 'white';
        ctx.fillRect(-12, -12, 8, 8); // 왼쪽 눈
        ctx.fillRect(4, -12, 8, 8);   // 오른쪽 눈
        ctx.fillRect(-8, 4, 16, 4);   // 입
        
        ctx.restore();

        // 망치들
        hammers.forEach(hammer => {
            ctx.save();
            ctx.translate(hammer.x, hammer.y);
            
            // 그림자
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(-hammer.width / 2 + 2, -hammer.height / 2 + 2, hammer.width, hammer.height);
            
            // 망치 머리 (타입별 색상)
            ctx.fillStyle = hammer.color;
            ctx.fillRect(-hammer.width / 2, -hammer.height / 2, hammer.width, hammer.height * 0.6);
            
            // 황금 망치는 반짝임 효과
            if (hammer.type === 'golden') {
                const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = '#ffed4e';
                ctx.fillRect(-hammer.width / 2 + 4, -hammer.height / 2 + 4, hammer.width - 8, hammer.height * 0.6 - 8);
                ctx.globalAlpha = 1;
            }
            
            // 망치 자루
            ctx.fillStyle = hammer.type === 'golden' ? '#d4af37' : '#8b4513';
            ctx.fillRect(-hammer.width / 6, -hammer.height / 2 + hammer.height * 0.6, hammer.width / 3, hammer.height * 0.4);
            
            // 테두리
            ctx.strokeStyle = hammer.type === 'golden' ? '#ffd700' : 'white';
            ctx.lineWidth = hammer.type === 'big' ? 3 : 2;
            ctx.strokeRect(-hammer.width / 2, -hammer.height / 2, hammer.width, hammer.height * 0.6);
            
            // 타입 표시
            if (hammer.type === 'golden') {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
            }
            
            ctx.restore();
        });

        // 게임 상태 메시지
        if (gameState === 'ready') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔨 망치 피하기', WIDTH / 2, HEIGHT / 2 - 100);
            
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('조작법', WIDTH / 2, HEIGHT / 2 - 60);
            
            ctx.font = '14px sans-serif';
            ctx.fillText('좌우 화살표 or A/D로 이동', WIDTH / 2, HEIGHT / 2 - 35);
            ctx.fillText('모바일: 터치로 이동', WIDTH / 2, HEIGHT / 2 - 15);
            
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('특수 망치', WIDTH / 2, HEIGHT / 2 + 15);
            
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('★ 황금 망치: +100점 보너스!', WIDTH / 2, HEIGHT / 2 + 40);
            
            ctx.fillStyle = '#ff1744';
            ctx.fillText('큰 망치: 느리지만 피하기 어려움', WIDTH / 2, HEIGHT / 2 + 60);
            
            ctx.fillStyle = '#ff6b9d';
            ctx.fillText('작은 망치: 빠르게 떨어짐', WIDTH / 2, HEIGHT / 2 + 80);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('탭해서 시작!', WIDTH / 2, HEIGHT / 2 + 120);
        }
    }

    // 게임 루프
    function gameLoop(timestamp) {
        const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
        lastTime = timestamp;

        update(Math.min(deltaTime, 0.1)); // 최대 0.1초로 제한
        draw();

        requestAnimationFrame(gameLoop);
    }

    // 시작
    updateUI();
    requestAnimationFrame(gameLoop);
})();

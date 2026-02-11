# 미니게임 아케이드 - 개발 가이드

> 바닐라 JavaScript로 만드는 모바일 우선 웹 게임 컬렉션

**라이브**: https://oringnam.github.io/minigames/  
**레포**: https://github.com/oringnam/minigames

---

## 📁 프로젝트 구조

```
minigames/
├── index.html              # 메인 페이지 (게임 목록 + 검색)
├── stats.html              # 통계 페이지 (최고 점수)
├── game-sounds.js          # 🔊 사운드 라이브러리
├── game-utils.js           # 🛠️ 공통 유틸리티
├── mobile-controls.js      # 🎮 터치 컨트롤
├── mobile-layout.css       # 📱 모바일 레이아웃
└── games/
    ├── snake/              # 뱀 게임
    ├── memory/             # 메모리 게임
    ├── match3/             # Match-3 게임
    ├── simon/              # Simon Says
    ├── spaceshooter/       # 스페이스 슈터
    ├── whackamole/         # 두더지 게임
    ├── sokoban/            # 창고지기
    └── blackjack/          # 블랙잭
```

---

## 🎮 현재 게임 (8개)

| 게임 | 디렉토리 | 특징 |
|------|----------|------|
| 🐍 Snake | `games/snake/` | 파티클, 사운드, 진동 |
| 🧠 Memory | `games/memory/` | 3D 카드 플립, 난이도 시스템 |
| 💎 Match-3 | `games/match3/` | 빅매치 감지, 파워업 |
| 🎵 Simon Says | `games/simon/` | 마일스톤 사운드, 대형 버튼 |
| 🚀 Space Shooter | `games/spaceshooter/` | 폭발 파티클, 레벨업 |
| 🔨 Whack-a-Mole | `games/whackamole/` | 콤보 시스템, 보너스 |
| 📦 Sokoban | `games/sokoban/` | 박스-목표 사운드, 실행취소 |
| 🃏 Blackjack | `games/blackjack/` | 블랙잭/버스트 사운드 |

---

## 🧩 공통 모듈

### 1. game-sounds.js
**모든 게임에서 사운드/파티클/진동을 쉽게 추가**

```javascript
const sounds = new GameSounds();

// 사운드 재생
sounds.play('success');  // click, success, error, pop, coin, powerup, gameover, victory, match, flip, wrong

// 파티클 효과 (캔버스 모드)
const particles = new ParticleEffect(canvas, ctx);
particles.createExplosion(x, y, '#ff0000', 20);

// 파티클 효과 (개별 모드)
const particle = new ParticleEffect(x, y, '#00ff00');

// 진동 (모바일)
vibrate(50);              // 단순 진동 (50ms)
vibrate([100, 50, 100]);  // 패턴 진동

// 화면 흔들기
screenShake(10, 300);     // 강도 10, 300ms
```

### 2. game-utils.js
**점수 저장, 모달, 텍스트 복사 등 공통 유틸리티**

```javascript
// LocalStorage 헬퍼
GameUtils.saveScore('snake', 'highScore', 1000);
const highScore = GameUtils.getScore('snake', 'highScore', 0);

// 모달 생성
GameUtils.createModal({
    title: '🎉 게임 클리어!',
    message: '축하합니다!',
    stats: [
        { label: '최종 점수', value: 1000 },
        { label: '최고 점수', value: 1500 }
    ],
    buttons: [
        { text: '📱 카톡 공유', action: () => shareKakao() },
        { text: '다시 하기', action: () => restartGame() }
    ],
    onClose: () => console.log('모달 닫힘')
});

// 텍스트 복사 (카톡 공유)
GameUtils.copyToClipboard('🐍 Snake 점수: 1000');

// 유틸리티 함수
GameUtils.formatNumber(1000);          // "1,000"
GameUtils.formatTime(125);             // "02:05"
GameUtils.randomInt(1, 10);            // 1~9
GameUtils.shuffle([1, 2, 3, 4]);       // 섞인 배열
GameUtils.randomElement(['a', 'b']);   // 랜덤 요소
```

### 3. mobile-controls.js
**터치 기반 가상 조이스틱/버튼**

```javascript
// 가상 조이스틱
const joystick = new VirtualJoystick({
    container: document.body,
    position: 'left',
    radius: 50
});

joystick.on('move', (data) => {
    console.log(data.direction); // 'up', 'down', 'left', 'right'
});

// 가상 버튼
const button = new VirtualButton({
    container: document.body,
    position: 'right',
    label: '🔥'
});

button.on('press', () => console.log('버튼 눌림'));
```

### 4. mobile-layout.css
**모바일 최적화 기본 레이아웃**

```html
<link rel="stylesheet" href="../../mobile-layout.css">
```

- 컨트롤 패널: 하단 고정 (180px)
- 캔버스: 최대 350px (모바일 오버플로우 방지)
- 반응형 그리드: 8x8 보드 자동 조정

---

## 🎨 개발 가이드

### 새 게임 추가하기

**1. 디렉토리 생성**
```bash
mkdir games/my-game
cd games/my-game
```

**2. index.html 템플릿**
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Game</title>
    
    <!-- 공통 모듈 -->
    <script src="../../game-sounds.js"></script>
    <script src="../../game-utils.js"></script>
    <link rel="stylesheet" href="../../mobile-layout.css">
    
    <style>
        /* 게임별 스타일 */
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 My Game</h1>
        
        <div class="game-info">
            <div class="info-box">
                <h3>점수</h3>
                <p id="score">0</p>
            </div>
        </div>
        
        <canvas id="gameCanvas"></canvas>
        
        <div class="controls">
            <button class="btn" onclick="startGame()">게임 시작</button>
            <a href="../../index.html" class="btn">← 메인으로</a>
        </div>
    </div>
    
    <script>
        const sounds = new GameSounds();
        
        // 게임 로직
        function startGame() {
            sounds.play('click');
            // ...
        }
    </script>
</body>
</html>
```

**3. index.html에 게임 등록**
```html
<div class="game-card" data-category="puzzle">
    <a href="games/my-game/index.html">
        <div class="game-icon">🎮</div>
        <div class="game-name">My Game</div>
    </a>
</div>
```

### 모바일 최적화 체크리스트

- [ ] 캔버스 크기 모바일 제한 (`max-width: 350px`)
- [ ] 터치 이벤트 지원 (클릭 + 터치)
- [ ] 세로 화면 최적화
- [ ] 컨트롤 패널 하단 고정
- [ ] 사운드/진동 피드백
- [ ] 파티클 효과
- [ ] 게임 속도 조정 (모바일은 10-30% 느리게)

### 사운드 가이드

**언제 어떤 사운드를 쓸까?**

| 사운드 | 용도 | 진동 |
|--------|------|------|
| `click` | 버튼 클릭, UI 상호작용 | 10-20ms |
| `success` | 정답, 성공, 점수 획득 | 50ms |
| `error` | 오답, 실패 | 100ms |
| `pop` | 아이템 터지기, 사라지기 | 30ms |
| `coin` | 코인/보너스 획득 | 50ms |
| `powerup` | 파워업, 레벨업 | [100, 50, 100] |
| `gameover` | 게임 오버 | [100, 50, 100, 50, 200] |
| `victory` | 게임 클리어, 승리 | [100, 50, 100, 50, 200] |
| `match` | 카드 매치, 조합 성공 | [50, 30, 50] |
| `flip` | 카드 뒤집기, 회전 | 20ms |
| `wrong` | 틀린 매치, 잘못된 조합 | 100ms |

### 파티클 가이드

**폭발 효과**
```javascript
const particles = new ParticleEffect(canvas, ctx);
particles.createExplosion(x, y, '#ff0000', 20); // 위치, 색상, 개수
```

**색상 추천**
- 성공: `#00ff00`, `#43e97b`
- 실패: `#ff0000`, `#ff6b6b`
- 레벨업: `#ffd700`, `#f39c12`
- 중립: `#667eea`, `#764ba2`

### 모달 활용 예시

**게임 클리어 모달**
```javascript
GameUtils.createModal({
    title: '🎉 게임 클리어!',
    stats: [
        { label: '최종 점수', value: GameUtils.formatNumber(score) },
        { label: '최고 점수', value: GameUtils.formatNumber(highScore) }
    ],
    buttons: [
        { 
            text: '📱 카톡 공유', 
            action: () => {
                const text = `🎮 My Game 점수: ${score}\nhttps://oringnam.github.io/minigames/games/my-game/`;
                GameUtils.copyToClipboard(text);
            }
        },
        { text: '다시 하기', action: () => restartGame() }
    ]
});
```

**게임 오버 모달**
```javascript
GameUtils.createModal({
    title: '💀 게임 오버!',
    message: '다시 도전해보세요!',
    stats: [
        { label: '최종 점수', value: score }
    ],
    buttons: [
        { text: '다시 하기', action: () => restartGame() }
    ]
});
```

---

## 🚀 배포

**자동 배포**: GitHub Actions (main 브랜치 push)

**수동 배포**:
```bash
git add -A
git commit -m "설명"
git push origin main
```

**캐시 새로고침**:
- 메인 페이지 우측 상단 "🔄 캐시 새로고침" 버튼
- 또는 `?nocache` 쿼리 파라미터

---

## 📝 코딩 컨벤션

### JavaScript
- 바닐라 JS (프레임워크 없음)
- ES6+ 문법 사용
- 함수형 + 객체지향 혼합
- 전역 변수 최소화

### 스타일
- CSS-in-HTML (각 게임 독립)
- 그라데이션 배경 선호
- 둥근 모서리 (`border-radius: 15-25px`)
- 애니메이션/트랜지션 적극 활용

### 네이밍
- 파일: kebab-case (`my-game.js`)
- 변수/함수: camelCase (`myFunction`)
- 클래스: PascalCase (`GameUtils`)
- 상수: UPPER_CASE (`MAX_SCORE`)

---

## 🐛 디버깅 팁

**게임이 느려요**
- 파티클 개수 줄이기
- requestAnimationFrame 사용 확인
- 불필요한 DOM 조작 제거

**사운드가 안 들려요**
- 브라우저 정책: 사용자 인터랙션 후 재생
- `sounds.play()` 호출 타이밍 확인

**모바일에서 깨져요**
- viewport meta 태그 확인
- mobile-layout.css 로드 확인
- 캔버스 크기 제한 (`max-width: 350px`)

**localStorage 에러**
- 시크릿 모드에서는 작동 안 함
- try-catch로 감싸기

---

## 📊 성능 최적화

### 권장 사항
- 캔버스 사이즈: 최대 400x600 (모바일)
- 프레임레이트: 30-60 FPS
- 파티클 수: 최대 50개
- 사운드: 짧고 가벼운 beep 음

### 모바일 속도 조정
```javascript
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const gameSpeed = isMobile ? 80 : 100; // 모바일 20% 느리게
```

---

## 🔧 유지보수

### 자주 바뀌는 것들
- `index.html`: 게임 목록, 카테고리
- `stats.html`: 점수 통계 로직
- 각 게임의 난이도/밸런스

### 거의 안 바뀌는 것들
- `game-sounds.js`: 사운드 라이브러리
- `game-utils.js`: 공통 유틸리티
- `mobile-controls.js`: 터치 컨트롤
- `mobile-layout.css`: 기본 레이아웃

### 코드 품질
- ESLint 없음 (바닐라 JS)
- 브라우저 콘솔로 디버깅
- 실제 기기 테스트 필수

---

## 📚 참고 자료

**공식 문서**
- [MDN Web Docs](https://developer.mozilla.org/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

**영감**
- 고전 아케이드 게임
- 모바일 캐주얼 게임

---

## 🎯 미래 계획

- [ ] PWA 지원 (오프라인 플레이)
- [ ] 멀티플레이어 (WebSocket)
- [ ] 리더보드 (서버 필요)
- [ ] 테마 커스터마이징
- [ ] 더 많은 게임 추가

---

**마지막 업데이트**: 2026-02-11  
**버전**: 1.0.0  
**개발자**: jwpark0830

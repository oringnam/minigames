# 🎮 미니게임 아케이드

> 모바일 우선, Glassmorphism 디자인의 브라우저 기반 게임 컬렉션

**라이브**: https://oringnam.github.io/minigames/  
**레포**: https://github.com/oringnam/minigames

---

## ✨ 특징

- 🎨 **Glassmorphism 디자인**: 반투명 유리 효과의 고급스러운 UI
- 📱 **모바일 최적화**: 터치 컨트롤, 세로 화면 완벽 지원
- 🔊 **몰입감**: 사운드, 진동, 파티클 효과
- 💾 **점수 저장**: LocalStorage 기반 최고 기록
- 🚀 **바닐라 JS**: 프레임워크 없이 순수 JavaScript
- 🎯 **4개의 완성도 높은 게임**: 품질 중심 큐레이션

---

## 🎮 게임 목록

### 🐍 스네이크 (Snake)
클래식 뱀 게임. 먹이를 먹고 길어지며 벽과 자신을 피하세요.

**특징**:
- 가상 조이스틱 (모바일)
- 부드러운 애니메이션
- 액자 테두리 디자인
- 파티클 효과

**조작**: 화살표/WASD 또는 조이스틱

---

### 🧠 메모리 게임 (Memory Game)
같은 카드 짝 맞추기. 3D 플립 애니메이션.

**특징**:
- 3단계 난이도 (4x2 → 4x4 → 4x6)
- 5개 목숨 시스템
- 3D 카드 플립 (rotateY 180deg)
- 단계 클리어 보상

**조작**: 클릭/터치

---

### 💎 매치 3 (Match-3)
보석 3개 이상 맞추기. 연쇄 반응으로 높은 점수!

**특징**:
- 8x8 보드
- 연쇄 반응 감지
- 빅매치 보너스 (5개 이상)
- 30번 이동으로 목표 달성

**조작**: 클릭/터치

---

### 🎵 사이먼 세즈 (Simon Says)
순서를 기억하고 따라하세요. 집중력 게임!

**특징**:
- 4개 대형 버튼
- 사운드 시퀀스
- 마일스톤 축하 (레벨 5, 10, 15...)
- 신기록 알림

**조작**: 클릭/터치

---

## 🛠️ 기술 스택

### 코어
- **HTML5 Canvas**: 게임 렌더링
- **Vanilla JavaScript**: 프레임워크 없음
- **CSS3**: Glassmorphism, 애니메이션
- **LocalStorage**: 점수/설정 저장

### 공통 모듈
- `game-sounds.js`: 사운드/파티클/진동 라이브러리 (11가지 사운드)
- `game-utils.js`: 점수 저장, 모달, UI 컴포넌트 (GameUtils, GameUI)
- `mobile-layout.css`: 모바일 최적화 레이아웃

### 디자인
- **Glassmorphism**: `rgba(255, 255, 255, 0.15)` + `backdrop-filter: blur(20px)`
- **그라디언트 배경**: 게임별 고유 색상
- **흰색 텍스트**: 그림자로 가독성 확보

---

## 🚀 시작하기

### 온라인 플레이
https://oringnam.github.io/minigames/ 접속

### 로컬 실행
```bash
git clone https://github.com/oringnam/minigames.git
cd minigames
# 웹 서버로 index.html 열기 (Live Server 등)
```

---

## 📁 프로젝트 구조

```
minigames/
├── index.html              # 메인 페이지
├── stats.html              # 통계 페이지
├── game-sounds.js          # 사운드 라이브러리
├── game-utils.js           # 공통 유틸리티
├── mobile-layout.css       # 모바일 레이아웃
├── CLAUDE.md               # 개발 가이드 (8.5KB)
├── EXAMPLES.html           # 공통 모듈 예시
└── games/
    ├── snake/              # 🐍 스네이크
    ├── memory/             # 🧠 메모리 게임
    ├── match3/             # 💎 매치 3
    └── simon/              # 🎵 사이먼 세즈
```

---

## 🎨 디자인 시스템

### Glassmorphism
```css
/* 기본 컨테이너 */
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
border: 2px solid rgba(255, 255, 255, 0.3);
box-shadow: 
    0 20px 60px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.2);
```

### 색상 팔레트
- Snake: `#1e3c72 → #2a5298` (파란색)
- Memory: `#667eea → #764ba2` (보라색)
- Match-3: `#f093fb → #f5576c` (핑크)
- Simon Says: `#141E30 → #243B55` (검정)

### 타이포그래피
- 제목: 흰색, 900 font-weight, text-shadow
- 버튼: 흰색, 600 font-weight
- 본문: rgba(255, 255, 255, 0.8~1.0)

---

## 📊 공통 모듈 사용법

### game-sounds.js
```javascript
const sounds = new GameSounds();
sounds.play('success');  // click, error, pop, coin, powerup, gameover, victory, match, flip, wrong
vibrate(50);             // 진동
screenShake(10, 300);    // 화면 흔들기
```

### game-utils.js
```javascript
// 점수 관리
GameUtils.saveScore('snake', 'highScore', 1000);
GameUtils.updateHighScore('snake', score);  // 자동 비교 + 저장

// 점수판 생성
const scoreBoard = GameUI.createScoreBoard({
    items: [
        { id: 'score', label: '점수', value: 0 },
        { id: 'highScore', label: '최고', value: 100 }
    ]
});
scoreBoard.update('score', 50);

// 모달 생성
GameUtils.createModal({
    title: '🎉 게임 클리어!',
    stats: [{ label: '점수', value: 1000 }],
    buttons: [
        { text: '📱 공유', action: () => shareKakao() },
        { text: '다시', action: restart }
    ]
});
```

자세한 내용: [CLAUDE.md](./CLAUDE.md)

---

## 📜 개발 히스토리

### v1.0-stable (2026-02-12)
- ✅ 4개 게임 완성 (Snake, Memory, Match-3, Simon Says)
- ✅ Glassmorphism 디자인 시스템 통일
- ✅ 공통 모듈 100% 적용
- ✅ 모바일 최적화 완료
- ✅ 사운드/진동/파티클 완전 통합

### 제거된 게임들 (품질 집중을 위해)
- 2048, Tetris, Breakout, Flappy Bird, Space Shooter
- Whack-a-Mole, Sokoban, Blackjack, Cookie Clicker
- Runner, Maze, Pong, Tic-Tac-Toe

**이유**: 10개 평범한 게임보다 4개 완성도 높은 게임

---

## 🤝 기여하기

이 프로젝트는 **자율 개선 모드**로 운영됩니다.

**개선 가능 영역**:
- 버그 수정
- UX/게임성 개선
- 성능 최적화
- 디자인 폴리싱

**큰 변경은 이슈로**:
- 새 게임 추가
- 게임 룰 변경
- 아키텍처 변경

---

## 📝 라이선스

MIT License

---

## 🔗 링크

- **라이브**: https://oringnam.github.io/minigames/
- **레포**: https://github.com/oringnam/minigames
- **개발 가이드**: [CLAUDE.md](./CLAUDE.md)
- **예시**: [EXAMPLES.html](./EXAMPLES.html)

---

**Made with ❤️** | 지속적으로 개선 중...

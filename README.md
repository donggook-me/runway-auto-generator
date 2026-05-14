# 🎬 Runway Auto Generator

Runway ML의 Generate 버튼이 `disabled → enabled` 상태로 바뀌는 순간 자동으로 클릭해주는 Chrome 확장 프로그램입니다.

## ✨ 주요 기능

- **자동 감지**: `MutationObserver` + 폴링(기본 3초) 이중 방식으로 버튼 상태 실시간 감시
- **즉시 클릭**: 버튼 활성화 시 자동 클릭
- **팝업 UI**: 모니터링 시작/중지, 체크 간격 설정, 상태 로그 확인
- **데스크탑 알림**: 클릭 시 알림 팝업
- **자동 시작**: 페이지 로드 시 자동으로 모니터링 시작하는 옵션

## 📁 파일 구조

```
runway-auto-generator/
├── manifest.json      # 확장 프로그램 설정 (Manifest V3)
├── content.js         # 버튼 감시 및 클릭 로직 (Runway 페이지에 삽입)
├── background.js      # 서비스 워커 (알림 처리)
├── popup.html         # 확장 프로그램 팝업 UI
├── popup.js           # 팝업 로직
└── icons/             # 확장 프로그램 아이콘
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 설치 방법

1. 이 저장소를 클론합니다:
   ```bash
   git clone https://github.com/YOUR_USERNAME/runway-auto-generator.git
   ```

2. Chrome 주소창에 `chrome://extensions` 입력

3. 우측 상단 **개발자 모드** 토글 ON

4. **"압축해제된 확장 프로그램을 로드합니다"** 클릭

5. 클론한 `runway-auto-generator` 폴더 선택

## 🎮 사용 방법

1. [Runway ML](https://app.runwayml.com) 접속
2. 원하는 프롬프트 및 설정 입력
3. 크롬 툴바의 🎬 아이콘 클릭
4. **▶ 모니터링 시작** 클릭
5. Generate 버튼이 활성화되면 자동 클릭 → 알림 발송

> 💡 **프롬프트는 Runway 페이지에서 직접 입력**해두면 됩니다. 확장 프로그램은 버튼 상태만 감지합니다.

## ⚙️ 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| 체크 간격 | 3초 | Generate 버튼 상태를 확인하는 주기 |
| 자동 시작 | OFF | 페이지 로드 시 자동으로 모니터링 시작 |

## 🛠️ 기술 스택

- Chrome Extension Manifest V3
- Vanilla JS (의존성 없음)
- MutationObserver API
- Chrome Storage / Notifications API

## 📝 변경 이력

### v1.0.0
- 최초 릴리즈
- Generate 버튼 자동 감지 및 클릭
- 팝업 UI (모니터링 제어, 로그, 알림)
- 자동 시작 옵션

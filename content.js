// Runway Auto Generator - Content Script
// Monitors the Generate button and auto-clicks when enabled

let isMonitoring = false;
let observer = null;
let checkInterval = null;
let lastClickTime = 0;
const MIN_CLICK_INTERVAL = 8000; // 최소 8초 간격 (랜덤 지터 포함)

// Generate 버튼 찾기
function findGenerateButton() {
  // 여러 선택자로 버튼 탐색 (Runway UI 업데이트에 대응)
  const candidates = document.querySelectorAll('button[data-soft-disabled]');
  for (const btn of candidates) {
    if (btn.textContent.trim().includes('Generate')) {
      return btn;
    }
  }
  // 폴백: primaryBlue 클래스 버튼
  const blueButtons = document.querySelectorAll('button.primaryBlue-oz2I8B, button[class*="primaryBlue"]');
  for (const btn of blueButtons) {
    if (btn.textContent.trim().includes('Generate')) {
      return btn;
    }
  }
  return null;
}

// 버튼이 활성화 상태인지 확인
function isButtonEnabled(btn) {
  if (!btn) return false;
  // data-soft-disabled가 없거나 "false"이고, disabled 속성도 없어야 함
  const softDisabled = btn.getAttribute('data-soft-disabled');
  const hardDisabled = btn.disabled;
  const ariaDisabled = btn.getAttribute('aria-disabled');

  return (softDisabled === null || softDisabled === 'false') &&
         !hardDisabled &&
         ariaDisabled !== 'true';
}

// 버튼 클릭 실행 — background의 Debugger API를 통해 isTrusted: true 실제 클릭
function clickGenerateButton(btn) {
  const now = Date.now();
  const jitter = Math.random() * 3000;
  if (now - lastClickTime < MIN_CLICK_INTERVAL + jitter) {
    return false;
  }
  lastClickTime = now;

  const rect = btn.getBoundingClientRect();
  // CDP Input.dispatchMouseEvent는 뷰포트 좌표 사용 — scrollX/Y 더하면 안 됨
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // 100~500ms 랜덤 딜레이 후 background에 debugger 클릭 요청
  const preDelay = Math.floor(Math.random() * 400) + 100;
  setTimeout(() => {
    chrome.runtime.sendMessage(
      { type: 'DEBUGGER_CLICK', tabId: null, x, y },
      (res) => {
        if (res && res.success) {
          chrome.runtime.sendMessage({
            type: 'BUTTON_CLICKED',
            time: new Date().toLocaleTimeString()
          });
          chrome.runtime.sendMessage({ type: 'NOTIFY_CLICK' });
        }
      }
    );
  }, preDelay);

  return true;
}

// MutationObserver로 버튼 상태 변화 감시
function startObserver(btn) {
  if (observer) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (isButtonEnabled(btn)) {
          clickGenerateButton(btn);
        }
      }
    }
  });

  observer.observe(btn, {
    attributes: true,
    attributeFilter: ['data-soft-disabled', 'disabled', 'aria-disabled', 'class']
  });

  console.log('[RunwayAuto] MutationObserver 시작됨');
}

// 주기적 폴링 체크 (MutationObserver 보조 + 버튼 재탐색)
function startPolling(intervalSeconds) {
  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    if (!isMonitoring) return;

    const btn = findGenerateButton();
    if (!btn) {
      console.log('[RunwayAuto] Generate 버튼을 찾을 수 없음 - 재탐색 중...');
      return;
    }

    // observer가 없거나 다른 버튼이면 재연결
    if (!observer) {
      startObserver(btn);
    }

    if (isButtonEnabled(btn)) {
      console.log('[RunwayAuto] 버튼 활성화 감지! (폴링)');
      clickGenerateButton(btn);
    }

    // 상태 업데이트 전달
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      buttonFound: true,
      buttonEnabled: isButtonEnabled(btn),
      time: new Date().toLocaleTimeString()
    });

  }, intervalSeconds * 1000);

  console.log(`[RunwayAuto] 폴링 시작: ${intervalSeconds}초 간격`);
}

// 모니터링 시작
function startMonitoring(intervalSeconds = 3) {
  isMonitoring = true;

  const btn = findGenerateButton();
  if (btn) {
    startObserver(btn);
    // 즉시 활성화 여부 체크
    if (isButtonEnabled(btn)) {
      clickGenerateButton(btn);
    }
  } else {
    console.log('[RunwayAuto] 버튼을 아직 찾지 못함. 폴링으로 탐색합니다.');
  }

  startPolling(intervalSeconds);

  chrome.runtime.sendMessage({ type: 'MONITORING_STARTED' });
  console.log('[RunwayAuto] 모니터링 시작!');
}

// 모니터링 중지
function stopMonitoring() {
  isMonitoring = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  chrome.runtime.sendMessage({ type: 'MONITORING_STOPPED' });
  console.log('[RunwayAuto] 모니터링 중지');
}

// 팝업/백그라운드에서 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_MONITORING') {
    startMonitoring(message.interval || 3);
    sendResponse({ success: true, status: 'started' });
  } else if (message.type === 'STOP_MONITORING') {
    stopMonitoring();
    sendResponse({ success: true, status: 'stopped' });
  } else if (message.type === 'GET_STATUS') {
    const btn = findGenerateButton();
    sendResponse({
      isMonitoring,
      buttonFound: !!btn,
      buttonEnabled: isButtonEnabled(btn),
      lastClickTime: lastClickTime ? new Date(lastClickTime).toLocaleTimeString() : null
    });
  }
  return true; // 비동기 응답 허용
});

// 저장된 설정 불러와서 자동 시작
chrome.storage.local.get(['autoStart', 'interval'], (data) => {
  if (data.autoStart) {
    console.log('[RunwayAuto] 자동 시작 모드로 모니터링 시작');
    startMonitoring(data.interval || 3);
  }
});

console.log('[RunwayAuto] Content script 로드됨 - app.runwayml.com');

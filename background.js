// Runway Auto Generator - Background Service Worker

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CDP로 버튼을 직접 찾아 scrollIntoView 후 클릭
// 좌표 계산과 클릭이 같은 CDP 세션 안에서 이뤄져 zoom/resize 무관
async function debuggerClick(tabId) {
  const target = { tabId };

  await chrome.debugger.attach(target, '1.3');

  try {
    // 1) 페이지 컨텍스트에서 버튼 찾기 + 뷰포트 안으로 스크롤
    const evalResult = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: `(function() {
        function findEnabledGenerateBtn() {
          // 1순위: data-soft-disabled 속성 버튼
          for (const b of document.querySelectorAll('button[data-soft-disabled]')) {
            if (b.textContent.trim().includes('Generate') &&
                !b.disabled &&
                b.getAttribute('data-soft-disabled') !== 'true' &&
                b.getAttribute('aria-disabled') !== 'true') return b;
          }
          // 2순위: primaryBlue 계열 버튼
          for (const b of document.querySelectorAll('button[class*="primaryBlue"], button[class*="primary"]')) {
            if (b.textContent.trim().includes('Generate') && !b.disabled) return b;
          }
          // 3순위: 텍스트로만 탐색
          for (const b of document.querySelectorAll('button')) {
            if (b.textContent.trim() === 'Generate' && !b.disabled) return b;
          }
          return null;
        }

        const btn = findEnabledGenerateBtn();
        if (!btn) return null;

        // 뷰포트 중앙으로 스크롤 (즉시, 애니메이션 없이)
        btn.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });

        const rect = btn.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })()`,
      returnByValue: true
    });

    const coords = evalResult.result.value;
    if (!coords) {
      throw new Error('Generate 버튼을 찾지 못했거나 비활성 상태');
    }

    // 2) 스크롤 안착 대기
    await sleep(120);

    // 3) scrollIntoView 후 좌표 재확인 (스크롤로 위치가 바뀌었을 수 있음)
    const recheck = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', {
      expression: `(function() {
        function findEnabledGenerateBtn() {
          for (const b of document.querySelectorAll('button[data-soft-disabled]')) {
            if (b.textContent.trim().includes('Generate') &&
                !b.disabled &&
                b.getAttribute('data-soft-disabled') !== 'true' &&
                b.getAttribute('aria-disabled') !== 'true') return b;
          }
          for (const b of document.querySelectorAll('button[class*="primaryBlue"], button[class*="primary"]')) {
            if (b.textContent.trim().includes('Generate') && !b.disabled) return b;
          }
          for (const b of document.querySelectorAll('button')) {
            if (b.textContent.trim() === 'Generate' && !b.disabled) return b;
          }
          return null;
        }
        const btn = findEnabledGenerateBtn();
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      returnByValue: true
    });

    const finalCoords = (recheck.result.value) || coords;
    const x = Math.round(finalCoords.x);
    const y = Math.round(finalCoords.y);

    // 4) 실제 클릭 (mousePressed → mouseReleased)
    //    mouseMoved 사전 이동 제거 — 불필요한 스크롤 유발 방지
    const cx = x + Math.round(Math.random() * 4 - 2);
    const cy = y + Math.round(Math.random() * 3 - 1);

    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: cx, y: cy,
      button: 'left',
      clickCount: 1,
      modifiers: 0,
      pointerType: 'mouse'
    });

    await sleep(60 + Math.floor(Math.random() * 80));

    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: cx, y: cy,
      button: 'left',
      clickCount: 1,
      modifiers: 0,
      pointerType: 'mouse'
    });

  } finally {
    await chrome.debugger.detach(target);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NOTIFY_CLICK') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Runway Auto Generator',
      message: `Generate 버튼 클릭! (${new Date().toLocaleTimeString()})`,
      priority: 1
    });
  }

  if (message.type === 'DEBUGGER_CLICK') {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) { sendResponse({ success: false, error: 'no tabId' }); return; }
    debuggerClick(tabId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    autoStart: false,
    interval: 3,
    intervalUnit: 'sec',
    clickCount: 0
  });
});

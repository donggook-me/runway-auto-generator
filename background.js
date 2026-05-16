// Runway Auto Generator - Background Service Worker

// Debugger API로 isTrusted: true 실제 클릭 생성
async function debuggerClick(tabId, x, y) {
  const target = { tabId };

  await chrome.debugger.attach(target, '1.3');

  // 버튼 근처에서 자연스럽게 이동해오는 경로 시뮬레이션
  const steps = 3;
  const startX = x - 30 + Math.random() * 20;
  const startY = y - 10 + Math.random() * 10;

  for (let i = 0; i <= steps; i++) {
    const mx = startX + ((x - startX) * i) / steps + (Math.random() * 2 - 1);
    const my = startY + ((y - startY) * i) / steps + (Math.random() * 2 - 1);
    await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(mx),
      y: Math.round(my),
      button: 'none',
      modifiers: 0
    });
    await sleep(20 + Math.random() * 30);
  }

  // 실제 클릭 좌표 (버튼 중앙 ± 미세 랜덤)
  const cx = Math.round(x + (Math.random() * 4 - 2));
  const cy = Math.round(y + (Math.random() * 3 - 1));

  await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: cx, y: cy,
    button: 'left',
    clickCount: 1,
    modifiers: 0
  });

  await sleep(60 + Math.random() * 80); // mousedown 유지 시간

  await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: cx, y: cy,
    button: 'left',
    clickCount: 1,
    modifiers: 0
  });

  await chrome.debugger.detach(target);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    debuggerClick(tabId, message.x, message.y)
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

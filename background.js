// Runway Auto Generator - Background Service Worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NOTIFY_CLICK') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Runway Auto Generator',
      message: `✅ Generate 버튼 자동 클릭! (${new Date().toLocaleTimeString()})`,
      priority: 1
    });
  }
});

// 설치/업데이트 시 초기 설정
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    autoStart: false,
    interval: 3,
    clickCount: 0
  });
  console.log('[RunwayAuto] 확장 프로그램 설치됨');
});

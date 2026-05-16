// Runway Auto Generator - Popup Script

let isMonitoring = false;
let statusPollTimer = null;

const statusDot = document.getElementById('statusDot');
const pageStatus = document.getElementById('pageStatus');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const intervalInput = document.getElementById('intervalInput');
const unitSelect = document.getElementById('unitSelect');
const autoStartToggle = document.getElementById('autoStartToggle');
const logBox = document.getElementById('logBox');
const lastClick = document.getElementById('lastClick');
const valFound = document.getElementById('valFound');
const valEnabled = document.getElementById('valEnabled');
const cardFound = document.getElementById('cardFound');
const cardEnabled = document.getElementById('cardEnabled');

function addLog(msg, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logBox.insertBefore(entry, logBox.firstChild);
  // 최대 20개 유지
  while (logBox.children.length > 20) {
    logBox.removeChild(logBox.lastChild);
  }
}

function setMonitoringUI(active) {
  isMonitoring = active;
  if (active) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    statusDot.className = 'status-dot active';
  } else {
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    statusDot.className = 'status-dot inactive';
  }
}

function updateStatusCards(buttonFound, buttonEnabled) {
  valFound.textContent = buttonFound ? '✓' : '✗';
  valEnabled.textContent = buttonEnabled ? '✓' : '✗';
  cardFound.className = `info-card ${buttonFound ? 'found' : ''}`;
  cardEnabled.className = `info-card ${buttonEnabled ? 'enabled' : ''}`;
}

// 현재 탭이 Runway인지 확인 후 content script에 메시지 전달
async function getActiveRunwayTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && tab.url.includes('app.runwayml.com')) {
        resolve(tab);
      } else {
        resolve(null);
      }
    });
  });
}

async function sendToContent(type, data = {}) {
  const tab = await getActiveRunwayTab();
  if (!tab) return null;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

// 상태 폴링 (팝업이 열려 있는 동안)
async function pollStatus() {
  const tab = await getActiveRunwayTab();
  if (!tab) {
    pageStatus.textContent = 'Runway 페이지를 열어주세요';
    pageStatus.className = 'off-runway';
    return;
  }

  pageStatus.textContent = '✓ app.runwayml.com 감지됨';
  pageStatus.className = 'on-runway';

  const status = await sendToContent('GET_STATUS');
  if (status) {
    setMonitoringUI(status.isMonitoring);
    updateStatusCards(status.buttonFound, status.buttonEnabled);
    if (status.lastClickTime) {
      lastClick.textContent = status.lastClickTime;
    }
  }
}

// 단위 변경 시 입력 범위 조정
unitSelect.addEventListener('change', () => {
  const isMin = unitSelect.value === 'min';
  intervalInput.max = isMin ? 999 : 99;
  const current = parseInt(intervalInput.value) || 1;
  if (!isMin && current > 99) intervalInput.value = 99;
  chrome.storage.local.set({ intervalUnit: unitSelect.value });
});

// 시작 버튼
startBtn.addEventListener('click', async () => {
  const raw = parseInt(intervalInput.value) || 3;
  const isMin = unitSelect.value === 'min';
  const intervalSec = isMin ? raw * 60 : raw;
  const label = isMin ? `${raw}분` : `${raw}초`;
  const response = await sendToContent('START_MONITORING', { interval: intervalSec });
  if (response && response.success) {
    setMonitoringUI(true);
    addLog(`모니터링 시작 (${label} 간격)`, 'success');
  } else {
    addLog('오류: Runway 페이지에서 실행해주세요', 'warn');
  }
});

// 중지 버튼
stopBtn.addEventListener('click', async () => {
  const response = await sendToContent('STOP_MONITORING');
  if (response && response.success) {
    setMonitoringUI(false);
    addLog('모니터링 중지됨', 'warn');
  }
});

// 자동 시작 토글 저장
autoStartToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoStart: autoStartToggle.checked });
  addLog(`자동 시작: ${autoStartToggle.checked ? 'ON' : 'OFF'}`, 'info');
});

// 간격 변경 저장
intervalInput.addEventListener('change', () => {
  const isMin = unitSelect.value === 'min';
  const max = isMin ? 999 : 99;
  const val = Math.max(1, Math.min(max, parseInt(intervalInput.value) || 3));
  intervalInput.value = val;
  chrome.storage.local.set({ interval: val });
});

// content script에서 오는 메시지
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'BUTTON_CLICKED') {
    addLog(`🎬 Generate 클릭! (${message.time})`, 'success');
    lastClick.textContent = message.time;
  } else if (message.type === 'MONITORING_STARTED') {
    setMonitoringUI(true);
    addLog('모니터링 활성화됨', 'info');
  } else if (message.type === 'MONITORING_STOPPED') {
    setMonitoringUI(false);
    addLog('모니터링 비활성화됨', 'warn');
  } else if (message.type === 'STATUS_UPDATE') {
    updateStatusCards(message.buttonFound, message.buttonEnabled);
  }
});

// 초기화
async function init() {
  // 저장된 설정 불러오기
  chrome.storage.local.get(['autoStart', 'interval', 'intervalUnit'], (data) => {
    autoStartToggle.checked = data.autoStart || false;
    intervalInput.value = data.interval || 3;
    if (data.intervalUnit) {
      unitSelect.value = data.intervalUnit;
      intervalInput.max = data.intervalUnit === 'min' ? 999 : 99;
    }
  });

  await pollStatus();

  // 주기적 상태 갱신
  statusPollTimer = setInterval(pollStatus, 2000);
}

// 팝업 닫힐 때 정리
window.addEventListener('unload', () => {
  if (statusPollTimer) clearInterval(statusPollTimer);
});

init();

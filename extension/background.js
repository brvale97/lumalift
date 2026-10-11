importScripts('common.js');

const STEP = 10;

// Start working in YouTube tabs that are already open, without a reload.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  for (const tab of tabs) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['common.js', 'content.js'] })
      .catch(() => {});
  }
});

async function handleCommand(command, tab) {
  const settings = await LumaLift.load();
  let text;
  if (command === 'brighter' || command === 'darker') {
    const step = command === 'brighter' ? STEP : -STEP;
    settings.brightness = LumaLift.clamp('brightness', settings.brightness + step);
    settings.enabled = true;
    text = chrome.i18n.getMessage('toastBrightness', [String(settings.brightness)]);
  } else if (command === 'toggle') {
    settings.enabled = !settings.enabled;
    text = chrome.i18n.getMessage(settings.enabled ? 'toastOn' : 'toastOff');
  } else {
    return;
  }
  await LumaLift.save(settings);
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'lumalift-toast', text }).catch(() => {});
}

chrome.commands.onCommand.addListener(handleCommand);

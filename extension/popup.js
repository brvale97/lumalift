const t = (key, substitutions) => chrome.i18n.getMessage(key, substitutions);

const SLIDERS = [
  { key: 'brightness', name: 'sliderBrightness', step: 5 },
  { key: 'shadows', name: 'sliderShadows', hint: 'hintShadows', step: 5 },
  { key: 'contrast', name: 'sliderContrast', step: 5 },
  { key: 'saturation', name: 'sliderColor', step: 5 },
];
const PRESET_KEYS = ['brightness', 'shadows', 'contrast', 'saturation'];
const SHORTCUT_LABELS = { brighter: 'keyBrighter', darker: 'keyDarker', toggle: 'keyToggle' };

const enabledInput = document.getElementById('enabled');
const presetsEl = document.getElementById('presets');
const slidersEl = document.getElementById('sliders');
const sliderInputs = {};
const sliderOutputs = {};
const presetButtons = {};
let settings = LumaLift.normalize();

document.documentElement.lang = chrome.i18n.getUILanguage();
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);

for (const preset of LumaLift.presets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = t(preset.message);
  button.addEventListener('click', () => {
    for (const key of PRESET_KEYS) settings[key] = preset[key];
    settings.enabled = true;
    save();
  });
  presetButtons[preset.id] = button;
  presetsEl.appendChild(button);
}

for (const slider of SLIDERS) {
  const [min, max] = LumaLift.limits[slider.key];
  const row = document.createElement('label');
  row.className = 'slider';
  row.innerHTML = `
    <span class="label">
      <span><span class="name"></span>${slider.hint ? '<span class="hint"></span>' : ''}</span>
      <output></output>
    </span>
    <input type="range" min="${min}" max="${max}" step="${slider.step}" />`;
  row.querySelector('.name').textContent = t(slider.name);
  if (slider.hint) row.querySelector('.hint').textContent = t(slider.hint);
  const input = row.querySelector('input');
  input.addEventListener('input', () => {
    settings[slider.key] = Number(input.value);
    settings.enabled = true;
    save();
  });
  sliderInputs[slider.key] = input;
  sliderOutputs[slider.key] = row.querySelector('output');
  slidersEl.appendChild(row);
}

enabledInput.addEventListener('change', () => {
  settings.enabled = enabledInput.checked;
  save();
});

document.getElementById('reset').addEventListener('click', () => {
  settings = LumaLift.normalize();
  save();
});

function render() {
  enabledInput.checked = settings.enabled;
  document.body.classList.toggle('off', !settings.enabled);
  for (const { key } of SLIDERS) {
    sliderInputs[key].value = settings[key];
    sliderOutputs[key].textContent = `${settings[key]}%`;
  }
  for (const preset of LumaLift.presets) {
    const matches = PRESET_KEYS.every((key) => preset[key] === settings[key]);
    presetButtons[preset.id].classList.toggle('active', settings.enabled && matches);
  }
}

function save() {
  LumaLift.save(settings);
  render();
}

async function renderShortcuts() {
  const keysEl = document.getElementById('keys');
  const commands = await chrome.commands.getAll();
  keysEl.replaceChildren();
  let count = 0;
  for (const [name, label] of Object.entries(SHORTCUT_LABELS)) {
    const shortcut = commands.find((command) => command.name === name)?.shortcut;
    if (!shortcut) continue;
    const kbd = document.createElement('kbd');
    kbd.textContent = shortcut.replace(/Up( Arrow)?$/, '↑').replace(/Down( Arrow)?$/, '↓');
    keysEl.append(kbd, ` ${t(label)} · `);
    count++;
  }
  const link = document.createElement('a');
  link.href = '#';
  link.textContent = t(count ? 'shortcutsChange' : 'shortcutsSetUp');
  link.addEventListener('click', (event) => {
    event.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
  keysEl.append(link);
}

LumaLift.load().then((loaded) => {
  settings = loaded;
  render();
});
renderShortcuts();

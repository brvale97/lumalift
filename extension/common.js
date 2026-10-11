// Shared settings for the popup, the background worker and the YouTube page.
// Assigned instead of declared with const, so injecting it twice does not throw.
globalThis.LumaLift = {
  defaults: { enabled: true, brightness: 100, shadows: 0, contrast: 100, saturation: 100 },

  limits: {
    brightness: [50, 200],
    shadows: [0, 100],
    contrast: [50, 150],
    saturation: [0, 200],
  },

  presets: [
    { id: 'normal', message: 'presetNormal', brightness: 100, shadows: 0, contrast: 100, saturation: 100 },
    { id: 'brighter', message: 'presetBrighter', brightness: 115, shadows: 20, contrast: 100, saturation: 105 },
    { id: 'darkGame', message: 'presetDarkGame', brightness: 110, shadows: 50, contrast: 105, saturation: 115 },
    { id: 'veryDark', message: 'presetVeryDark', brightness: 125, shadows: 80, contrast: 105, saturation: 120 },
  ],

  clamp(key, value) {
    const [min, max] = LumaLift.limits[key];
    const number = Number.isFinite(Number(value)) ? Number(value) : LumaLift.defaults[key];
    return Math.min(max, Math.max(min, Math.round(number)));
  },

  normalize(raw) {
    const settings = { ...LumaLift.defaults, ...(raw || {}) };
    for (const key of Object.keys(LumaLift.limits)) settings[key] = LumaLift.clamp(key, settings[key]);
    settings.enabled = settings.enabled !== false;
    return settings;
  },

  // Lifting shadows = gamma < 1: dark tones get much brighter while white stays white.
  shadowExponent(shadows) {
    return 1 / (1 + (shadows / 100) * 1.5);
  },

  async load() {
    const { settings } = await chrome.storage.local.get('settings');
    return LumaLift.normalize(settings);
  },

  save(settings) {
    return chrome.storage.local.set({ settings: LumaLift.normalize(settings) });
  },
};

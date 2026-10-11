// Applies the chosen settings to every video on the YouTube page.
(() => {
  const STYLE_ID = 'lumalift-style';
  const SVG_ID = 'lumalift-svg';
  const FILTER_ID = 'lumalift-shadows';
  const TOAST_ID = 'lumalift-toast';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let toastTimer;

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.documentElement.appendChild(style);
    }
    return style;
  }

  function ensureShadowFilter(exponent) {
    let svg = document.getElementById(SVG_ID);
    if (!svg) {
      svg = document.createElementNS(SVG_NS, 'svg');
      svg.id = SVG_ID;
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
      const filter = document.createElementNS(SVG_NS, 'filter');
      filter.id = FILTER_ID;
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      const transfer = document.createElementNS(SVG_NS, 'feComponentTransfer');
      for (const channel of ['R', 'G', 'B']) {
        const func = document.createElementNS(SVG_NS, `feFunc${channel}`);
        func.setAttribute('type', 'gamma');
        func.setAttribute('amplitude', '1');
        func.setAttribute('offset', '0');
        transfer.appendChild(func);
      }
      filter.appendChild(transfer);
      svg.appendChild(filter);
      document.documentElement.appendChild(svg);
    }
    for (const channel of ['R', 'G', 'B']) {
      for (const func of svg.getElementsByTagNameNS(SVG_NS, `feFunc${channel}`)) {
        func.setAttribute('exponent', exponent.toFixed(3));
      }
    }
  }

  function filterFor(settings) {
    if (!settings.enabled) return '';
    const parts = [];
    if (settings.shadows > 0) parts.push(`url("#${FILTER_ID}")`);
    if (settings.brightness !== 100) parts.push(`brightness(${settings.brightness / 100})`);
    if (settings.contrast !== 100) parts.push(`contrast(${settings.contrast / 100})`);
    if (settings.saturation !== 100) parts.push(`saturate(${settings.saturation / 100})`);
    return parts.join(' ');
  }

  function apply(settings) {
    if (settings.enabled && settings.shadows > 0) {
      ensureShadowFilter(LumaLift.shadowExponent(settings.shadows));
    }
    const filter = filterFor(settings);
    ensureStyle().textContent = filter ? `video { filter: ${filter} !important; }` : '';
  }

  // Short on-screen message after a keyboard shortcut, also in fullscreen.
  function showToast(text) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.setAttribute(
        'style',
        [
          'position:fixed',
          'top:28px',
          'left:50%',
          'transform:translateX(-50%)',
          'z-index:2147483647',
          'padding:10px 18px',
          'border-radius:999px',
          'background:rgba(15,15,15,.82)',
          'color:#fff',
          'font:600 16px/1.2 Roboto,Arial,sans-serif',
          'pointer-events:none',
          'transition:opacity .25s',
          'opacity:0',
        ].join(';'),
      );
    }
    const host = document.fullscreenElement || document.body || document.documentElement;
    if (toast.parentNode !== host) host.appendChild(toast);
    toast.textContent = text;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.style.opacity = '0'), 1300);
  }

  LumaLift.load().then(apply);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) apply(LumaLift.normalize(changes.settings.newValue));
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'lumalift-toast') showToast(message.text);
  });
})();

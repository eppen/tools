(function () {
  'use strict';

  var config = window.ADS_CONFIG;
  if (!config || !config.enabled) return;

  var client = config.client || '';
  if (!client || client.indexOf('XXXXXXXX') !== -1) return;

  function loadAdScript() {
    if (document.querySelector('script[data-adsense]')) return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsense', 'true');
    document.head.appendChild(script);
  }

  function pushAd(container, slotId) {
    container.hidden = false;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);

    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }

  loadAdScript();

  document.querySelectorAll('.ad-slot').forEach(function (el) {
    var key = el.getAttribute('data-ad-key');
    var slotId = key && config.slots ? config.slots[key] : '';
    if (slotId) {
      pushAd(el, slotId);
    }
  });
})();

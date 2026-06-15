(function () {
  'use strict';

  var KEY = 'eppen-tools-theme';

  function resolveTheme() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* ignore */ }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  document.documentElement.setAttribute('data-theme', resolveTheme());
})();

(function () {
  'use strict';

  var toastEl = null;
  var toastTimer = null;
  var THEME_KEY = 'eppen-tools-theme';

  function initNav() {
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
      });

      navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.classList.remove('open');
        });
      });
    }

    var page = document.body.getAttribute('data-page');
    if (page && navLinks) {
      navLinks.querySelectorAll('a[data-nav]').forEach(function (link) {
        if (link.getAttribute('data-nav') === page) {
          link.classList.add('active');
        }
      });
    }
  }

  function ensureToast() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    return toastEl;
  }

  function showToast(message, type) {
    var el = ensureToast();
    el.textContent = message;
    el.className = 'toast show' + (type ? ' toast-' + type : '');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 2200);
  }

  function copyText(text) {
    if (!text) {
      showToast('没有可复制的内容');
      return Promise.reject(new Error('empty'));
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        showToast('已复制到剪贴板', 'success');
      }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('已复制到剪贴板', 'success');
    } catch (e) {
      showToast('复制失败，请手动选择复制');
      return Promise.reject(e);
    } finally {
      document.body.removeChild(ta);
    }
    return Promise.resolve();
  }

  function showStatus(el, message, type) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = 'status-msg ' + (type || '');
  }

  function getTheme() {
    var theme = document.documentElement.getAttribute('data-theme');
    return theme === 'light' ? 'light' : 'dark';
  }

  function updateThemeToggle(theme) {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    if (theme === 'light') {
      btn.setAttribute('aria-label', '切换暗色主题');
      btn.title = '切换暗色主题';
    } else {
      btn.setAttribute('aria-label', '切换亮色主题');
      btn.title = '切换亮色主题';
    }
  }

  function setTheme(theme) {
    var next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) { /* ignore */ }
    updateThemeToggle(next);
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    updateThemeToggle(getTheme());

    var btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);

    if (window.matchMedia) {
      var media = window.matchMedia('(prefers-color-scheme: light)');
      var onChange = function (e) {
        try {
          if (localStorage.getItem(THEME_KEY)) return;
        } catch (err) { /* ignore */ }
        setTheme(e.matches ? 'light' : 'dark');
      };

      if (media.addEventListener) {
        media.addEventListener('change', onChange);
      } else if (media.addListener) {
        media.addListener(onChange);
      }
    }
  }

  window.ToolsCommon = {
    initNav: initNav,
    initTheme: initTheme,
    showToast: showToast,
    copyText: copyText,
    showStatus: showStatus,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme
  };

  function initAll() {
    initNav();
    initTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

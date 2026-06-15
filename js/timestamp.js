(function () {
  'use strict';

  var input = document.getElementById('tsInput');
  var unitSec = document.getElementById('unitSec');
  var unitMs = document.getElementById('unitMs');
  var btnNow = document.getElementById('btnNow');
  var btnConvert = document.getElementById('btnConvert');
  var btnClear = document.getElementById('btnClear');
  var localOut = document.getElementById('localOut');
  var utcOut = document.getElementById('utcOut');
  var isoOut = document.getElementById('isoOut');
  var status = document.getElementById('tsStatus');
  var unit = 'sec';

  function setUnit(next) {
    unit = next;
    if (unitSec) unitSec.classList.toggle('active', unit === 'sec');
    if (unitMs) unitMs.classList.toggle('active', unit === 'ms');
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatLocal(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
      ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')';
  }

  function convert() {
    var raw = (input.value || '').trim();
    if (!raw) {
      ToolsCommon.showStatus(status, '请输入 Unix 时间戳', 'error');
      return;
    }

    if (!/^-?\d+$/.test(raw)) {
      ToolsCommon.showStatus(status, '时间戳应为整数数字', 'error');
      return;
    }

    var num = parseInt(raw, 10);
    var ms = unit === 'sec' ? num * 1000 : num;
    var d = new Date(ms);

    if (isNaN(d.getTime())) {
      ToolsCommon.showStatus(status, '无效的时间戳', 'error');
      return;
    }

    if (localOut) localOut.textContent = formatLocal(d);
    if (utcOut) utcOut.textContent = d.toUTCString();
    if (isoOut) isoOut.textContent = d.toISOString();
    ToolsCommon.showStatus(status, '转换成功', 'success');
  }

  function fillNow() {
    var now = Date.now();
    input.value = unit === 'sec' ? Math.floor(now / 1000) : now;
    convert();
  }

  if (unitSec) {
    unitSec.addEventListener('click', function () {
      setUnit('sec');
      if (input.value) convert();
    });
  }

  if (unitMs) {
    unitMs.addEventListener('click', function () {
      setUnit('ms');
      if (input.value) convert();
    });
  }

  if (btnNow) btnNow.addEventListener('click', fillNow);
  if (btnConvert) btnConvert.addEventListener('click', convert);
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      input.value = '';
      if (localOut) localOut.textContent = '—';
      if (utcOut) utcOut.textContent = '—';
      if (isoOut) isoOut.textContent = '—';
      ToolsCommon.showStatus(status, '', '');
    });
  }

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') convert();
    });
  }

  setUnit('sec');
})();

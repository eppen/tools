(function () {
  'use strict';

  var input = document.getElementById('jsonInput');
  var output = document.getElementById('jsonOutput');
  var status = document.getElementById('jsonStatus');
  var btnFormat = document.getElementById('btnFormat');
  var btnMinify = document.getElementById('btnMinify');
  var btnClear = document.getElementById('btnClear');
  var btnCopyIn = document.getElementById('btnCopyIn');
  var btnCopyOut = document.getElementById('btnCopyOut');

  function parseJson(text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      var msg = e.message || 'Invalid JSON';
      var match = msg.match(/position (\d+)/i);
      if (match) {
        var pos = parseInt(match[1], 10);
        var lines = text.substring(0, pos).split('\n');
        msg = msg + '（约第 ' + lines.length + ' 行）';
      }
      return { ok: false, error: msg };
    }
  }

  function formatJson(spaces) {
    var text = (input.value || '').trim();
    if (!text) {
      ToolsCommon.showStatus(status, '请输入 JSON 内容', 'error');
      output.value = '';
      return;
    }

    var result = parseJson(text);
    if (!result.ok) {
      ToolsCommon.showStatus(status, result.error, 'error');
      input.classList.add('error-field');
      output.value = '';
      return;
    }

    input.classList.remove('error-field');
    output.value = JSON.stringify(result.value, null, spaces);
    ToolsCommon.showStatus(status, spaces ? '格式化成功' : '压缩成功', 'success');
  }

  if (btnFormat) {
    btnFormat.addEventListener('click', function () {
      formatJson(2);
    });
  }

  if (btnMinify) {
    btnMinify.addEventListener('click', function () {
      formatJson(0);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', function () {
      input.value = '';
      output.value = '';
      input.classList.remove('error-field');
      ToolsCommon.showStatus(status, '', '');
    });
  }

  if (btnCopyIn) {
    btnCopyIn.addEventListener('click', function () {
      ToolsCommon.copyText(input.value);
    });
  }

  if (btnCopyOut) {
    btnCopyOut.addEventListener('click', function () {
      ToolsCommon.copyText(output.value);
    });
  }
})();

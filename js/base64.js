(function () {
  'use strict';

  var input = document.getElementById('base64Input');
  var output = document.getElementById('base64Output');
  var status = document.getElementById('base64Status');
  var btnEncode = document.getElementById('btnEncode');
  var btnDecode = document.getElementById('btnDecode');
  var btnClear = document.getElementById('btnClear');
  var btnCopyOut = document.getElementById('btnCopyOut');
  var mode = 'encode';

  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    bytes.forEach(function (b) {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function setMode(next) {
    mode = next;
    if (btnEncode) btnEncode.classList.toggle('active', mode === 'encode');
    if (btnDecode) btnDecode.classList.toggle('active', mode === 'decode');
  }

  function run() {
    var text = input.value;
    if (!text && text !== '0') {
      ToolsCommon.showStatus(status, '请输入内容', 'error');
      output.value = '';
      return;
    }

    try {
      if (mode === 'encode') {
        output.value = utf8ToBase64(text);
        ToolsCommon.showStatus(status, '编码成功', 'success');
      } else {
        var cleaned = text.replace(/\s/g, '');
        output.value = base64ToUtf8(cleaned);
        ToolsCommon.showStatus(status, '解码成功', 'success');
      }
    } catch (e) {
      ToolsCommon.showStatus(status, (mode === 'encode' ? '编码' : '解码') + '失败：' + (e.message || '格式错误'), 'error');
      output.value = '';
    }
  }

  if (btnEncode) {
    btnEncode.addEventListener('click', function () {
      setMode('encode');
      run();
    });
  }

  if (btnDecode) {
    btnDecode.addEventListener('click', function () {
      setMode('decode');
      run();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', function () {
      input.value = '';
      output.value = '';
      ToolsCommon.showStatus(status, '', '');
    });
  }

  if (btnCopyOut) {
    btnCopyOut.addEventListener('click', function () {
      ToolsCommon.copyText(output.value);
    });
  }

  setMode('encode');
})();

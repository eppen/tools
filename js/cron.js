(function () {
  'use strict';

  var ALIASES = {
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
    '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0',
    '@daily': '0 0 * * *',
    '@hourly': '0 * * * *',
    '@midnight': '0 0 * * *'
  };

  var FIELD_META = [
    { name: '分钟', min: 0, max: 59 },
    { name: '小时', min: 0, max: 23 },
    { name: '日', min: 1, max: 31 },
    { name: '月', min: 1, max: 12 },
    { name: '星期', min: 0, max: 7 }
  ];

  var DOW_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  function expandPart(part, min, max) {
    part = part.trim();
    if (!part) throw new Error('字段不能为空');

    if (part === '*') {
      var all = [];
      for (var i = min; i <= max; i++) all.push(i);
      return { values: all, isStar: true };
    }

    var isStar = false;
    var values = [];
    var segments = part.split(',');

    segments.forEach(function (seg) {
      seg = seg.trim();
      var step = 1;
      var rangeStart = min;
      var rangeEnd = max;

      if (seg.indexOf('/') !== -1) {
        var slash = seg.split('/');
        step = parseInt(slash[1], 10);
        if (!step || step < 1) throw new Error('步长 /' + slash[1] + ' 无效');
        seg = slash[0];
      }

      if (seg === '*') {
        isStar = true;
      } else if (seg.indexOf('-') !== -1) {
        var dash = seg.split('-');
        rangeStart = parseInt(dash[0], 10);
        rangeEnd = parseInt(dash[1], 10);
      } else {
        rangeStart = rangeEnd = parseInt(seg, 10);
      }

      if (isNaN(rangeStart) || isNaN(rangeEnd)) throw new Error('无效字段: ' + part);
      if (rangeStart < min || rangeEnd > max || rangeStart > rangeEnd) {
        throw new Error('数值超出范围 (' + min + '-' + max + '): ' + part);
      }

      for (var v = rangeStart; v <= rangeEnd; v += step) {
        if (values.indexOf(v) === -1) values.push(v);
      }
    });

    values.sort(function (a, b) { return a - b; });
    return { values: values, isStar: isStar };
  }

  function parseExpression(expr) {
    var raw = (expr || '').trim().toLowerCase();
    if (!raw) throw new Error('请输入 Cron 表达式');

    if (ALIASES[raw]) raw = ALIASES[raw];

    var parts = raw.replace(/\s+/g, ' ').split(' ');
    if (parts.length !== 5) {
      throw new Error('标准 Cron 为 5 段：分 时 日 月 周（例如 0 9 * * 1）');
    }

    if (!/^[\d*,\-\/]+$/.test(parts.join(''))) {
      throw new Error('包含非法字符，仅支持数字 * , - /');
    }

    var fields = [];
    for (var i = 0; i < 5; i++) {
      fields.push(expandPart(parts[i], FIELD_META[i].min, FIELD_META[i].max));
    }

    return { parts: parts, fields: fields };
  }

  function toLookup(values) {
    var map = {};
    values.forEach(function (v) {
      map[v] = true;
      if (v === 7) map[0] = true;
    });
    return map;
  }

  function describePart(part, meta, isDow) {
    if (part.isStar || part.values.length === (meta.max - meta.min + 1)) {
      return '每' + meta.name;
    }
    if (isDow) {
      return part.values.map(function (v) {
        var d = v === 7 ? 0 : v;
        return '周' + DOW_NAMES[d];
      }).join('、');
    }
    return part.values.join(', ');
  }

  function matches(date, fields) {
    var min = date.getMinutes();
    var hour = date.getHours();
    var dom = date.getDate();
    var month = date.getMonth() + 1;
    var dow = date.getDay();

    if (!fields[0].isStar && fields[0].values.indexOf(min) === -1) return false;
    if (!fields[1].isStar && fields[1].values.indexOf(hour) === -1) return false;
    if (!fields[2].isStar && fields[2].values.indexOf(dom) === -1) return false;
    if (!fields[3].isStar && fields[3].values.indexOf(month) === -1) return false;

    var domRestricted = !fields[2].isStar;
    var dowRestricted = !fields[4].isStar;
    var dowMap = toLookup(fields[4].values);

    if (!domRestricted && !dowRestricted) return true;
    if (domRestricted && !dowRestricted) return fields[2].values.indexOf(dom) !== -1;
    if (!domRestricted && dowRestricted) return !!dowMap[dow];
    return fields[2].values.indexOf(dom) !== -1 || !!dowMap[dow];
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
      ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')';
  }

  function getNextRuns(fields, count, from) {
    var results = [];
    var cursor = new Date(from.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);

    var limit = 366 * 24 * 60;
    var steps = 0;

    while (results.length < count && steps < limit) {
      if (matches(cursor, fields)) {
        results.push(new Date(cursor.getTime()));
      }
      cursor.setMinutes(cursor.getMinutes() + 1);
      steps++;
    }

    if (results.length < count) {
      throw new Error('在一年内未找到足够的执行时间，请检查表达式');
    }
    return results;
  }

  var input = document.getElementById('cronInput');
  var btnParse = document.getElementById('btnParse');
  var btnClear = document.getElementById('btnClear');
  var status = document.getElementById('cronStatus');
  var fieldDesc = document.getElementById('fieldDesc');
  var nextRuns = document.getElementById('nextRuns');
  var presets = document.querySelectorAll('[data-cron]');

  function renderDescriptions(parsed) {
    if (!fieldDesc) return;
    var html = '<table class="cron-table"><thead><tr><th>字段</th><th>值</th><th>说明</th></tr></thead><tbody>';
    var labels = ['分钟', '小时', '日', '月', '星期'];
    for (var i = 0; i < 5; i++) {
      html += '<tr><td>' + labels[i] + '</td><td><code>' + parsed.parts[i] + '</code></td><td>' +
        describePart(parsed.fields[i], FIELD_META[i], i === 4) + '</td></tr>';
    }
    html += '</tbody></table>';
    fieldDesc.innerHTML = html;
    fieldDesc.hidden = false;
  }

  function renderNextRuns(dates) {
    if (!nextRuns) return;
    var html = '<ol class="cron-runs">';
    dates.forEach(function (d) {
      html += '<li><code>' + formatDate(d) + '</code></li>';
    });
    html += '</ol>';
    nextRuns.innerHTML = html;
    nextRuns.hidden = false;
  }

  function parse() {
    try {
      var parsed = parseExpression(input.value);
      var runs = getNextRuns(parsed.fields, 8, new Date());
      renderDescriptions(parsed);
      renderNextRuns(runs);
      ToolsCommon.showStatus(status, '解析成功，以下为接下来 8 次执行时间（本地时区）', 'success');
    } catch (e) {
      if (fieldDesc) { fieldDesc.innerHTML = ''; fieldDesc.hidden = true; }
      if (nextRuns) { nextRuns.innerHTML = ''; nextRuns.hidden = true; }
      ToolsCommon.showStatus(status, e.message || '解析失败', 'error');
    }
  }

  if (btnParse) btnParse.addEventListener('click', parse);
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      input.value = '';
      if (fieldDesc) { fieldDesc.innerHTML = ''; fieldDesc.hidden = true; }
      if (nextRuns) { nextRuns.innerHTML = ''; nextRuns.hidden = true; }
      ToolsCommon.showStatus(status, '', '');
    });
  }

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') parse();
    });
  }

  presets.forEach(function (btn) {
    btn.addEventListener('click', function () {
      input.value = btn.getAttribute('data-cron');
      parse();
    });
  });
})();

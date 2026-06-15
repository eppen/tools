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
    if (parts.length === 6 || parts.length === 7) {
      parts = parts.slice(1, 6);
    }
    if (parts.length !== 5) {
      throw new Error('标准 Cron 为 5 段：分 时 日 月 周（例如 0 9 * * 1）');
    }

    parts = parts.map(function (p) {
      return p === '?' ? '*' : p;
    });

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

  function parse(expr) {
    var value = expr != null ? expr : (input ? input.value : '');
    try {
      var parsed = parseExpression(value);
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

  if (btnParse) btnParse.addEventListener('click', function () { parse(); });
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      if (input) input.value = '';
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
      if (input) input.value = btn.getAttribute('data-cron');
      parse();
    });
  });

  /* ---- Visual builder (mes-parent style) ---- */

  var BUILDER_KEYS = ['minute', 'hour', 'day', 'month', 'week'];
  var BUILDER_TABS = ['分钟', '小时', '日', '月', '周'];
  var BUILDER_EVERY = ['每分钟', '每小时', '每天', '每月', '每周'];
  var BUILDER_UNITS = ['分钟', '小时', '天', '月', ''];
  var BUILDER_META = [
    { min: 0, max: 59 },
    { min: 0, max: 23 },
    { min: 1, max: 31 },
    { min: 1, max: 12 },
    { min: 0, max: 6, week: true }
  ];

  var cronBuilder = document.getElementById('cronBuilder');
  var btnOpenBuilder = document.getElementById('btnOpenBuilder');
  var cronModal = document.getElementById('cronModal');
  var cronModalBackdrop = document.getElementById('cronModalBackdrop');
  var btnCloseModal = document.getElementById('btnCloseModal');
  var btnCancelModal = document.getElementById('btnCancelModal');
  var btnApplyModal = document.getElementById('btnApplyModal');
  var generatedExpr = null;
  var builderNextRuns = null;
  var btnCopyExpr = null;

  function defaultFieldState(meta) {
    return {
      type: 'every',
      intervalStart: meta.min,
      intervalEnd: Math.min(meta.min + 5, meta.max),
      stepStart: meta.min,
      stepValue: meta.min === 0 ? 5 : 1,
      specificValues: []
    };
  }

  function normalizeUnixParts(expr) {
    var raw = (expr || '').trim().toLowerCase();
    if (!raw) return null;
    if (ALIASES[raw]) raw = ALIASES[raw];
    var parts = raw.replace(/\s+/g, ' ').split(' ');
    if (parts.length === 6 || parts.length === 7) parts = parts.slice(1, 6);
    if (parts.length !== 5) return null;
    return parts.map(function (p) { return p === '?' ? '*' : p; });
  }

  function parsePartToState(part, meta) {
    var state = defaultFieldState(meta);
    part = (part || '*').trim();
    if (part === '*' || part === '?') {
      state.type = 'every';
      return state;
    }
    if (part.indexOf('/') !== -1) {
      var slash = part.split('/');
      state.type = 'step';
      state.stepStart = slash[0] === '*' ? meta.min : parseInt(slash[0], 10);
      state.stepValue = parseInt(slash[1], 10) || 1;
      return state;
    }
    if (part.indexOf('-') !== -1) {
      var dash = part.split('-');
      state.type = 'interval';
      state.intervalStart = parseInt(dash[0], 10);
      state.intervalEnd = parseInt(dash[1], 10);
      return state;
    }
    if (part.indexOf(',') !== -1) {
      state.type = 'specific';
      state.specificValues = part.split(',').map(function (v) { return parseInt(v, 10); });
      return state;
    }
    state.type = 'specific';
    state.specificValues = [parseInt(part, 10)];
    return state;
  }

  function buildPartFromState(state, meta) {
    if (state.type === 'every') return '*';
    if (state.type === 'interval') {
      return state.intervalStart + '-' + state.intervalEnd;
    }
    if (state.type === 'step') {
      if (state.stepStart === meta.min) return '*/' + state.stepValue;
      return state.stepStart + '/' + state.stepValue;
    }
    if (state.type === 'specific' && state.specificValues.length) {
      return state.specificValues.slice().sort(function (a, b) { return a - b; }).join(',');
    }
    return '*';
  }

  function isFieldRestricted(state) {
    if (state.type === 'every') return false;
    if (state.type === 'specific') return state.specificValues.length > 0;
    return true;
  }

  function readFieldState(key) {
    var panel = cronBuilder.querySelector('.cron-tab-panel[data-field="' + key + '"]');
    if (!panel) return defaultFieldState(BUILDER_META[BUILDER_KEYS.indexOf(key)]);

    var meta = BUILDER_META[BUILDER_KEYS.indexOf(key)];
    var typeInput = panel.querySelector('input[name="' + key + '-type"]:checked');
    var state = defaultFieldState(meta);
    state.type = typeInput ? typeInput.value : 'every';

    var intervalStart = panel.querySelector('[data-bind="' + key + '.intervalStart"]');
    var intervalEnd = panel.querySelector('[data-bind="' + key + '.intervalEnd"]');
    var stepStart = panel.querySelector('[data-bind="' + key + '.stepStart"]');
    var stepValue = panel.querySelector('[data-bind="' + key + '.stepValue"]');

    if (intervalStart) state.intervalStart = parseInt(intervalStart.value, 10);
    if (intervalEnd) state.intervalEnd = parseInt(intervalEnd.value, 10);
    if (stepStart) state.stepStart = parseInt(stepStart.value, 10);
    if (stepValue) state.stepValue = parseInt(stepValue.value, 10);

    state.specificValues = [];
    panel.querySelectorAll('.cron-specific-grid input:checked').forEach(function (cb) {
      state.specificValues.push(parseInt(cb.value, 10));
    });

    return state;
  }

  function applyFieldState(key, state) {
    var panel = cronBuilder.querySelector('.cron-tab-panel[data-field="' + key + '"]');
    if (!panel) return;

    var radio = panel.querySelector('input[name="' + key + '-type"][value="' + state.type + '"]');
    if (radio) radio.checked = true;

    var intervalStart = panel.querySelector('[data-bind="' + key + '.intervalStart"]');
    var intervalEnd = panel.querySelector('[data-bind="' + key + '.intervalEnd"]');
    var stepStart = panel.querySelector('[data-bind="' + key + '.stepStart"]');
    var stepValue = panel.querySelector('[data-bind="' + key + '.stepValue"]');

    if (intervalStart) intervalStart.value = state.intervalStart;
    if (intervalEnd) intervalEnd.value = state.intervalEnd;
    if (stepStart) stepStart.value = state.stepStart;
    if (stepValue) stepValue.value = state.stepValue;

    panel.querySelectorAll('.cron-specific-grid input').forEach(function (cb) {
      cb.checked = state.specificValues.indexOf(parseInt(cb.value, 10)) !== -1;
    });

    toggleSpecificGrid(key);
  }

  function toggleSpecificGrid(key) {
    var panel = cronBuilder.querySelector('.cron-tab-panel[data-field="' + key + '"]');
    if (!panel) return;
    var type = panel.querySelector('input[name="' + key + '-type"]:checked');
    var grid = panel.querySelector('.cron-specific-grid');
    if (grid) grid.hidden = !type || type.value !== 'specific';
  }

  function buildExpressionFromBuilder() {
    var parts = BUILDER_KEYS.map(function (key, i) {
      return buildPartFromState(readFieldState(key), BUILDER_META[i]);
    });

    var dayState = readFieldState('day');
    var weekState = readFieldState('week');
    if (isFieldRestricted(weekState)) parts[2] = '*';
    if (isFieldRestricted(dayState)) parts[4] = '*';

    return parts.join(' ');
  }

  function renderSpecificGrid(meta) {
    var html = '<div class="cron-specific-grid" hidden>';
    for (var v = meta.min; v <= meta.max; v++) {
      var label = meta.week ? ('周' + DOW_NAMES[v]) : String(v);
      html += '<label class="cron-specific-item"><input type="checkbox" value="' + v + '">' + label + '</label>';
    }
    html += '</div>';
    return html;
  }

  function renderFieldPanel(key, index) {
    var meta = BUILDER_META[index];
    var unit = BUILDER_UNITS[index];
    var html = '<div class="cron-tab-panel' + (index === 0 ? ' active' : '') + '" data-field="' + key + '">';
    html += '<div class="cron-section">';
    html += '<label class="cron-radio-row"><input type="radio" name="' + key + '-type" value="every" checked> ' + BUILDER_EVERY[index] + '</label>';

    html += '<label class="cron-radio-row"><input type="radio" name="' + key + '-type" value="interval"> 每隔 ';
    html += '<input type="number" class="cron-inline-input" data-bind="' + key + '.intervalStart" min="' + meta.min + '" max="' + meta.max + '" value="' + meta.min + '"> - ';
    html += '<input type="number" class="cron-inline-input" data-bind="' + key + '.intervalEnd" min="' + meta.min + '" max="' + meta.max + '" value="' + Math.min(meta.min + 5, meta.max) + '">';
    if (unit) html += ' ' + unit;
    html += '</label>';

    html += '<label class="cron-radio-row"><input type="radio" name="' + key + '-type" value="step"> 从 ';
    html += '<input type="number" class="cron-inline-input" data-bind="' + key + '.stepStart" min="' + meta.min + '" max="' + meta.max + '" value="' + meta.min + '"> 开始，每 ';
    html += '<input type="number" class="cron-inline-input" data-bind="' + key + '.stepValue" min="1" max="' + meta.max + '" value="' + (meta.min === 0 ? 5 : 1) + '">';
    if (unit) html += ' ' + unit;
    html += ' 执行一次</label>';

    html += '<label class="cron-radio-row"><input type="radio" name="' + key + '-type" value="specific"> 指定</label>';
    html += renderSpecificGrid(meta);
    html += '</div></div>';
    return html;
  }

  function renderBuilder() {
    if (!cronBuilder) return;

    var html = '<ul class="cron-field-tabs" role="tablist">';
    BUILDER_TABS.forEach(function (label, i) {
      html += '<li><button type="button" class="cron-field-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + BUILDER_KEYS[i] + '" role="tab">' + label + '</button></li>';
    });
    html += '</ul><div class="cron-tab-panels">';
    BUILDER_KEYS.forEach(function (key, i) {
      html += renderFieldPanel(key, i);
    });
    html += '</div>';

    html += '<div class="cron-output">';
    html += '<div class="cron-output-main"><h4 class="cron-output-title">生成的 Cron 表达式</h4>';
    html += '<code id="generatedExpr" class="cron-expr-preview">0 0 * * *</code>';
    html += '<button type="button" class="btn btn-outline btn-sm" id="btnCopyExpr">复制</button></div>';
    html += '<div class="cron-output-side"><h4 class="cron-output-title">表达式说明</h4>';
    html += '<p class="text-muted cron-output-desc">Unix Cron 为 5 段：<code>分 时 日 月 周</code></p>';
    html += '<ul class="cron-help-list"><li><code>*</code> 表示所有可能的值</li>';
    html += '<li><code>-</code> 表示范围，如 1-5</li>';
    html += '<li><code>/</code> 表示步长，如 */5 每 5 单位</li>';
    html += '<li><code>,</code> 表示列举多个值</li></ul></div></div>';
    html += '<div class="cron-builder-runs" id="builderNextRuns" hidden></div>';

    cronBuilder.innerHTML = html;
    generatedExpr = document.getElementById('generatedExpr');
    builderNextRuns = document.getElementById('builderNextRuns');
    btnCopyExpr = document.getElementById('btnCopyExpr');
  }

  function switchBuilderTab(key) {
    cronBuilder.querySelectorAll('.cron-field-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === key);
    });
    cronBuilder.querySelectorAll('.cron-tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-field') === key);
    });
  }

  function renderBuilderNextRuns(expr) {
    if (!builderNextRuns) return;
    try {
      var parsed = parseExpression(expr);
      var runs = getNextRuns(parsed.fields, 5, new Date());
      var html = '<h4 class="cron-output-title">最近 5 次运行时间</h4><ul class="cron-runs-inline">';
      runs.forEach(function (d) {
        html += '<li><code>' + formatDate(d) + '</code></li>';
      });
      html += '</ul>';
      builderNextRuns.innerHTML = html;
      builderNextRuns.hidden = false;
    } catch (e) {
      builderNextRuns.innerHTML = '';
      builderNextRuns.hidden = true;
    }
  }

  function updatePreview() {
    var expr = buildExpressionFromBuilder();
    if (generatedExpr) generatedExpr.textContent = expr;
    renderBuilderNextRuns(expr);
    return expr;
  }

  function loadVisualFromExpression(expr) {
    var parts = normalizeUnixParts(expr);
    if (!parts) {
      BUILDER_KEYS.forEach(function (key, i) {
        applyFieldState(key, defaultFieldState(BUILDER_META[i]));
      });
      updatePreview();
      return;
    }

    BUILDER_KEYS.forEach(function (key, i) {
      applyFieldState(key, parsePartToState(parts[i], BUILDER_META[i]));
    });
    updatePreview();
  }

  function onBuilderChange(e) {
    var target = e.target;
    if (target.matches('input[name$="-type"]')) {
      var key = target.name.replace('-type', '');
      toggleSpecificGrid(key);
      if (key === 'week' && target.value === 'specific') {
        applyFieldState('day', defaultFieldState(BUILDER_META[2]));
      }
      if (key === 'day' && target.value !== 'every') {
        applyFieldState('week', defaultFieldState(BUILDER_META[4]));
      }
    }
    updatePreview();
  }

  function openModal() {
    if (!cronModal) return;
    loadVisualFromExpression(input ? input.value : '');
    switchBuilderTab('minute');
    cronModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!cronModal) return;
    cronModal.hidden = true;
    document.body.style.overflow = '';
  }

  function applyModal() {
    var expr = updatePreview();
    if (input) input.value = expr;
    closeModal();
    parse(expr);
  }

  function initBuilder() {
    if (!cronBuilder) return;
    renderBuilder();

    cronBuilder.addEventListener('click', function (e) {
      var tab = e.target.closest('.cron-field-tab');
      if (tab) switchBuilderTab(tab.getAttribute('data-tab'));
    });

    cronBuilder.addEventListener('change', onBuilderChange);
    cronBuilder.addEventListener('input', onBuilderChange);

    if (btnOpenBuilder) btnOpenBuilder.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (cronModalBackdrop) cronModalBackdrop.addEventListener('click', closeModal);
    if (btnApplyModal) btnApplyModal.addEventListener('click', applyModal);

    if (btnCopyExpr) {
      btnCopyExpr.addEventListener('click', function () {
        if (generatedExpr) ToolsCommon.copyText(generatedExpr.textContent);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (cronModal && !cronModal.hidden && e.key === 'Escape') closeModal();
    });
  }

  if (cronBuilder) initBuilder();
  if (input && input.value) parse();
})();

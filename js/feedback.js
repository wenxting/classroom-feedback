(function() {
  'use strict';

  var Storage = window.CF.Storage;

  function init() {
    setTodayDate();
    reloadDefaults();
    refreshStudentList();
    refreshDatalists();
    setupAutoSave();
  }

  function reloadDefaults() {
    var settings = Storage.getSettings();
    if (settings.defaultSubject) document.getElementById('fb-subject').value = settings.defaultSubject;
    if (settings.defaultTeacher) document.getElementById('fb-teacher').value = settings.defaultTeacher;
    if (settings.defaultTime) document.getElementById('fb-time').value = settings.defaultTime;
    document.getElementById('fb-homework').value = settings.defaultHomework || '';
  }

  function setTodayDate() {
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    document.getElementById('fb-date').value = yyyy + '-' + mm + '-' + dd;
  }

  function refreshStudentList() {
    var students = Storage.getStudents();
    var container = document.getElementById('fb-student-list');
    var emptyHint = document.getElementById('fb-student-empty');
    var selectAll = document.getElementById('fb-select-all');

    // Read checked state BEFORE removing labels
    var checkedNames = getCheckedStudentNames();

    // Remove only labels, keep empty hint in DOM
    var labels = container.querySelectorAll('label');
    for (var li = 0; li < labels.length; li++) {
      labels[li].parentNode.removeChild(labels[li]);
    }

    if (students.length === 0) {
      if (emptyHint) { emptyHint.style.display = ''; container.appendChild(emptyHint); }
      selectAll.checked = false;
      selectAll.disabled = true;
      updateSelectedCount();
      renderBatchTable();
      return;
    }

    if (emptyHint) emptyHint.style.display = 'none';
    selectAll.disabled = false;
    var allCheckedFlag = true;

    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      var checked = checkedNames.indexOf(s.name) >= 0;
      if (!checked) allCheckedFlag = false;
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'fb-student-check'; cb.value = s.name;
      cb.checked = checked;
      var ns = document.createElement('span');
      ns.className = 'check-name'; ns.textContent = s.name;
      var cs = document.createElement('span');
      cs.className = 'check-class'; cs.textContent = s.className;
      label.appendChild(cb); label.appendChild(ns); label.appendChild(cs);
      container.appendChild(label);
    }
    selectAll.checked = students.length > 0 && allCheckedFlag;

    updateSelectedCount();

    var input = document.getElementById('fb-student-input');
    if (input) filterStudentList(input.value);
  }

  function filterStudentList(query) {
    var items = document.querySelectorAll('.student-filter-list label');
    var q = (query || '').toLowerCase();
    var hasVisible = false;
    Array.prototype.forEach.call(items, function(item) {
      var text = (item.textContent || '').toLowerCase();
      if (!q || text.indexOf(q) >= 0) {
        item.classList.remove('filtered-out');
        hasVisible = true;
      } else {
        item.classList.add('filtered-out');
      }
    });
    // Show/hide empty hint
    var empty = document.getElementById('fb-student-empty');
    if (empty) {
      empty.style.display = hasVisible ? 'none' : 'block';
    }
  }

  function getCheckedStudentNames() {
    var checks = document.querySelectorAll('.fb-student-check');
    var names = [];
    Array.prototype.forEach.call(checks, function(c) {
      if (c.checked) names.push(c.value);
    });
    return names;
  }

  function updateSelectedCount() {
    var count = getCheckedStudentNames().length;
    var el = document.getElementById('fb-selected-count');
    if (count === 0) {
      el.textContent = '未选择';
    } else {
      el.textContent = '已选 ' + count + ' 人';
    }
  }

  function refreshDatalists() {
    var settings = Storage.getSettings();

    var types = [
      { id: 'subject-presets', list: settings.subjectPresets || [] },
      { id: 'teacher-presets', list: settings.teacherPresets || [] },
      { id: 'time-presets', list: settings.timePresets || [] }
    ];

    for (var i = 0; i < types.length; i++) {
      var datalist = document.getElementById(types[i].id);
      if (datalist) {
        datalist.innerHTML = types[i].list.map(function(v) {
          return '<option value="' + escapeHtml(v) + '">';
        }).join('');
      }
    }
  }

  function setupAutoSave() {
    var form = document.getElementById('feedback-form');
    var saveKey = 'cf_draft';
    var textFields = ['subject', 'teacher', 'content', 'accuracy', 'homework'];

    try {
      var draft = JSON.parse(localStorage.getItem(saveKey));
      if (draft) {
        textFields.forEach(function(key) {
          var el = document.getElementById('fb-' + key);
          if (el && !el.value && draft[key]) el.value = draft[key];
        });
        if (draft.time) {
          var timeEl = document.getElementById('fb-time');
          if (timeEl && !timeEl.value) timeEl.value = draft.time;
        }
        if (draft.studentInput) {
          var siEl = document.getElementById('fb-student-input');
          if (siEl && !siEl.value) { siEl.value = draft.studentInput; showStudentHistory(draft.studentInput.trim()); }
        }
      }
    } catch (e) {}

    form.addEventListener('input', function() {
      var draft = {};
      textFields.forEach(function(f) {
        var el = document.getElementById('fb-' + f);
        if (el) draft[f] = el.value;
      });
      draft.time = document.getElementById('fb-time').value;
      draft.students = getCheckedStudentNames();
      draft.studentInput = document.getElementById('fb-student-input').value;
      localStorage.setItem(saveKey, JSON.stringify(draft));
    });

    // Listen for checkbox changes
    document.getElementById('fb-student-list').addEventListener('change', function(e) {
      if (e.target.classList.contains('fb-student-check')) {
        updateSelectedCount();
        saveDraftStudents();
        // Auto-fill input if single student checked
        var checked = document.querySelectorAll('.fb-student-check:checked');
        if (checked.length === 1) {
          document.getElementById('fb-student-input').value = checked[0].value;
          showStudentHistory(checked[0].value);
        }
        renderBatchTable();
        // Update select all state
        var allChecks = document.querySelectorAll('.fb-student-check');
        var allChecked = Array.prototype.every.call(allChecks, function(c) { return c.checked; });
        document.getElementById('fb-select-all').checked = allChecked;
      }
    });

    // Select all / deselect all
    document.getElementById('fb-select-all').addEventListener('change', function() {
      var checked = this.checked;
      Array.prototype.forEach.call(document.querySelectorAll('.fb-student-check'), function(c) {
        c.checked = checked;
      });
      updateSelectedCount();
      saveDraftStudents();
      renderBatchTable();
    });

    // Filter student list as user types, and force refresh on focus
    var studentInput = document.getElementById('fb-student-input');
    if (studentInput) {
      studentInput.addEventListener('input', function() {
        filterStudentList(this.value);
        showStudentHistory(this.value.trim());
      });
      studentInput.addEventListener('focus', function() {
        refreshStudentList();
      });
      studentInput.addEventListener('click', function() {
        refreshStudentList();
      });
    }
  }

  function saveDraftStudents() {
    var draft = {};
    try { draft = JSON.parse(localStorage.getItem('cf_draft')) || {}; } catch (e) {}
    draft.students = getCheckedStudentNames();
    localStorage.setItem('cf_draft', JSON.stringify(draft));
  }

  function getFormData() {
    return {
      date: document.getElementById('fb-date').value,
      time: document.getElementById('fb-time').value,
      subject: document.getElementById('fb-subject').value,
      teacher: document.getElementById('fb-teacher').value,
      content: document.getElementById('fb-content').value,
      accuracy: document.getElementById('fb-accuracy').value,
      mastery: (function() {
        var a = document.getElementById('fb-mastery-a').value;
        var b = document.getElementById('fb-mastery-b').value;
        return (a && b) ? a + '/' + b : (a || b || '');
      })(),
      improvement: document.getElementById('fb-improvement').value,
      performance: document.getElementById('fb-performance').value,
      homework: document.getElementById('fb-homework').value
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length === 3) {
      return parseInt(parts[1], 10) + '.' + parseInt(parts[2], 10);
    }
    return dateStr;
  }

  function buildFeedbackText(data, studentName) {
    return '课堂反馈\n' +
      '日期：' + formatDate(data.date) + '\n' +
      '时间：' + data.time + '\n' +
      '学生姓名：' + studentName + '\n' +
      '科目：' + data.subject + '\n' +
      '督学师：' + data.teacher + '\n' +
      '学习内容：' + data.content + '\n' +
      '\n' +
      '正确率：' + data.accuracy + '%\n' +
      '掌握比例：' + data.mastery + '\n' +
      '建议提升：' + data.improvement + '\n' +
      '\n' +
      '课堂表现：' + data.performance + '\n' +
      '\n' +
      '作业布置与完成情况：' + data.homework;
  }

  function copySingle(studentName) {
    var ta = document.querySelector('.preview-text[data-student="' + studentName + '"]');
    var text = ta ? ta.value : '';
    if (!text) { showToast('反馈内容未找到'); return; }
    copyToClipboard(text);
  }

  function shareSingle(studentName) {
    var ta = document.querySelector('.preview-text[data-student="' + studentName + '"]');
    var text = ta ? ta.value : '';
    if (!text) { showToast('反馈内容未找到'); return; }
    doShare(text);
  }

  function doShare(text) {
    // Try native Capacitor Share plugin first
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
      try {
        window.Capacitor.Plugins.Share.share({ text: text }).catch(function() {
          fallbackCopyShare(text);
        });
        return;
      } catch(e) {}
    }
    // Try Web Share API
    if (navigator.share) {
      navigator.share({ text: text }).catch(function() {
        fallbackCopyShare(text);
      });
    } else {
      fallbackCopyShare(text);
    }
  }

  function fallbackCopyShare(text) {
    copyToClipboard(text);
    showToast('已复制，可到微信粘贴发送');
  }

  function copyAll() {
    var textareas = document.querySelectorAll('.preview-text');
    if (textareas.length === 0) { showToast('请先生成反馈'); return; }
    var all = [];
    for (var i = 0; i < textareas.length; i++) {
      if (textareas[i].value) all.push(textareas[i].value);
    }
    if (all.length === 0) { showToast('请先生成反馈'); return; }
    copyToClipboard(all.join('\n\n━━━━━━━━━━━━━━━━\n\n'));
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('已复制到剪贴板');
      }).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制到剪贴板');
    } catch (e) {
      showToast('复制失败，请手动选择复制');
    }
    document.body.removeChild(textarea);
  }

  function clearForm() {
    var fields = ['student-input', 'subject', 'teacher', 'content', 'accuracy', 'improvement', 'performance'];
    document.getElementById('fb-mastery-a').value = '';
    document.getElementById('fb-mastery-b').value = '';
    fields.forEach(function(f) {
      document.getElementById('fb-' + f).value = '';
    });
    setTodayDate();
    var settings = Storage.getSettings();
    if (settings.defaultTime) {
      document.getElementById('fb-time').value = settings.defaultTime;
    } else {
      document.getElementById('fb-time').value = '';
    }
    if (settings.defaultSubject) {
      document.getElementById('fb-subject').value = settings.defaultSubject;
    }
    if (settings.defaultTeacher) {
      document.getElementById('fb-teacher').value = settings.defaultTeacher;
    }
    document.getElementById('fb-homework').value = settings.defaultHomework || '';

    // Clear student selections
    Array.prototype.forEach.call(document.querySelectorAll('.fb-student-check'), function(c) { c.checked = false; });
    document.getElementById('fb-select-all').checked = false;
    updateSelectedCount();

    // Hide history summary
    var hs = document.getElementById('fb-history-summary');
    if (hs) { hs.style.display = 'none'; hs._lastFeedback = null; }
    var qf = document.getElementById('fb-quick-fill');
    if (qf) qf.style.display = 'none';

    document.getElementById('preview-area').style.display = 'none';
    document.getElementById('batch-preview-list').innerHTML = '';
    document.getElementById('preview-area')._generatedTexts = {};
    localStorage.removeItem('cf_draft');
  }

  function aiExpand(targetId) {
    var settings = Storage.getSettings();
    if (!settings.apiKey) {
      showToast('请先在设置页填写 DeepSeek API Key');
      return;
    }

    var targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    var btn = document.querySelector('[data-target="' + targetId + '"]');
    if (btn) { btn.textContent = '...'; btn.classList.add('loading'); }

    var data = getFormData();
    var studentName = document.getElementById('fb-student-input').value.trim();
    var masteryNote = data.mastery ? '\n【重要】掌握比例 ' + data.mastery + ' 的含义：本节课共涉及 ' + (data.mastery.split('/')[1] || '?') + ' 个知识点，学生仅掌握了其中 ' + (data.mastery.split('/')[0] || '?') + ' 个。请据此评估知识薄弱点。' : '';

    var info = '日期：' + data.date + '\n时间：' + data.time +
      '\n学生姓名：' + studentName +
      '\n科目：' + data.subject + '\n督学师：' + data.teacher +
      '\n学习内容：' + data.content +
      '\n正确率：' + data.accuracy + '%' +
      '\n掌握比例：' + data.mastery + masteryNote;

    // Add student history
    var history = Storage.getStudentHistory(studentName);
    if (history.length > 0) {
      info += '\n\n该生历史反馈记录：';
      for (var i = 0; i < Math.min(history.length, 5); i++) {
        var h = history[i];
        info += '\n- [' + h.date + '] 科目：' + h.subject + ' 内容：' + h.content + ' 正确率：' + h.accuracy + '% 掌握：' + h.mastery + ' 表现：' + (h.performance || '').substring(0, 40);
      }
    }

    var aiStyle = settings.aiStyle || '';
    var aiSamples = settings.aiSamples || '';
    var styleInject = aiStyle ? '\n请按以下风格写作：' + aiStyle : '';
    var sampleInject = aiSamples ? '\n请模仿以下范文的语气和用词习惯：\n' + aiSamples : '';

    var currentPerf = document.getElementById('fb-performance') ? document.getElementById('fb-performance').value : '';
    var hasDiscipline = /纪律|态度|走神|分心|讲话|迟到|捣乱|不认真/.test(currentPerf);

    var isImprovement = targetId === 'fb-improvement';
    var prompt = isImprovement
      ? '这是培训机构一对一/小班辅导场景。根据以下学生信息，直接指出1-2个知识薄弱点和针对性练习方向（30-40字）。不用"同学"等学校用词，不提姓名和作业。\n\n' + info
      : '这是培训机构一对一/小班辅导场景。按固定结构输出：\n【学习状态】必出，一两句话概括学习状态趋势。\n' +
        (hasDiscipline ? '【课堂纪律】必出，仅基于输入文本中提到的纪律问题描述。\n' : '') +
        '【综合分析】必出，结合学习内容、正确率、掌握比例分析强弱项。\n【建议】必出，30-40字指出薄弱点和练习方向。\n【鼓励】必出，一句鼓励。\n' +
        (hasDiscipline ? '' : '不要提及纪律相关内容。\n') +
        '不提姓名和作业。培训机构场景。\n\n' + info +
        (currentPerf ? '\n用户已填写内容：' + currentPerf : '');
    prompt += styleInject + sampleInject;

    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是培训机构专业督学师。注意这是培训机构小班辅导，不是学校大班授课。评价客观平衡，不提及姓名和作业。回复简洁，不用markdown。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    }).then(function(res) {
      if (!res.ok) throw new Error('API 请求失败: ' + res.status);
      return res.json();
    }).then(function(json) {
      var text = json.choices[0].message.content.trim();
      if (targetEl.value) {
        targetEl.value = text;
      } else {
        targetEl.value = text;
      }
    }).catch(function(err) {
      showToast('AI 扩展失败，请检查 API Key 是否正确');
      console.error(err);
    }).finally(function() {
      if (btn) { btn.textContent = 'AI'; btn.classList.remove('loading'); }
    });
  }

  function showStudentHistory(studentName) {
    var container = document.getElementById('fb-history-summary');
    var quickBtn = document.getElementById('fb-quick-fill');
    if (!studentName || !container) {
      if (container) container.style.display = 'none';
      if (quickBtn) quickBtn.style.display = 'none';
      return;
    }

    var history = Storage.getStudentHistory(studentName);
    if (history.length === 0) {
      container.style.display = 'none';
      if (quickBtn) quickBtn.style.display = 'none';
      return;
    }

    // Show quick fill button
    if (quickBtn) quickBtn.style.display = '';

    // Show last 3 summaries
    var recent = history.slice(0, 3);
    container.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">历史记录</div>' +
      recent.map(function(h) {
        var perf = (h.performance || '').substring(0, 30);
        return '<div class="history-summary-item">' +
          '<span class="hs-date">' + escapeHtml(h.date) + '</span>' +
          '<span class="hs-subject">' + escapeHtml(h.subject) + '</span>' +
          '<span class="hs-text">' + escapeHtml(perf + (perf.length >= 30 ? '...' : '')) + '</span>' +
        '</div>';
      }).join('');
    container.style.display = '';

    // Store last feedback data for quick fill
    container._lastFeedback = history[0];
  }

  function quickFill() {
    var container = document.getElementById('fb-history-summary');
    if (!container || !container._lastFeedback) return;
    var last = container._lastFeedback;
    if (!document.getElementById('fb-subject').value) {
      document.getElementById('fb-subject').value = last.subject || '';
    }
    if (!document.getElementById('fb-teacher').value) {
      document.getElementById('fb-teacher').value = last.teacher || '';
    }
    if (!document.getElementById('fb-time').value) {
      document.getElementById('fb-time').value = last.time || '';
    }
    showToast('已填充科目、督学师、时间段');
  }

  function renderBatchTable() {
    var checked = document.querySelectorAll('.fb-student-check:checked');
    var area = document.getElementById('batch-table-area');
    var table = document.getElementById('batch-table');
    if (!area || !table) return;

    var singleFields = document.getElementById('fb-single-fields');
    if (checked.length <= 1) {
      area.style.display = 'none';
      if (singleFields) singleFields.style.display = '';
      return;
    }

    // 2+ students: show batch table, hide single fields
    // Save current batch data before re-rendering
    var savedData = {};
    for (var j = 0; j < checked.length; j++) {
      var oldAcc = document.getElementById('bt-' + j + '-acc');
      var oldMas = document.getElementById('bt-' + j + '-mas');
      var oldImp = document.getElementById('bt-' + j + '-imp');
      var oldPerf = document.getElementById('bt-' + j + '-perf');
      if (oldAcc || oldMas || oldImp || oldPerf) {
        savedData[j] = {
          acc: oldAcc ? oldAcc.value : '',
          mas: oldMas ? oldMas.value : '',
          imp: oldImp ? oldImp.value : '',
          perf: oldPerf ? oldPerf.value : ''
        };
      }
    }

    area.style.display = '';
    if (singleFields) singleFields.style.display = 'none';
    var data = getFormData();

    // Build header + rows
    var html = '<div class="batch-row header">' +
      '<div class="batch-cell name">学生</div>' +
      '<div class="batch-cell" style="width:62px">正确率%</div>' +
      '<div class="batch-cell" style="width:66px">掌握</div>' +
      '<div class="batch-cell" style="width:30%">建议提升</div>' +
      '<div class="batch-cell" style="width:30%">课堂表现</div>' +
      '<div class="batch-cell" style="width:30px">AI</div>' +
      '</div>';

    for (var i = 0; i < checked.length; i++) {
      var s = checked[i];
      var sid = 'bt-' + i;
      var sd = savedData[i] || {};
      html += '<div class="batch-row" data-student="' + escapeHtml(s.value) + '">' +
        '<div class="batch-cell name">' + escapeHtml(s.value) + '</div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-acc" value="' + escapeHtml(sd.acc || data.accuracy) + '" placeholder="' + escapeHtml(data.accuracy || '80') + '"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-mas" value="' + escapeHtml(sd.mas || data.mastery) + '" placeholder="' + escapeHtml(data.mastery || '7/8') + '"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-imp" value="' + escapeHtml(sd.imp || '') + '" placeholder="可选"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-perf" value="' + escapeHtml(sd.perf || '') + '" placeholder="可选"></div>' +
        '<div class="batch-cell"><button type="button" class="btn btn-ai btn-sm" data-action="ai-expand-row" data-row="' + i + '">AI</button></div>' +
        '</div>';
    }

    table.innerHTML = html;
  }

  function aiExpandRow(rowIndex) {
    var settings = Storage.getSettings();
    if (!settings.apiKey) { showToast('请先设置 API Key'); return; }

    var checked = document.querySelectorAll('.fb-student-check:checked');
    if (rowIndex >= checked.length) return;
    var studentName = checked[rowIndex].value;

    var btn = document.querySelector('[data-action="ai-expand-row"][data-row="' + rowIndex + '"]');
    if (btn) { btn.textContent = '...'; btn.classList.add('loading'); }

    var data = getFormData();
    var accEl = document.getElementById('bt-' + rowIndex + '-acc');
    var masEl = document.getElementById('bt-' + rowIndex + '-mas');
    var rowAcc = accEl && accEl.value ? accEl.value : data.accuracy;
    var rowMas = masEl && masEl.value ? masEl.value : data.mastery;
    var masteryNote = rowMas ? '\n【重要】掌握比例 ' + rowMas + ' 的含义：本节课共涉及 ' + (rowMas.split('/')[1] || '?') + ' 个知识点，学生仅掌握了其中 ' + (rowMas.split('/')[0] || '?') + ' 个。请据此评估知识薄弱点。' : '';

    var info = '日期：' + data.date + '\n时间：' + data.time +
      '\n学生姓名：' + studentName + '\n科目：' + data.subject +
      '\n督学师：' + data.teacher + '\n学习内容：' + data.content +
      '\n正确率：' + rowAcc + '%\n掌握比例：' + rowMas + masteryNote;

    // Add student history
    var history = Storage.getStudentHistory(studentName);
    if (history.length > 0) {
      info += '\n\n该生历史反馈记录：';
      for (var j = 0; j < Math.min(history.length, 5); j++) {
        var h = history[j];
        info += '\n- [' + h.date + '] 科目：' + h.subject + ' 内容：' + h.content + ' 正确率：' + h.accuracy + '% 掌握：' + h.mastery + ' 表现：' + (h.performance || '').substring(0, 40);
      }
    }

    // Get current input text for context (classroom performance field)
    var currentPerf = document.getElementById('fb-performance') ? document.getElementById('fb-performance').value : '';
    var hasDiscipline = /纪律|态度|走神|分心|讲话|迟到|捣乱|不认真/.test(currentPerf);

    var prompt = '这是培训机构一对一/小班辅导场景。根据以下学生信息和历史记录，按固定结构输出：\n' +
      '【学习状态】必出。结合历史记录，一两句话概括该生当前学习状态（如进步、稳定、退步趋势）。\n' +
      (hasDiscipline ? '【课堂纪律】必出。根据"课堂表现"中提到的纪律问题客观描述，不额外猜测。\n' : '') +
      '【综合分析】必出。结合学习内容、正确率、掌握比例，分析知识强弱项。\n' +
      '【建议】必出。30-40字，指出1-2个薄弱点及练习方向。\n' +
      '【鼓励】必出。一句温暖鼓励的话。\n' +
      (hasDiscipline ? '' : '注意：不要提及纪律相关的内容。\n') +
      '不提姓名和作业。培训机构场景，不用"同学""上课"等学校词汇。\n' +
      (settings.aiStyle ? '风格：' + settings.aiStyle + '\n' : '') +
      (settings.aiSamples ? '范文：\n' + settings.aiSamples + '\n' : '') +
      '\n' + info +
      (currentPerf ? '\n\n用户已填写的内容（可参考）：' + currentPerf : '');

    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是培训机构专业督学师。按【学习状态】【课堂纪律】【综合分析】【建议】【鼓励】格式输出。客观评价，不猜测未提及的问题。不提姓名和作业。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400, temperature: 0.7
      })
    }).then(function(res) {
      if (!res.ok) throw new Error('API error ' + res.status);
      return res.json();
    }).then(function(json) {
      var text = json.choices[0].message.content.trim();
      // Parse sections
      var sections = { imp: '', perf: '' };
      var markers = ['【学习状态】','【课堂纪律】','【综合分析】','【建议】','【鼓励】'];
      var startIdx = -1;
      for (var m = 0; m < markers.length; m++) {
        var idx = text.indexOf(markers[m]);
        if (idx >= 0) {
          if (startIdx >= 0) {
            sections.imp += text.substring(startIdx, idx).trim() + '\n\n';
          }
          startIdx = idx;
        }
      }
      if (startIdx >= 0) {
        sections.imp += text.substring(startIdx).trim();
      } else {
        sections.imp = text; // fallback
      }
      sections.perf = sections.imp;

      // Write to DOM and cache
      var impEl = document.getElementById('bt-' + rowIndex + '-imp');
      var perfEl = document.getElementById('bt-' + rowIndex + '-perf');
      if (impEl) impEl.value = sections.imp;
      if (perfEl) perfEl.value = sections.perf;

      // Store in memory cache for generateFeedback
      if (!window.CF.Feedback._aiResults) window.CF.Feedback._aiResults = {};
      window.CF.Feedback._aiResults['bt-' + rowIndex + '-imp'] = sections.imp;
      window.CF.Feedback._aiResults['bt-' + rowIndex + '-perf'] = sections.perf;
    }).catch(function(err) {
      showToast('AI 失败，请检查 API Key');
      console.error(err);
    }).finally(function() {
      if (btn) { btn.textContent = 'AI'; btn.classList.remove('loading'); }
    });
  }

  function aiExpandAll() {
    var settings = Storage.getSettings();
    if (!settings.apiKey) { showToast('请先设置 API Key'); return; }
    var checked = document.querySelectorAll('.fb-student-check:checked');
    if (checked.length === 0) { showToast('请先勾选学生'); return; }
    showToast('正在生成 ' + checked.length + ' 名学生...');
    var i = 0;
    var done = 0;
    function next() {
      if (i >= checked.length) {
        showToast('全部完成（' + done + '/' + checked.length + '）');
        return;
      }
      try {
        aiExpandRow(i);
        done++;
      } catch(e) { console.error(e); }
      i++;
      setTimeout(next, 600);
    }
    next();
  }

  function generateFeedback() {
    var checked = document.querySelectorAll('.fb-student-check:checked');
    var data = getFormData();
    var manualInput = document.getElementById('fb-student-input').value.trim();
    var selectedStudents = [];

    if (manualInput && checked.length === 0) {
      selectedStudents = [manualInput];
    } else if (checked.length > 0) {
      for (var i = 0; i < checked.length; i++) {
        selectedStudents.push(checked[i].value);
      }
    }

    if (selectedStudents.length === 0) { showToast('请输入学生姓名或从名单勾选'); return null; }
    if (!data.subject) { showToast('请输入科目'); return null; }

    var previewArea = document.getElementById('preview-area');
    var batchList = document.getElementById('batch-preview-list');
    var html = '';

    for (var i = 0; i < selectedStudents.length; i++) {
      var studentName = selectedStudents[i];
      // Get per-student data from table if available
      var rowAcc = data.accuracy, rowMas = data.mastery, rowImp = data.improvement, rowPerf = data.performance;
      if (checked.length > 0) {
        var accEl = document.getElementById('bt-' + i + '-acc');
        var masEl = document.getElementById('bt-' + i + '-mas');
        var impEl = document.getElementById('bt-' + i + '-imp');
        var perfEl = document.getElementById('bt-' + i + '-perf');
        if (accEl && accEl.value) rowAcc = accEl.value;
        if (masEl && masEl.value) rowMas = masEl.value;
        // Prefer AI memory cache over DOM value
        var cacheKeyImp = 'bt-' + i + '-imp';
        var cacheKeyPerf = 'bt-' + i + '-perf';
        var aiCache = window.CF.Feedback._aiResults || {};
        if (aiCache[cacheKeyImp]) { rowImp = aiCache[cacheKeyImp]; }
        else if (impEl && impEl.value) rowImp = impEl.value;
        if (aiCache[cacheKeyPerf]) { rowPerf = aiCache[cacheKeyPerf]; }
        else if (perfEl && perfEl.value) rowPerf = perfEl.value;
      }

      var text = '课堂反馈\n日期：' + formatDate(data.date) + '\n时间：' + data.time +
        '\n学生姓名：' + studentName + '\n科目：' + data.subject +
        '\n督学师：' + data.teacher + '\n学习内容：' + data.content +
        '\n\n正确率：' + rowAcc + '%\n掌握比例：' + rowMas +
        '\n建议提升：' + rowImp +
        '\n\n课堂表现：' + rowPerf +
        '\n\n作业布置与完成情况：' + data.homework;

      var record = { date: data.date, time: data.time, studentName: studentName,
        subject: data.subject, teacher: data.teacher, content: data.content,
        accuracy: rowAcc, mastery: rowMas, improvement: rowImp,
        performance: rowPerf, homework: data.homework };
      Storage.addFeedback(record);

      html += '<div class="batch-preview-item">' +
        '<div class="batch-preview-header">' + escapeHtml(studentName) + '</div>' +
        '<textarea class="preview-text" data-student="' + escapeHtml(studentName) + '">' + escapeHtml(text) + '</textarea>' +
        '<div class="preview-actions">' +
          '<button class="btn btn-primary" data-action="copy-single" data-student="' + escapeHtml(studentName) + '">复制</button>' +
          '<button class="btn btn-secondary" data-action="share-single" data-student="' + escapeHtml(studentName) + '">分享</button>' +
        '</div></div>';
    }

    batchList.innerHTML = html;
    previewArea.style.display = 'block';
    previewArea.scrollIntoView({ behavior: 'smooth' });
    localStorage.removeItem('cf_draft');
    return true;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(msg) {
    window.CF.showToast(msg);
  }

  window.CF = window.CF || {};
  window.CF.Feedback = {
    init: init,
    refreshStudentList: refreshStudentList,
    refreshDatalists: refreshDatalists,
    generateFeedback: generateFeedback,
    copySingle: copySingle,
    shareSingle: shareSingle,
    copyAll: copyAll,
    clearForm: clearForm,
    aiExpand: aiExpand,
    aiExpandRow: aiExpandRow,
    aiExpandAll: aiExpandAll,
    renderBatchTable: renderBatchTable,
    reloadDefaults: reloadDefaults,
    doShare: doShare,
    showStudentHistory: showStudentHistory,
    quickFill: quickFill
  };
})();

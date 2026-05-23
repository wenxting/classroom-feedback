(function() {
  'use strict';

  var Storage = window.CF.Storage;

  function init() {
    var settings = Storage.getSettings();
    setTodayDate();

    if (settings.defaultTime) {
      document.getElementById('fb-time').value = settings.defaultTime;
    }
    if (settings.defaultSubject) {
      document.getElementById('fb-subject').value = settings.defaultSubject;
    }
    if (settings.defaultTeacher) {
      document.getElementById('fb-teacher').value = settings.defaultTeacher;
    }
    if (settings.defaultHomework) {
      document.getElementById('fb-homework').value = settings.defaultHomework;
    }

    refreshStudentList();
    refreshDatalists();
    setupAutoSave();
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
          if (siEl && !siEl.value) siEl.value = draft.studentInput;
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
    if (navigator.share) {
      navigator.share({ text: text }).catch(function() {});
    } else {
      copyToClipboard(text);
    }
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
    var fields = ['student-input', 'subject', 'teacher', 'content', 'accuracy'];
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
    var studentName = document.getElementById('fb-student-input').value || '未指定';
    var masteryNote = data.mastery ? '\n（掌握比例 ' + data.mastery + ' = 本节课涉及的知识点中，学生掌握的比例情况）' : '';

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

    var isImprovement = targetId === 'fb-improvement';
    var prompt = isImprovement
      ? '你是一位专业督学师。根据以下学生课堂信息和历史记录，给出一段具体的建议提升内容（50-100字），指出知识薄弱点和具体练习方向，可对比历史记录分析进步或退步。不需要标题，直接写内容。\n\n' + info
      : '你是一位专业督学师。根据以下学生课堂信息和历史记录，写一段课堂表现评价（80-150字），语气温暖鼓励，可结合历史记录对比评价学生的进步情况。不需要标题，直接写内容。\n\n' + info;

    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位经验丰富的专业督学师，善于分析学生情况并给出针对性的建议。回复简洁专业，不使用markdown格式，不要在回复中提及学生姓名。' },
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
        targetEl.value = targetEl.value + '\n' + text;
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

    if (checked.length === 0) {
      area.style.display = 'none';
      return;
    }

    area.style.display = '';
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
      html += '<div class="batch-row" data-student="' + escapeHtml(s.value) + '">' +
        '<div class="batch-cell name">' + escapeHtml(s.value) + '</div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-acc" value="' + escapeHtml(data.accuracy) + '" placeholder="' + escapeHtml(data.accuracy || '80') + '"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-mas" value="' + escapeHtml(data.mastery) + '" placeholder="' + escapeHtml(data.mastery || '7/8') + '"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-imp" value="" placeholder="可选"></div>' +
        '<div class="batch-cell"><input type="text" id="' + sid + '-perf" value="" placeholder="可选"></div>' +
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
    var masteryNote = rowMas ? '\n（掌握比例 ' + rowMas + ' = 本节课涉及的知识点中，学生掌握的比例情况）' : '';

    var info = '日期：' + data.date + '\n时间：' + data.time +
      '\n学生姓名：' + studentName + '\n科目：' + data.subject +
      '\n督学师：' + data.teacher + '\n学习内容：' + data.content +
      '\n正确率：' + rowAcc + '%\n掌握比例：' + rowMas + masteryNote;

    var prompt = '你是一位专业督学师。根据以下学生课堂信息，请严格按格式生成两段内容：\n' +
      '第一段用【建议提升】开头，指出知识薄弱点和具体练习方向（50-100字）。\n' +
      '第二段用【课堂表现】开头，客观评价，既要肯定优点也要如实指出不足（如纪律、态度、专注度等问题），给出改进建议（80-150字）。\n' +
      '不要提及学生姓名。\n\n' + info;

    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位经验丰富的专业督学师。评价客观平衡，既要鼓励进步也要指出不足。不使用markdown格式，不提及学生姓名。严格用【建议提升】和【课堂表现】作为两段的开头标记。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500, temperature: 0.7
      })
    }).then(function(res) {
      if (!res.ok) throw new Error('API error ' + res.status);
      return res.json();
    }).then(function(json) {
      var text = json.choices[0].message.content.trim();
      var imp = '', perf = '';
      var impIdx = text.indexOf('【课堂表现】');
      if (impIdx > -1) {
        imp = text.substring(0, impIdx).replace('【建议提升】', '').trim();
        perf = text.substring(impIdx).replace('【课堂表现】', '').trim();
      } else {
        // Fallback: try splitting by double newline
        var parts = text.split('\n\n');
        imp = parts[0] ? parts[0].replace('【建议提升】', '').trim() : '';
        perf = parts.slice(1).join('\n\n').replace('【课堂表现】', '').trim();
      }
      var impEl = document.getElementById('bt-' + rowIndex + '-imp');
      var perfEl = document.getElementById('bt-' + rowIndex + '-perf');
      if (impEl) impEl.value = imp;
      if (perfEl) perfEl.value = perf;
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
      var rowAcc = data.accuracy, rowMas = data.mastery, rowImp = '', rowPerf = '';
      if (checked.length > 0) {
        var accEl = document.getElementById('bt-' + i + '-acc');
        var masEl = document.getElementById('bt-' + i + '-mas');
        var impEl = document.getElementById('bt-' + i + '-imp');
        var perfEl = document.getElementById('bt-' + i + '-perf');
        if (accEl && accEl.value) rowAcc = accEl.value;
        if (masEl && masEl.value) rowMas = masEl.value;
        if (impEl && impEl.value) rowImp = impEl.value;
        if (perfEl && perfEl.value) rowPerf = perfEl.value;
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
    showStudentHistory: showStudentHistory,
    quickFill: quickFill
  };
})();

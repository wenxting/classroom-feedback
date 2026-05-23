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
      return;
    }

    if (emptyHint) emptyHint.style.display = 'none';
    selectAll.disabled = false;

    var checkedNames = getCheckedStudentNames();
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

    // Render preset tag buttons for subject, teacher, time
    renderPresetRow('preset-row-subject', settings.subjectPresets || [], 'fb-subject');
    renderPresetRow('preset-row-teacher', settings.teacherPresets || [], 'fb-teacher');
    renderPresetRow('preset-row-time', settings.timePresets || [], 'fb-time');
  }

  function renderPresetRow(rowId, list, inputId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = list.map(function(v) {
      return '<button type="button" class="preset-btn" data-action="fill-preset" data-target="' + inputId + '" data-value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</button>';
    }).join('');
  }

  function setupAutoSave() {
    var form = document.getElementById('feedback-form');
    var saveKey = 'cf_draft';
    var textFields = ['subject', 'teacher', 'content', 'accuracy', 'mastery', 'improvement', 'performance', 'homework'];

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
      mastery: document.getElementById('fb-mastery').value,
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

  function generateFeedback() {
    var manualInput = document.getElementById('fb-student-input').value.trim();
    var selectedStudents = manualInput ? [manualInput] : getCheckedStudentNames();
    var data = getFormData();

    if (selectedStudents.length === 0) { showToast('请输入学生姓名或从名单勾选'); return null; }
    if (!data.subject) { showToast('请输入科目'); return null; }

    var previewArea = document.getElementById('preview-area');
    var batchList = document.getElementById('batch-preview-list');

    var html = '';
    selectedStudents.forEach(function(studentName) {
      var text = buildFeedbackText(data, studentName);
      // Save each to history
      var record = Object.assign({}, data, { studentName: studentName });
      Storage.addFeedback(record);

      html += '<div class="batch-preview-item">' +
        '<div class="batch-preview-header">' + escapeHtml(studentName) + '</div>' +
        '<textarea class="preview-text" data-student="' + escapeHtml(studentName) + '">' + escapeHtml(text) + '</textarea>' +
        '<div class="preview-actions">' +
          '<button class="btn btn-primary" data-action="copy-single" data-student="' + escapeHtml(studentName) + '">复制</button>' +
          '<button class="btn btn-secondary" data-action="share-single" data-student="' + escapeHtml(studentName) + '">分享</button>' +
        '</div>' +
      '</div>';
    });

    batchList.innerHTML = html;
    previewArea.style.display = 'block';
    previewArea.scrollIntoView({ behavior: 'smooth' });

    // Store generated texts for copy-all
    previewArea._generatedTexts = {};
    selectedStudents.forEach(function(studentName) {
      previewArea._generatedTexts[studentName] = buildFeedbackText(data, studentName);
    });

    localStorage.removeItem('cf_draft');
    return true;
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
    var fields = ['student-input', 'subject', 'teacher', 'content', 'accuracy', 'mastery', 'improvement', 'performance'];
    fields.forEach(function(f) {
      document.getElementById('fb-' + f).value = '';
    });
    document.getElementById('fb-homework').value = '作业已完成，课后多练习巩固知识点';
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
          { role: 'system', content: '你是一位经验丰富的专业督学师，善于分析学生情况并给出针对性的建议。回复简洁专业，不使用markdown格式。' },
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
    showStudentHistory: showStudentHistory,
    quickFill: quickFill
  };
})();

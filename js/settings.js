(function() {
  'use strict';

  var Storage = window.CF.Storage;

  function init() {
    var settings = Storage.getSettings();
    document.getElementById('set-subject').value = settings.defaultSubject || '';
    document.getElementById('set-teacher').value = settings.defaultTeacher || '';
    document.getElementById('set-time').value = settings.defaultTime || '';
    document.getElementById('set-homework').value = settings.defaultHomework || '';
    document.getElementById('set-apikey').value = settings.apiKey || '';
    document.getElementById('set-aistyle').value = settings.aiStyle || '';
    document.getElementById('set-aisamples').value = settings.aiSamples || '';
    var retEl = document.getElementById('set-retention');
    if (retEl) retEl.value = settings.historyRetention || 'never';
    renderPresets();
    updateStats();
  }

  function saveRetention() {
    var settings = Storage.getSettings();
    settings.historyRetention = document.getElementById('set-retention').value;
    Storage.saveSettings(settings);
    Storage.cleanOldHistory();
    if (window.CF.History && window.CF.History.render) window.CF.History.render();
    updateStats();
    showToast('保留期设置已保存');
  }

  function updateStats() {
    var el = document.getElementById('stat-count');
    if (el) el.textContent = Storage.getFeedbackCount();
  }

  function save() {
    var settings = Storage.getSettings();
    settings.defaultSubject = document.getElementById('set-subject').value.trim();
    settings.defaultTeacher = document.getElementById('set-teacher').value.trim();
    settings.defaultTime = document.getElementById('set-time').value.trim();
    settings.defaultHomework = document.getElementById('set-homework').value.trim();
    settings.apiKey = document.getElementById('set-apikey').value.trim();
    settings.aiStyle = document.getElementById('set-aistyle').value.trim();
    settings.aiSamples = document.getElementById('set-aisamples').value.trim();
    Storage.saveSettings(settings);
    window.CF.Feedback.refreshDatalists();
    window.CF.Feedback.reloadDefaults();
    showToast('设置已保存');
  }

  function renderPresets() {
    var settings = Storage.getSettings();

    renderOnePreset('preset-subject-list', settings.subjectPresets || [], 'subject');
    renderOnePreset('preset-teacher-list', settings.teacherPresets || [], 'teacher');
    renderOnePreset('preset-time-list', settings.timePresets || [], 'time');
  }

  function renderOnePreset(containerId, list, type) {
    var container = document.getElementById(containerId);
    if (list.length === 0) {
      container.innerHTML = '<span style="color:#999;font-size:13px">暂无预设</span>';
      return;
    }
    container.innerHTML = list.map(function(item) {
      return '<span class="preset-tag">' +
        escapeHtml(item) +
        '<span class="preset-delete" data-action="remove-preset" data-preset-type="' + type + '" data-preset-value="' + escapeHtml(item) + '">×</span>' +
      '</span>';
    }).join('');
  }

  function addPreset(type) {
    var inputMap = {
      subject: 'preset-subject-input',
      teacher: 'preset-teacher-input',
      time: 'preset-time-input'
    };
    var keyMap = {
      subject: 'subjectPresets',
      teacher: 'teacherPresets',
      time: 'timePresets'
    };

    var input = document.getElementById(inputMap[type]);
    var value = input.value.trim();
    if (!value) { showToast('请输入内容'); return; }

    var settings = Storage.getSettings();
    var list = settings[keyMap[type]] || [];
    if (list.indexOf(value) >= 0) {
      showToast('该预设已存在');
      return;
    }

    list.push(value);
    settings[keyMap[type]] = list;
    Storage.saveSettings(settings);
    input.value = '';
    renderPresets();
    window.CF.Feedback.refreshDatalists();
    showToast('添加成功');
  }

  function removePreset(type, value) {
    var keyMap = {
      subject: 'subjectPresets',
      teacher: 'teacherPresets',
      time: 'timePresets'
    };

    var settings = Storage.getSettings();
    var list = settings[keyMap[type]] || [];
    settings[keyMap[type]] = list.filter(function(v) { return v !== value; });
    Storage.saveSettings(settings);
    renderPresets();
    window.CF.Feedback.refreshDatalists();
    showToast('已删除');
  }

  function backupAll() {
    var data = {
      version: '2.0.10',
      exportedAt: new Date().toISOString(),
      students: Storage.getStudents(),
      history: Storage.getHistory(),
      settings: Storage.getSettings()
    };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '课堂反馈备份_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('备份已下载');
  }

  function restoreAll() {
    var input = document.getElementById('restore-file-input');
    input.value = '';
    input.onchange = function() {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data.students || !data.history || !data.settings) {
            showToast('备份文件格式不正确');
            return;
          }
          if (!confirm('将恢复 ' + data.students.length + ' 名学生、' + data.history.length + ' 条历史记录和设置数据。当前数据将被覆盖，确认继续？')) return;
          Storage.saveStudents(data.students);
          Storage.saveHistory(data.history);
          Storage.saveSettings(data.settings);
          window.CF.Roster.render();
          window.CF.Feedback.refreshStudentList();
          window.CF.Feedback.refreshDatalists();
          window.CF.History.render();
          init();
          showToast('数据已恢复');
        } catch (err) {
          showToast('文件解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearAll() {
    if (!confirm('确定要清除所有数据吗？包括学生名单、历史记录、预设和设置数据，此操作不可恢复！')) return;
    if (!confirm('再次确认：清除所有数据？')) return;
    Storage.clearAll();
    window.CF.Roster.render();
    window.CF.Feedback.refreshStudentList();
    window.CF.Feedback.refreshDatalists();
    window.CF.History.render();
    init();
    showToast('所有数据已清除');
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
  window.CF.Settings = {
    init: init,
    save: save,
    addPreset: addPreset,
    removePreset: removePreset,
    saveRetention: saveRetention,
    backupAll: backupAll,
    restoreAll: restoreAll,
    clearAll: clearAll
  };
})();

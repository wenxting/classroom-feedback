(function() {
  'use strict';

  var Storage = window.CF.Storage;

  function init() {
    var settings = Storage.getSettings();
    document.getElementById('set-subject').value = settings.defaultSubject || '';
    document.getElementById('set-teacher').value = settings.defaultTeacher || '';
    document.getElementById('set-time').value = settings.defaultTime || '';
    renderPresets();
    updateStats();
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
    Storage.saveSettings(settings);
    window.CF.Feedback.refreshDatalists();
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
    clearAll: clearAll
  };
})();

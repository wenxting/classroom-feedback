(function() {
  'use strict';

  var KEYS = {
    STUDENTS: 'cf_students',
    HISTORY: 'cf_history',
    SETTINGS: 'cf_settings'
  };

  var _lastId = Date.now();

  function nextId() {
    var now = Date.now();
    if (now <= _lastId) {
      _lastId = _lastId + 1;
    } else {
      _lastId = now;
    }
    return _lastId;
  }

  function getStudents() {
    try { return JSON.parse(localStorage.getItem(KEYS.STUDENTS)) || []; }
    catch (e) { return []; }
  }

  function repairStudents() {
    var students = getStudents();
    var seen = {};
    var changed = false;
    students.forEach(function(s) {
      if (seen[s.id]) {
        s.id = nextId();
        changed = true;
      }
      seen[s.id] = true;
      // Migrate old className field to grade
      if (s.className !== undefined && s.grade === undefined) {
        s.grade = s.className;
        delete s.className;
        changed = true;
      }
    });
    if (changed) saveStudents(students);
  }

  function saveStudents(students) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  }

  function addStudent(name, grade) {
    var students = getStudents();
    var student = { id: nextId(), name: name.trim(), grade: grade.trim() };
    students.push(student);
    saveStudents(students);
    return student;
  }

  function deleteStudent(id) {
    saveStudents(getStudents().filter(function(s) { return s.id !== id; }));
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY)) || []; }
    catch (e) { return []; }
  }

  function saveHistory(history) {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }

  function addFeedback(feedback) {
    var history = getHistory();
    var record = Object.assign({}, feedback, { id: nextId(), createdAt: Date.now() });
    history.unshift(record);
    saveHistory(history);
    return record;
  }

  function deleteFeedback(id) {
    saveHistory(getHistory().filter(function(h) { return h.id !== id; }));
  }

  function cleanOldHistory() {
    var settings = getSettings();
    var retention = settings.historyRetention || 'never';
    if (retention === 'never') return;
    var days = retention === '3months' ? 90 : 30;
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var history = getHistory();
    var filtered = history.filter(function(h) { return h.createdAt >= cutoff; });
    if (filtered.length !== history.length) {
      saveHistory(filtered);
    }
  }

  function getStudentHistory(name) {
    return getHistory().filter(function(h) { return h.studentName === name; });
  }

  function getFeedbackCount() {
    return getHistory().length;
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
        defaultSubject: '', defaultTeacher: '', defaultTime: '', defaultHomework: '',
        teacherPresets: [], timePresets: [], subjectPresets: [],
        historyRetention: 'never', apiKey: '', aiStyle: '', aiSamples: ''
      };
    } catch (e) {
      return { defaultSubject: '', defaultTeacher: '', defaultTime: '', defaultHomework: '',
        teacherPresets: [], timePresets: [], subjectPresets: [],
        historyRetention: 'never', apiKey: '', aiStyle: '', aiSamples: '' };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  function clearAll() {
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.SETTINGS);
  }

  window.CF = window.CF || {};
  window.CF.Storage = {
    getStudents: getStudents,
    saveStudents: saveStudents,
    addStudent: addStudent,
    deleteStudent: deleteStudent,
    getHistory: getHistory,
    saveHistory: saveHistory,
    addFeedback: addFeedback,
    deleteFeedback: deleteFeedback,
    getSettings: getSettings,
    saveSettings: saveSettings,
    repairStudents: repairStudents,
    cleanOldHistory: cleanOldHistory,
    getStudentHistory: getStudentHistory,
    getFeedbackCount: getFeedbackCount,
    clearAll: clearAll
  };
})();

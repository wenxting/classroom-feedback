(function() {
  'use strict';

  var KEYS = {
    STUDENTS: 'cf_students',
    HISTORY: 'cf_history',
    SETTINGS: 'cf_settings'
  };

  function getStudents() {
    try { return JSON.parse(localStorage.getItem(KEYS.STUDENTS)) || []; }
    catch (e) { return []; }
  }

  function saveStudents(students) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  }

  function addStudent(name, className) {
    var students = getStudents();
    var student = { id: Date.now(), name: name.trim(), className: className.trim() };
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
    var record = Object.assign({}, feedback, { id: Date.now(), createdAt: Date.now() });
    history.unshift(record);
    saveHistory(history);
    return record;
  }

  function deleteFeedback(id) {
    saveHistory(getHistory().filter(function(h) { return h.id !== id; }));
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
        defaultSubject: '', defaultTeacher: '', defaultTime: '',
        teacherPresets: [], timePresets: [], subjectPresets: []
      };
    } catch (e) {
      return { defaultSubject: '', defaultTeacher: '', defaultTime: '',
        teacherPresets: [], timePresets: [], subjectPresets: [] };
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
    clearAll: clearAll
  };
})();

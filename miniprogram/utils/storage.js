var _lastId = Date.now();
function nextId() { var now = Date.now(); _lastId = now <= _lastId ? _lastId + 1 : now; return _lastId; }

function getStudents() { return wx.getStorageSync('cf_students') || []; }
function saveStudents(s) { wx.setStorageSync('cf_students', s); }
function addStudent(name, grade) {
  var s = getStudents();
  var st = { id: nextId(), name: name.trim(), grade: grade.trim() };
  s.push(st); saveStudents(s); return st;
}
function deleteStudent(id) { saveStudents(getStudents().filter(function(s) { return s.id !== id; })); }

function repairStudents() {
  var students = getStudents(), seen = {}, changed = false;
  students.forEach(function(s) {
    if (seen[s.id]) { s.id = nextId(); changed = true; }
    seen[s.id] = true;
    if (s.className !== undefined && s.grade === undefined) { s.grade = s.className; delete s.className; changed = true; }
  });
  if (changed) saveStudents(students);
}

function getHistory() { return wx.getStorageSync('cf_history') || []; }
function saveHistory(h) { wx.setStorageSync('cf_history', h); }
function addFeedback(fb) {
  var h = getHistory();
  var record = Object.assign({}, fb, { id: nextId(), createdAt: Date.now() });
  h.unshift(record); saveHistory(h); return record;
}
function deleteFeedback(id) { saveHistory(getHistory().filter(function(h) { return h.id !== id; })); }
function getStudentHistory(name) { return getHistory().filter(function(h) { return h.studentName === name; }); }
function getFeedbackCount() { return getHistory().length; }

function cleanOldHistory() {
  var settings = getSettings();
  var retention = settings.historyRetention || 'never';
  if (retention === 'never') return;
  var days = retention === '3months' ? 90 : 30;
  var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  var history = getHistory();
  var filtered = history.filter(function(h) { return h.createdAt >= cutoff; });
  if (filtered.length !== history.length) saveHistory(filtered);
}

function getSettings() {
  try { return wx.getStorageSync('cf_settings') || {}; }
  catch(e) { return {}; }
}
function saveSettings(s) { wx.setStorageSync('cf_settings', s); }
function clearAll() { wx.removeStorageSync('cf_students'); wx.removeStorageSync('cf_history'); wx.removeStorageSync('cf_settings'); }

module.exports = {
  getStudents: getStudents, saveStudents: saveStudents, addStudent: addStudent, deleteStudent: deleteStudent, repairStudents: repairStudents,
  getHistory: getHistory, saveHistory: saveHistory, addFeedback: addFeedback, deleteFeedback: deleteFeedback,
  getStudentHistory: getStudentHistory, getFeedbackCount: getFeedbackCount, cleanOldHistory: cleanOldHistory,
  getSettings: getSettings, saveSettings: saveSettings, clearAll: clearAll
};

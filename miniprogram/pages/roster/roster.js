var Storage = require('../../utils/storage');

Page({
  data: { name: '', grade: '', students: [], batchMode: false, hasChecked: false },

  onShow: function() { this.loadStudents(); },

  loadStudents: function() {
    var students = Storage.getStudents().map(function(s) { return Object.assign({}, s, { checked: false }); });
    this.setData({ students: students, batchMode: false, hasChecked: false });
  },

  onInput: function(e) { var obj = {}; obj[e.currentTarget.dataset.field] = e.detail.value; this.setData(obj); },

  onAdd: function() {
    if (!this.data.name.trim()) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return; }
    if (!this.data.grade.trim()) { wx.showToast({ title: '请输入年级', icon: 'none' }); return; }
    Storage.addStudent(this.data.name, this.data.grade);
    this.setData({ name: '', grade: '' });
    this.loadStudents();
    wx.showToast({ title: '添加成功', icon: 'none' });
  },

  onDelete: function(e) {
    var that = this;
    wx.showModal({ title: '确定删除？', success: function(res) {
      if (res.confirm) { Storage.deleteStudent(e.currentTarget.dataset.id); that.loadStudents(); }
    }});
  },

  onToggleBatch: function() {
    var mode = !this.data.batchMode;
    var students = this.data.students.map(function(s) { return Object.assign({}, s, { checked: false }); });
    this.setData({ batchMode: mode, students: students, hasChecked: false });
  },

  onCheck: function(e) {
    var id = e.currentTarget.dataset.id;
    var students = this.data.students;
    var hasChecked = false;
    for (var i = 0; i < students.length; i++) { if (students[i].id === id) students[i].checked = !students[i].checked; if (students[i].checked) hasChecked = true; }
    this.setData({ students: students, hasChecked: hasChecked });
  },

  onBatchDelete: function() {
    var toDelete = this.data.students.filter(function(s) { return s.checked; });
    if (toDelete.length === 0) return;
    var that = this;
    wx.showModal({ title: '确定删除选中的 ' + toDelete.length + ' 名学生？', success: function(res) {
      if (res.confirm) { toDelete.forEach(function(s) { Storage.deleteStudent(s.id); }); that.loadStudents(); }
    }});
  }
});

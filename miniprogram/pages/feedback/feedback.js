var Storage = require('../../utils/storage');

function formatDate(d) { var p = d.split('-'); return parseInt(p[1]) + '.' + parseInt(p[2]); }
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

Page({
  data: {
    form: { date: '', time: '', subject: '', teacher: '', content: '', accuracy: '', masteryA: '', masteryB: '', improvement: '', performance: '', homework: '' },
    studentInput: '',
    students: [], sortedStudents: [], checkedCount: 0, selectAll: false,
    batchStudents: [], previewVisible: false, previewList: [],
    aiResults: {}
  },

  onStudentInput: function(e) {
    var val = e.detail.value;
    this.setData({ studentInput: val });
    // Filter students
    var q = val.trim().toLowerCase();
    var sorted = this.data.students.map(function(s) { return Object.assign({}, s); });
    if (q) {
      sorted = sorted.filter(function(s) { return s.name.toLowerCase().indexOf(q) >= 0; });
    }
    // Keep checked status
    var checkedNames = {};
    (this.data.sortedStudents || []).forEach(function(s) { if (s.checked) checkedNames[s.name] = true; });
    sorted.forEach(function(s) { if (checkedNames[s.name]) s.checked = true; });
    // Sort checked first
    sorted.sort(function(a,b) { return a.checked === b.checked ? 0 : (a.checked ? -1 : 1); });
    this.setData({ sortedStudents: sorted });
  },

  onShow: function() {
    this.loadDefaults();
    this.loadStudents();
  },

  loadDefaults: function() {
    var s = Storage.getSettings();
    var now = new Date();
    var date = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    this.setData({
      'form.date': date,
      'form.time': s.defaultTime || '',
      'form.subject': s.defaultSubject || '',
      'form.teacher': s.defaultTeacher || '',
      'form.homework': s.defaultHomework || ''
    });
  },

  loadStudents: function() {
    var students = Storage.getStudents();
    var sorted = students.map(function(s) { return Object.assign({}, s, { checked: false }); });
    this.setData({ students: sorted, sortedStudents: sorted, checkedCount: 0, selectAll: false });
  },

  onFieldChange: function(e) {
    var field = e.currentTarget.dataset.field;
    var obj = {}; obj['form.' + field] = e.detail.value;
    this.setData(obj);
  },

  onDateChange: function(e) { this.setData({ 'form.date': e.detail.value }); },

  onToggleStudent: function(e) {
    var name = e.currentTarget.dataset.name;
    var sorted = this.data.sortedStudents;
    var count = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].name === name) sorted[i].checked = !sorted[i].checked;
      if (sorted[i].checked) count++;
    }
    // Sort checked first
    sorted.sort(function(a,b) { return a.checked === b.checked ? 0 : (a.checked ? -1 : 1); });
    var allChecked = count === sorted.length && sorted.length > 0;
    this.setData({ sortedStudents: sorted, checkedCount: count, selectAll: allChecked });
    this.updateBatchTable();
  },

  onSelectAll: function() {
    var check = !this.data.selectAll;
    var sorted = this.data.sortedStudents;
    var count = 0;
    for (var i = 0; i < sorted.length; i++) { sorted[i].checked = check; if (check) count++; }
    sorted.sort(function(a,b) { return a.checked === b.checked ? 0 : (a.checked ? -1 : 1); });
    this.setData({ sortedStudents: sorted, checkedCount: count, selectAll: check });
    this.updateBatchTable();
  },

  onDeselectAll: function() {
    var sorted = this.data.sortedStudents;
    for (var i = 0; i < sorted.length; i++) sorted[i].checked = false;
    this.setData({ sortedStudents: sorted, checkedCount: 0, selectAll: false, batchStudents: [] });
  },

  updateBatchTable: function() {
    var checked = this.data.sortedStudents.filter(function(s) { return s.checked; });
    if (checked.length < 2) { this.setData({ batchStudents: [] }); return; }
    var aiCache = this.data.aiResults || {};
    var batch = checked.map(function(s) {
      var ai = aiCache[s.name] || {};
      return { name: s.name, acc: '', mas: '', imp: ai.imp || '', perf: ai.perf || '' };
    });
    this.setData({ batchStudents: batch });
  },

  onBatchChange: function(e) {
    var idx = e.currentTarget.dataset.index, field = e.currentTarget.dataset.field;
    var batch = this.data.batchStudents;
    batch[idx][field] = e.detail.value;
    this.setData({ batchStudents: batch });
  },

  onAIExpand: function(e) {
    var target = e.currentTarget.dataset.target;
    var that = this;
    var settings = Storage.getSettings();
    if (!settings.apiKey) { wx.showToast({ title: '请先设置API Key', icon: 'none' }); return; }

    var form = this.data.form;
    var studentName = form.subject; // placeholder
    var info = '日期：' + form.date + '\n时间：' + form.time + '\n科目：' + form.subject + '\n督学师：' + form.teacher + '\n学习内容：' + form.content + '\n正确率：' + form.accuracy + '%\n掌握比例：' + (form.masteryA && form.masteryB ? form.masteryA + '/' + form.masteryB : '');

    var prompt = target === 'improvement'
      ? '这是培训机构辅导场景。写一句具体练习建议（30字以内），不谈课堂表现。不用"同学""拿满分"等词。\n\n' + info
      : '这是培训机构辅导场景。写一段完整流畅的评价（80-150字），按学习状态→综合分析→鼓励的顺序。不提姓名和作业，不用"同学""拿满分"等词。\n\n' + info;

    wx.request({
      url: 'https://api.deepseek.com/v1/chat/completions',
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
      data: { model: 'deepseek-chat', messages: [{ role: 'system', content: '你是培训机构专业督学师。回复简洁，不提姓名和作业，不用绝对化词汇。' }, { role: 'user', content: prompt }], max_tokens: 300, temperature: 0.7 },
      success: function(res) {
        var text = res.data.choices[0].message.content.trim();
        var obj = {}; obj['form.' + target] = text; that.setData(obj);
      },
      fail: function() { wx.showToast({ title: 'AI请求失败', icon: 'none' }); }
    });
  },

  onAIExpandRow: function(e) {
    var idx = e.currentTarget.dataset.index;
    var that = this;
    var settings = Storage.getSettings();
    if (!settings.apiKey) { wx.showToast({ title: '请先设置API Key', icon: 'none' }); return; }

    var batch = this.data.batchStudents;
    var studentName = batch[idx].name;
    var form = this.data.form;
    var rowAcc = batch[idx].acc || form.accuracy;
    var rowMas = batch[idx].mas || (form.masteryA && form.masteryB ? form.masteryA + '/' + form.masteryB : '');
    var masteryNote = rowMas ? '\n【重要】掌握比例' + rowMas + '=本节课涉及的知识点中该生掌握的比例' : '';

    var info = '日期：' + form.date + '\n时间：' + form.time + '\n学生姓名：' + studentName + '\n科目：' + form.subject + '\n督学师：' + form.teacher + '\n学习内容：' + form.content + '\n正确率：' + rowAcc + '%\n掌握比例：' + rowMas + masteryNote;

    var prompt = '【重要】科目为：' + form.subject + '，所有分析必须紧扣' + form.subject + '科目。\n' +
      '请生成两段内容，用【建议提升】【课堂表现】标记分隔：\n' +
      '【建议提升】：30字以内，只写练习建议，不谈课堂表现。根据学习内容"' + form.content + '"写出具体建议。\n' +
      '【课堂表现】：80-150字完整评价。\n' +
      '不提姓名和作业，不用"同学""拿满分"等词。\n\n' + info;

    wx.request({
      url: 'https://api.deepseek.com/v1/chat/completions',
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.apiKey },
      data: { model: 'deepseek-chat', messages: [{ role: 'system', content: '你是培训机构' + form.subject + '科目督学师。严格用【建议提升】【课堂表现】标记输出。不提姓名和作业，不用绝对化词汇。' }, { role: 'user', content: prompt }], max_tokens: 400, temperature: 0.7 },
      success: function(res) {
        var text = res.data.choices[0].message.content.trim();
        var imp = '', perf = '';
        var perfIdx = text.indexOf('【课堂表现】');
        if (perfIdx > -1) { imp = text.substring(0, perfIdx).replace('【建议提升】','').trim(); perf = text.substring(perfIdx).replace('【课堂表现】','').trim(); }
        else { imp = perf = text; }
        batch[idx].imp = imp; batch[idx].perf = perf;
        var aiResults = that.data.aiResults || {};
        aiResults[studentName] = { imp: imp, perf: perf };
        that.setData({ batchStudents: batch, aiResults: aiResults });
      },
      fail: function() { wx.showToast({ title: 'AI请求失败', icon: 'none' }); }
    });
  },

  onAIExpandAll: function() {
    var that = this;
    var batch = this.data.batchStudents;
    if (batch.length === 0) return;
    wx.showToast({ title: '正在生成' + batch.length + '名学生...', icon: 'none' });
    var i = 0;
    function next() { if (i >= batch.length) { wx.showToast({ title: '全部已提交', icon: 'none' }); return; } that.onAIExpandRow({ currentTarget: { dataset: { index: i } } }); i++; setTimeout(next, 1000); }
    next();
  },

  onGenerate: function() {
    var form = this.data.form;
    var checked = this.data.sortedStudents.filter(function(s) { return s.checked; });
    var manualInput = this.data.studentInput.trim();
    if (checked.length === 0 && !manualInput) { wx.showToast({ title: '请输入或勾选学生', icon: 'none' }); return; }
    if (!form.subject) { wx.showToast({ title: '请输入科目', icon: 'none' }); return; }

    var studentNames = checked.length > 0 ? checked.map(function(s) { return s.name; }) : [manualInput];

    var previewList = [];
    for (var i = 0; i < studentNames.length; i++) {
      var name = studentNames[i];
      var rowAcc = form.accuracy, rowMas = (form.masteryA && form.masteryB ? form.masteryA + '/' + form.masteryB : ''), rowImp = form.improvement, rowPerf = form.performance;
      if (this.data.batchStudents.length > 0 && this.data.batchStudents[i]) {
        var bt = this.data.batchStudents[i];
        if (bt.acc) rowAcc = bt.acc;
        if (bt.mas) rowMas = bt.mas;
        if (bt.imp) rowImp = bt.imp;
        if (bt.perf) rowPerf = bt.perf;
      }
      var text = '课堂反馈\n日期：' + formatDate(form.date) + '\n时间：' + form.time + '\n学生姓名：' + name + '\n科目：' + form.subject + '\n督学师：' + form.teacher + '\n学习内容：' + form.content + '\n\n正确率：' + rowAcc + '%\n掌握比例：' + rowMas + '\n建议提升：' + rowImp + '\n\n课堂表现：' + rowPerf + '\n\n作业布置与完成情况：' + form.homework;
      Storage.addFeedback({ date: form.date, time: form.time, studentName: name, subject: form.subject, teacher: form.teacher, content: form.content, accuracy: rowAcc, mastery: rowMas, improvement: rowImp, performance: rowPerf, homework: form.homework });
      previewList.push({ name: name, text: text });
    }
    this.setData({ previewVisible: true, previewList: previewList });
  },

  onClearForm: function() {
    var settings = Storage.getSettings();
    var now = new Date();
    var date = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    this.setData({
      studentInput: '',
      'form.date': date, 'form.time': settings.defaultTime || '', 'form.subject': settings.defaultSubject || '', 'form.teacher': settings.defaultTeacher || '',
      'form.content': '', 'form.accuracy': '', 'form.masteryA': '', 'form.masteryB': '', 'form.improvement': '', 'form.performance': '',
      'form.homework': settings.defaultHomework || '', previewVisible: false, previewList: [], batchStudents: [], aiResults: {},
      checkedCount: 0, selectAll: false
    });
    this.loadStudents();
  },

  onPreviewEdit: function(e) {
    var idx = e.currentTarget.dataset.index;
    var list = this.data.previewList;
    list[idx].text = e.detail.value;
    this.setData({ previewList: list });
  },

  onCopySingle: function(e) {
    var text = this.data.previewList[e.currentTarget.dataset.index].text;
    wx.setClipboardData({ data: text, success: function() { wx.showToast({ title: '已复制', icon: 'none' }); } });
  },

  onCopyAll: function() {
    var all = this.data.previewList.map(function(p) { return p.text; }).join('\n\n━━━━━━━━━━━━━━━━\n\n');
    wx.setClipboardData({ data: all, success: function() { wx.showToast({ title: '已复制全部', icon: 'none' }); } });
  },

  onShareSingle: function(e) {
    var text = this.data.previewList[e.currentTarget.dataset.index].text;
    wx.setClipboardData({ data: text, success: function() { wx.showToast({ title: '已复制，可到微信粘贴', icon: 'none' }); } });
  }
});

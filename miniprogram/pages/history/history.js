var Storage = require('../../utils/storage');

function buildText(h) {
  return '课堂反馈\n日期：' + h.date + '\n时间：' + h.time + '\n学生姓名：' + h.studentName + '\n科目：' + h.subject + '\n督学师：' + h.teacher + '\n学习内容：' + h.content + '\n\n正确率：' + h.accuracy + '%\n掌握比例：' + h.mastery + '\n建议提升：' + h.improvement + '\n\n课堂表现：' + h.performance + '\n\n作业布置与完成情况：' + h.homework;
}

Page({
  data: { list: [], filterText: '' },

  onShow: function() { this.render(); },

  render: function() {
    var filter = this.data.filterText.trim().toLowerCase();
    var all = Storage.getHistory();
    var filtered = filter ? all.filter(function(h) { return h.studentName.toLowerCase().indexOf(filter) >= 0; }) : all;
    var list = filtered.map(function(h) { return Object.assign({}, h, { text: buildText(h), expanded: false }); });
    this.setData({ list: list });
  },

  onFilter: function(e) { this.setData({ filterText: e.detail.value }); this.render(); },

  onToggle: function(e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.list;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) list[i].expanded = !list[i].expanded; }
    this.setData({ list: list });
  },

  onCopy: function(e) {
    var id = e.currentTarget.dataset.id;
    var item = this.data.list.find(function(h) { return h.id === id; });
    if (item) wx.setClipboardData({ data: item.text, success: function() { wx.showToast({ title: '已复制', icon: 'none' }); } });
  },

  onShare: function(e) {
    var id = e.currentTarget.dataset.id;
    var item = this.data.list.find(function(h) { return h.id === id; });
    if (item) wx.setClipboardData({ data: item.text, success: function() { wx.showToast({ title: '已复制，可到微信粘贴', icon: 'none' }); } });
  },

  onDelete: function(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({ title: '确定删除？', success: function(res) {
      if (res.confirm) { Storage.deleteFeedback(id); that.render(); }
    }});
  }
});

var Storage = require('../../utils/storage');

Page({
  data: { defaultSubject: '', defaultTeacher: '', defaultTime: '', defaultHomework: '', apiKey: '', retention: 'never', feedbackCount: 0 },

  onShow: function() {
    var s = Storage.getSettings();
    this.setData({
      defaultSubject: s.defaultSubject || '', defaultTeacher: s.defaultTeacher || '', defaultTime: s.defaultTime || '',
      defaultHomework: s.defaultHomework || '', apiKey: s.apiKey || '', retention: s.historyRetention || 'never',
      feedbackCount: Storage.getFeedbackCount()
    });
  },

  onInput: function(e) { var obj = {}; obj[e.currentTarget.dataset.field] = e.detail.value; this.setData(obj); },

  onRetentionChange: function(e) { this.setData({ retention: e.detail.value }); },

  onSave: function() {
    var settings = Storage.getSettings();
    settings.defaultSubject = this.data.defaultSubject;
    settings.defaultTeacher = this.data.defaultTeacher;
    settings.defaultTime = this.data.defaultTime;
    settings.defaultHomework = this.data.defaultHomework;
    settings.apiKey = this.data.apiKey;
    settings.historyRetention = this.data.retention;
    Storage.saveSettings(settings);
    Storage.cleanOldHistory();
    wx.showToast({ title: '已保存', icon: 'none' });
  }
});

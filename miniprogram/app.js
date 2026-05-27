var Storage = require('./utils/storage');

App({
  globalData: { version: '1.0.0' },

  onLaunch: function() {
    Storage.repairStudents();
    Storage.cleanOldHistory();
  },

  showToast: function(msg) {
    wx.showToast({ title: msg, icon: 'none', duration: 2000 });
  },

  Storage: Storage
});

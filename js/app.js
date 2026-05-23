(function() {
  'use strict';

  function init() {
    window.CF.Storage.repairStudents();
    window.CF.Storage.cleanOldHistory();
    window.CF.Feedback.init();
    window.CF.Roster.render();
    window.CF.History.render();
    window.CF.Settings.init();

    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchTab(this.dataset.tab);
      });
    });

    document.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;

      var action = target.dataset.action;
      var id = target.dataset.id ? Number(target.dataset.id) : null;

      switch (action) {
        case 'add-student':
          window.CF.Roster.handleAdd();
          break;
        case 'delete-student':
          window.CF.Roster.handleDelete(id);
          break;
        case 'generate':
          window.CF.Feedback.generateFeedback();
          break;
        case 'copy-single':
          window.CF.Feedback.copySingle(target.dataset.student);
          break;
        case 'share-single':
          window.CF.Feedback.shareSingle(target.dataset.student);
          break;
        case 'copy-all':
          window.CF.Feedback.copyAll();
          break;
        case 'fill-preset':
          var targetEl = document.getElementById(target.dataset.target);
          if (targetEl) { targetEl.value = target.dataset.value; targetEl.focus(); }
          break;
        case 'ai-expand':
          window.CF.Feedback.aiExpand(target.dataset.target);
          break;
        case 'ai-expand-row':
          e.stopPropagation();
          window.CF.Feedback.aiExpandRow(parseInt(target.dataset.row));
          break;
        case 'ai-expand-all':
          window.CF.Feedback.aiExpandAll();
          break;
        case 'quick-fill':
          window.CF.Feedback.quickFill();
          break;
        case 'save-retention':
          window.CF.Settings.saveRetention();
          break;
        case 'clear-form':
          window.CF.Feedback.clearForm();
          break;
        case 'toggle-history':
          window.CF.History.toggleDetail(id);
          break;
        case 'copy-history':
          e.stopPropagation();
          window.CF.History.copyHistory(id);
          break;
        case 'share-history':
          e.stopPropagation();
          window.CF.History.shareHistory(id);
          break;
        case 'delete-history':
          e.stopPropagation();
          window.CF.History.deleteHistory(id);
          break;
        case 'save-settings':
          window.CF.Settings.save();
          break;
        case 'add-preset':
          window.CF.Settings.addPreset(target.dataset.presetType);
          break;
        case 'remove-preset':
          window.CF.Settings.removePreset(target.dataset.presetType, target.dataset.presetValue);
          break;
        case 'clear-all':
          window.CF.Settings.clearAll();
          break;
      }
    });

    var histFilter = document.getElementById('history-filter-student');
    if (histFilter) {
      histFilter.addEventListener('change', function() {
        window.CF.History.render();
      });
    }

    document.getElementById('excel-file').addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        window.CF.Roster.handleExcelImport(e.target.files[0]);
        e.target.value = '';
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function() {});
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-page').forEach(function(page) {
      page.classList.toggle('active', page.id === 'tab-' + tabName);
    });

    if (tabName === 'history') {
      window.CF.History.render();
    }
    if (tabName === 'feedback') {
      var input = document.getElementById('fb-student-input');
      if (input) input.value = '';
      window.CF.Feedback.refreshStudentList();
    }
    if (tabName === 'settings') {
      window.CF.Settings.init();
    }
  }

  function showToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
      toast.classList.remove('show');
    }, 2000);
  }

  window.CF = window.CF || {};
  window.CF.showToast = showToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

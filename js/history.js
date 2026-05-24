(function() {
  'use strict';

  var Storage = window.CF.Storage;

  function render() {
    var allHistory = Storage.getHistory();
    var filterEl = document.getElementById('history-filter-student');
    var filterName = filterEl ? filterEl.value.trim() : '';

    var history = filterName
      ? allHistory.filter(function(h) { return h.studentName.toLowerCase().indexOf(filterName.toLowerCase()) >= 0; })
      : allHistory;
    var container = document.getElementById('history-list');
    var emptyHint = document.getElementById('history-empty');

    if (history.length === 0) {
      container.innerHTML = '';
      emptyHint.style.display = 'block';
      return;
    }

    emptyHint.style.display = 'none';
    container.innerHTML = history.map(function(h) {
      return '<div class="history-item" data-id="' + h.id + '">' +
        '<div class="history-header" data-action="toggle-history" data-id="' + h.id + '">' +
          '<div class="history-summary">' +
            '<span class="history-student">' + escapeHtml(h.studentName) + '</span>' +
            '<span class="history-subject">' + escapeHtml(h.subject) + '</span>' +
            '<span class="history-date">' + escapeHtml(h.date) + '</span>' +
          '</div>' +
          '<span class="history-arrow">&#x25BC;</span>' +
        '</div>' +
        '<div class="history-detail" style="display:none">' +
          '<pre class="history-text">' + escapeHtml(buildFeedbackText(h)) + '</pre>' +
          '<div class="history-actions">' +
            '<button class="btn btn-primary" data-action="copy-history" data-id="' + h.id + '">复制</button>' +
            '<button class="btn btn-secondary" data-action="share-history" data-id="' + h.id + '">分享</button>' +
            '<button class="btn btn-delete" data-action="delete-history" data-id="' + h.id + '">删除</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function formatDateStr(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length === 3) {
      return parseInt(parts[1], 10) + '.' + parseInt(parts[2], 10);
    }
    return dateStr;
  }

  function buildFeedbackText(h) {
    return '课堂反馈\n' +
      '日期：' + formatDateStr(h.date) + '\n' +
      '时间：' + h.time + '\n' +
      '学生姓名：' + h.studentName + '\n' +
      '科目：' + h.subject + '\n' +
      '督学师：' + h.teacher + '\n' +
      '学习内容：' + h.content + '\n' +
      '\n' +
      '正确率：' + h.accuracy + '%\n' +
      '掌握比例：' + h.mastery + '\n' +
      '建议提升：' + h.improvement + '\n' +
      '\n' +
      '课堂表现：' + h.performance + '\n' +
      '\n' +
      '作业布置与完成情况：' + h.homework;
  }

  function toggleDetail(id) {
    var item = document.querySelector('.history-item[data-id="' + id + '"]');
    if (!item) return;
    var detail = item.querySelector('.history-detail');
    var arrow = item.querySelector('.history-arrow');
    if (detail.style.display === 'none') {
      detail.style.display = 'block';
      arrow.innerHTML = '&#x25B2;';
    } else {
      detail.style.display = 'none';
      arrow.innerHTML = '&#x25BC;';
    }
  }

  function copyHistory(id) {
    var record = Storage.getHistory().find(function(h) { return h.id === id; });
    if (!record) return;

    var text = buildFeedbackText(record);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('已复制到剪贴板');
      }).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function shareHistory(id) {
    var record = Storage.getHistory().find(function(h) { return h.id === id; });
    if (!record) return;
    var text = buildFeedbackText(record);
    // Use shared share function from Feedback module
    if (window.CF.Feedback && window.CF.Feedback.doShare) {
      window.CF.Feedback.doShare(text);
    } else {
      copyHistory(id);
      showToast('已复制，可到微信粘贴发送');
    }
  }

  function deleteHistory(id) {
    if (!confirm('确定要删除该记录吗？')) return;
    Storage.deleteFeedback(id);
    render();
    showToast('已删除');
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制到剪贴板');
    } catch (e) {
      showToast('复制失败，请手动选择复制');
    }
    document.body.removeChild(textarea);
  }

  function exportHistory() {
    var allHistory = Storage.getHistory();
    if (allHistory.length === 0) { showToast('暂无历史记录可导出'); return; }

    var rows = [['日期','时间','学生姓名','科目','督学师','学习内容','正确率','掌握比例','建议提升','课堂表现','作业布置与完成情况']];
    for (var i = 0; i < allHistory.length; i++) {
      var h = allHistory[i];
      rows.push([h.date, h.time, h.studentName, h.subject, h.teacher, h.content,
        h.accuracy, h.mastery, h.improvement, h.performance, h.homework]);
    }

    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '历史反馈');
    XLSX.writeFile(wb, '课堂反馈历史记录.xlsx');
    showToast('导出成功');
  }

  function handleHistoryImport(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        var count = 0;
        for (var i = 1; i < rows.length; i++) {
          var r = rows[i];
          if (!r || !r[0] || !r[2]) continue;
          Storage.addFeedback({
            date: String(r[0] || ''), time: String(r[1] || ''), studentName: String(r[2] || ''),
            subject: String(r[3] || ''), teacher: String(r[4] || ''), content: String(r[5] || ''),
            accuracy: String(r[6] || ''), mastery: String(r[7] || ''), improvement: String(r[8] || ''),
            performance: String(r[9] || ''), homework: String(r[10] || '')
          });
          count++;
        }
        render();
        if (window.CF.Settings && window.CF.Settings.init) window.CF.Settings.init();
        if (count === 0) {
          showToast('未找到有效记录，请检查文件格式');
        } else {
          showToast('成功导入 ' + count + ' 条记录');
        }
      } catch(err) {
        showToast('导入失败，请检查文件格式');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
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
  window.CF.History = {
    render: render,
    toggleDetail: toggleDetail,
    copyHistory: copyHistory,
    shareHistory: shareHistory,
    deleteHistory: deleteHistory,
    exportHistory: exportHistory,
    handleHistoryImport: handleHistoryImport
  };
})();

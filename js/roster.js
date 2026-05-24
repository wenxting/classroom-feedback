(function() {
  'use strict';

  var Storage = window.CF.Storage;
  var batchMode = false;

  function render() {
    var students = Storage.getStudents();
    var container = document.getElementById('roster-list');
    var emptyHint = document.getElementById('roster-empty');

    if (students.length === 0) {
      container.innerHTML = '';
      emptyHint.style.display = 'block';
      return;
    }

    emptyHint.style.display = 'none';
    container.innerHTML = students.map(function(s) {
      return '<div class="student-item' + (batchMode ? ' batch-mode' : '') + '">' +
        '<input type="checkbox" class="batch-check" value="' + s.id + '" style="display:' + (batchMode ? 'block' : 'none') + '">' +
        '<div class="student-info">' +
          '<span class="student-name">' + escapeHtml(s.name) + '</span>' +
          '<span class="student-grade">' + escapeHtml(s.grade) + '</span>' +
        '</div>' +
        '<button class="btn-delete" data-action="delete-student" data-id="' + s.id + '" style="display:' + (batchMode ? 'none' : '') + '">删除</button>' +
      '</div>';
    }).join('');
  }

  function handleAdd() {
    var nameInput = document.getElementById('roster-name');
    var classInput = document.getElementById('roster-class');
    var name = nameInput.value.trim();
    var grade = classInput.value.trim();

    if (!name) { showToast('请输入学生姓名'); return; }
    if (!grade) { showToast('请输入年级'); return; }

    Storage.addStudent(name, grade);
    nameInput.value = '';
    classInput.value = '';
    render();
    showToast('添加成功');
  }

  function handleDelete(id) {
    if (!confirm('确定要删除该学生吗？')) return;
    Storage.deleteStudent(id);
    render();
    showToast('已删除');
  }

  function handleExcelImport(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      var rows, count = 0;

      // Step 1: Parse Excel only
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      } catch (err) {
        showToast('导入失败，请检查文件格式');
        return;
      }

      if (!rows || rows.length <= 1) {
        showToast('文件中没有找到学生数据');
        return;
      }

      // Step 2: Add students
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (!row) continue;
        var name = String(row[0] || '').trim();
        var grade = String(row[1] || '').trim();
        if (name && grade) {
          Storage.addStudent(name, grade);
          count++;
        }
      }

      if (count === 0) {
        showToast('未找到有效数据，请确保第一列为姓名、第二列为年级');
        return;
      }

      // Step 3: Refresh UI
      render();
      showToast('成功导入 ' + count + ' 名学生');
    };
    reader.readAsArrayBuffer(file);
  }

  function toggleBatchMode() {
    batchMode = !batchMode;
    var btn = document.getElementById('roster-batch-btn');
    var delBtn = document.getElementById('roster-batch-delete');
    if (btn) btn.textContent = batchMode ? '完成' : '批量管理';
    if (delBtn) delBtn.style.display = batchMode ? '' : 'none';
    render();
  }

  function batchDeleteStudents() {
    var checks = document.querySelectorAll('.batch-check:checked');
    if (checks.length === 0) { showToast('请先勾选要删除的学生'); return; }
    if (!confirm('确定删除选中的 ' + checks.length + ' 名学生吗？')) return;
    for (var i = 0; i < checks.length; i++) {
      Storage.deleteStudent(Number(checks[i].value));
    }
    batchMode = false;
    var btn = document.getElementById('roster-batch-btn');
    if (btn) btn.textContent = '批量管理';
    var delBtn = document.getElementById('roster-batch-delete');
    if (delBtn) delBtn.style.display = 'none';
    render();
    window.CF.Feedback.refreshStudentList();
    showToast('已删除 ' + checks.length + ' 名学生');
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
  window.CF.Roster = {
    render: render,
    handleAdd: handleAdd,
    handleDelete: handleDelete,
    handleExcelImport: handleExcelImport,
    toggleBatchMode: toggleBatchMode,
    batchDeleteStudents: batchDeleteStudents
  };
})();

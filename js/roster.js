(function() {
  'use strict';

  var Storage = window.CF.Storage;

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
      return '<div class="student-item">' +
        '<div class="student-info">' +
          '<span class="student-name">' + escapeHtml(s.name) + '</span>' +
          '<span class="student-class">' + escapeHtml(s.className) + '</span>' +
        '</div>' +
        '<button class="btn-delete" data-action="delete-student" data-id="' + s.id + '">删除</button>' +
      '</div>';
    }).join('');
  }

  function handleAdd() {
    var nameInput = document.getElementById('roster-name');
    var classInput = document.getElementById('roster-class');
    var name = nameInput.value.trim();
    var className = classInput.value.trim();

    if (!name) { showToast('请输入学生姓名'); return; }
    if (!className) { showToast('请输入班级'); return; }

    Storage.addStudent(name, className);
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
        var className = String(row[1] || '').trim();
        if (name && className) {
          Storage.addStudent(name, className);
          count++;
        }
      }

      if (count === 0) {
        showToast('未找到有效数据，请确保第一列为姓名、第二列为班级');
        return;
      }

      // Step 3: Refresh UI
      render();
      showToast('成功导入 ' + count + ' 名学生');
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
  window.CF.Roster = {
    render: render,
    handleAdd: handleAdd,
    handleDelete: handleDelete,
    handleExcelImport: handleExcelImport
  };
})();

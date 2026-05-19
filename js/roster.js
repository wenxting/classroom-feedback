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
    window.CF.Feedback.refreshStudentList();
    showToast('添加成功');
  }

  function handleDelete(id) {
    if (!confirm('确定要删除该学生吗？')) return;
    Storage.deleteStudent(id);
    render();
    window.CF.Feedback.refreshStudentList();
    showToast('已删除');
  }

  function handleExcelImport(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        var count = 0;
        for (var i = 1; i < rows.length; i++) {
          var name = String(rows[i][0] || '').trim();
          var className = String(rows[i][1] || '').trim();
          if (name && className) {
            Storage.addStudent(name, className);
            count++;
          }
        }

        render();
        window.CF.Feedback.refreshStudentList();
        showToast('成功导入 ' + count + ' 名学生');
      } catch (err) {
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
  window.CF.Roster = {
    render: render,
    handleAdd: handleAdd,
    handleDelete: handleDelete,
    handleExcelImport: handleExcelImport
  };
})();

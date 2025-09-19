
// متغير عام لتخزين المهام
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
let currentEditId = null;
let deleteTaskId = null;
let currentTab = 'task';
let selectedFiles = [];
let tasksChart = null;

// عناصر DOM
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTypeSelect = document.getElementById('task-type');
const caseNumberInput = document.getElementById('case-number');
const reasonTextarea = document.getElementById('reason');
const taskStatusSelect = document.getElementById('task-status');
const prioritySelect = document.getElementById('priority');
const clientNameInput = document.getElementById('client-name');
const deadlineInput = document.getElementById('deadline');
const notesTextarea = document.getElementById('notes');
const attachmentsInput = document.getElementById('attachments');
const fileList = document.getElementById('file-list');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit');
const tasksContainer = document.getElementById('tasks-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const notificationContainer = document.getElementById('notification-container');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const toggleThemeBtn = document.getElementById('toggle-theme');
const exportDataBtn = document.getElementById('export-data');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const statAll = document.getElementById('stat-all');
const statExecuting = document.getElementById('stat-executing');
const statCompleted = document.getElementById('stat-completed');
const statPending = document.getElementById('stat-pending');
const viewToggleBtn = document.getElementById('view-toggle');

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    // تطبيق الوضع المحفوظ
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // تطبيق وضع العرض المحفوظ
    const savedViewMode = localStorage.getItem('view-mode') || 'grid';
    if (savedViewMode === 'list') {
        tasksContainer.classList.remove('grid-view');
        tasksContainer.classList.add('list-view');
        const icon = viewToggleBtn.querySelector('i');
        icon.className = 'fas fa-th-list';
    }

    // تهيئة المهام
    renderTasks(tasks);
    updateStatistics();
    initChart();

    // إضافة مستمعي الأحداث
    taskForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });

    confirmDeleteBtn.addEventListener('click', confirmDelete);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    toggleThemeBtn.addEventListener('click', toggleTheme);
    exportDataBtn.addEventListener('click', exportData);

    // مستمعي أحداث علامات التبويب
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });

    // مستمعي أحداث الملفات
    attachmentsInput.addEventListener('change', handleFileSelect);

    // مستمعي أحداث السحب والإفلات
    const fileUploadLabel = document.querySelector('.file-upload-label');

    fileUploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadLabel.classList.add('drag-over');
    });

    fileUploadLabel.addEventListener('dragleave', () => {
        fileUploadLabel.classList.remove('drag-over');
    });

    fileUploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadLabel.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // مستمع حدث تبديل العرض
    viewToggleBtn.addEventListener('click', toggleView);

    // مستمع حدث لحقل رقم الحالة للتحقق من المدخلات
    caseNumberInput.addEventListener('input', function(e) {
        let value = this.value.toUpperCase();

        // التأكد من أن الحقل يبدأ بحرف D متبوعًا بحرف A ثم الأرقام
        if (value.length > 0 && value[0] !== 'D') {
            value = 'D' + value.replace(/[^A0-9]/g, '');
        }

        // التأكد من وجود حرف A في الموضع الثاني إذا كان هناك أكثر من حرف
        if (value.length > 1) {
            if (value[1] !== 'A') {
                value = value[0] + 'A' + value.substring(2).replace(/[^0-9]/g, '');
            }
        }

        // منع تكرار حرفي D و A
        if (value.length > 2) {
            value = value.substring(0, 2) + value.substring(2).replace(/[^0-9]/g, '');
        }

        this.value = value;
    });

    // إغلاق نافذة الحوار عند النقر خارجها
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
});

// تبديل الوضع (النور/الظلام)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // تحديث الرسم البياني إذا كان موجودًا
    if (tasksChart) {
        updateChart();
    }
}

// تحديث أيقونة الوضع
function updateThemeIcon(theme) {
    const icon = toggleThemeBtn.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// تبديل علامات التبويب
function switchTab(tabId) {
    currentTab = tabId;

    // تحديث أزرار علامات التبويب
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // تحديث محتوى علامات التبويب
    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// معالجة إرسال النموذج
function handleFormSubmit(e) {
    e.preventDefault();

    const taskData = {
        id: currentEditId || taskIdCounter++,
        type: taskTypeSelect.value,
        caseNumber: caseNumberInput.value,
        reason: reasonTextarea.value,
        status: taskStatusSelect.value,
        priority: prioritySelect.value,
        clientName: clientNameInput.value,
        deadline: deadlineInput.value,
        notes: notesTextarea.value,
        attachments: selectedFiles.map(file => file.name),
        createdAt: currentEditId ? 
            tasks.find(t => t.id === currentEditId).createdAt : 
            new Date().toISOString()
    };

    if (currentEditId) {
        // تحديث المهمة الموجودة
        const index = tasks.findIndex(t => t.id === currentEditId);
        tasks[index] = taskData;
        showNotification('تم تحديث المهمة بنجاح', 'success');
        resetForm();
    } else {
        // إضافة مهمة جديدة
        tasks.push(taskData);
        showNotification('تمت إضافة المهمة بنجاح', 'success');
        taskForm.reset();
        selectedFiles = [];
        updateFileList();
    }

    saveTasksToLocalStorage();
    renderTasks(tasks);
    updateStatistics();
    updateChart();
}

// تعديل المهمة
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    currentEditId = id;
    taskIdInput.value = task.id;
    taskTypeSelect.value = task.type;
    caseNumberInput.value = task.caseNumber;
    reasonTextarea.value = task.reason;
    taskStatusSelect.value = task.status;
    prioritySelect.value = task.priority || 'عالية';
    clientNameInput.value = task.clientName || '';
    deadlineInput.value = task.deadline || '';
    notesTextarea.value = task.notes || '';

    // تحميل الملفات المرفقة
    selectedFiles = task.attachments ? 
        task.attachments.map(name => ({ name, size: 0 })) : [];
    updateFileList();

    formTitle.textContent = 'تعديل المهمة';
    cancelEditBtn.style.display = 'inline-flex';

    // التمرير إلى أعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // التبديل إلى علامة التبويب الأولى
    switchTab('task');
}

// إلغاء التعديل
function cancelEdit() {
    resetForm();
    taskForm.reset();
    selectedFiles = [];
    updateFileList();
}

// إعادة تعيين النموذج
function resetForm() {
    currentEditId = null;
    formTitle.textContent = 'إضافة مهمة جديدة';
    cancelEditBtn.style.display = 'none';
}

// حذف المهمة
function deleteTask(id) {
    deleteTaskId = id;
    deleteModal.classList.add('active');
}

// تأكيد الحذف
function confirmDelete() {
    if (deleteTaskId) {
        tasks = tasks.filter(t => t.id !== deleteTaskId);
        saveTasksToLocalStorage();
        renderTasks(tasks);
        updateStatistics();
        updateChart();
        showNotification('تم حذف المهمة بنجاح', 'success');
        closeDeleteModal();
    }
}

// إغلاق نافذة حوار الحذف
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    deleteTaskId = null;
}

// البحث في المهام
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        renderTasks(tasks);
        return;
    }

    const filteredTasks = tasks.filter(task => 
        task.type.toLowerCase().includes(searchTerm) ||
        task.caseNumber.toLowerCase().includes(searchTerm) ||
        (task.reason && task.reason.toLowerCase().includes(searchTerm)) ||
        task.status.toLowerCase().includes(searchTerm) ||
        (task.clientName && task.clientName.toLowerCase().includes(searchTerm))
    );

    renderTasks(filteredTasks);
}

// فلترة المهام حسب الحالة
function handleFilter(e) {
    const filterValue = e.target.dataset.filter;

    // تحديث زر الفلترة النشط
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    if (filterValue === 'all') {
        renderTasks(tasks);
    } else {
        const filteredTasks = tasks.filter(task => task.status === filterValue);
        renderTasks(filteredTasks);
    }
}

// عرض المهام
function renderTasks(tasksToRender) {
    if (tasksToRender.length === 0) {
        tasksContainer.innerHTML = '<p class="no-tasks">لا توجد مهام لعرضها</p>';
        return;
    }

    tasksContainer.innerHTML = tasksToRender.map(task => {
        const deadlineText = task.deadline ? 
            `<div class="task-detail">
                <span class="task-detail-label">تاريخ الاستحقاق:</span>
                <span class="task-detail-value">${formatDate(task.deadline)}</span>
            </div>` : '';

        const priorityText = task.priority ? 
            `<div class="task-priority priority-${task.priority}">
                <i class="fas fa-flag"></i> ${task.priority}
            </div>` : '';

        const clientText = task.clientName ? 
            `<div class="task-detail">
                <span class="task-detail-label">العميل:</span>
                <span class="task-detail-value">${task.clientName}</span>
            </div>` : '';

        const attachmentsText = task.attachments && task.attachments.length > 0 ? 
            `<div class="task-detail">
                <span class="task-detail-label">المرفقات:</span>
                <span class="task-detail-value">${task.attachments.length} ملف</span>
            </div>` : '';

        return `
            <div class="task-card status-${task.status.replace(' ', '-')}">
                <div class="task-header">
                    <div class="task-type">${task.type}</div>
                    <div class="task-status status-${task.status.replace(' ', '-')}">${task.status}</div>
                </div>
                <div class="task-details">
                    <div class="task-detail">
                        <span class="task-detail-label">رقم الحالة:</span>
                        <span class="task-detail-value">${task.caseNumber}</span>
                    </div>
                    <div class="task-detail">
                        <span class="task-detail-label">سبب الإضافة:</span>
                        <span class="task-detail-value">${task.reason}</span>
                    </div>
                    ${clientText}
                    ${deadlineText}
                    ${attachmentsText}
                </div>
                ${priorityText}
                <div class="task-actions">
                    <button class="btn btn-primary" onclick="editTask(${task.id})">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-success" onclick="markAsCompleted(${task.id})">
                        <i class="fas fa-check"></i> ${task.status === 'مكتملة' ? 'مكتملة' : 'اكتمل'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteTask(${task.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
                <div class="task-date">
                    <i class="far fa-clock"></i> ${formatDate(task.createdAt)}
                </div>
            </div>
        `;
    }).join('');
}

// تحديد المهمة كمكتملة
function markAsCompleted(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.status = 'مكتملة';
    saveTasksToLocalStorage();
    renderTasks(tasks);
    updateStatistics();
    updateChart();
    showNotification('تم تحديث حالة المهمة إلى مكتملة', 'success');
}

// حفظ المهام في التخزين المحلي
function saveTasksToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// تحديث الإحصائيات
function updateStatistics() {
    const allTasks = tasks.length;
    const executingTasks = tasks.filter(t => t.status === 'قيد التنفيذ').length;
    const completedTasks = tasks.filter(t => t.status === 'مكتملة').length;
    const pendingTasks = tasks.filter(t => t.status === 'معلقة').length;

    // تحديث العناصر
    statAll.textContent = allTasks;
    statExecuting.textContent = executingTasks;
    statCompleted.textContent = completedTasks;
    statPending.textContent = pendingTasks;
}

// تهيئة الرسم البياني
function initChart() {
    const ctx = document.getElementById('tasks-chart').getContext('2d');

    // تحقق إذا كان هناك رسم بياني موجود
    if (tasksChart) {
        tasksChart.destroy();
    }

    // بيانات الرسم البياني
    const executingTasks = tasks.filter(t => t.status === 'قيد التنفيذ').length;
    const completedTasks = tasks.filter(t => t.status === 'مكتملة').length;
    const pendingTasks = tasks.filter(t => t.status === 'معلقة').length;

    // إنشاء الرسم البياني
    tasksChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['قيد التنفيذ', 'مكتملة', 'معلقة'],
            datasets: [{
                data: [executingTasks, completedTasks, pendingTasks],
                backgroundColor: [
                    '#f39c12',
                    '#2ecc71',
                    '#e74c3c'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Tajawal',
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'توزيع المهام حسب الحالة',
                    font: {
                        family: 'Tajawal',
                        size: 16
                    }
                }
            }
        }
    });
}

// تحديث الرسم البياني
function updateChart() {
    if (!tasksChart) return;

    // بيانات الرسم البياني
    const executingTasks = tasks.filter(t => t.status === 'قيد التنفيذ').length;
    const completedTasks = tasks.filter(t => t.status === 'مكتملة').length;
    const pendingTasks = tasks.filter(t => t.status === 'معلقة').length;

    // تحديث البيانات
    tasksChart.data.datasets[0].data = [executingTasks, completedTasks, pendingTasks];
    tasksChart.update();
}

// معالجة اختيار الملفات
function handleFileSelect(e) {
    handleFiles(e.target.files);
}

// معالجة الملفات
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        selectedFiles.push({
            name: file.name,
            size: file.size,
            file: file
        });
    }
    updateFileList();
}

// تحديث قائمة الملفات
function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div class="file-name">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <span>(${formatFileSize(file.size)})</span>
            </div>
            <div class="file-remove" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `).join('');
}

// إزالة ملف من القائمة
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

// تنسيح حجم الملف
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// تصدير البيانات
function exportData() {
    // إنشاء ورقة عمل جديدة
    const wb = XLSX.utils.book_new();

    // إنشاء مصفوفة للبيانات
    const wsData = [];

    // إضافة رأس الجدول
    wsData.push(['رقم الحالة', 'نوع المهمة', 'تاريخ الإضافة', 'تاريخ الإكمال']);

    // إضافة بيانات المهام
    tasks.forEach(task => {
        // تحديد تاريخ الإكمال (إذا كانت المهمة مكتملة)
        const completionDate = task.status === 'مكتملة' ? formatDate(task.createdAt) : 'غير مكتملة';

        // إضافة صف البيانات
        wsData.push([
            task.caseNumber,
            task.type,
            formatDate(task.createdAt),
            completionDate
        ]);
    });

    // إنشاء ورقة العمل من البيانات
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // إضافة ورقة العمل إلى المصنف
    XLSX.utils.book_append_sheet(wb, ws, 'المهام');

    // ضبط عرض الأعمدة
    const colWidths = [
        { wch: 15 }, // رقم الحالة
        { wch: 20 }, // نوع المهمة
        { wch: 20 }, // تاريخ الإضافة
        { wch: 20 }  // تاريخ الإكمال
    ];
    ws['!cols'] = colWidths;

    // إنشاء اسم الملف
    const fileName = `المهام_${new Date().toISOString().slice(0,10)}.xlsx`;

    // حفظ الملف
    XLSX.writeFile(wb, fileName);

    showNotification('تم تصدير البيانات إلى ملف Excel بنجاح', 'success');
}

// استيراد البيانات
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedTasks = JSON.parse(event.target.result);
            if (Array.isArray(importedTasks)) {
                tasks = importedTasks;
                taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
                saveTasksToLocalStorage();
                renderTasks(tasks);
                updateStatistics();
                updateChart();
                showNotification('تم استيراد البيانات بنجاح', 'success');
            } else {
                showNotification('خطأ: ملف غير صالح', 'error');
            }
        } catch (error) {
            showNotification('خطأ في قراءة الملف', 'error');
        }
    };
    reader.readAsText(file);

    // إعادة تعيين قيمة الinput لتمكين استيراد نفس الملف مرة أخرى
    e.target.value = '';
}

// عرض رسالة إشعار
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    notificationContainer.appendChild(notification);

    // إزالة الرسالة بعد 3 ثوانٍ
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// تنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// تبديل عرض المهام بين الشبكة والقائمة
function toggleView() {
    const icon = viewToggleBtn.querySelector('i');

    if (tasksContainer.classList.contains('grid-view')) {
        // التبديل إلى عرض القائمة
        tasksContainer.classList.remove('grid-view');
        tasksContainer.classList.add('list-view');
        icon.className = 'fas fa-th-list';
        localStorage.setItem('view-mode', 'list');
    } else {
        // التبديل إلى عرض الشبكة
        tasksContainer.classList.remove('list-view');
        tasksContainer.classList.add('grid-view');
        icon.className = 'fas fa-th';
        localStorage.setItem('view-mode', 'grid');
    }
}

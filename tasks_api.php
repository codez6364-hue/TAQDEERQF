<?php
// تضمين ملف الاتصال بقاعدة البيانات
require_once 'database_connection.php';

// التحقق من طلب الـ API
header('Content-Type: application/json');

// التحقق من طريقة الطلب
$method = $_SERVER['REQUEST_METHOD'];

// معالجة الطلبات المختلفة
switch ($method) {
    case 'GET':
        // الحصول على المهام
        get_tasks();
        break;

    case 'POST':
        // إنشاء مهمة جديدة
        create_task();
        break;

    case 'PUT':
        // تحديث مهمة موجودة
        update_task();
        break;

    case 'DELETE':
        // حذف مهمة
        delete_task();
        break;

    default:
        // طريقة غير مدعومة
        http_response_code(405);
        echo json_encode(['message' => 'طريقة غير مدعومة']);
        break;
}

// دالة للحصول على المهام
function get_tasks() {
    global $conn;

    // الحصول على معايير التصفية من الطلب
    $status = isset($_GET['status']) ? clean_input($_GET['status']) : 'all';
    $priority = isset($_GET['priority']) ? clean_input($_GET['priority']) : 'all';
    $search = isset($_GET['search']) ? clean_input($_GET['search']) : '';
    $sort = isset($_GET['sort']) ? clean_input($_GET['sort']) : 'newest';

    // بناء استعلام SQL
    $sql = "SELECT * FROM tasks WHERE 1=1";

    // إضافة شروط التصفية
    if ($status !== 'all') {
        $sql .= " AND status = '$status'";
    }

    if ($priority !== 'all') {
        $sql .= " AND priority = '$priority'";
    }

    if (!empty($search)) {
        $sql .= " AND (case_number LIKE '%$search%' OR reason LIKE '%$search%' OR client_name LIKE '%$search%' OR notes LIKE '%$search%')";
    }

    // إضافة الترتيب
    switch ($sort) {
        case 'oldest':
            $sql .= " ORDER BY created_at ASC";
            break;
        case 'priority':
            $sql .= " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END";
            break;
        case 'newest':
        default:
            $sql .= " ORDER BY created_at DESC";
            break;
    }

    $result = $conn->query($sql);

    $tasks = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
    }

    echo json_encode($tasks);
}

// دالة لإنشاء مهمة جديدة
function create_task() {
    global $conn;

    // الحصول على البيانات من الطلب
    $data = json_decode(file_get_contents('php://input'), true);

    // التحقق من البيانات المطلوبة
    if (!isset($data['type']) || !isset($data['case_number']) || !isset($data['reason']) || 
        !isset($data['status']) || !isset($data['priority']) || !isset($data['client_name'])) {
        http_response_code(400);
        echo json_encode(['message' => 'بيانات غير مكتملة']);
        return;
    }

    // تنظيف البيانات
    $type = clean_input($data['type']);
    $case_number = clean_input($data['case_number']);
    $reason = clean_input($data['reason']);
    $status = clean_input($data['status']);
    $priority = clean_input($data['priority']);
    $client_name = clean_input($data['client_name']);
    $deadline = isset($data['deadline']) ? clean_input($data['deadline']) : null;
    $notes = isset($data['notes']) ? clean_input($data['notes']) : '';
    $attachments = isset($data['attachments']) ? json_encode($data['attachments']) : json_encode([]);

    // إعداد الاستعلام
    $sql = "INSERT INTO tasks (type, case_number, reason, status, priority, client_name, deadline, notes, attachments) 
            VALUES ('$type', '$case_number', '$reason', '$status', '$priority', '$client_name', " . 
            ($deadline ? "'$deadline'" : "NULL") . ", '$notes', '$attachments')";

    // تنفيذ الاستعلام
    if ($conn->query($sql) === TRUE) {
        $task_id = $conn->insert_id;
        echo json_encode(['message' => 'تم إنشاء المهمة بنجاح', 'task_id' => $task_id]);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'خطأ في إنشاء المهمة: ' . $conn->error]);
    }
}

// دالة لتحديث مهمة موجودة
function update_task() {
    global $conn;

    // الحصول على معرف المهمة من الطلب
    $task_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($task_id <= 0) {
        http_response_code(400);
        echo json_encode(['message' => 'معرف المهمة غير صالح']);
        return;
    }

    // الحصول على البيانات من الطلب
    $data = json_decode(file_get_contents('php://input'), true);

    // التحقق من وجود المهمة
    $check_sql = "SELECT * FROM tasks WHERE id = $task_id";
    $result = $conn->query($check_sql);

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['message' => 'المهمة غير موجودة']);
        return;
    }

    // بناء استعلام التحديث
    $update_fields = [];

    if (isset($data['type'])) {
        $update_fields[] = "type = '" . clean_input($data['type']) . "'";
    }

    if (isset($data['case_number'])) {
        $update_fields[] = "case_number = '" . clean_input($data['case_number']) . "'";
    }

    if (isset($data['reason'])) {
        $update_fields[] = "reason = '" . clean_input($data['reason']) . "'";
    }

    if (isset($data['status'])) {
        $update_fields[] = "status = '" . clean_input($data['status']) . "'";
    }

    if (isset($data['priority'])) {
        $update_fields[] = "priority = '" . clean_input($data['priority']) . "'";
    }

    if (isset($data['client_name'])) {
        $update_fields[] = "client_name = '" . clean_input($data['client_name']) . "'";
    }

    if (isset($data['deadline'])) {
        $update_fields[] = "deadline = " . (clean_input($data['deadline']) ? "'" . clean_input($data['deadline']) . "'" : "NULL");
    }

    if (isset($data['notes'])) {
        $update_fields[] = "notes = '" . clean_input($data['notes']) . "'";
    }

    if (isset($data['attachments'])) {
        $update_fields[] = "attachments = '" . json_encode($data['attachments']) . "'";
    }

    if (empty($update_fields)) {
        http_response_code(400);
        echo json_encode(['message' => 'لا توجد بيانات لتحديثها']);
        return;
    }

    // إعداد الاستعلام
    $sql = "UPDATE tasks SET " . implode(', ', $update_fields) . " WHERE id = $task_id";

    // تنفيذ الاستعلام
    if ($conn->query($sql) === TRUE) {
        echo json_encode(['message' => 'تم تحديث المهمة بنجاح']);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'خطأ في تحديث المهمة: ' . $conn->error]);
    }
}

// دالة لحذف مهمة
function delete_task() {
    global $conn;

    // الحصول على معرف المهمة من الطلب
    $task_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($task_id <= 0) {
        http_response_code(400);
        echo json_encode(['message' => 'معرف المهمة غير صالح']);
        return;
    }

    // التحقق من وجود المهمة
    $check_sql = "SELECT * FROM tasks WHERE id = $task_id";
    $result = $conn->query($check_sql);

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['message' => 'المهمة غير موجودة']);
        return;
    }

    // إعداد الاستعلام
    $sql = "DELETE FROM tasks WHERE id = $task_id";

    // تنفيذ الاستعلام
    if ($conn->query($sql) === TRUE) {
        echo json_encode(['message' => 'تم حذف المهمة بنجاح']);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'خطأ في حذف المهمة: ' . $conn->error]);
    }
}
?>
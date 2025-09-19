<?php
// إعدادات الاتصال بقاعدة البيانات
$host = "localhost";
$username = "root";
$password = "";
$dbname = "tasks_management";

// إنشاء الاتصال
$conn = new mysqli($host, $username, $password, $dbname);

// التحقق من الاتصال
if ($conn->connect_error) {
    die("فشل الاتصال: " . $conn->connect_error);
}

// تعيين مجموعة الأحرف
$conn->set_charset("utf8mb4");

// دالة لتنظيف المدخلات
function clean_input($data) {
    global $conn;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $conn->real_escape_string($data);
}

// دالة للتحقق من تسجيل دخول المستخدم
function is_user_logged_in() {
    return isset($_SESSION['user_id']);
}

// دالة للحصول على معلومات المستخدم الحالي
function get_current_user() {
    if (!is_user_logged_in()) {
        return null;
    }

    global $conn;
    $user_id = $_SESSION['user_id'];

    $sql = "SELECT * FROM users WHERE id = $user_id";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }

    return null;
}

// بدء الجلسة
if (!isset($_SESSION)) {
    session_start();
}
?>
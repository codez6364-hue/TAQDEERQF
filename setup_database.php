<?php
// إعدادات الاتصال بقاعدة البيانات
$host = "localhost";
$username = "root";
$password = "";
$dbname = "tasks_management";

// إنشاء الاتصال
$conn = new mysqli($host, $username, $password);

// التحقق من الاتصال
if ($conn->connect_error) {
    die("فشل الاتصال: " . $conn->connect_error);
}

// إنشاء قاعدة البيانات إذا لم تكن موجودة
$sql = "CREATE DATABASE IF NOT EXISTS $dbname";
if ($conn->query($sql) === TRUE) {
    echo "تم إنشاء قاعدة البيانات بنجاح أو أنها موجودة بالفعل<br>";
} else {
    echo "خطأ في إنشاء قاعدة البيانات: " . $conn->error . "<br>";
}

// اختيار قاعدة البيانات
$conn->select_db($dbname);

// إنشاء جدول المهام
$sql = "CREATE TABLE IF NOT EXISTS tasks (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    case_number VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    deadline DATE,
    notes TEXT,
    attachments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "تم إنشاء جدول المهام بنجاح أو أنه موجود بالفعل<br>";
} else {
    echo "خطأ في إنشاء جدول المهام: " . $conn->error . "<br>";
}

// إنشاء جدول المستخدمين
$sql = "CREATE TABLE IF NOT EXISTS users (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "تم إنشاء جدول المستخدمين بنجاح أو أنه موجود بالفعل<br>";
} else {
    echo "خطأ في إنشاء جدول المستخدمين: " . $conn->error . "<br>";
}

// إنشاء جدول الملاحظات
$sql = "CREATE TABLE IF NOT EXISTS comments (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    task_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

if ($conn->query($sql) === TRUE) {
    echo "تم إنشاء جدول الملاحظات بنجاح أو أنه موجود بالفعل<br>";
} else {
    echo "خطأ في إنشاء جدول الملاحظات: " . $conn->error . "<br>";
}

// إغلاق الاتصال
$conn->close();

echo "تم تهيئة قاعدة البيانات بنجاح!";
?>
<?php
// تضمين ملف الاتصال بقاعدة البيانات
require_once 'database_connection.php';

// التحقق من طلب الـ API
header('Content-Type: application/json');

// التحقق من طريقة الطلب
$method = $_SERVER['REQUEST_METHOD'];

// معالجة الطلبات المختلفة
switch ($method) {
    case 'POST':
        // تسجيل مستخدم جديد أو تسجيل الدخول
        $action = isset($_GET['action']) ? clean_input($_GET['action']) : '';

        if ($action === 'register') {
            register_user();
        } elseif ($action === 'login') {
            login_user();
        } elseif ($action === 'logout') {
            logout_user();
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'إجراء غير صالح']);
        }
        break;

    case 'GET':
        // الحصول على معلومات المستخدم
        get_user_info();
        break;

    case 'PUT':
        // تحديث معلومات المستخدم
        update_user();
        break;

    default:
        // طريقة غير مدعومة
        http_response_code(405);
        echo json_encode(['message' => 'طريقة غير مدعومة']);
        break;
}

// دالة لتسجيل مستخدم جديد
function register_user() {
    global $conn;

    // الحصول على البيانات من الطلب
    $data = json_decode(file_get_contents('php://input'), true);

    // التحقق من البيانات المطلوبة
    if (!isset($data['username']) || !isset($data['password']) || !isset($data['full_name']) || !isset($data['email'])) {
        http_response_code(400);
        echo json_encode(['message' => 'بيانات غير مكتملة']);
        return;
    }

    // تنظيف البيانات
    $username = clean_input($data['username']);
    $password = password_hash(clean_input($data['password']), PASSWORD_DEFAULT);
    $full_name = clean_input($data['full_name']);
    $email = clean_input($data['email']);
    $role = isset($data['role']) ? clean_input($data['role']) : 'user';

    // التحقق من عدم وجود مستخدم بنفس اسم المستخدم
    $check_sql = "SELECT * FROM users WHERE username = '$username'";
    $result = $conn->query($check_sql);

    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['message' => 'اسم المستخدم موجود بالفعل']);
        return;
    }

    // إعداد الاستعلام
    $sql = "INSERT INTO users (username, password, full_name, email, role) 
            VALUES ('$username', '$password', '$full_name', '$email', '$role')";

    // تنفيذ الاستعلام
    if ($conn->query($sql) === TRUE) {
        $user_id = $conn->insert_id;
        echo json_encode(['message' => 'تم إنشاء المستخدم بنجاح', 'user_id' => $user_id]);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'خطأ في إنشاء المستخدم: ' . $conn->error]);
    }
}

// دالة لتسجيل دخول المستخدم
function login_user() {
    global $conn;

    // الحصول على البيانات من الطلب
    $data = json_decode(file_get_contents('php://input'), true);

    // التحقق من البيانات المطلوبة
    if (!isset($data['username']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['message' => 'بيانات غير مكتملة']);
        return;
    }

    // تنظيف البيانات
    $username = clean_input($data['username']);
    $password = clean_input($data['password']);

    // إعداد الاستعلام
    $sql = "SELECT * FROM users WHERE username = '$username'";
    $result = $conn->query($sql);

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['message' => 'اسم المستخدم أو كلمة المرور غير صحيحة']);
        return;
    }

    $user = $result->fetch_assoc();

    // التحقق من كلمة المرور
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['message' => 'اسم المستخدم أو كلمة المرور غير صحيحة']);
        return;
    }

    // حفظ معلومات المستخدم في الجلسة
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role'] = $user['role'];

    // إزالة كلمة المرور من النتيجة
    unset($user['password']);

    echo json_encode(['message' => 'تم تسجيل الدخول بنجاح', 'user' => $user]);
}

// دالة لتسجيل خروج المستخدم
function logout_user() {
    // تدمير الجلسة
    session_destroy();

    echo json_encode(['message' => 'تم تسجيل الخروج بنجاح']);
}

// دالة للحصول على معلومات المستخدم الحالي
function get_user_info() {
    // التحقق من تسجيل دخول المستخدم
    if (!is_user_logged_in()) {
        http_response_code(401);
        echo json_encode(['message' => 'غير مصرح لك']);
        return;
    }

    $user = get_current_user();

    // إزالة كلمة المرور من النتيجة
    if (isset($user['password'])) {
        unset($user['password']);
    }

    echo json_encode($user);
}

// دالة لتحديث معلومات المستخدم
function update_user() {
    global $conn;

    // التحقق من تسجيل دخول المستخدم
    if (!is_user_logged_in()) {
        http_response_code(401);
        echo json_encode(['message' => 'غير مصرح لك']);
        return;
    }

    // الحصول على معرف المستخدم من الجلسة
    $user_id = $_SESSION['user_id'];

    // الحصول على البيانات من الطلب
    $data = json_decode(file_get_contents('php://input'), true);

    // بناء استعلام التحديث
    $update_fields = [];

    if (isset($data['full_name'])) {
        $update_fields[] = "full_name = '" . clean_input($data['full_name']) . "'";
        $_SESSION['full_name'] = clean_input($data['full_name']);
    }

    if (isset($data['email'])) {
        $update_fields[] = "email = '" . clean_input($data['email']) . "'";
    }

    if (isset($data['password'])) {
        $password = password_hash(clean_input($data['password']), PASSWORD_DEFAULT);
        $update_fields[] = "password = '$password'";
    }

    if (empty($update_fields)) {
        http_response_code(400);
        echo json_encode(['message' => 'لا توجد بيانات لتحديثها']);
        return;
    }

    // إعداد الاستعلام
    $sql = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE id = $user_id";

    // تنفيذ الاستعلام
    if ($conn->query($sql) === TRUE) {
        echo json_encode(['message' => 'تم تحديث المعلومات بنجاح']);
    } else {
        http_response_code(500);
        echo json_encode(['message' => 'خطأ في تحديث المعلومات: ' . $conn->error]);
    }
}
?>
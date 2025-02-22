<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

function handleError($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error: [$errno] $errstr in $errfile on line $errline");
    echo json_encode(['error' => 'Internal server error']);
    exit();
}
set_error_handler('handleError');

function handleException($e) {
    error_log("PHP Exception: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}
set_exception_handler('handleException');

if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dbConfig = [
    'host' => 'localhost',
    'dbname' => 'watchmate',
    'user' => 'root',
    'pass' => 'root'
];

try {
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch(PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

function getClientIP() {
    return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        if (!$input) {
            throw new Exception('No input data received');
        }

        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON: ' . json_last_error_msg());
        }

        if (!isset($data['type'])) {
            throw new Exception('Type parameter is required');
        }

        if (!isset($data['netflix_id'])) {
            throw new Exception('Netflix ID is required');
        }

        switch ($data['type']) {
            case 'comment':
                if (!isset($data['username']) || !isset($data['comment'])) {
                    throw new Exception('Username and comment are required');
                }

                $stmt = $pdo->prepare("SELECT COUNT(*) FROM comments WHERE netflix_id = ? AND ip_address = ?");
                $stmt->execute([$data['netflix_id'], getClientIP()]);
                if ($stmt->fetchColumn() >= 5) {
                    echo json_encode(['error' => 'Comment limit reached']);
                    exit();
                }

                $stmt = $pdo->prepare("INSERT INTO comments (netflix_id, ip_address, username, comment) VALUES (?, ?, ?, ?)");
                $stmt->execute([
                    $data['netflix_id'],
                    getClientIP(),
                    $data['username'],
                    $data['comment']
                ]);
                break;

            case 'rating':
                if (!isset($data['rating'])) {
                    throw new Exception('Rating is required');
                }

                $stmt = $pdo->prepare("SELECT id FROM ratings WHERE netflix_id = ? AND ip_address = ?");
                $stmt->execute([$data['netflix_id'], getClientIP()]);
                if ($stmt->fetch()) {
                    echo json_encode(['error' => 'Already rated']);
                    exit();
                }

                $stmt = $pdo->prepare("INSERT INTO ratings (netflix_id, ip_address, rating) VALUES (?, ?, ?)");
                $stmt->execute([
                    $data['netflix_id'],
                    getClientIP(),
                    $data['rating']
                ]);
                break;

            default:
                throw new Exception('Invalid type parameter');
        }

        echo json_encode(['success' => true]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['netflix_id'])) {
            throw new Exception('Netflix ID parameter is required');
        }

        $stmt = $pdo->prepare("SELECT rating, COUNT(*) as count FROM ratings WHERE netflix_id = ? GROUP BY rating");
        $stmt->execute([$_GET['netflix_id']]);
        $ratings = [];
        while ($row = $stmt->fetch()) {
            $ratings[$row['rating']] = (int)$row['count'];
        }

        $stmt = $pdo->prepare("SELECT username, comment, created_at FROM comments WHERE netflix_id = ? ORDER BY created_at DESC");
        $stmt->execute([$_GET['netflix_id']]);
        $comments = $stmt->fetchAll();

        echo json_encode([
            'ratings' => $ratings,
            'comments' => $comments
        ]);
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}
?>

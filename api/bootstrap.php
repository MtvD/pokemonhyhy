<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('Dữ liệu gửi lên không hợp lệ', 400);
    }

    return $data;
}

function respond(array $data, int $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $status = 400)
{
    respond(['error' => $message], $status);
}

function int_value(array $data, string $key, int $default = 0): int
{
    return max(0, (int)($data[$key] ?? $default));
}

function signed_int_value(array $data, string $key, int $default = 0): int
{
    return (int)($data[$key] ?? $default);
}

function money_value(array $data, string $key, float $default = 0): float
{
    return max(0, (float)($data[$key] ?? $default));
}

function session_row(array $row, array $players = []): array
{
    return [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'date' => $row['session_date'],
        'buyinValue' => (float)$row['buyin_value'],
        'deletedAt' => $row['deleted_at'] ?? null,
        'createdAt' => $row['created_at'],
        'players' => $players,
    ];
}

function player_row(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'sessionId' => (int)$row['session_id'],
        'name' => $row['name'],
        'buyins' => (int)$row['buyins'],
        'finalAmount' => (float)$row['final_amount'],
        'createdAt' => $row['created_at'],
    ];
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'POST') {
        $data = input();
        $sessionId = int_value($data, 'sessionId');
        $name = trim((string)($data['name'] ?? ''));
        if (!$sessionId || $name === '') {
            fail('Thiếu phiên hoặc tên người chơi', 422);
        }

        $stmt = db()->prepare('INSERT INTO players (session_id, name, buyins, final_amount) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $sessionId,
            $name,
            signed_int_value($data, 'buyins', 1),
            money_value($data, 'finalAmount'),
        ]);

        $find = db()->prepare('SELECT * FROM players WHERE id = ?');
        $find->execute([(int)db()->lastInsertId()]);
        respond(['player' => player_row($find->fetch() ?: [])], 201);
    }

    if ($method === 'PUT') {
        $data = input();
        $id = int_value($data, 'id');
        $name = trim((string)($data['name'] ?? ''));
        if (!$id || $name === '') {
            fail('Thiếu mã hoặc tên người chơi', 422);
        }

        $stmt = db()->prepare('UPDATE players SET name = ?, buyins = ?, final_amount = ? WHERE id = ?');
        $stmt->execute([
            $name,
            signed_int_value($data, 'buyins'),
            money_value($data, 'finalAmount'),
            $id,
        ]);

        respond(['ok' => true]);
    }

    if ($method === 'DELETE') {
        $data = input();
        $id = int_value($data, 'id');
        if (!$id) {
            fail('Thiếu mã người chơi', 422);
        }

        $stmt = db()->prepare('DELETE FROM players WHERE id = ?');
        $stmt->execute([$id]);
        respond(['ok' => true]);
    }

    fail('Phương thức không hỗ trợ', 405);
} catch (Throwable $error) {
    fail('Lỗi server: ' . $error->getMessage(), 500);
}

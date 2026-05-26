<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $sessions = db()
            ->query('SELECT * FROM sessions ORDER BY created_at DESC, id DESC')
            ->fetchAll();

        $players = db()
            ->query('SELECT * FROM players ORDER BY created_at ASC, id ASC')
            ->fetchAll();

        $playersBySession = [];
        foreach ($players as $player) {
            $playersBySession[(int)$player['session_id']][] = player_row($player);
        }

        $payload = [];
        foreach ($sessions as $session) {
            $sessionId = (int)$session['id'];
            $payload[] = session_row($session, $playersBySession[$sessionId] ?? []);
        }

        respond(['sessions' => $payload]);
    }

    if ($method === 'POST') {
        $data = input();
        $name = trim((string)($data['name'] ?? 'Phiên mới'));
        $date = (string)($data['date'] ?? date('Y-m-d'));
        $buyinValue = money_value($data, 'buyinValue');

        if ($name === '') {
            $name = 'Phiên mới';
        }

        $stmt = db()->prepare('INSERT INTO sessions (name, session_date, buyin_value) VALUES (?, ?, ?)');
        $stmt->execute([$name, $date, $buyinValue]);

        $find = db()->prepare('SELECT * FROM sessions WHERE id = ?');
        $find->execute([(int)db()->lastInsertId()]);
        respond(['session' => session_row($find->fetch() ?: [], [])], 201);
    }

    if ($method === 'PUT') {
        $data = input();
        $id = int_value($data, 'id');
        if (!$id) {
            fail('Thiếu mã phiên', 422);
        }

        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            $name = 'Phiên không tên';
        }

        $stmt = db()->prepare('UPDATE sessions SET name = ?, session_date = ?, buyin_value = ? WHERE id = ?');
        $stmt->execute([
            $name,
            (string)($data['date'] ?? date('Y-m-d')),
            money_value($data, 'buyinValue'),
            $id,
        ]);

        respond(['ok' => true]);
    }

    if ($method === 'DELETE') {
        $data = input();
        $id = int_value($data, 'id');
        if (!$id) {
            fail('Thiếu mã phiên', 422);
        }

        $action = $data['action'] ?? '';

        if ($action === 'clearPlayers') {
            $stmt = db()->prepare('DELETE FROM players WHERE session_id = ?');
            $stmt->execute([$id]);
            respond(['ok' => true]);
        }

        if ($action === 'hide') {
            $stmt = db()->prepare('UPDATE sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
            $stmt->execute([$id]);
            respond(['ok' => true]);
        }

        if ($action === 'restore') {
            $stmt = db()->prepare('UPDATE sessions SET deleted_at = NULL WHERE id = ?');
            $stmt->execute([$id]);
            respond(['ok' => true]);
        }

        fail('Hành động không hợp lệ', 422);
    }

    fail('Phương thức không hỗ trợ', 405);
} catch (Throwable $error) {
    fail('Lỗi server: ' . $error->getMessage(), 500);
}

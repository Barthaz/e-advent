<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

function reportRange(array $query): array {
    $from = $query['from'] ?? '2026-12-01'; $to = $query['to'] ?? '2026-12-26';
    foreach ([$from, $to] as $date) {
        if (!is_string($date) || !preg_match('/^2026-12-(0[1-9]|1[0-9]|2[0-6])$/D', $date)) throw new InvalidArgumentException('Wybierz daty od 1 do 26 grudnia 2026.');
    }
    if ($from > $to) throw new InvalidArgumentException('Data początkowa nie może być późniejsza od końcowej.');
    return [$from, $to];
}

function reportData(string $from, string $to): array {
    global $config;
    $daily = []; $windows = array_fill(1, 24, 0);
    for ($day = (int)substr($from, -2); $day <= (int)substr($to, -2); $day++) {
        $date = sprintf('2026-12-%02d', $day);
        $daily[$date] = ['date' => $date, 'page_views' => 0, 'opens' => 0];
    }
    if ($config['stats_source'] === 'mock') {
        foreach ($daily as $date => &$row) {
            $day = (int)substr($date, -2);
            $row['page_views'] = 82 + $day * 5 + ($day % 4) * 17;
            for ($window = 1; $window <= min(24, $day); $window++) {
                $events = $window === $day ? 70 + $day * 4 : 2 + (($window + $day) % 9);
                $windows[$window] += $events; $row['opens'] += $events;
            }
        }
        unset($row);
    } elseif ($config['stats_source'] === 'mysql') {
        $stmt = db()->prepare('SELECT day_date, page_views, window_open_events FROM soa_daily_stats WHERE day_date BETWEEN ? AND ?');
        $stmt->execute([$from, $to]);
        foreach ($stmt as $row) $daily[$row['day_date']] = ['date' => $row['day_date'], 'page_views' => (int)$row['page_views'], 'opens' => (int)$row['window_open_events']];
        $stmt = db()->prepare('SELECT window_day, SUM(open_events) AS total FROM soa_window_stats WHERE day_date BETWEEN ? AND ? GROUP BY window_day');
        $stmt->execute([$from, $to]);
        foreach ($stmt as $row) $windows[(int)$row['window_day']] = (int)$row['total'];
    } else throw new RuntimeException('Unknown statistics source');
    return ['daily' => array_values($daily), 'windows' => $windows, 'views' => array_sum(array_column($daily, 'page_views')), 'opens' => array_sum($windows), 'mock' => $config['stats_source'] === 'mock'];
}

function recordEvent(string $event, ?int $day): void {
    $date = appNow()->format('Y-m-d');
    $pdo = db(); $pdo->beginTransaction();
    try {
        $views = $event === 'page_view' ? 1 : 0; $opens = $event === 'window_open' ? 1 : 0;
        $q = $pdo->prepare('INSERT INTO soa_daily_stats (day_date, page_views, window_open_events) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE page_views = page_views + ?, window_open_events = window_open_events + ?');
        $q->execute([$date, $views, $opens, $views, $opens]);
        if ($opens) {
            $q = $pdo->prepare('INSERT INTO soa_window_stats (day_date, window_day, open_events) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE open_events = open_events + 1');
            $q->execute([$date, $day]);
        }
        $pdo->commit();
    } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
}

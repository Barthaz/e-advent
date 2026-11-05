<?php
declare(strict_types=1);

function campaignState(DateTimeImmutable $now): array {
    $tz = new DateTimeZone('Europe/Warsaw');
    $now = $now->setTimezone($tz);
    $start = new DateTimeImmutable('2026-12-01 00:00:00', $tz);
    $end = new DateTimeImmutable('2026-12-27 00:00:00', $tz);
    $phase = $now < $start ? 'upcoming' : ($now >= $end ? 'ended' : 'active');
    $available = $phase === 'active' ? min(24, (int)$now->format('j')) : 0;
    $next = $now < $start ? $start : $now->modify('tomorrow')->setTime(0, 0);
    return ['phase' => $phase, 'available' => $available, 'serverDate' => $now->format('Y-m-d'),
        'refreshAfter' => max(1, $next->getTimestamp() - $now->getTimestamp())];
}

function availableTasks(array $tasks, array $state): array {
    if ($state['available'] === 0) return [];
    return array_intersect_key($tasks, array_flip(range(1, $state['available'])));
}

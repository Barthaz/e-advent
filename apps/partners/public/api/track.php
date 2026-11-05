<?php
require __DIR__ . '/../../private/bootstrap.php';
require __DIR__ . '/../../private/auth.php';
require __DIR__ . '/../../private/statistics.php';
requirePost(); $body = jsonBody();
if (!$config['analytics_enabled'] || !$config['analytics_approved'] || $config['stats_source'] !== 'mysql') jsonResponse(['error' => 'Pomiar jest wyłączony.'], 503);
startSession();
if (($_SESSION['analytics_consent'] ?? '') !== $config['consent_version'] || !verifyCsrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) jsonResponse(['error' => 'Brak zgody lub nieprawidłowy token.'], 403);
$state = campaignState(appNow());
$event = $body['event'] ?? ''; $day = $body['windowDay'] ?? null;
if (!in_array($event, ['page_view', 'window_open'], true) || $state['phase'] !== 'active') jsonResponse(['error' => 'Nieprawidłowe zdarzenie.'], 422);
if ($event === 'window_open' && (!is_int($day) || $day < 1 || $day > $state['available'])) jsonResponse(['error' => 'To okienko nie jest dostępne.'], 422);
if (!rateLimit('tracking', 90, 60)) jsonResponse(['error' => 'Spróbuj później.'], 429);
session_write_close();
try { recordEvent($event, $event === 'window_open' ? $day : null); }
catch (Throwable $error) { error_log('[soa] analytics unavailable'); jsonResponse(['error' => 'Pomiar chwilowo niedostępny.'], 503); }
http_response_code(204);

<?php
require __DIR__ . '/../private/bootstrap.php';
require __DIR__ . '/../private/views/layout.php';
$day = filter_var($_GET['day'] ?? null, FILTER_VALIDATE_INT);
$tasks = availableTasks(require __DIR__ . '/../private/tasks.php', campaignState(appNow()));
$task = $tasks[$day ?: 0] ?? null;
if (!$task) http_response_code(404);
pageStart($task ? $day . ' grudnia – ' . $task['title'] : 'Okienko niedostępne', $task ? 'task' : 'document'); ?>
<main id="main" class="document-panel"><p class="eyebrow"><?= $task ? $day . ' grudnia 2026' : 'Kalendarz adwentowy' ?></p><h1><?= e($task['title'] ?? 'To okienko nie jest dostępne') ?></h1><p><?= e($task['body'] ?? 'Wróć do kalendarza, aby sprawdzić udostępnione dni.') ?></p><a class="button" href="/">Wróć do kalendarza</a><?php if ($task) taskSignature(); ?></main>
<?php pageEnd(); ?>

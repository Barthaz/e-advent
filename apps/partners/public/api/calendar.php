<?php
require __DIR__ . '/../../private/bootstrap.php';
$state = campaignState(appNow());
jsonResponse(['state' => $state, 'tasks' => (object)availableTasks(require __DIR__ . '/../../private/tasks.php', $state)]);

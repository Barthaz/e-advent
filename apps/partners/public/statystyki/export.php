<?php
require __DIR__ . '/../../private/bootstrap.php';
require __DIR__ . '/../../private/auth.php';
require __DIR__ . '/../../private/statistics.php';
requireAdmin();
try { [$from, $to] = reportRange($_GET); }
catch (InvalidArgumentException $error) { http_response_code(400); exit(e($error->getMessage())); }
$data = reportData($from, $to);
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="soa-' . ($data['mock'] ? 'DEMO-' : '') . $from . '-' . $to . '.csv"');
$out = fopen('php://output', 'w'); fwrite($out, "\xEF\xBB\xBF");
$row = fn(array $values) => fputcsv($out, $values, ';', '"', '');
$row([$data['mock'] ? 'DANE DEMONSTRACYJNE — NIE JEST RAPORTEM KAMPANII' : 'Zdarzenia po dobrowolnej zgodzie — nie liczba osób']);
$row(['Okres', $from, $to, 'Europe/Warsaw']);
$row(['Typ', 'Data / numer okienka', 'Odsłony', 'Zdarzenia otwarcia']);
foreach ($data['daily'] as $entry) $row(['Data', $entry['date'], $entry['page_views'], $entry['opens']]);
foreach ($data['windows'] as $day=>$count) $row(['Okienko', $day, '', $count]);
fclose($out);

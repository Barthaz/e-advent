<?php
if (PHP_SAPI !== 'cli') exit;
$config = require __DIR__ . '/../private/config.php';
$checks = [
    'PHP >= 8.2' => version_compare(PHP_VERSION,'8.2','>='),
    'Produkcja' => $config['environment']==='production',
    'Brak symulacji daty' => $config['preview_now']===null,
    'Docelowa domena' => $config['base_url']==='https://soa.e-advent.pl',
    'MySQL PDO' => extension_loaded('pdo_mysql'),
    'Rzeczywiste statystyki' => $config['stats_source']==='mysql',
    'Hasło admina' => strlen($config['admin_password_hash'])>=60,
    'Klucz bezpieczeństwa' => strlen($config['security_key'])>=32,
    'Zatwierdzone treści' => $config['content_approved'],
    'Zatwierdzony branding' => $config['branding_approved'],
    'Zatwierdzone dokumenty' => $config['legal_approved'],
    'Kontakt' => (bool)filter_var($config['contact_email'],FILTER_VALIDATE_EMAIL),
    'Tekst finansowania' => (bool)$config['funding_text'],
    'Logo ŚOA' => is_file(__DIR__.'/../public/assets/branding/soa-logo.svg'),
    'Pasek finansowania' => is_file(__DIR__.'/../public/assets/branding/fe-sl-official-strip.svg'),
    'Zapis limiterów' => is_writable(__DIR__.'/../private/storage'),
    'Akceptacja analityki, jeśli włączona' => !$config['analytics_enabled'] || $config['analytics_approved'],
];
if(extension_loaded('pdo_mysql')&&$config['db']['dsn']){
    try{require __DIR__.'/../private/db.php';db()->query('SELECT 1 FROM soa_daily_stats LIMIT 1');db()->query('SELECT 1 FROM soa_window_stats LIMIT 1');$checks['Połączenie i schemat DB']=true;}
    catch(Throwable $e){$checks['Połączenie i schemat DB']=false;}
}else{$checks['Połączenie i schemat DB']=false;}
foreach($checks as $label=>$ok)echo ($ok?'[OK] ':'[BRAK] ').$label."\n";
exit(in_array(false,$checks,true)?1:0);

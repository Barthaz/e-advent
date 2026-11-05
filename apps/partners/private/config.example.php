<?php
// Copy to config.local.php; this file must never be publicly served.
return [
    'environment' => 'production',
    'base_url' => 'https://soa.e-advent.pl',
    'preview_now' => null,
    'stats_source' => 'mysql',
    'analytics_enabled' => false,
    'analytics_approved' => false,
    'admin_password_hash' => '', // php scripts/set-password.php
    'security_key' => '', // bin2hex(random_bytes(32))
    'db' => [
        'dsn' => 'mysql:host=localhost;dbname=soa_advent;charset=utf8mb4',
        'user' => '', 'password' => '',
    ],
    'content_approved' => false,
    'branding_approved' => false,
    'legal_approved' => false,
    'contact_email' => '',
    'funding_text' => '',
];

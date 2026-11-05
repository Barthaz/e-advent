<?php
declare(strict_types=1);
// Override with an ignored config.local.php placed OUTSIDE the document root.
$config = [
    'environment' => 'production', // fail closed until configured; setup:demo overrides locally
    'base_url' => 'http://127.0.0.1:5180',
    'preview_now' => null,
    'stats_source' => 'mock', // mock | mysql; never silently fallback in production
    'analytics_enabled' => false,
    'analytics_approved' => false,
    'consent_version' => 'soa-2026-v1',
    'admin_password_hash' => '',
    'security_key' => '',
    'session_timeout' => 1800,
    'db' => ['dsn' => '', 'user' => '', 'password' => ''],
    'content_approved' => false,
    'branding_approved' => false,
    'legal_approved' => false,
    'contact_email' => '',
    'funding_text' => '',
];
if (is_file(__DIR__ . '/config.local.php')) {
    $config = array_replace_recursive($config, require __DIR__ . '/config.local.php');
}
return $config;

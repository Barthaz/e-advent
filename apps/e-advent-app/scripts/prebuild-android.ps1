# PowerShell script dla Windows
Write-Host "🚀 Rozpoczynam prebuild Androida z modułem ExitApp...`n" -ForegroundColor Cyan

# Krok 1: Usuń katalog android
if (Test-Path "android") {
    Write-Host "📁 Usuwanie katalogu android..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "android"
    Write-Host "✓ Katalog android usunięty`n" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Katalog android nie istnieje, pomijam usuwanie`n" -ForegroundColor Gray
}

# Krok 2: Uruchom expo prebuild
Write-Host "🔨 Uruchamianie npx expo prebuild --platform android..." -ForegroundColor Yellow
try {
    npx expo prebuild --platform android
    Write-Host "✓ Expo prebuild zakończony`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Błąd podczas prebuild: $_" -ForegroundColor Red
    exit 1
}

# Krok 3: Utwórz moduły ExitApp
Write-Host "📝 Tworzenie modułów ExitApp..." -ForegroundColor Yellow

$moduleDir = "android\app\src\main\java\com\eadvent\app"
if (-not (Test-Path $moduleDir)) {
    New-Item -ItemType Directory -Path $moduleDir -Force | Out-Null
}

# ExitAppModule.kt
$exitAppModuleContent = @"
package com.eadvent.app

import android.app.Activity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ExitAppModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "ExitApp"
    }

    @ReactMethod
    fun exitApp(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                // Użyj finishAffinity() aby zamknąć wszystkie aktywności w zadaniu
                activity.finishAffinity()
                // Alternatywnie użyj System.exit(0) dla całkowitego zamknięcia
                System.exit(0)
            } else {
                // Jeśli nie ma aktywności, użyj System.exit(0)
                System.exit(0)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("EXIT_ERROR", "Nie udało się zamknąć aplikacji", e)
        }
    }
}
"@

# ExitAppPackage.kt
$exitAppPackageContent = @"
package com.eadvent.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ExitAppPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ExitAppModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
"@

# Zapisz pliki
$exitAppModulePath = "$moduleDir\ExitAppModule.kt"
$exitAppPackagePath = "$moduleDir\ExitAppPackage.kt"

Set-Content -Path $exitAppModulePath -Value $exitAppModuleContent -Encoding UTF8
Write-Host "✓ Utworzono ExitAppModule.kt" -ForegroundColor Green

Set-Content -Path $exitAppPackagePath -Value $exitAppPackageContent -Encoding UTF8
Write-Host "✓ Utworzono ExitAppPackage.kt" -ForegroundColor Green

# Krok 4: Dodaj ExitAppPackage do MainApplication.kt
Write-Host "`n🔧 Dodawanie ExitAppPackage do MainApplication.kt..." -ForegroundColor Yellow

$mainApplicationPath = "$moduleDir\MainApplication.kt"
if (-not (Test-Path $mainApplicationPath)) {
    Write-Host "❌ MainApplication.kt nie został znaleziony!" -ForegroundColor Red
    exit 1
}

$content = Get-Content -Path $mainApplicationPath -Raw -Encoding UTF8

# Sprawdź czy ExitAppPackage jest już dodany
if ($content -match "ExitAppPackage") {
    Write-Host "✓ ExitAppPackage jest już dodany do MainApplication.kt" -ForegroundColor Green
} else {
    # Dodaj import jeśli nie istnieje
    if ($content -notmatch "import com\.eadvent\.app\.ExitAppPackage") {
        # Znajdź miejsce po ostatnim imporcie
        $importPattern = "(import\s+[\w.]+;?\s*\r?\n)"
        $lastImportMatch = [regex]::Matches($content, $importPattern) | Select-Object -Last 1
        if ($lastImportMatch) {
            $insertIndex = $lastImportMatch.Index + $lastImportMatch.Length
            $content = $content.Substring(0, $insertIndex) + 
                      "import com.eadvent.app.ExitAppPackage`n" + 
                      $content.Substring($insertIndex)
        }
    }

    # Dodaj ExitAppPackage() do listy pakietów
    if ($content -match "(getPackages\(\):\s*List<ReactPackage>\s*=\s*PackageList\(this\)\.packages\.apply\s*\{)([^}]*)(\})") {
        $packagesContent = $matches[2]
        if ($packagesContent -notmatch "ExitAppPackage\(\)") {
            $newPackagesContent = $packagesContent.TrimEnd() + "`n              add(ExitAppPackage())"
            $content = $content -replace "($packagesContent)", $newPackagesContent
        }
    } else {
        Write-Host "⚠️ Nie udało się znaleźć bloku getPackages() w MainApplication.kt" -ForegroundColor Yellow
        Write-Host "   Musisz ręcznie dodać: add(ExitAppPackage())" -ForegroundColor Yellow
    }

    Set-Content -Path $mainApplicationPath -Value $content -Encoding UTF8
    Write-Host "✓ Dodano ExitAppPackage do MainApplication.kt" -ForegroundColor Green
}

# Krok 5: Napraw przestarzałe funkcje Gradle dla kompatybilności z Gradle 9.0
Write-Host "`n🔧 Aktualizowanie konfiguracji Gradle dla kompatybilności z Gradle 9.0..." -ForegroundColor Yellow

$buildGradlePath = "android\app\build.gradle"
if (Test-Path $buildGradlePath) {
    $content = Get-Content -Path $buildGradlePath -Raw -Encoding UTF8
    
    # Zmień packagingOptions na packaging
    $content = $content -replace "packagingOptions\s*\{", "packaging {"
    
    # Zmień useLegacyPackaging na useLegacyPackaging = (nowa składnia)
    $content = $content -replace "useLegacyPackaging\s+enableLegacyPackaging\.toBoolean\(\)", "useLegacyPackaging = enableLegacyPackaging.toBoolean()"
    
    # Zmień android.packagingOptions na android.packaging
    $content = $content -replace "android\.packagingOptions", "android.packaging"
    
    # Zmień findProperty("android.packagingOptions. na findProperty("android.packaging.
    $content = $content -replace 'findProperty\("android\.packagingOptions\.', 'findProperty("android.packaging.'
    
    Set-Content -Path $buildGradlePath -Value $content -Encoding UTF8
    Write-Host "✓ Zaktualizowano build.gradle dla kompatybilności z Gradle 9.0" -ForegroundColor Green
}

Write-Host "`n✅ Prebuild zakończony! Moduł ExitApp jest gotowy do użycia." -ForegroundColor Green
Write-Host "   Możesz teraz uruchomić: npm run android" -ForegroundColor Cyan



const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANDROID_DIR = path.join(__dirname, '..', 'android');
const EXIT_APP_MODULE_PATH = path.join(ANDROID_DIR, 'app', 'src', 'main', 'java', 'com', 'eadvent', 'app', 'ExitAppModule.kt');
const EXIT_APP_PACKAGE_PATH = path.join(ANDROID_DIR, 'app', 'src', 'main', 'java', 'com', 'eadvent', 'app', 'ExitAppPackage.kt');
const MAIN_APPLICATION_PATH = path.join(ANDROID_DIR, 'app', 'src', 'main', 'java', 'com', 'eadvent', 'app', 'MainApplication.kt');

// Zawartość modułów do zapisania
const EXIT_APP_MODULE_CONTENT = `package com.eadvent.app

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
`;

const EXIT_APP_PACKAGE_CONTENT = `package com.eadvent.app

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
`;

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function addExitAppPackageToMainApplication() {
    if (!fs.existsSync(MAIN_APPLICATION_PATH)) {
        console.error('❌ MainApplication.kt nie został znaleziony!');
        return false;
    }

    let content = fs.readFileSync(MAIN_APPLICATION_PATH, 'utf8');
    
    // Sprawdź czy ExitAppPackage jest już dodany
    if (content.includes('ExitAppPackage')) {
        console.log('✓ ExitAppPackage jest już dodany do MainApplication.kt');
        return true;
    }

    // Dodaj import jeśli nie istnieje
    if (!content.includes('import com.eadvent.app.ExitAppPackage')) {
        // Znajdź ostatni import i dodaj nowy
        const importRegex = /(import\s+[\w.]+;?\s*\n)/g;
        const imports = content.match(importRegex) || [];
        const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '');
        if (lastImportIndex !== -1) {
            const insertIndex = lastImportIndex + (imports[imports.length - 1] || '').length;
            content = content.slice(0, insertIndex) + 
                     'import com.eadvent.app.ExitAppPackage\n' + 
                     content.slice(insertIndex);
        } else {
            // Jeśli nie ma importów, dodaj po package
            const packageIndex = content.indexOf('package');
            const packageLineEnd = content.indexOf('\n', packageIndex);
            content = content.slice(0, packageLineEnd + 1) + 
                     'import com.eadvent.app.ExitAppPackage\n' + 
                     content.slice(packageLineEnd + 1);
        }
    }

    // Dodaj ExitAppPackage() do listy pakietów
    const packagesRegex = /getPackages\(\):\s*List<ReactPackage>\s*=\s*PackageList\(this\)\.packages\.apply\s*\{([^}]*)\}/s;
    const match = content.match(packagesRegex);
    
    if (match) {
        const packagesBlock = match[0];
        const packagesContent = match[1];
        
        // Sprawdź czy ExitAppPackage() jest już w liście
        if (!packagesContent.includes('ExitAppPackage()')) {
            // Dodaj ExitAppPackage() przed zamknięciem bloku
            const newPackagesBlock = packagesBlock.replace(
                /(\s*)\}/,
                `$1              add(ExitAppPackage())\n$1}`
            );
            content = content.replace(packagesRegex, newPackagesBlock);
        }
    } else {
        console.warn('⚠️ Nie udało się znaleźć bloku getPackages() w MainApplication.kt');
        console.warn('   Musisz ręcznie dodać: add(ExitAppPackage())');
    }

    fs.writeFileSync(MAIN_APPLICATION_PATH, content, 'utf8');
    console.log('✓ Dodano ExitAppPackage do MainApplication.kt');
    return true;
}

function main() {
    console.log('🚀 Rozpoczynam prebuild Androida z modułem ExitApp...\n');

    // Krok 1: Usuń katalog android
    if (fs.existsSync(ANDROID_DIR)) {
        console.log('📁 Usuwanie katalogu android...');
        fs.rmSync(ANDROID_DIR, { recursive: true, force: true });
        console.log('✓ Katalog android usunięty\n');
    } else {
        console.log('ℹ️ Katalog android nie istnieje, pomijam usuwanie\n');
    }

    // Krok 2: Uruchom expo prebuild
    console.log('🔨 Uruchamianie npx expo prebuild --platform android...');
    try {
        execSync('npx expo prebuild --platform android', {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        console.log('✓ Expo prebuild zakończony\n');
    } catch (error) {
        console.error('❌ Błąd podczas prebuild:', error.message);
        process.exit(1);
    }

    // Krok 3: Utwórz moduły ExitApp
    console.log('📝 Tworzenie modułów ExitApp...');
    
    // Utwórz katalogi jeśli nie istnieją
    const moduleDir = path.dirname(EXIT_APP_MODULE_PATH);
    ensureDirectoryExists(moduleDir);
    
    // Zapisz ExitAppModule.kt
    fs.writeFileSync(EXIT_APP_MODULE_PATH, EXIT_APP_MODULE_CONTENT, 'utf8');
    console.log('✓ Utworzono ExitAppModule.kt');
    
    // Zapisz ExitAppPackage.kt
    fs.writeFileSync(EXIT_APP_PACKAGE_PATH, EXIT_APP_PACKAGE_CONTENT, 'utf8');
    console.log('✓ Utworzono ExitAppPackage.kt');

    // Krok 4: Dodaj ExitAppPackage do MainApplication.kt
    console.log('\n🔧 Dodawanie ExitAppPackage do MainApplication.kt...');
    if (addExitAppPackageToMainApplication()) {
        console.log('✓ Konfiguracja zakończona pomyślnie!\n');
    } else {
        console.error('❌ Nie udało się dodać ExitAppPackage do MainApplication.kt');
        console.error('   Musisz dodać ręcznie: add(ExitAppPackage())');
        process.exit(1);
    }

    // Krok 5: Napraw przestarzałe funkcje Gradle dla kompatybilności z Gradle 9.0
    console.log('\n🔧 Aktualizowanie konfiguracji Gradle dla kompatybilności z Gradle 9.0...');
    const buildGradlePath = path.join(ANDROID_DIR, 'app', 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
        let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
        
        // Zmień packagingOptions na packaging
        buildGradleContent = buildGradleContent.replace(
            /packagingOptions\s*\{/g,
            'packaging {'
        );
        
        // Zmień useLegacyPackaging na useLegacyPackaging = (nowa składnia)
        buildGradleContent = buildGradleContent.replace(
            /useLegacyPackaging\s+enableLegacyPackaging\.toBoolean\(\)/g,
            'useLegacyPackaging = enableLegacyPackaging.toBoolean()'
        );
        
        // Zmień android.packagingOptions na android.packaging w komentarzach i kodzie
        buildGradleContent = buildGradleContent.replace(
            /android\.packagingOptions/g,
            'android.packaging'
        );
        
        // Zmień findProperty("android.packagingOptions. na findProperty("android.packaging.
        buildGradleContent = buildGradleContent.replace(
            /findProperty\("android\.packagingOptions\./g,
            'findProperty("android.packaging.'
        );
        
        fs.writeFileSync(buildGradlePath, buildGradleContent, 'utf8');
        console.log('✓ Zaktualizowano build.gradle dla kompatybilności z Gradle 9.0');
    }

    console.log('\n✅ Prebuild zakończony! Moduł ExitApp jest gotowy do użycia.');
    console.log('   Możesz teraz uruchomić: npm run android');
}

main();



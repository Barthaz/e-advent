#!/bin/bash

# Bash script dla Unix/Linux/Mac
echo "🚀 Rozpoczynam prebuild Androida z modułem ExitApp..."
echo ""

# Krok 1: Usuń katalog android
if [ -d "android" ]; then
    echo "📁 Usuwanie katalogu android..."
    rm -rf android
    echo "✓ Katalog android usunięty"
    echo ""
else
    echo "ℹ️ Katalog android nie istnieje, pomijam usuwanie"
    echo ""
fi

# Krok 2: Uruchom expo prebuild
echo "🔨 Uruchamianie npx expo prebuild --platform android..."
if npx expo prebuild --platform android; then
    echo "✓ Expo prebuild zakończony"
    echo ""
else
    echo "❌ Błąd podczas prebuild"
    exit 1
fi

# Krok 3: Utwórz moduły ExitApp
echo "📝 Tworzenie modułów ExitApp..."

MODULE_DIR="android/app/src/main/java/com/eadvent/app"
mkdir -p "$MODULE_DIR"

# ExitAppModule.kt
cat > "$MODULE_DIR/ExitAppModule.kt" << 'EOF'
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
EOF

# ExitAppPackage.kt
cat > "$MODULE_DIR/ExitAppPackage.kt" << 'EOF'
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
EOF

echo "✓ Utworzono ExitAppModule.kt"
echo "✓ Utworzono ExitAppPackage.kt"

# Krok 4: Dodaj ExitAppPackage do MainApplication.kt
echo ""
echo "🔧 Dodawanie ExitAppPackage do MainApplication.kt..."

MAIN_APPLICATION_PATH="$MODULE_DIR/MainApplication.kt"

if [ ! -f "$MAIN_APPLICATION_PATH" ]; then
    echo "❌ MainApplication.kt nie został znaleziony!"
    exit 1
fi

# Sprawdź czy ExitAppPackage jest już dodany
if grep -q "ExitAppPackage" "$MAIN_APPLICATION_PATH"; then
    echo "✓ ExitAppPackage jest już dodany do MainApplication.kt"
else
    # Dodaj import jeśli nie istnieje
    if ! grep -q "import com.eadvent.app.ExitAppPackage" "$MAIN_APPLICATION_PATH"; then
        # Znajdź ostatni import i dodaj nowy
        sed -i.bak '/^import /a\
import com.eadvent.app.ExitAppPackage
' "$MAIN_APPLICATION_PATH"
        rm -f "$MAIN_APPLICATION_PATH.bak"
    fi

    # Dodaj ExitAppPackage() do listy pakietów
    if grep -q "getPackages()" "$MAIN_APPLICATION_PATH"; then
        if ! grep -q "ExitAppPackage()" "$MAIN_APPLICATION_PATH"; then
            # Dodaj przed zamknięciem bloku apply
            sed -i.bak '/PackageList(this)\.packages\.apply {/,/}/ {
                /^[[:space:]]*}$/i\
              add(ExitAppPackage())
            }' "$MAIN_APPLICATION_PATH"
            rm -f "$MAIN_APPLICATION_PATH.bak"
        fi
    else
        echo "⚠️ Nie udało się znaleźć bloku getPackages() w MainApplication.kt"
        echo "   Musisz ręcznie dodać: add(ExitAppPackage())"
    fi
    
    echo "✓ Dodano ExitAppPackage do MainApplication.kt"
fi

# Krok 5: Napraw przestarzałe funkcje Gradle dla kompatybilności z Gradle 9.0
echo ""
echo "🔧 Aktualizowanie konfiguracji Gradle dla kompatybilności z Gradle 9.0..."

BUILD_GRADLE_PATH="android/app/build.gradle"
if [ -f "$BUILD_GRADLE_PATH" ]; then
    # Zmień packagingOptions na packaging
    sed -i.bak 's/packagingOptions\s*{/packaging {/g' "$BUILD_GRADLE_PATH"
    
    # Zmień useLegacyPackaging na useLegacyPackaging = (nowa składnia)
    sed -i.bak 's/useLegacyPackaging\s\+enableLegacyPackaging\.toBoolean()/useLegacyPackaging = enableLegacyPackaging.toBoolean()/g' "$BUILD_GRADLE_PATH"
    
    # Zmień android.packagingOptions na android.packaging
    sed -i.bak 's/android\.packagingOptions/android.packaging/g' "$BUILD_GRADLE_PATH"
    
    # Zmień findProperty("android.packagingOptions. na findProperty("android.packaging.
    sed -i.bak 's/findProperty("android\.packagingOptions\./findProperty("android.packaging./g' "$BUILD_GRADLE_PATH"
    
    rm -f "$BUILD_GRADLE_PATH.bak"
    echo "✓ Zaktualizowano build.gradle dla kompatybilności z Gradle 9.0"
fi

echo ""
echo "✅ Prebuild zakończony! Moduł ExitApp jest gotowy do użycia."
echo "   Możesz teraz uruchomić: npm run android"



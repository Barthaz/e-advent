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

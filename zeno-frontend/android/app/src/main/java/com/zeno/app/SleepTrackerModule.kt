package com.zeno.app

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*

class SleepTrackerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SleepTracker"

    @ReactMethod
    fun startTracking(accessToken: String, refreshToken: String, userId: String, apiBaseUrl: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(SleepTrackerService.PREFS_NAME, Context.MODE_PRIVATE)

            prefs.edit()
                .putString(SleepTrackerService.KEY_ACCESS_TOKEN, accessToken)
                .putString(SleepTrackerService.KEY_REFRESH_TOKEN, refreshToken)
                .putString(SleepTrackerService.KEY_USER_ID, userId)
                .putString(SleepTrackerService.KEY_API_BASE_URL, apiBaseUrl)
                .apply()

            val intent = Intent(context, SleepTrackerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_START_SLEEP_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, SleepTrackerService::class.java)
            context.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_STOP_SLEEP_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun isTrackingActive(promise: Promise) {
        try {
            val context = reactApplicationContext
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            var running = false

            @Suppress("DEPRECATION")
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            for (service in runningServices) {
                if (SleepTrackerService::class.java.name == service.service.className) {
                    running = true
                    break
                }
            }
            promise.resolve(running)
        } catch (e: Exception) {
            promise.reject("ERROR_CHECK_SLEEP_TRACKING", e.message, e)
        }
    }

    @ReactMethod
    fun getLocalEvents(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(SleepTrackerService.PREFS_NAME, Context.MODE_PRIVATE)
            val events = prefs.getString(SleepTrackerService.KEY_EVENTS, "[]") ?: "[]"
            promise.resolve(events)
        } catch (e: Exception) {
            promise.reject("ERROR_GET_EVENTS", e.message, e)
        }
    }
}

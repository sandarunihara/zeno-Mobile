package com.zeno.app

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*

class StepCounterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StepCounter"

    @ReactMethod
    fun startService(accessToken: String, refreshToken: String, userId: String, apiBaseUrl: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val sharedPreferences = context.getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)
            
            sharedPreferences.edit()
                .putString("accessToken", accessToken)
                .putString("refreshToken", refreshToken)
                .putString("userId", userId)
                .putString("apiBaseUrl", apiBaseUrl)
                .apply()

            val intent = Intent(context, StepCounterService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_START_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, StepCounterService::class.java)
            context.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_STOP_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            val context = reactApplicationContext
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            var running = false
            
            @Suppress("DEPRECATION")
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
            for (service in runningServices) {
                if (StepCounterService::class.java.name == service.service.className) {
                    running = true
                    break
                }
            }
            promise.resolve(running)
        } catch (e: Exception) {
            promise.reject("ERROR_CHECK_SERVICE", e.message, e)
        }
    }
}

package com.zeno.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class StepCounterService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    
    private val channelId = "step_counter_channel"
    private val notificationId = 888

    private lateinit var sharedPreferences: SharedPreferences

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        sharedPreferences = getSharedPreferences("StepCounterPrefs", Context.MODE_PRIVATE)

        createNotificationChannel()
        startForegroundService()
        
        registerSensor()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                channelId,
                "Step Tracking Channel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Used to track physical recovery battery in the background"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    private fun startForegroundService() {
        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Zeno Recovery Battery")
            .setContentText("ZenAdmin is tracking your recovery battery")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(notificationId, notification)
        }
    }

    private fun registerSensor() {
        stepSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        registerSensor()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        
        val currentSteps = event.values[0].toInt()
        val lastSavedSteps = sharedPreferences.getInt("lastSavedSteps", -1)
        val currentTime = System.currentTimeMillis()

        if (lastSavedSteps == -1) {
            // First run, save baseline
            sharedPreferences.edit()
                .putInt("lastSavedSteps", currentSteps)
                .putLong("lastUploadTime", currentTime)
                .apply()
            return
        }

        if (currentSteps < lastSavedSteps) {
            // Device rebooted, reset baseline
            sharedPreferences.edit()
                .putInt("lastSavedSteps", currentSteps)
                .apply()
            return
        }

        val delta = currentSteps - lastSavedSteps
        if (delta > 0) {
            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date(currentTime))
            val pendingKey = "pending_$dateStr"
            val pendingSteps = sharedPreferences.getInt(pendingKey, 0)
            
            sharedPreferences.edit()
                .putInt(pendingKey, pendingSteps + delta)
                .putInt("lastSavedSteps", currentSteps)
                .apply()
        }

        val lastUploadTime = sharedPreferences.getLong("lastUploadTime", 0L)
        val timeElapsed = currentTime - lastUploadTime
        val fiveMinutesMs = 5 * 60 * 1000

        if (timeElapsed >= fiveMinutesMs || delta >= 10) {
            uploadPendingSteps(currentTime)
        }
    }

    private fun uploadPendingSteps(currentTime: Long) {
        val allPrefs = sharedPreferences.all
        for (key in allPrefs.keys) {
            if (key.startsWith("pending_")) {
                val dateStr = key.substring("pending_".length)
                val stepsToUpload = allPrefs[key] as? Int ?: 0
                if (stepsToUpload > 0) {
                    sendStepsToBackend(dateStr, stepsToUpload, currentTime)
                }
            }
        }
    }

    private fun sendStepsToBackend(dateStr: String, stepsToUpload: Int, currentTime: Long) {
        val accessToken = sharedPreferences.getString("accessToken", null) ?: return
        val apiBaseUrl = sharedPreferences.getString("apiBaseUrl", null) ?: return
        val refreshToken = sharedPreferences.getString("refreshToken", null)

        val url = "$apiBaseUrl/api/core/health/steps"
        val json = JSONObject().apply {
            put("steps", stepsToUpload)
            put("date", dateStr)
        }

        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer $accessToken")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (response.isSuccessful) {
                        onUploadSuccess(dateStr, stepsToUpload, currentTime)
                    } else if (response.code == 401 && refreshToken != null) {
                        val refreshed = refreshAuthTokenSynchronously(apiBaseUrl, refreshToken)
                        if (refreshed) {
                            val newAccessToken = sharedPreferences.getString("accessToken", null)
                            if (newAccessToken != null) {
                                val retryRequest = Request.Builder()
                                    .url(url)
                                    .post(body)
                                    .addHeader("Authorization", "Bearer $newAccessToken")
                                    .build()
                                client.newCall(retryRequest).enqueue(object : Callback {
                                    override fun onFailure(call: Call, e: IOException) {}
                                    override fun onResponse(call: Call, retryResponse: Response) {
                                        retryResponse.use {
                                            if (retryResponse.isSuccessful) {
                                                onUploadSuccess(dateStr, stepsToUpload, currentTime)
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        })
    }

    private fun onUploadSuccess(dateStr: String, stepsUploaded: Int, currentTime: Long) {
        val pendingKey = "pending_$dateStr"
        val currentPending = sharedPreferences.getInt(pendingKey, 0)
        val newPending = Math.max(0, currentPending - stepsUploaded)
        
        val editor = sharedPreferences.edit()
        if (newPending == 0) {
            editor.remove(pendingKey)
        } else {
            editor.putInt(pendingKey, newPending)
        }
        editor.putLong("lastUploadTime", currentTime)
        editor.apply()
    }

    private fun refreshAuthTokenSynchronously(apiBaseUrl: String, refreshToken: String): Boolean {
        val url = "$apiBaseUrl/api/auth/refresh-token"
        val json = JSONObject().apply {
            put("refreshtoken", refreshToken)
        }
        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .build()

        try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return false
                val jsonObj = JSONObject(responseBody)
                val newAccessToken = jsonObj.optString("accesstoken", null)
                val newRefreshToken = jsonObj.optString("refreshtoken", null)
                if (newAccessToken != null) {
                    val editor = sharedPreferences.edit()
                        .putString("accessToken", newAccessToken)
                    if (newRefreshToken != null) {
                        editor.putString("refreshToken", newRefreshToken)
                    }
                    editor.apply()
                    return true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        sensorManager.unregisterListener(this)
        super.onDestroy()
    }
}

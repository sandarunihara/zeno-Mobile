package com.zeno.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class SleepTrackerService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "SleepTrackerService"
        private const val CHANNEL_ID = "sleep_tracker_channel"
        private const val NOTIFICATION_ID = 889
        const val PREFS_NAME = "SleepTrackerPrefs"
        const val KEY_EVENTS = "sleep_events"
        const val KEY_UNSYNCED_EVENTS = "unsynced_sleep_events"
        const val KEY_ACCESS_TOKEN = "accessToken"
        const val KEY_REFRESH_TOKEN = "refreshToken"
        const val KEY_USER_ID = "userId"
        const val KEY_API_BASE_URL = "apiBaseUrl"
    }

    private lateinit var sensorManager: SensorManager
    private var lightSensor: Sensor? = null
    private var proximitySensor: Sensor? = null
    private lateinit var sharedPreferences: SharedPreferences

    // Latest cached sensor readings
    @Volatile var currentLux: Float = -1f
    @Volatile var currentProximity: Float = -1f
    private var maxProximityRange: Float = 5f

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    // Screen state broadcast receiver
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.d(TAG, "Screen OFF detected — logging SUSPENDED event")
                    logDeviceEvent("SUSPENDED")
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.d(TAG, "Screen ON detected")
                    // We wait for USER_PRESENT (unlock) for the actual RESUMED event
                }
                Intent.ACTION_USER_PRESENT -> {
                    Log.d(TAG, "User PRESENT (unlocked) — logging RESUMED event & triggering sync")
                    logDeviceEvent("RESUMED")
                    attemptSync()
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Cache the max proximity range for NEAR/FAR classification
        proximitySensor?.let { maxProximityRange = it.maximumRange }

        createNotificationChannel()
        startForegroundService()
        registerSensors()
        registerScreenReceiver()

        Log.i(TAG, "SleepTrackerService created. Light sensor: ${lightSensor != null}, Proximity sensor: ${proximitySensor != null}")

        // On startup, attempt to sync any previously unsynced events from failed syncs
        syncUnsyncedEventsOnStartup()
    }

    /**
     * On service start, check for any unsynced events left over from a previous session
     * (e.g. backend was down overnight) and also check if the current events buffer has
     * accumulated events that were never synced. This ensures sleep data is not lost.
     */
    private fun syncUnsyncedEventsOnStartup() {
        val unsyncedJson = sharedPreferences.getString(KEY_UNSYNCED_EVENTS, null)
        val eventsJson = sharedPreferences.getString(KEY_EVENTS, "[]") ?: "[]"
        val eventsArray = try { JSONArray(eventsJson) } catch (_: Exception) { JSONArray() }

        val hasUnsynced = unsyncedJson != null && unsyncedJson != "[]"
        val hasBufferedEvents = eventsArray.length() >= 2

        if (hasUnsynced || hasBufferedEvents) {
            Log.i(TAG, "Found pending sleep data on startup (unsynced=$hasUnsynced, buffered=${eventsArray.length()} events). Scheduling sync.")

            // Merge unsynced events with current buffer if both exist
            if (hasUnsynced && hasBufferedEvents) {
                try {
                    val unsyncedArray = JSONArray(unsyncedJson)
                    // Combine: unsynced events first, then current buffer
                    val mergedArray = JSONArray()
                    for (i in 0 until unsyncedArray.length()) {
                        mergedArray.put(unsyncedArray.get(i))
                    }
                    for (i in 0 until eventsArray.length()) {
                        mergedArray.put(eventsArray.get(i))
                    }
                    sharedPreferences.edit()
                        .putString(KEY_EVENTS, mergedArray.toString())
                        .remove(KEY_UNSYNCED_EVENTS)
                        .apply()
                } catch (e: Exception) {
                    Log.e(TAG, "Error merging unsynced events: ${e.message}")
                }
            } else if (hasUnsynced) {
                // Move unsynced events into the main buffer
                sharedPreferences.edit()
                    .putString(KEY_EVENTS, unsyncedJson)
                    .remove(KEY_UNSYNCED_EVENTS)
                    .apply()
            }

            // Attempt immediate sync
            attemptSync()
        } else {
            Log.d(TAG, "No pending sleep data on startup.")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sleep Tracking Channel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors sleep patterns passively using device sensors"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun startForegroundService() {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zeno Sleep Tracker")
            .setContentText("Passively monitoring sleep patterns")
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerSensors() {
        lightSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        proximitySensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    private fun registerScreenReceiver() {
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Sensor Callbacks
    // ──────────────────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return
        when (event.sensor.type) {
            Sensor.TYPE_LIGHT -> {
                currentLux = event.values[0]
            }
            Sensor.TYPE_PROXIMITY -> {
                currentProximity = event.values[0]
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ──────────────────────────────────────────────────────────
    //  Event Logging (SharedPreferences as local cache)
    // ──────────────────────────────────────────────────────────

    private fun logDeviceEvent(type: String) {
        val timestamp = System.currentTimeMillis()
        val proximityLabel = if (currentProximity < maxProximityRange) "NEAR" else "FAR"
        val lux = if (currentLux >= 0) currentLux.toDouble() else 0.0

        val event = JSONObject().apply {
            put("type", type)
            put("lux", lux)
            put("proximity", proximityLabel)
            put("timestamp", timestamp)
        }

        // Append to local event array
        val eventsJson = sharedPreferences.getString(KEY_EVENTS, "[]") ?: "[]"
        val eventsArray = JSONArray(eventsJson)
        eventsArray.put(event)

        sharedPreferences.edit()
            .putString(KEY_EVENTS, eventsArray.toString())
            .apply()

        Log.d(TAG, "Logged event: $type | lux=$lux | proximity=$proximityLabel | ts=$timestamp")
    }

    // ──────────────────────────────────────────────────────────
    //  Sync Logic (Push to Spring Boot)
    // ──────────────────────────────────────────────────────────

    private fun attemptSync() {
        val eventsJson = sharedPreferences.getString(KEY_EVENTS, "[]") ?: "[]"
        val eventsArray = JSONArray(eventsJson)

        if (eventsArray.length() < 2) {
            Log.d(TAG, "Not enough events to sync (${eventsArray.length()})")
            return
        }

        val accessToken = sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
        val apiBaseUrl = sharedPreferences.getString(KEY_API_BASE_URL, null)

        if (accessToken == null || apiBaseUrl == null) {
            Log.w(TAG, "No access token or API URL configured. Saving for later sync.")
            markEventsUnsynced(eventsJson)
            return
        }

        val payload = JSONObject().apply {
            put("syncTimestamp", System.currentTimeMillis())
            put("events", eventsArray)
        }

        val url = "$apiBaseUrl/api/core/health/sleep-sync"
        val body = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer $accessToken")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Sleep sync failed (network error): ${e.message}. Scheduling WorkManager retry.")
                markEventsUnsynced(eventsJson)
                scheduleSyncRetry()
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (response.isSuccessful) {
                        Log.i(TAG, "Sleep sync successful! Clearing local event cache.")
                        clearSyncedEvents()
                    } else if (response.code == 401) {
                        Log.w(TAG, "Auth expired during sleep sync. Attempting token refresh...")
                        val refreshToken = sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
                        if (refreshToken != null && refreshAuthToken(apiBaseUrl, refreshToken)) {
                            // Retry with new token
                            retrySyncWithNewToken(apiBaseUrl, payload)
                        } else {
                            markEventsUnsynced(eventsJson)
                            scheduleSyncRetry()
                        }
                    } else {
                        Log.e(TAG, "Sleep sync failed with HTTP ${response.code}. Scheduling retry.")
                        markEventsUnsynced(eventsJson)
                        scheduleSyncRetry()
                    }
                }
            }
        })
    }

    private fun retrySyncWithNewToken(apiBaseUrl: String, payload: JSONObject) {
        val newToken = sharedPreferences.getString(KEY_ACCESS_TOKEN, null) ?: return
        val url = "$apiBaseUrl/api/core/health/sleep-sync"
        val body = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer $newToken")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                markEventsUnsynced(payload.optString("events", "[]"))
                scheduleSyncRetry()
            }
            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (response.isSuccessful) {
                        clearSyncedEvents()
                    } else {
                        markEventsUnsynced(payload.optString("events", "[]"))
                        scheduleSyncRetry()
                    }
                }
            }
        })
    }

    private fun refreshAuthToken(apiBaseUrl: String, refreshToken: String): Boolean {
        val url = "$apiBaseUrl/api/auth/refresh-token"
        val json = JSONObject().apply { put("refreshtoken", refreshToken) }
        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder().url(url).post(body).build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return false
                val jsonObj = JSONObject(responseBody)
                val newAccessToken = jsonObj.optString("accesstoken", null)
                val newRefreshToken = jsonObj.optString("refreshtoken", null)
                if (newAccessToken != null) {
                    val editor = sharedPreferences.edit()
                        .putString(KEY_ACCESS_TOKEN, newAccessToken)
                    if (newRefreshToken != null) {
                        editor.putString(KEY_REFRESH_TOKEN, newRefreshToken)
                    }
                    editor.apply()
                    true
                } else false
            } else false
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh failed: ${e.message}")
            false
        }
    }

    private fun markEventsUnsynced(eventsJson: String) {
        sharedPreferences.edit()
            .putString(KEY_UNSYNCED_EVENTS, eventsJson)
            .apply()
    }

    private fun clearSyncedEvents() {
        sharedPreferences.edit()
            .putString(KEY_EVENTS, "[]")
            .remove(KEY_UNSYNCED_EVENTS)
            .apply()
    }

    private fun scheduleSyncRetry() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWork = OneTimeWorkRequestBuilder<SleepSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(applicationContext)
            .enqueueUniqueWork(
                "sleep_sync_retry",
                ExistingWorkPolicy.REPLACE,
                syncWork
            )

        Log.i(TAG, "WorkManager sync retry scheduled with CONNECTED network constraint")
    }

    // ──────────────────────────────────────────────────────────
    //  Service Lifecycle
    // ──────────────────────────────────────────────────────────

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        try { unregisterReceiver(screenReceiver) } catch (_: Exception) {}
        sensorManager.unregisterListener(this)
        Log.i(TAG, "SleepTrackerService destroyed")
        super.onDestroy()
    }
}

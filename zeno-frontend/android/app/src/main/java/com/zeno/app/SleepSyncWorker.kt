package com.zeno.app

import android.content.Context
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * WorkManager Worker that retries failed sleep event syncs.
 * Automatically triggered by the OS when network becomes available.
 */
class SleepSyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    companion object {
        private const val TAG = "SleepSyncWorker"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    override fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(
            SleepTrackerService.PREFS_NAME, Context.MODE_PRIVATE
        )

        val unsyncedJson = prefs.getString(SleepTrackerService.KEY_UNSYNCED_EVENTS, null)
        if (unsyncedJson == null || unsyncedJson == "[]") {
            Log.d(TAG, "No unsynced events found. Worker complete.")
            return Result.success()
        }

        val accessToken = prefs.getString(SleepTrackerService.KEY_ACCESS_TOKEN, null)
        val apiBaseUrl = prefs.getString(SleepTrackerService.KEY_API_BASE_URL, null)

        if (accessToken == null || apiBaseUrl == null) {
            Log.w(TAG, "No credentials available for sync retry.")
            return Result.retry()
        }

        val eventsArray = try {
            JSONArray(unsyncedJson)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse unsynced events JSON: ${e.message}")
            prefs.edit().remove(SleepTrackerService.KEY_UNSYNCED_EVENTS).apply()
            return Result.failure()
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

        return try {
            val response = client.newCall(request).execute()
            response.use {
                when {
                    response.isSuccessful -> {
                        Log.i(TAG, "Sleep sync retry succeeded! Clearing unsynced cache.")
                        prefs.edit()
                            .remove(SleepTrackerService.KEY_UNSYNCED_EVENTS)
                            .putString(SleepTrackerService.KEY_EVENTS, "[]")
                            .apply()
                        Result.success()
                    }
                    response.code == 401 -> {
                        Log.w(TAG, "Auth expired during retry. Attempting token refresh...")
                        val refreshToken = prefs.getString(SleepTrackerService.KEY_REFRESH_TOKEN, null)
                        if (refreshToken != null && refreshAuthToken(prefs, apiBaseUrl, refreshToken)) {
                            // Token refreshed, retry on next WorkManager attempt
                            Result.retry()
                        } else {
                            Log.e(TAG, "Token refresh failed. Will retry later.")
                            Result.retry()
                        }
                    }
                    else -> {
                        Log.e(TAG, "Sync retry failed with HTTP ${response.code}. Will retry later.")
                        Result.retry()
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync retry network error: ${e.message}. Will retry later.")
            Result.retry()
        }
    }

    private fun refreshAuthToken(
        prefs: android.content.SharedPreferences,
        apiBaseUrl: String,
        refreshToken: String
    ): Boolean {
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
                    val editor = prefs.edit()
                        .putString(SleepTrackerService.KEY_ACCESS_TOKEN, newAccessToken)
                    if (newRefreshToken != null) {
                        editor.putString(SleepTrackerService.KEY_REFRESH_TOKEN, newRefreshToken)
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
}

package com.zeno.app

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class SocialBatteryRescueActivity : Activity() {

    private lateinit var buttonContainer: LinearLayout
    private lateinit var loadingContainer: LinearLayout
    private lateinit var loadingText: TextView
    private lateinit var btnEnthusiastic: Button
    private lateinit var btnCasual: Button
    private lateinit var btnHardPass: Button
    private lateinit var btnReschedule: Button
    private lateinit var btnProfessional: Button
    private lateinit var btnSoftDecline: Button
    private lateinit var btnCancel: Button

    private var selectedText: String = ""
    private var isReadOnly: Boolean = false

    // We'll hardcode the API key for this native integration since it's a specific frontend direct feature
    private val groqApiKey = "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"
    private val groqApiUrl = "https://api.groq.com/openai/v1/chat/completions"

    private val client = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // This makes the dialog look more centered and properly themed if not using true AppCompatDialog
        window.setLayout(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.WRAP_CONTENT
        )
        window.setBackgroundDrawableResource(android.R.color.transparent)

        val textExtra = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
        if (textExtra == null) {
            finish()
            return
        }

        selectedText = textExtra.toString()
        isReadOnly = intent.getBooleanExtra(Intent.EXTRA_PROCESS_TEXT_READONLY, false)

        // For this to work, we need to resolve the R layout. React Native apps don't typically 
        // have an R class we can easily import if we don't know the exact package.
        // It's `com.zeno.app.R` usually.
        val resId = resources.getIdentifier("activity_social_battery", "layout", packageName)
        if (resId == 0) {
            // Fallback if layout doesn't exist (e.g. build issue)
            Toast.makeText(this, "Layout missing", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setContentView(resId)

        buttonContainer = findViewById(resources.getIdentifier("buttonContainer", "id", packageName))
        loadingContainer = findViewById(resources.getIdentifier("loadingContainer", "id", packageName))
        loadingText = findViewById(resources.getIdentifier("loadingText", "id", packageName))
        
        btnEnthusiastic = findViewById(resources.getIdentifier("btnEnthusiastic", "id", packageName))
        btnCasual = findViewById(resources.getIdentifier("btnCasual", "id", packageName))
        btnHardPass = findViewById(resources.getIdentifier("btnHardPass", "id", packageName))
        btnReschedule = findViewById(resources.getIdentifier("btnReschedule", "id", packageName))
        btnProfessional = findViewById(resources.getIdentifier("btnProfessional", "id", packageName))
        btnSoftDecline = findViewById(resources.getIdentifier("btnSoftDecline", "id", packageName))
        btnCancel = findViewById(resources.getIdentifier("btnCancel", "id", packageName))

        btnEnthusiastic.setOnClickListener { handleVibeSelection("Enthusiastic Accept (Excited and ready)") }
        btnCasual.setOnClickListener { handleVibeSelection("Casual Accept (Chill and easygoing. Keep it extremely simple, casual, and like a normal text message.)") }
        btnHardPass.setOnClickListener { handleVibeSelection("Hard Pass (Polite but Firm)") }
        btnReschedule.setOnClickListener { handleVibeSelection("Reschedule (Suggest another time)") }
        btnProfessional.setOnClickListener { handleVibeSelection("Professional Boundary (Workplace appropriate)") }
        btnSoftDecline.setOnClickListener { handleVibeSelection("Soft Decline (Warm and caring for close relationships. Keep it extremely simple, casual, and like a normal text message.)") }
        
        btnCancel.setOnClickListener { finish() }
    }

    private fun handleVibeSelection(vibe: String) {
        buttonContainer.visibility = View.GONE
        loadingContainer.visibility = View.VISIBLE
        loadingText.text = "Crafting $vibe response..."
        btnCancel.isEnabled = false

        generatePoliteExcuse(vibe, selectedText) { result ->
            runOnUiThread {
                if (result != null) {
                    sendTextBack(result)
                } else {
                    Toast.makeText(this, "Failed to generate response", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    private fun generatePoliteExcuse(vibe: String, inputMessage: String, callback: (String?) -> Unit) {
        val systemPrompt = """
            You are an empathetic communication coach and social boundary expert. 
            Your job is to draft short, natural-sounding text message responses that protect the user's energy while maintaining relationships.
            Rules:
            - Keep it SHORT (2-4 sentences max, like a real text message)
            - Sound natural and human, NOT robotic or overly formal
            - Do NOT over-apologize
            - Communicate the user's intent clearly but warmly
            - Match the tone to the selected boundary style
        """.trimIndent()

        val userPrompt = """
            The user received this message/email:
            "$inputMessage"

            They need to respond using a "$vibe" approach.
            Draft a short, warm, natural-sounding text message response. Only output the response text, nothing else.
        """.trimIndent()

        val jsonBody = JSONObject()
        jsonBody.put("model", "llama-3.3-70b-versatile")
        
        val messagesArray = JSONArray()
        
        val systemMsg = JSONObject()
        systemMsg.put("role", "system")
        systemMsg.put("content", systemPrompt)
        messagesArray.put(systemMsg)
        
        val userMsg = JSONObject()
        userMsg.put("role", "user")
        userMsg.put("content", userPrompt)
        messagesArray.put(userMsg)
        
        jsonBody.put("messages", messagesArray)
        jsonBody.put("temperature", 0.8)
        jsonBody.put("max_tokens", 300)

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = jsonBody.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url(groqApiUrl)
            .addHeader("Authorization", "Bearer $groqApiKey")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                e.printStackTrace()
                callback(null)
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    callback(null)
                    return
                }

                try {
                    val responseData = response.body?.string()
                    if (responseData != null) {
                        val jsonResponse = JSONObject(responseData)
                        val choices = jsonResponse.getJSONArray("choices")
                        if (choices.length() > 0) {
                            val content = choices.getJSONObject(0).getJSONObject("message").getString("content")
                            callback(content.trim())
                            return
                        }
                    }
                    callback(null)
                } catch (e: Exception) {
                    e.printStackTrace()
                    callback(null)
                }
            }
        })
    }

    private fun sendTextBack(generatedResponse: String) {
        if (!isReadOnly) {
            val intentData = Intent().apply {
                putExtra(Intent.EXTRA_PROCESS_TEXT, generatedResponse)
            }
            // This passes the new text back to the calling app (e.g., WhatsApp)
            setResult(Activity.RESULT_OK, intentData)
        } else {
            // If the source app text field was read-only, copy it to the clipboard
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Excuse", generatedResponse)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Response copied to clipboard!", Toast.LENGTH_SHORT).show()
        }
        finish()
    }
}

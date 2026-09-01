package com.zeno.core_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.zeno.core_service.entity.Subscription;
import com.zeno.core_service.repository.SubscriptionRepository;

@Service
public class SubscriptionExtractorService {

    private final SubscriptionRepository subscriptionRepository;

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public SubscriptionExtractorService(SubscriptionRepository subscriptionRepository, ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    public Subscription extractSubscriptionData(String emailText) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        String systemPrompt = "You are a finance assistant. Extract the subscription details from the following email snippet. "
                + "Return ONLY a raw JSON object with the following keys exactly: 'serviceName' (string), 'cost' (number), "
                + "'currency' (string like USD, LKR), 'billingCycle' (string like Monthly, Yearly), "
                + "'paymentDate' (string representing the date the payment happened or needs to happen, in YYYY-MM-DD format if possible, otherwise a description like '15th of each month' or null). "
                + "If you cannot find a recurring subscription, return an empty JSON object {}. Do not use markdown blocks.";

        Map<String, Object> messageSystem = new HashMap<>();
        messageSystem.put("role", "system");
        messageSystem.put("content", systemPrompt);

        Map<String, Object> messageUser = new HashMap<>();
        messageUser.put("role", "user");
        messageUser.put("content", emailText);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama-3.3-70b-versatile");
        requestBody.put("messages", List.of(messageSystem, messageUser));
        requestBody.put("response_format", Map.of("type", "json_object"));
        requestBody.put("temperature", 0.1);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(groqApiUrl, HttpMethod.POST, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    
                    if (content != null && content.trim().startsWith("{") && content.trim().length() > 2) {
                        return objectMapper.readValue(content, Subscription.class);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to extract subscription: " + e.getMessage());
        }
        return null;
    }

    public List<Subscription> getAllforUser(UUID userid){
        return subscriptionRepository.findByUserId(userid);
    }
}

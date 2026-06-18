package com.zeno.core_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Service
public class GmailService {

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    private final RestTemplate restTemplate;

    public GmailService() {
        this.restTemplate = new RestTemplate();
    }

    public String getAccessToken(String refreshToken) {
        String url = "https://oauth2.googleapis.com/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);
        map.add("refresh_token", refreshToken);
        map.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return (String) response.getBody().get("access_token");
        }
        throw new RuntimeException("Failed to get Google Access Token");
    }

    public List<String> fetchRecentReceiptEmails(String accessToken) {
        // Query to search for recent receipts/subscriptions in the last day
        String query = "subject:receipt OR subject:subscription newer_than:1d";
        String url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + query;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        
        List<String> emailContents = new ArrayList<>();
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            List<Map<String, Object>> messages = (List<Map<String, Object>>) response.getBody().get("messages");
            if (messages != null) {
                for (Map<String, Object> message : messages) {
                    String messageId = (String) message.get("id");
                    String content = fetchEmailContent(accessToken, messageId);
                    if (content != null) {
                        emailContents.add(content);
                    }
                }
            }
        }
        return emailContents;
    }

    private String fetchEmailContent(String accessToken, String messageId) {
        String url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + messageId + "?format=full";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> bodyMap = response.getBody();
                Map<String, Object> payload = (Map<String, Object>) bodyMap.get("payload");
                String fullBody = extractBodyFromPayload(payload);
                if (fullBody != null && !fullBody.trim().isEmpty()) {
                    return fullBody;
                }
                // Fallback to snippet if body decoding yields nothing
                return (String) bodyMap.get("snippet");
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch email " + messageId + ": " + e.getMessage());
        }
        return null;
    }

    private String extractBodyFromPayload(Map<String, Object> payload) {
        if (payload == null) return null;

        // Try to get body data from the top level (singlepart message)
        Map<String, Object> body = (Map<String, Object>) payload.get("body");
        if (body != null && body.get("data") != null) {
            String base64Data = (String) body.get("data");
            return decodeBase64(base64Data);
        }

        // Try to traverse parts (multipart message)
        List<Map<String, Object>> parts = (List<Map<String, Object>>) payload.get("parts");
        if (parts != null) {
            return extractBodyFromParts(parts);
        }

        return null;
    }

    private String extractBodyFromParts(List<Map<String, Object>> parts) {
        // Look for text/plain first, then text/html
        String htmlBody = null;
        for (Map<String, Object> part : parts) {
            String mimeType = (String) part.get("mimeType");
            Map<String, Object> body = (Map<String, Object>) part.get("body");
            
            if (body != null && body.get("data") != null) {
                String base64Data = (String) body.get("data");
                String decoded = decodeBase64(base64Data);
                
                if ("text/plain".equalsIgnoreCase(mimeType)) {
                    return decoded; // Prefer plain text
                } else if ("text/html".equalsIgnoreCase(mimeType)) {
                    htmlBody = decoded;
                }
            }

            // Recursive search for nested parts (e.g. multipart/alternative inside multipart/mixed)
            List<Map<String, Object>> subParts = (List<Map<String, Object>>) part.get("parts");
            if (subParts != null) {
                String result = extractBodyFromParts(subParts);
                if (result != null) {
                    return result;
                }
            }
        }
        return htmlBody;
    }

    private String decodeBase64(String base64Data) {
        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(base64Data);
            return new String(decodedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            System.err.println("Failed to decode base64 data: " + e.getMessage());
            return null;
        }
    }
}

package com.zeno.core_service.service;

import com.zeno.core_service.dto.GmailMessageDto;
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

    public List<GmailMessageDto> fetchRecentReceiptEmails(String accessToken) {
        // Query to search for recent receipts/subscriptions in the last day
        String query = "subject:receipt OR subject:subscription newer_than:1d";
        String url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + query;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        
        List<GmailMessageDto> emails = new ArrayList<>();
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            List<Map<String, Object>> messages = (List<Map<String, Object>>) response.getBody().get("messages");
            if (messages != null) {
                for (Map<String, Object> message : messages) {
                    String messageId = (String) message.get("id");
                    GmailMessageDto content = fetchEmailDetails(accessToken, messageId);
                    if (content != null) {
                        emails.add(content);
                    }
                }
            }
        }
        return emails;
    }

    private GmailMessageDto fetchEmailDetails(String accessToken, String messageId) {
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
                if (fullBody == null || fullBody.trim().isEmpty()) {
                    fullBody = (String) bodyMap.get("snippet");
                }
                
                Map<String, Object> userInfo = getUserInfo(accessToken);
                String userEmail = userInfo != null ? (String) userInfo.get("email") : null;
                String userPicture = userInfo != null ? (String) userInfo.get("picture") : null;

                String fromHeader = extractFromHeader(payload);
                String senderEmail = extractSenderEmail(fromHeader);
                String avatarUrl = getAvatarUrl(senderEmail, userEmail, userPicture);

                return GmailMessageDto.builder()
                        .body(fullBody)
                        .senderEmail(senderEmail)
                        .avatarUrl(avatarUrl)
                        .build();
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch email " + messageId + ": " + e.getMessage());
        }
        return null;
    }

    private Map<String, Object> getUserInfo(String accessToken) {
        String url = "https://www.googleapis.com/oauth2/v3/userinfo";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch Google userinfo: " + e.getMessage());
        }
        return null;
    }

    private String extractFromHeader(Map<String, Object> payload) {
        if (payload == null) return null;
        List<Map<String, Object>> headers = (List<Map<String, Object>>) payload.get("headers");
        if (headers != null) {
            for (Map<String, Object> header : headers) {
                String name = (String) header.get("name");
                if ("From".equalsIgnoreCase(name)) {
                    return (String) header.get("value");
                }
            }
        }
        return null;
    }

    private String extractSenderEmail(String fromHeader) {
        if (fromHeader == null) {
            return null;
        }
        int start = fromHeader.indexOf('<');
        int end = fromHeader.indexOf('>');
        if (start != -1 && end != -1 && start < end) {
            return fromHeader.substring(start + 1, end).trim();
        }
        return fromHeader.trim();
    }

    private String getAvatarUrl(String email, String userEmail, String userPicture) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        if (userEmail != null && email.equalsIgnoreCase(userEmail.trim()) && userPicture != null) {
            return userPicture;
        }
        String domain = email.substring(email.indexOf('@') + 1);
        List<String> personalDomains = List.of("gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com");
        if (personalDomains.contains(domain.toLowerCase())) {
            String hash = md5Hex(email.toLowerCase().trim());
            return "https://www.gravatar.com/avatar/" + hash + "?d=identicon";
        }
        return "https://logo.clearbit.com/" + domain;
    }

    private String md5Hex(String message) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] array = md.digest(message.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : array) {
                sb.append(Integer.toHexString((b & 0xFF) | 0x100).substring(1, 3));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            return "";
        }
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

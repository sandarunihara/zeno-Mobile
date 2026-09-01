package com.zeno.core_service.service;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.zeno.core_service.dto.GoogleConnectedUserDto;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceClient {

    // This is the special Eureka-powered RestTemplate we just created
    private final RestTemplate restTemplate;

    public UUID validateAndGetUserId(String token) {
        
        // 1. Prepare the request body
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN); // Because your Auth endpoint expects a raw String
        HttpEntity<String> request = new HttpEntity<>(token, headers);
        try {
            // 2. Call the Validate Endpoint (Notice we use the Eureka name 'AUTH-SERVICE', not localhost!)
            ResponseEntity<Boolean> validateResponse = restTemplate.postForEntity(
                "http://AUTH-SERVICE/api/auth/validate-token", 
                request, 
                Boolean.class
            );
            
            
            if (Boolean.FALSE.equals(validateResponse.getBody())) {
                throw new com.zeno.core_service.exception.UnauthorizedException("Unauthorized: Invalid token");
            }
            
            // 3. Call the Extract Endpoint
            ResponseEntity<String> idResponse = restTemplate.postForEntity(
                "http://AUTH-SERVICE/api/auth/extract-user-id", 
                request, 
                String.class
            );
            
            // 4. Return the safely extracted UUID
            return UUID.fromString(idResponse.getBody());

        } catch (com.zeno.core_service.exception.UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to communicate with Auth Service: " + e.getMessage());
        }
    }

    public GoogleConnectedUserDto getConnectedUser(String authHeader) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authHeader);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<GoogleConnectedUserDto> response = restTemplate.exchange(
                "http://AUTH-SERVICE/api/auth/me", 
                HttpMethod.GET, 
                entity, 
                GoogleConnectedUserDto.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get connected user from Auth Service: " + e.getMessage());
        }
    }
}

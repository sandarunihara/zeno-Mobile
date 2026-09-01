package com.zeno.core_service.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.core_service.entity.Subscription;
import com.zeno.core_service.service.AuthServiceClient;
import com.zeno.core_service.service.SubscriptionExtractorService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core/sub")
@RequiredArgsConstructor
public class SubscriptionController {
    
    private final SubscriptionExtractorService subscriptionExtractorService;
    private final AuthServiceClient authServiceClient;

    private UUID getUserIdFromAuthService(HttpServletRequest request){
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        
        // Pass the token to the Auth Service via Eureka!
        return authServiceClient.validateAndGetUserId(token);
    }

    @GetMapping("/user")
    public ResponseEntity<List<Subscription>> getuserSub(HttpServletRequest httprequest){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(subscriptionExtractorService.getAllforUser(userId));
    }

}

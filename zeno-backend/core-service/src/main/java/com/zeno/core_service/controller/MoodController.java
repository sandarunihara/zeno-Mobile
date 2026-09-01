package com.zeno.core_service.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.core_service.dto.Moodlog;
import com.zeno.core_service.service.AuthServiceClient;
import com.zeno.core_service.service.MoodlogService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core/mood")
@RequiredArgsConstructor
public class MoodController {
    
    private final MoodlogService moodService;
    private final AuthServiceClient authServiceClient;

    private UUID getUserIdFromAuthService(HttpServletRequest request){
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new com.zeno.core_service.exception.UnauthorizedException("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        
        // Pass the token to the Auth Service via Eureka!
        return authServiceClient.validateAndGetUserId(token);
    }

    @PostMapping("/create/{mood}/{isLight}")
    public ResponseEntity<Moodlog> createMoodlog(HttpServletRequest httprequest ,@PathVariable int mood ,@PathVariable Boolean isLight){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(moodService.updateorcreateMoodlog(mood, userId ,isLight));
    }

    @GetMapping("/latest")
    public ResponseEntity<Moodlog> getLatestMoodlog(HttpServletRequest httprequest){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(moodService.getLatestMoodlog(userId));
    }
}

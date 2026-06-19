package com.zeno.auth_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.auth_service.dto.AuthRequest;
import com.zeno.auth_service.dto.AuthResponse;
import com.zeno.auth_service.dto.RefreshTokenRequest;
import com.zeno.auth_service.dto.RegisterRequest;
import com.zeno.auth_service.dto.ConnectGmailRequest;
import com.zeno.auth_service.dto.GoogleConnectedUserDto;
import com.zeno.auth_service.service.AuthService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.http.HttpStatus;
import com.zeno.auth_service.entity.User;
import com.zeno.auth_service.dto.UserProfileDto;
import java.util.UUID;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody RegisterRequest request){
        AuthResponse response = authService.Register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request){
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshtoken(@RequestBody RefreshTokenRequest request){
        AuthResponse response = authService.refreshtoken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/connect-gmail")
    public ResponseEntity<String> connectGmail(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody ConnectGmailRequest request){
        try{
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            authService.connectGmail(token, request);
            return ResponseEntity.ok("Gmail connected successfully");
        }catch(Exception e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        try {
            UUID userId = authService.extractUserIdFromToken(token);
            User user = authService.getUserById(userId);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }
            return ResponseEntity.ok(UserProfileDto.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fname(user.getFname())
                    .lname(user.getLname())
                    .height(user.getHeight())
                    .weight(user.getWeight())
                    .hobbies(user.getHobbies())
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token: " + e.getMessage());
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody UserProfileDto updateDto) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        try {
            UUID userId = authService.extractUserIdFromToken(token);
            UserProfileDto updated = authService.updateProfile(userId, updateDto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/google-connected-users")
    public ResponseEntity<List<GoogleConnectedUserDto>> getGoogleConnectedUsers() {
        return ResponseEntity.ok(authService.getGoogleConnectedUsers());
    }

    @PostMapping("/extract-user-id")
    public ResponseEntity<String> extractUserId(@RequestBody String token){
        try{
            return ResponseEntity.ok(authService.extractUserIdFromToken(token).toString());
        }catch(Exception e){
            return ResponseEntity.badRequest().body("Invalid token!");
        }
    }

    @PostMapping("/validate-token")
    public ResponseEntity<Boolean> validateToken(@RequestBody String token){
        try{
            boolean valid = authService.validateToken(token);
            return ResponseEntity.ok(valid);
        }catch(Exception e){
            return ResponseEntity.badRequest().body(false);
        }
    }
}   

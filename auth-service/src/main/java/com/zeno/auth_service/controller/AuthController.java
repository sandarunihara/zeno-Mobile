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
import com.zeno.auth_service.service.AuthService;

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

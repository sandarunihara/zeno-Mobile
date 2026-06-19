package com.zeno.auth_service.service;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.zeno.auth_service.dto.AuthRequest;
import com.zeno.auth_service.dto.AuthResponse;
import com.zeno.auth_service.dto.RefreshTokenRequest;
import com.zeno.auth_service.dto.RegisterRequest;
import com.zeno.auth_service.dto.GoogleConnectedUserDto;
import com.zeno.auth_service.entity.User;
import com.zeno.auth_service.repository.UserRepository;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${google.client.id:dummy-client-id}")
    private String googleClientId;

    @Value("${google.client.secret:dummy-client-secret}")
    private String googleClientSecret;

    public AuthResponse Register(RegisterRequest request) {
        User user = userRepository.findByEmail(request.getEmail());
        if (user != null) {
            throw new RuntimeException("User already exists");
        }

        String refreshtoken = jwtService.generateRefreshToken(request.getEmail());

        user = User.builder()
                .fname(request.getFname())
                .lname(request.getLname())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .refreshToken(refreshtoken)
                .build();

        User savedUser = userRepository.save(user);

        String accesstoken = jwtService.generateAccessToken(savedUser.getId(), request.getEmail());

        return new AuthResponse(accesstoken, refreshtoken, "User registered successfully");
    }

    public AuthResponse login(AuthRequest request) {

        User user = userRepository.findByEmail(request.getEmail());
        if (user == null) {
            throw new RuntimeException("User not found!");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials!");
        }

        String accesstoken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshtoken = jwtService.generateRefreshToken(user.getEmail());
        user.setRefreshToken(refreshtoken);
        userRepository.save(user);

        return new AuthResponse(accesstoken, refreshtoken, "Login successful");

    }

    public User getUserById(UUID id) {
        return userRepository.findById(id).orElse(null);
    }

    public void connectGmail(String token, com.zeno.auth_service.dto.ConnectGmailRequest request) {
        User user = null;
        if (token != null) {
            try {
                UUID userId = jwtService.extractUserId(token);
                user = userRepository.findById(userId).orElse(null);
            } catch (Exception e) {
                System.err.println("Failed to extract userId from token in connectGmail: " + e.getMessage());
            }
        }

        if (user == null) {
            user = userRepository.findByEmail(request.getEmail());
        }

        if (user == null) {
            throw new RuntimeException("User not found!");
        }
        String serverAuthCode = request.getGmailToken();
        String refreshToken = exchangeCodeForRefreshToken(serverAuthCode);
        if (refreshToken != null) {
            user.setGmailToken(refreshToken);
            userRepository.save(user);
        } else {
            throw new RuntimeException("Failed to exchange auth code for refresh token");
        }
    }

    private String exchangeCodeForRefreshToken(String code) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://oauth2.googleapis.com/token";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
            map.add("client_id", googleClientId);
            map.add("client_secret", googleClientSecret);
            map.add("code", code);
            map.add("grant_type", "authorization_code");
            map.add("redirect_uri", ""); // Usually empty for RN, or "postmessage"

            HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(map, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, req, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (String) response.getBody().get("refresh_token");
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errorBody = e.getResponseBodyAsString();
            System.err.println("Google OAuth Token Exchange Error: " + errorBody);
            throw new RuntimeException("Google token exchange failed: " + errorBody);
        } catch (Exception e) {
            System.err.println("Error exchanging code: " + e.getMessage());
            throw new RuntimeException("Google token exchange failed: " + e.getMessage());
        }
        return null;
    }

    public List<GoogleConnectedUserDto> getGoogleConnectedUsers() {
        return userRepository.findByGmailTokenIsNotNull().stream()
                .map(user -> GoogleConnectedUserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .gmailToken(user.getGmailToken())
                        .build())
                .collect(Collectors.toList());
    }

    public AuthResponse refreshtoken(RefreshTokenRequest request) {
        User user = userRepository.findByRefreshToken(request.getRefreshtoken());
        if (user == null) {
            throw new RuntimeException("Invalid refresh token!");
        }

        String refreshtoken = request.getRefreshtoken();
        String email = jwtService.extractEmail(refreshtoken);
        if (!email.equals(user.getEmail())) {
            throw new RuntimeException("User not found for the provided refresh token!");
        }

        String newaccesstoken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        return new AuthResponse(newaccesstoken, refreshtoken, "Access token refreshed successfully");

    }

    public boolean validateToken(String token) {
        try {
            String email = jwtService.extractEmail(token);
            return email != null;
        } catch (Exception e) {
            return false;
        }
    }

    public UUID extractUserIdFromToken(String token) {
        try {
            return jwtService.extractUserId(token);
        } catch (Exception e) {
            throw new RuntimeException("Invalid token!");
        }
    }
}

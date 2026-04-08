package com.zeno.auth_service.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.zeno.auth_service.dto.AuthRequest;
import com.zeno.auth_service.dto.AuthResponse;
import com.zeno.auth_service.dto.RefreshTokenRequest;
import com.zeno.auth_service.dto.RegisterRequest;
import com.zeno.auth_service.entity.User;
import com.zeno.auth_service.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthResponse Register(RegisterRequest request){
        User user = userRepository.findByEmail(request.getEmail());
        if(user != null){
            throw new RuntimeException("User already exists");
        }

        String accesstoken = jwtService.generateAccessToken(request.getEmail());
        String refreshtoken = jwtService.generateRefreshToken(request.getEmail());

        user=User.builder()
                 .fname(request.getFname())
                 .lname(request.getLname())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .refreshToken(refreshtoken)
                .build();

        userRepository.save(user);


        return new AuthResponse(accesstoken, refreshtoken, "User registered successfully");
    }

    public AuthResponse login(AuthRequest request){
        
        User user = userRepository.findByEmail(request.getEmail());
        if(user == null){
            throw new RuntimeException("User not found!");
        }
        if(!passwordEncoder.matches(request.getPassword(), user.getPassword())){
            throw new RuntimeException("Invalid credentials!");
        }

        String accesstoken= jwtService.generateAccessToken(user.getEmail());
        String refreshtoken = jwtService.generateRefreshToken(user.getEmail());
        user.setRefreshToken(refreshtoken);
        userRepository.save(user);

        return new AuthResponse(accesstoken, refreshtoken, "Login successful");

    }

    public AuthResponse refreshtoken(RefreshTokenRequest request){
        User user = userRepository.findByRefreshToken(request.getRefreshtoken());
        if(user == null){
            throw new RuntimeException("Invalid refresh token!");
        }

        String refreshtoken = request.getRefreshtoken();
        String email = jwtService.extractEmail(refreshtoken);
        if(!email.equals(user.getEmail())){
            throw new RuntimeException("User not found for the provided refresh token!");
        }

        String newaccesstoken = jwtService.generateAccessToken(email);
        return new AuthResponse(newaccesstoken, refreshtoken, "Access token refreshed successfully");

    }
}




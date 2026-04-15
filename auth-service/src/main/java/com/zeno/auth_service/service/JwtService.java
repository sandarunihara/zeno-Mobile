package com.zeno.auth_service.service;

import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    
    private static final String SECRET_KEY_STRING = "3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a756784d5df612";
    private final SecretKey secretKey = Keys.hmacShaKeyFor(SECRET_KEY_STRING.getBytes());

    public String generateAccessToken(UUID userId, String email){
        return Jwts.builder()
               .subject(email)
               .id(userId.toString())
               .issuedAt(new Date(System.currentTimeMillis()))
               .expiration(new Date(System.currentTimeMillis()+ 1000 * 60 * 60 * 24))
               .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(String email){
        return Jwts.builder()
               .subject(email)
               .issuedAt(new Date(System.currentTimeMillis()))
               .expiration(new Date(System.currentTimeMillis()+ 1000L * 60 * 60 * 24 * 30))
               .signWith(secretKey)
                .compact();
    }

    public String extractEmail(String token){
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public UUID extractUserId(String token){
        String userIdStr = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getId();
        return UUID.fromString(userIdStr);
    }

    // Under development, will be used to validate tokens in future implementations
    // public boolean isTokenValid(String token, String email){
    //     try{
    //         String tokenEmail = extractEmail(token);
    //         return tokenEmail.equals(email) && !isTokenExpired(token);
    //     }catch(Exception e){
    //         return false;
    //     }
    // }

}

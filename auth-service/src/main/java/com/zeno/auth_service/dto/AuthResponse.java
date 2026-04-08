package com.zeno.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {

    private String accesstoken;
    private String refreshtoken;
    private String message;

}

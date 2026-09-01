package com.zeno.core_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleConnectedUserDto {
    private UUID id;
    private String email;
    private String gmailToken;
}

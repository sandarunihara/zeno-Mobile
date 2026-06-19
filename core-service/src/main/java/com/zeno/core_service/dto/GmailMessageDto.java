package com.zeno.core_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GmailMessageDto {
    private String body;
    private String senderEmail;
    private String avatarUrl;
}

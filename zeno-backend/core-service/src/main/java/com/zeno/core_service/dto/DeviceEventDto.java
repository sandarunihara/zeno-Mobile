package com.zeno.core_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeviceEventDto {
    private String type;       // "SUSPENDED" or "RESUMED"
    private Double lux;        // Ambient light in lux (0.0 = dark)
    private String proximity;  // "NEAR" or "FAR"
    private Long timestamp;    // Unix epoch milliseconds
}

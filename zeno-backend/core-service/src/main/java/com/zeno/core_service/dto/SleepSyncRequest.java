package com.zeno.core_service.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SleepSyncRequest {
    private Long syncTimestamp;           // When the phone sent this batch
    private List<DeviceEventDto> events;  // Chronological array of device events
}

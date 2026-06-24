package com.zeno.core_service.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SleepRecordResponse {
    private boolean success;
    private String message;
    private Double totalSleepHours;
    private Long sleepStartTime;      // Unix epoch ms
    private Long sleepEndTime;        // Unix epoch ms
    private Integer microAwakeningsCount;
    private List<Long> interruptionTimes;  // Epoch ms of each micro-awakening
    private String sleepDate;         // ISO date string (yyyy-MM-dd)
}

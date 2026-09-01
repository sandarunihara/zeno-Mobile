package com.zeno.core_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StepBucketResponse {
    private boolean success;
    private String message;
    private Integer totalSteps;
    private Integer bucket1;
    private Integer bucket2;
    private Integer bucket3;
    private Integer bucket4;
}

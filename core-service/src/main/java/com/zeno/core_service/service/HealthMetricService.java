package com.zeno.core_service.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zeno.core_service.dto.StepBucketResponse;
import com.zeno.core_service.dto.StepBucketProjection;
import com.zeno.core_service.entity.HealthMetric;
import com.zeno.core_service.repository.HealthMetricRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HealthMetricService {

    private final HealthMetricRepository healthMetricRepository;

    @Transactional
    public void recordSteps(UUID userId, Integer steps) {
        HealthMetric metric = HealthMetric.builder()
                .userId(userId)
                .metricType("STEP_COUNT")
                .value(steps)
                .loggedAt(LocalDateTime.now())
                .build();
        healthMetricRepository.save(metric);
    }

    public StepBucketResponse getStepsToday(UUID userId) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        StepBucketProjection projection = healthMetricRepository.getStepBucketsForDay(userId, startOfDay, endOfDay);
        
        Integer bucket1 = projection != null && projection.getBucket1() != null ? projection.getBucket1() : 0;
        Integer bucket2 = projection != null && projection.getBucket2() != null ? projection.getBucket2() : 0;
        Integer bucket3 = projection != null && projection.getBucket3() != null ? projection.getBucket3() : 0;
        Integer bucket4 = projection != null && projection.getBucket4() != null ? projection.getBucket4() : 0;

        Integer dayTotal = healthMetricRepository.getTotalStepsForDay(userId, startOfDay, endOfDay);
        if (dayTotal == null) {
            dayTotal = 0;
        }

        return StepBucketResponse.builder()
                .success(true)
                .message("Steps retrieved successfully.")
                .totalSteps(dayTotal)
                .bucket1(bucket1)
                .bucket2(bucket2)
                .bucket3(bucket3)
                .bucket4(bucket4)
                .build();
    }
}

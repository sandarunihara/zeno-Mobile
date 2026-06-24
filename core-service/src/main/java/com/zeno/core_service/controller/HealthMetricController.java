package com.zeno.core_service.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.core_service.dto.SleepRecordResponse;
import com.zeno.core_service.dto.SleepSyncRequest;
import com.zeno.core_service.dto.StepBucketResponse;
import com.zeno.core_service.dto.StepRecordRequest;
import com.zeno.core_service.service.AuthServiceClient;
import com.zeno.core_service.service.HealthMetricService;
import com.zeno.core_service.service.SleepInferenceService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core/health")
@RequiredArgsConstructor
public class HealthMetricController {

    private final HealthMetricService healthMetricService;
    private final SleepInferenceService sleepInferenceService;
    private final AuthServiceClient authServiceClient;

    private UUID getUserIdFromAuthService(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new com.zeno.core_service.exception.UnauthorizedException("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        return authServiceClient.validateAndGetUserId(token);
    }

    @PostMapping("/steps")
    public ResponseEntity<Void> recordSteps(HttpServletRequest request, @RequestBody StepRecordRequest recordRequest) {
        UUID userId = getUserIdFromAuthService(request);
        healthMetricService.recordSteps(userId, recordRequest.getSteps(), recordRequest.getDate());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/steps/today")
    public ResponseEntity<StepBucketResponse> getStepsToday(HttpServletRequest request) {
        UUID userId = getUserIdFromAuthService(request);
        return ResponseEntity.ok(healthMetricService.getStepsToday(userId));
    }

    @PostMapping("/sleep-sync")
    public ResponseEntity<SleepRecordResponse> syncSleepEvents(
            HttpServletRequest request,
            @RequestBody SleepSyncRequest syncRequest) {
        UUID userId = getUserIdFromAuthService(request);
        SleepRecordResponse response = sleepInferenceService.processSleepSync(userId, syncRequest);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sleep/latest")
    public ResponseEntity<SleepRecordResponse> getLatestSleep(HttpServletRequest request) {
        UUID userId = getUserIdFromAuthService(request);
        return ResponseEntity.ok(sleepInferenceService.getLatestSleep(userId));
    }

    @GetMapping("/sleep/weekly")
    public ResponseEntity<java.util.List<SleepRecordResponse>> getWeeklySleep(HttpServletRequest request) {
        UUID userId = getUserIdFromAuthService(request);
        return ResponseEntity.ok(sleepInferenceService.getWeeklySleep(userId));
    }
}

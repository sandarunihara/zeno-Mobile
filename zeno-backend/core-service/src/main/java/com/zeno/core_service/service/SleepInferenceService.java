package com.zeno.core_service.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zeno.core_service.dto.DeviceEventDto;
import com.zeno.core_service.dto.SleepRecordResponse;
import com.zeno.core_service.dto.SleepSyncRequest;
import com.zeno.core_service.entity.SleepRecord;
import com.zeno.core_service.repository.SleepRecordRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SleepInferenceService {

    private final SleepRecordRepository sleepRecordRepository;

    // If the user goes back to sleep within 20 minutes, bridge the blocks
    private static final long MAX_AWAKE_THRESHOLD_MILLIS = 20 * 60 * 1000;

    // Sanity bounds: reject inferred sleep outside this range
    private static final double MIN_SLEEP_HOURS = 2.0;
    private static final double MAX_SLEEP_HOURS = 16.0;

    /**
     * Process a batch of device events from the phone, run inference,
     * and persist the computed sleep record.
     */
    @Transactional
    public SleepRecordResponse processSleepSync(UUID userId, SleepSyncRequest request) {
        List<DeviceEventDto> events = request.getEvents();

        if (events == null || events.size() < 2) {
            return SleepRecordResponse.builder()
                    .success(false)
                    .message("Insufficient data points to infer sleep.")
                    .build();
        }

        // 1. Sort events chronologically
        events.sort(Comparator.comparingLong(DeviceEventDto::getTimestamp));

        // 2. Pair SUSPENDED→RESUMED into validated sleep segments
        List<SleepSegment> segments = buildSleepSegments(events);

        if (segments.isEmpty()) {
            return SleepRecordResponse.builder()
                    .success(false)
                    .message("No valid sleep segments found. Environment conditions did not match sleep.")
                    .build();
        }

        // 3. Consolidate segments (bridge micro-awakenings)
        ConsolidationResult result = consolidateSegments(segments);

        if (result.totalSleepHours < MIN_SLEEP_HOURS || result.totalSleepHours > MAX_SLEEP_HOURS) {
            return SleepRecordResponse.builder()
                    .success(false)
                    .message("Inferred sleep duration (" + result.totalSleepHours +
                            "h) is outside valid range [2h–16h]. Likely idle phone, not actual sleep.")
                    .build();
        }

        // 4. Determine sleep date (the date the user went to sleep)
        LocalDateTime sleepStart = epochToLocalDateTime(result.sleepStartTimestamp);
        LocalDateTime sleepEnd = epochToLocalDateTime(result.sleepEndTimestamp);
        LocalDate sleepDate = sleepStart.toLocalDate();

        // 5. Build interruption timestamps JSON
        String interruptionJson = result.interruptionTimestamps.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));

        // 6. Upsert: update if same user+date exists, otherwise create new
        Optional<SleepRecord> existing = sleepRecordRepository.findByUserIdAndSleepDate(userId, sleepDate);
        SleepRecord record;

        if (existing.isPresent()) {
            record = existing.get();
            record.setSleepStartTime(sleepStart);
            record.setSleepEndTime(sleepEnd);
            record.setTotalSleepHours(result.totalSleepHours);
            record.setMicroAwakeningsCount(result.microAwakeningsCount);
            record.setInterruptionTimestamps(interruptionJson);
            record.setEnvironmentVerified(true);
        } else {
            record = SleepRecord.builder()
                    .userId(userId)
                    .sleepDate(sleepDate)
                    .sleepStartTime(sleepStart)
                    .sleepEndTime(sleepEnd)
                    .totalSleepHours(result.totalSleepHours)
                    .microAwakeningsCount(result.microAwakeningsCount)
                    .interruptionTimestamps(interruptionJson)
                    .environmentVerified(true)
                    .build();
        }

        sleepRecordRepository.save(record);

        log.info("Sleep record saved for user {} on {}: {}h with {} micro-awakenings",
                userId, sleepDate, result.totalSleepHours, result.microAwakeningsCount);

        return buildResponse(record);
    }

    /**
     * Get the latest sleep record for a user.
     */
    public SleepRecordResponse getLatestSleep(UUID userId) {
        Optional<SleepRecord> latest = sleepRecordRepository.findTopByUserIdOrderBySleepDateDesc(userId);

        if (latest.isEmpty()) {
            return SleepRecordResponse.builder()
                    .success(false)
                    .message("No sleep data recorded yet.")
                    .build();
        }

        return buildResponse(latest.get());
    }

    /**
     * Get sleep records for the last 7 days.
     */
    public List<SleepRecordResponse> getWeeklySleep(UUID userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(6); // 7 days inclusive

        List<SleepRecord> records = sleepRecordRepository.findByUserIdAndSleepDateBetweenOrderBySleepDateDesc(
                userId, startDate, endDate);

        return records.stream()
                .map(this::buildResponse)
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────
    //  INTERNAL: Sleep Segment Building (Multi-Sensor Validation)
    // ──────────────────────────────────────────────────────────

    private List<SleepSegment> buildSleepSegments(List<DeviceEventDto> events) {
        List<SleepSegment> segments = new ArrayList<>();
        DeviceEventDto activeSuspend = null;

        for (DeviceEventDto event : events) {
            if ("SUSPENDED".equals(event.getType())) {
                // Validate environment: lux must be dark (≤ 1.0) OR phone face-down (NEAR)
                boolean isDark = event.getLux() != null && event.getLux() <= 1.0;
                boolean isFaceDown = "NEAR".equals(event.getProximity());

                if (isDark || isFaceDown) {
                    activeSuspend = event;
                }
            } else if ("RESUMED".equals(event.getType()) && activeSuspend != null) {
                segments.add(new SleepSegment(
                        activeSuspend.getTimestamp(),
                        event.getTimestamp()
                ));
                activeSuspend = null;
            }
        }

        return segments;
    }

    // ──────────────────────────────────────────────────────────
    //  INTERNAL: Sleep Block Consolidation (Bridge Algorithm)
    // ──────────────────────────────────────────────────────────

    private ConsolidationResult consolidateSegments(List<SleepSegment> segments) {
        long totalSleepMillis = 0;
        int microAwakenings = 0;
        List<Long> interruptionTimestamps = new ArrayList<>();

        SleepSegment baseSegment = segments.get(0);
        totalSleepMillis += baseSegment.getDuration();

        long overallStart = baseSegment.startTimestamp;
        long overallEnd = baseSegment.endTimestamp;

        for (int i = 1; i < segments.size(); i++) {
            SleepSegment nextSegment = segments.get(i);
            long awakeGap = nextSegment.startTimestamp - baseSegment.endTimestamp;

            if (awakeGap <= MAX_AWAKE_THRESHOLD_MILLIS) {
                // Bridge confirmed — micro-awakening
                totalSleepMillis += nextSegment.getDuration();
                microAwakenings++;
                interruptionTimestamps.add(baseSegment.endTimestamp);
                overallEnd = nextSegment.endTimestamp;
                baseSegment = nextSegment;
            } else {
                // Gap too long — stop consolidating
                break;
            }
        }

        double totalHours = (double) totalSleepMillis / (1000.0 * 60.0 * 60.0);
        totalHours = Math.round(totalHours * 10.0) / 10.0;

        return new ConsolidationResult(totalHours, overallStart, overallEnd,
                microAwakenings, interruptionTimestamps);
    }

    // ──────────────────────────────────────────────────────────
    //  INTERNAL: Helpers
    // ──────────────────────────────────────────────────────────

    private LocalDateTime epochToLocalDateTime(long epochMillis) {
        return LocalDateTime.ofInstant(
                Instant.ofEpochMilli(epochMillis),
                ZoneId.systemDefault()
        );
    }

    private SleepRecordResponse buildResponse(SleepRecord record) {
        List<Long> interruptions = parseInterruptionTimestamps(record.getInterruptionTimestamps());

        return SleepRecordResponse.builder()
                .success(true)
                .message("Sleep data retrieved successfully.")
                .totalSleepHours(record.getTotalSleepHours())
                .sleepStartTime(record.getSleepStartTime()
                        .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .sleepEndTime(record.getSleepEndTime()
                        .atZone(ZoneId.systemDefault()).toInstant().toEpochMilli())
                .microAwakeningsCount(record.getMicroAwakeningsCount())
                .interruptionTimes(interruptions)
                .sleepDate(record.getSleepDate().toString())
                .build();
    }

    private List<Long> parseInterruptionTimestamps(String json) {
        List<Long> result = new ArrayList<>();
        if (json == null || json.equals("[]")) return result;

        String cleaned = json.replace("[", "").replace("]", "").trim();
        if (cleaned.isEmpty()) return result;

        for (String part : cleaned.split(",")) {
            try {
                result.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException e) {
                // skip malformed entries
            }
        }
        return result;
    }

    // ──────────────────────────────────────────────────────────
    //  INTERNAL: Data Classes
    // ──────────────────────────────────────────────────────────

    private static class SleepSegment {
        final long startTimestamp;
        final long endTimestamp;

        SleepSegment(long startTimestamp, long endTimestamp) {
            this.startTimestamp = startTimestamp;
            this.endTimestamp = endTimestamp;
        }

        long getDuration() {
            return endTimestamp - startTimestamp;
        }
    }

    private static class ConsolidationResult {
        final double totalSleepHours;
        final long sleepStartTimestamp;
        final long sleepEndTimestamp;
        final int microAwakeningsCount;
        final List<Long> interruptionTimestamps;

        ConsolidationResult(double totalSleepHours, long sleepStartTimestamp,
                            long sleepEndTimestamp, int microAwakeningsCount,
                            List<Long> interruptionTimestamps) {
            this.totalSleepHours = totalSleepHours;
            this.sleepStartTimestamp = sleepStartTimestamp;
            this.sleepEndTimestamp = sleepEndTimestamp;
            this.microAwakeningsCount = microAwakeningsCount;
            this.interruptionTimestamps = interruptionTimestamps;
        }
    }
}

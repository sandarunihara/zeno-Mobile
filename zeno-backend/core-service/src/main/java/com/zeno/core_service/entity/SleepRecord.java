package com.zeno.core_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sleep_records", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "sleep_date"}),
    indexes = {
        @Index(name = "idx_sleep_records_user_date", columnList = "user_id, sleep_date")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SleepRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "sleep_date", nullable = false)
    private LocalDate sleepDate;

    @Column(name = "sleep_start_time", nullable = false)
    private LocalDateTime sleepStartTime;

    @Column(name = "sleep_end_time", nullable = false)
    private LocalDateTime sleepEndTime;

    @Column(name = "total_sleep_hours", nullable = false)
    private Double totalSleepHours;

    @Column(name = "micro_awakenings_count", nullable = false)
    private Integer microAwakeningsCount;

    @Column(name = "interruption_timestamps", columnDefinition = "TEXT")
    private String interruptionTimestamps; // JSON array of epoch ms strings

    @Column(name = "environment_verified", nullable = false)
    private Boolean environmentVerified;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

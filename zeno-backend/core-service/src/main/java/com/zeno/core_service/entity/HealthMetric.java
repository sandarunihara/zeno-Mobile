package com.zeno.core_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "health_metrics", indexes = {
    @Index(name = "idx_health_metrics_user_type_logged", columnList = "user_id, metric_type, logged_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "metric_type", nullable = false, length = 50)
    private String metricType; // e.g. "STEP_COUNT"

    @Column(name = "value", nullable = false)
    private Integer value;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    protected void onCreate() {
        if (this.loggedAt == null) {
            this.loggedAt = LocalDateTime.now();
        }
    }
}

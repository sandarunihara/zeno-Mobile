package com.zeno.core_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mood_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // BIGSERIAL [cite: 284]

    @Column(name = "user_id", nullable = false)
    private UUID userId; // [cite: 284]

    @Column(name = "energy_score", nullable = false)
    private Integer energyScore; // 1 to 10 [cite: 285]

    @Column(name = "sentiment")
    private String sentiment; // e.g., "anxious" [cite: 285]

    @Column(name = "data_source", nullable = false, length = 50)
    private String dataSource; // 'sensor' or 'manual' [cite: 285]

    @Column(name = "logged_at")
    private LocalDateTime loggedAt; // [cite: 285]
    
    @PrePersist
    protected void onCreate() {
        this.loggedAt = LocalDateTime.now();
    }

    @Column(name = "isLight")
    private Boolean isLight;
}
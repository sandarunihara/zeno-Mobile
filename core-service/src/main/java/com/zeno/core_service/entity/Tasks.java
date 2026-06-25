package com.zeno.core_service.entity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@Table(name = "tasks")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tasks {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "effort_level")
    private String effort_level;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "estimated_time")
    private Integer estimatedTime;

    @Column(name = "is_critical")
    private Boolean is_critical;

    @Column(name = "status")
    private String status;

    @Column(name = "parent_task_id")
    private Long parentTaskId;

    @Column(name = "has_micro_steps")
    private Boolean hasMicroSteps;

    @Transient // Tells Hibernate to include this in JSON, but NOT in PostgreSQL
    private List<Tasks> microSteps;

    @Column(name = "is_from_calender")
    private Boolean isFromCalender;

    @Column(name = "calender_event_id")
    private String calenderEventId;

    @Column(name = "calender_event_etag")
    private String calenderEventEtag;
}

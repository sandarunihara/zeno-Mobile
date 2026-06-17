package com.zeno.core_service.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private Long id;
    private UUID userId;
    private String title;
    private String description;
    private String effort_level;
    private LocalDateTime deadline;
    private Boolean is_critical;
    private String status;
    private Long parentTaskId;
    private Boolean hasMicroSteps;
    private List<TaskDto> microSteps;
}

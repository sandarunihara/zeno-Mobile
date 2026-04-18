package com.zeno.core_service.dto;

import java.util.List;

import com.zeno.core_service.entity.Tasks;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class Taskfullresponce {
    private Boolean success;
    private Tasks task;
    private List<Tasks> microSteps;
    private Tasks parentTask; // Optional: Include parent task details if this is a micro-step
    private String message;
}

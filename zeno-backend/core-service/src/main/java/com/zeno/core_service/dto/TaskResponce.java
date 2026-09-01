package com.zeno.core_service.dto;

import com.zeno.core_service.entity.Tasks;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TaskResponce {
    private Boolean success;
    private Tasks task;
    private String message;
}

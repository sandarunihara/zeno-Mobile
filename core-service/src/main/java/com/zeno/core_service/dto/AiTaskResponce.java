package com.zeno.core_service.dto;

import java.util.List;

import com.zeno.core_service.entity.Tasks;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AiTaskResponce {
    private Boolean success;
    private List<Tasks> task;
    private String message;
}

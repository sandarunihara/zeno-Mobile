package com.zeno.core_service.dto;

import com.zeno.core_service.entity.MoodLog;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class Moodlog {

    private Boolean success;
    private MoodLog moodLog;
    private String message;
    
}

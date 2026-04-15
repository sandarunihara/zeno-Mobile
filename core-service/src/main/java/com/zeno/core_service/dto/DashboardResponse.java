package com.zeno.core_service.dto;

import java.util.List;

import com.zeno.core_service.entity.Tasks;

public record DashboardResponse(
    Integer currentEnergyScore,
    String empatheticMessage, // "You're exhausted, I hid the big stuff."
    Boolean askConsent,       // Scenario 2: If true, show "Keep it light?" buttons
    List<Tasks> displayTasks   // The filtered list of tasks to show right now
) {}
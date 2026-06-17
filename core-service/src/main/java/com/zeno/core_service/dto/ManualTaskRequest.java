package com.zeno.core_service.dto;

public record ManualTaskRequest(
    String title,
    String description,
    String effortLevel,
    String deadline,
    Boolean isCritical,
    String status
) {}

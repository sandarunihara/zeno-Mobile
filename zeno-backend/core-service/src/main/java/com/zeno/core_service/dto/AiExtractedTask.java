package com.zeno.core_service.dto;

public record AiExtractedTask(
    String title,
    String description,
    String effortLevel,
    String deadline
) {}

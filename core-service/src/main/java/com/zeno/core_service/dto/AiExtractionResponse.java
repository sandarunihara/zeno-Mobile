package com.zeno.core_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AiExtractionResponse(
    List<AiExtractedTask> tasks,
    AiExtractedMood mood
) {
    public record AiExtractedTask(String title,String description, String effortLevel, LocalDateTime deadline) {}
    public record AiExtractedMood(Integer energyScore, String sentiment) {}
}
package com.zeno.core_service.dto;

public record FreeTimeSlotDto(
    String from,
    String to,
    Integer durationInMinutes
) {}

package com.zeno.core_service.dto;

import java.util.List;

public record FreeTimeResponse(
    List<FreeTimeSlotDto> freeTimeSlots,
    Integer totalFreeTimeInMinutes
) {}

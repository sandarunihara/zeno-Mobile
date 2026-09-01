package com.zeno.core_service.dto;

import java.util.List;

public record AiEstimationResponse(
    List<AiEstimationDto> estimations
) {}

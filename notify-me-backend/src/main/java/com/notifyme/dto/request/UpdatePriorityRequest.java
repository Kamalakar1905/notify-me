package com.notifyme.dto.request;

import com.notifyme.model.enums.Priority;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdatePriorityRequest {
    @NotNull
    private Priority priority;
}

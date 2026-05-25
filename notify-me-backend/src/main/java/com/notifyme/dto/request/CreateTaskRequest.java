package com.notifyme.dto.request;

import com.notifyme.model.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
public class CreateTaskRequest {

    @NotBlank
    @Size(max = 500)
    private String title;

    private String description;

    private Priority priority = Priority.MEDIUM;

    private Instant dueDate;

    private Instant reminderAt;

    private String timezone = "UTC";

    private UUID categoryId;

    private Boolean isRecurring = false;

    // { "type": "DAILY|WEEKLY|MONTHLY|CUSTOM", "interval": 1, "days": ["MON","WED"], "endDate": null, "count": null }
    private Map<String, Object> recurrenceRule;

    private Boolean suggestionEnabled = true;
}

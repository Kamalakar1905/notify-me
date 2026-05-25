package com.notifyme.dto.response;

import com.notifyme.model.enums.Priority;
import com.notifyme.model.enums.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private Priority priority;
    private TaskStatus status;
    private Instant dueDate;
    private Instant reminderAt;
    private String timezone;
    private Boolean isRecurring;
    private Map<String, Object> recurrenceRule;
    private UUID parentTaskId;
    private Boolean suggestionEnabled;
    private Instant suggestedReminder;
    private Instant completedAt;
    private Instant snoozedUntil;
    private Integer snoozeCount;
    private UUID categoryId;
    private String categoryName;
    private Instant createdAt;
    private Instant updatedAt;
}

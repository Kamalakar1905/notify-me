package com.notifyme.dto.response;

import com.notifyme.model.enums.NotificationStatus;
import com.notifyme.model.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class NotificationHistoryResponse {
    private UUID id;
    private UUID taskId;
    private String taskTitle;
    private String title;
    private String body;
    private NotificationType notificationType;
    private String channel;
    private NotificationStatus status;
    private Instant sentAtUtc;
    private Instant openedAtUtc;
    private Integer retryCount;
    private Instant createdAt;
}

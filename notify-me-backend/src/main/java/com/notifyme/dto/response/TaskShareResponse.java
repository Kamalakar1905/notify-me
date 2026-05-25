package com.notifyme.dto.response;

import com.notifyme.model.enums.ShareStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class TaskShareResponse {
    private UUID id;
    private TaskResponse task;
    private String ownerName;
    private String ownerEmail;
    private ShareStatus status;
    private Instant createdAt;
}

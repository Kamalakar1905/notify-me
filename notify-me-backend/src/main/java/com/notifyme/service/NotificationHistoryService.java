package com.notifyme.service;

import com.notifyme.dto.response.NotificationHistoryResponse;
import com.notifyme.exception.ResourceNotFoundException;
import com.notifyme.model.NotificationHistory;
import com.notifyme.model.enums.NotificationStatus;
import com.notifyme.repository.NotificationHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationHistoryService {

    private final NotificationHistoryRepository repository;
    private final ExportService exportService;

    @Transactional(readOnly = true)
    public Page<NotificationHistoryResponse> getHistory(UUID userId, String search,
                                                         NotificationStatus status,
                                                         Instant from, Instant to,
                                                         Pageable pageable) {
        return repository.searchNotifications(userId, search, status, from, to, pageable)
                .map(this::mapToResponse);
    }

    public void deleteNotification(UUID notificationId, UUID userId) {
        NotificationHistory n = repository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        repository.delete(n);
    }

    public int bulkDelete(List<UUID> ids, UUID userId) {
        return repository.bulkDeleteByIds(ids, userId);
    }

    public byte[] exportHistory(UUID userId, String format, Instant from, Instant to) {
        List<NotificationHistory> records = repository
                .findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(userId, from, to);
        return switch (format.toUpperCase()) {
            case "CSV" -> exportService.exportToCsv(records);
            case "XLSX" -> exportService.exportToExcel(records);
            case "PDF" -> exportService.exportToPdf(records);
            default -> throw new IllegalArgumentException("Unsupported format: " + format);
        };
    }

    private NotificationHistoryResponse mapToResponse(NotificationHistory n) {
        return NotificationHistoryResponse.builder()
                .id(n.getId())
                .taskId(n.getTask() != null ? n.getTask().getId() : null)
                .taskTitle(n.getTask() != null ? n.getTask().getTitle() : null)
                .title(n.getTitle())
                .body(n.getBody())
                .notificationType(n.getNotificationType())
                .channel(n.getChannel())
                .status(n.getStatus())
                .sentAtUtc(n.getSentAtUtc())
                .openedAtUtc(n.getOpenedAtUtc())
                .retryCount(n.getRetryCount())
                .createdAt(n.getCreatedAt())
                .build();
    }
}

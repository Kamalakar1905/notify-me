package com.notifyme.controller;

import com.notifyme.dto.response.ApiResponse;
import com.notifyme.dto.response.NotificationHistoryResponse;
import com.notifyme.model.enums.NotificationStatus;
import com.notifyme.security.SecurityUtils;
import com.notifyme.service.NotificationHistoryService;
import com.notifyme.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationHistoryService historyService;
    private final NotificationService notificationService;

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<NotificationHistoryResponse>>> getHistory(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                historyService.getHistory(userId, search, status, from, to, pageable)));
    }

    @PatchMapping("/{id}/open")
    public ResponseEntity<ApiResponse<Void>> markOpened(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        notificationService.markOpened(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Marked as opened", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        historyService.deleteNotification(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted", null));
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<ApiResponse<Integer>> bulkDelete(@RequestBody List<UUID> ids) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int deleted = historyService.bulkDelete(ids, userId);
        return ResponseEntity.ok(ApiResponse.success("Deleted " + deleted + " notifications", deleted));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportHistory(
            @RequestParam(defaultValue = "CSV") String format,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        UUID userId = SecurityUtils.getCurrentUserId();
        if (from == null) from = Instant.now().minusSeconds(2592000); // 30 days
        if (to == null) to = Instant.now();

        byte[] data = historyService.exportHistory(userId, format, from, to);
        String contentType = switch (format.toUpperCase()) {
            case "XLSX" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "PDF" -> "application/pdf";
            default -> "text/csv";
        };
        String filename = "notifications." + format.toLowerCase();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }
}

package com.notifyme.controller;

import com.notifyme.dto.response.AnalyticsDashboardResponse;
import com.notifyme.dto.response.ApiResponse;
import com.notifyme.security.SecurityUtils;
import com.notifyme.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AnalyticsDashboardResponse>> getDashboard(
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false, defaultValue = "UTC") String timezone) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getDashboard(userId, from, to, timezone)));
    }
}

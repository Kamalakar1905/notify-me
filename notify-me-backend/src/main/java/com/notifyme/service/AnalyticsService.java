package com.notifyme.service;

import com.notifyme.dto.response.AnalyticsDashboardResponse;
import com.notifyme.model.enums.Priority;
import com.notifyme.model.enums.TaskStatus;
import com.notifyme.repository.NotificationHistoryRepository;
import com.notifyme.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final TaskRepository taskRepository;
    private final NotificationHistoryRepository notificationHistoryRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "analytics", key = "#userId + ':' + #from + ':' + #to")
    public AnalyticsDashboardResponse getDashboard(UUID userId, Instant from, Instant to, String timezone) {
        if (from == null) from = Instant.now().minus(30, ChronoUnit.DAYS);
        if (to == null) to = Instant.now();
        if (timezone == null) timezone = "UTC";

        long total = taskRepository.count();
        long completed = taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED);
        long overdue = taskRepository.findOverdueTasks(userId, Instant.now()).size();
        long pending = taskRepository.countByUserIdAndStatus(userId, TaskStatus.PENDING);

        double completionRate = total > 0 ? (double) completed / total * 100 : 0;

        long remindersSent = notificationHistoryRepository.countSentInRange(userId, from, to);
        long remindersOpened = notificationHistoryRepository.countOpenedInRange(userId, from, to);
        double openRate = remindersSent > 0 ? (double) remindersOpened / remindersSent * 100 : 0;

        // Completion trend
        List<Object[]> trendRaw = taskRepository.getCompletionTrend(userId, from, to, timezone);
        List<Map<String, Object>> trend = trendRaw.stream().map(row -> {
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", row[0].toString());
            point.put("count", ((Number) row[1]).longValue());
            return point;
        }).toList();

        // Heatmap
        List<Object[]> heatmapRaw = taskRepository.getCompletionHeatmap(userId,
                Instant.now().minus(90, ChronoUnit.DAYS), timezone);
        List<Map<String, Object>> heatmap = heatmapRaw.stream().map(row -> {
            Map<String, Object> cell = new LinkedHashMap<>();
            cell.put("dow", ((Number) row[0]).intValue());
            cell.put("hour", ((Number) row[1]).intValue());
            cell.put("count", ((Number) row[2]).longValue());
            return cell;
        }).toList();

        // Priority distribution
        Map<String, Long> priorityDist = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            priorityDist.put(p.name(), 0L);
        }

        return AnalyticsDashboardResponse.builder()
                .totalTasks(total)
                .completedTasks(completed)
                .overdueTasks(overdue)
                .pendingTasks(pending)
                .completionRate(Math.round(completionRate * 10.0) / 10.0)
                .remindersSent(remindersSent)
                .remindersOpened(remindersOpened)
                .reminderOpenRate(Math.round(openRate * 10.0) / 10.0)
                .completionTrend(trend)
                .heatmap(heatmap)
                .priorityDistribution(priorityDist)
                .build();
    }
}

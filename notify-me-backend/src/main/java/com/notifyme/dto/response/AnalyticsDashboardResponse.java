package com.notifyme.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AnalyticsDashboardResponse {
    private long totalTasks;
    private long completedTasks;
    private long overdueTasks;
    private long pendingTasks;
    private double completionRate;
    private long remindersSent;
    private long remindersOpened;
    private double reminderOpenRate;
    private long totalSnoozed;
    private double snoozeRate;
    private int productivityStreak; // consecutive days with at least 1 completion

    // Trend data: [{date: "2024-01-01", count: 5}, ...]
    private List<Map<String, Object>> completionTrend;
    private List<Map<String, Object>> overdueTrend;

    // Heatmap: [{dow: 1, hour: 9, count: 12}, ...]
    private List<Map<String, Object>> heatmap;

    // Priority distribution: {LOW: 10, MEDIUM: 20, HIGH: 5, CRITICAL: 2}
    private Map<String, Long> priorityDistribution;
}

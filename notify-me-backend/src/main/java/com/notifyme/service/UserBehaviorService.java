package com.notifyme.service;

import com.notifyme.model.User;
import com.notifyme.model.UserBehaviorStats;
import com.notifyme.repository.UserBehaviorStatsRepository;
import com.notifyme.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserBehaviorService {

    private final UserBehaviorStatsRepository statsRepository;
    private final UserRepository userRepository;

    @Async
    @Transactional
    public void recordCompletion(UUID userId, Instant completedAt) {
        ZonedDateTime zdt = completedAt.atZone(ZoneOffset.UTC);
        updateStats(userId, (short) zdt.getHour(), (short) zdt.getDayOfWeek().getValue(),
                true, false, false, false);
    }

    @Async
    @Transactional
    public void recordReminderOpen(UUID userId, Instant openedAt) {
        ZonedDateTime zdt = openedAt.atZone(ZoneOffset.UTC);
        updateStats(userId, (short) zdt.getHour(), (short) zdt.getDayOfWeek().getValue(),
                false, true, false, false);
    }

    @Async
    @Transactional
    public void recordSnooze(UUID userId, Instant snoozedAt) {
        ZonedDateTime zdt = snoozedAt.atZone(ZoneOffset.UTC);
        updateStats(userId, (short) zdt.getHour(), (short) zdt.getDayOfWeek().getValue(),
                false, false, true, false);
    }

    @Async
    @Transactional
    public void recordDismiss(UUID userId, Instant dismissedAt) {
        ZonedDateTime zdt = dismissedAt.atZone(ZoneOffset.UTC);
        updateStats(userId, (short) zdt.getHour(), (short) zdt.getDayOfWeek().getValue(),
                false, false, false, true);
    }

    private void updateStats(UUID userId, short hour, short dow,
                              boolean completion, boolean open, boolean snooze, boolean dismiss) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserBehaviorStats stats = statsRepository
                .findByUserIdAndHourOfDayAndDayOfWeek(userId, hour, dow)
                .orElseGet(() -> UserBehaviorStats.builder()
                        .user(user)
                        .hourOfDay(hour)
                        .dayOfWeek(dow)
                        .build());

        if (completion) stats.setCompletionCount(stats.getCompletionCount() + 1);
        if (open) stats.setReminderOpenCount(stats.getReminderOpenCount() + 1);
        if (snooze) stats.setSnoozeCount(stats.getSnoozeCount() + 1);
        if (dismiss) stats.setDismissCount(stats.getDismissCount() + 1);
        stats.setUpdatedAt(Instant.now());

        statsRepository.save(stats);
    }
}

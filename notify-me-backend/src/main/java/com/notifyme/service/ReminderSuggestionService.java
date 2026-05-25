package com.notifyme.service;

import com.notifyme.model.UserBehaviorStats;
import com.notifyme.repository.UserBehaviorStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderSuggestionService {

    private final UserBehaviorStatsRepository behaviorStatsRepository;

    /**
     * Suggests the best reminder time based on user's historical engagement patterns.
     * Falls back to 1 hour before due date if no data available.
     */
    @Transactional(readOnly = true)
    public Instant suggestReminderTime(UUID userId, Instant dueDate) {
        List<UserBehaviorStats> topSlots = behaviorStatsRepository.findTopEngagementSlots(userId);

        if (topSlots.isEmpty() || dueDate == null) {
            // Default: 1 hour before due date or tomorrow morning
            if (dueDate != null) {
                return dueDate.minus(Duration.ofHours(1));
            }
            return ZonedDateTime.now(ZoneOffset.UTC)
                    .plusDays(1)
                    .withHour(9)
                    .withMinute(0)
                    .withSecond(0)
                    .toInstant();
        }

        // Find the best slot that is before the due date
        ZonedDateTime dueDateUtc = dueDate.atZone(ZoneOffset.UTC);
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        for (UserBehaviorStats slot : topSlots) {
            ZonedDateTime candidate = now.plusDays(1)
                    .withHour(slot.getHourOfDay())
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0);

            if (candidate.isBefore(dueDateUtc) && candidate.isAfter(now)) {
                return candidate.toInstant();
            }
        }

        // Fallback: 2 hours before due date
        return dueDate.minus(Duration.ofHours(2));
    }

    /**
     * Returns suggestion cards for the task creation UI.
     */
    @Transactional(readOnly = true)
    public List<SuggestionCard> getSuggestions(UUID userId, Instant dueDate) {
        List<SuggestionCard> suggestions = new ArrayList<>();
        List<UserBehaviorStats> topSlots = behaviorStatsRepository.findTopEngagementSlots(userId);

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        // Suggestion 1: Based on behavior
        if (!topSlots.isEmpty()) {
            UserBehaviorStats best = topSlots.get(0);
            ZonedDateTime suggested = now.plusDays(1)
                    .withHour(best.getHourOfDay())
                    .withMinute(0)
                    .withSecond(0);
            suggestions.add(new SuggestionCard(
                    "Based on your activity patterns",
                    suggested.toInstant(),
                    "BEHAVIOR_BASED"
            ));
        }

        // Suggestion 2: Morning reminder
        ZonedDateTime morning = now.plusDays(1).withHour(9).withMinute(0).withSecond(0);
        suggestions.add(new SuggestionCard("Morning reminder", morning.toInstant(), "MORNING"));

        // Suggestion 3: 1 hour before due
        if (dueDate != null) {
            suggestions.add(new SuggestionCard(
                    "1 hour before due date",
                    dueDate.minus(Duration.ofHours(1)),
                    "BEFORE_DUE"
            ));
        }

        return suggestions;
    }

    public record SuggestionCard(String label, Instant suggestedTime, String type) {}
}

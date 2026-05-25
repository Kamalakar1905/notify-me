package com.notifyme.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_behavior_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBehaviorStats {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "hour_of_day", nullable = false)
    private Short hourOfDay;

    @Column(name = "day_of_week", nullable = false)
    private Short dayOfWeek;

    @Column(name = "completion_count", nullable = false)
    @Builder.Default
    private Integer completionCount = 0;

    @Column(name = "reminder_open_count", nullable = false)
    @Builder.Default
    private Integer reminderOpenCount = 0;

    @Column(name = "snooze_count", nullable = false)
    @Builder.Default
    private Integer snoozeCount = 0;

    @Column(name = "dismiss_count", nullable = false)
    @Builder.Default
    private Integer dismissCount = 0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}

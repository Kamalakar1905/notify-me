package com.notifyme.repository;

import com.notifyme.model.UserBehaviorStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBehaviorStatsRepository extends JpaRepository<UserBehaviorStats, UUID> {

    Optional<UserBehaviorStats> findByUserIdAndHourOfDayAndDayOfWeek(
            UUID userId, Short hourOfDay, Short dayOfWeek);

    List<UserBehaviorStats> findByUserIdOrderByCompletionCountDesc(UUID userId);

    // Top 3 best hours for a user based on completion + open rate
    @Query("""
        SELECT s FROM UserBehaviorStats s
        WHERE s.user.id = :userId
        ORDER BY (s.completionCount + s.reminderOpenCount) DESC
        """)
    List<UserBehaviorStats> findTopEngagementSlots(UUID userId);
}

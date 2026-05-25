package com.notifyme.repository;

import com.notifyme.model.Task;
import com.notifyme.model.enums.Priority;
import com.notifyme.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    // Find tasks for a user with sorting by priority then reminder time
    @Query("""
        SELECT t FROM Task t
        WHERE t.user.id = :userId
        ORDER BY
            CASE t.priority
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
            END,
            t.reminderAt ASC NULLS LAST,
            t.dueDate ASC NULLS LAST
        """)
    Page<Task> findByUserIdOrderByPriorityAndReminder(@Param("userId") UUID userId, Pageable pageable);

    // Tasks due for reminder (scheduler query)
    @Query("""
        SELECT t FROM Task t
        WHERE t.reminderAt BETWEEN :from AND :to
        AND t.status = 'PENDING'
        AND t.user.isActive = true
        """)
    List<Task> findTasksDueForReminder(@Param("from") Instant from, @Param("to") Instant to);

    // Overdue tasks
    @Query("""
        SELECT t FROM Task t
        WHERE t.user.id = :userId
        AND t.dueDate < :now
        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        """)
    List<Task> findOverdueTasks(@Param("userId") UUID userId, @Param("now") Instant now);

    // Recurring parent tasks
    List<Task> findByUserIdAndIsRecurringTrueAndParentTaskIsNull(UUID userId);

    // Tasks by status
    Page<Task> findByUserIdAndStatus(UUID userId, TaskStatus status, Pageable pageable);

    // Tasks by priority
    Page<Task> findByUserIdAndPriority(UUID userId, Priority priority, Pageable pageable);

    // Analytics: count by status in date range
    @Query("""
        SELECT t.status, COUNT(t) FROM Task t
        WHERE t.user.id = :userId
        AND t.createdAt BETWEEN :from AND :to
        GROUP BY t.status
        """)
    List<Object[]> countByStatusInRange(@Param("userId") UUID userId,
                                         @Param("from") Instant from,
                                         @Param("to") Instant to);

    // Analytics: completion trend by day
    @Query(value = """
        SELECT DATE(completed_at AT TIME ZONE :timezone) as day, COUNT(*) as count
        FROM tasks
        WHERE user_id = :userId
        AND completed_at BETWEEN :from AND :to
        GROUP BY day
        ORDER BY day
        """, nativeQuery = true)
    List<Object[]> getCompletionTrend(@Param("userId") UUID userId,
                                       @Param("from") Instant from,
                                       @Param("to") Instant to,
                                       @Param("timezone") String timezone);

    // Heatmap: completions by hour and day of week
    @Query(value = """
        SELECT EXTRACT(DOW FROM completed_at AT TIME ZONE :timezone) as dow,
               EXTRACT(HOUR FROM completed_at AT TIME ZONE :timezone) as hour,
               COUNT(*) as count
        FROM tasks
        WHERE user_id = :userId
        AND completed_at IS NOT NULL
        AND completed_at >= :since
        GROUP BY dow, hour
        """, nativeQuery = true)
    List<Object[]> getCompletionHeatmap(@Param("userId") UUID userId,
                                         @Param("since") Instant since,
                                         @Param("timezone") String timezone);

    Optional<Task> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
        SELECT t FROM Task t
        WHERE t.user.id = :userId
        AND t.dueDate = :dueDate
        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        """)
    List<Task> findConflictingTasks(@Param("userId") UUID userId, @Param("dueDate") Instant dueDate);

    long countByUserIdAndStatus(UUID userId, TaskStatus status);
}

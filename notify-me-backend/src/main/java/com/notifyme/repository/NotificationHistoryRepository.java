package com.notifyme.repository;

import com.notifyme.model.NotificationHistory;
import com.notifyme.model.enums.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationHistoryRepository extends JpaRepository<NotificationHistory, UUID> {

    Page<NotificationHistory> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
        SELECT n FROM NotificationHistory n
        WHERE n.user.id = :userId
        AND (:search IS NULL OR LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:status IS NULL OR n.status = :status)
        AND (:from IS NULL OR n.createdAt >= :from)
        AND (:to IS NULL OR n.createdAt <= :to)
        ORDER BY n.createdAt DESC
        """)
    Page<NotificationHistory> searchNotifications(
            @Param("userId") UUID userId,
            @Param("search") String search,
            @Param("status") NotificationStatus status,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    // Notifications pending retry
    @Query("""
        SELECT n FROM NotificationHistory n
        WHERE n.status = 'FAILED'
        AND n.retryCount < n.maxRetries
        AND n.nextRetryAt <= :now
        """)
    List<NotificationHistory> findPendingRetries(@Param("now") Instant now);

    Optional<NotificationHistory> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("DELETE FROM NotificationHistory n WHERE n.id IN :ids AND n.user.id = :userId")
    int bulkDeleteByIds(@Param("ids") List<UUID> ids, @Param("userId") UUID userId);

    // Analytics
    @Query("""
        SELECT COUNT(n) FROM NotificationHistory n
        WHERE n.user.id = :userId
        AND n.sentAtUtc BETWEEN :from AND :to
        """)
    long countSentInRange(@Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("""
        SELECT COUNT(n) FROM NotificationHistory n
        WHERE n.user.id = :userId
        AND n.openedAtUtc BETWEEN :from AND :to
        """)
    long countOpenedInRange(@Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);

    List<NotificationHistory> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            UUID userId, Instant from, Instant to);
}

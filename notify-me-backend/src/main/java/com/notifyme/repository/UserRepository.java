package com.notifyme.repository;

import com.notifyme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByMobileNumber(String mobileNumber);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    boolean existsByMobileNumber(String mobileNumber);

    @Modifying
    @Query("UPDATE User u SET u.fcmToken = :fcmToken, u.updatedAt = CURRENT_TIMESTAMP WHERE u.id = :userId")
    void updateFcmToken(UUID userId, String fcmToken);

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = CURRENT_TIMESTAMP WHERE u.id = :userId")
    void updateLastLogin(UUID userId);
}

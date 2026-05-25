package com.notifyme.repository;

import com.notifyme.model.OtpRecord;
import com.notifyme.model.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpRepository extends JpaRepository<OtpRecord, UUID> {

    Optional<OtpRecord> findTopByIdentifierAndPurposeAndUsedFalseOrderByCreatedAtDesc(
            String identifier, OtpPurpose purpose);

    @Modifying
    @Query("UPDATE OtpRecord o SET o.used = true WHERE o.identifier = :identifier AND o.purpose = :purpose")
    void invalidateAll(String identifier, OtpPurpose purpose);

    @Modifying
    @Query("DELETE FROM OtpRecord o WHERE o.expiresAt < :now OR o.used = true")
    void deleteExpiredAndUsed(Instant now);
}

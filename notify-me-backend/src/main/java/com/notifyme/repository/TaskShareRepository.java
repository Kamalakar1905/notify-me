package com.notifyme.repository;

import com.notifyme.model.TaskShare;
import com.notifyme.model.enums.ShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskShareRepository extends JpaRepository<TaskShare, UUID> {

    List<TaskShare> findBySharedWithIdAndStatus(UUID sharedWithId, ShareStatus status);

    Optional<TaskShare> findByIdAndSharedWithId(UUID id, UUID sharedWithId);

    boolean existsByTaskIdAndSharedWithId(UUID taskId, UUID sharedWithId);
}

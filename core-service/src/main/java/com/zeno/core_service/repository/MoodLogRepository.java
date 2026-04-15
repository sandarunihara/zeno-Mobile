package com.zeno.core_service.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zeno.core_service.entity.MoodLog;

@Repository
public interface MoodLogRepository extends JpaRepository<MoodLog, Long> {
    // Finds the absolute latest mood check-in for this user
    Optional<MoodLog> findFirstByUserIdOrderByLoggedAtDesc(UUID userId);
}

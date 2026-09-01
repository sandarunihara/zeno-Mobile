package com.zeno.core_service.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zeno.core_service.entity.SleepRecord;

@Repository
public interface SleepRecordRepository extends JpaRepository<SleepRecord, Long> {

    Optional<SleepRecord> findByUserIdAndSleepDate(UUID userId, LocalDate sleepDate);

    List<SleepRecord> findByUserIdAndSleepDateBetweenOrderBySleepDateDesc(
            UUID userId, LocalDate startDate, LocalDate endDate);

    Optional<SleepRecord> findTopByUserIdOrderBySleepDateDesc(UUID userId);
}

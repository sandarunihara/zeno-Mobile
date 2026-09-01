package com.zeno.core_service.repository;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.zeno.core_service.dto.StepBucketProjection;
import com.zeno.core_service.entity.HealthMetric;

@Repository
public interface HealthMetricRepository extends JpaRepository<HealthMetric, Long> {

    @Query(value = "SELECT " +
            "COALESCE(SUM(CASE WHEN logged_at::time >= '07:00:00' AND logged_at::time < '11:00:00' THEN value ELSE 0 END), 0) as bucket1, " +
            "COALESCE(SUM(CASE WHEN logged_at::time >= '11:00:00' AND logged_at::time < '15:00:00' THEN value ELSE 0 END), 0) as bucket2, " +
            "COALESCE(SUM(CASE WHEN logged_at::time >= '15:00:00' AND logged_at::time < '19:00:00' THEN value ELSE 0 END), 0) as bucket3, " +
            "COALESCE(SUM(CASE WHEN logged_at::time >= '19:00:00' AND logged_at::time < '21:00:00' THEN value ELSE 0 END), 0) as bucket4 " +
            "FROM health_metrics " +
            "WHERE user_id = CAST(:userId AS uuid) " +
            "AND metric_type = 'STEP_COUNT' " +
            "AND logged_at >= CAST(:startOfDay AS timestamp) " +
            "AND logged_at <= CAST(:endOfDay AS timestamp)", 
            nativeQuery = true)
    StepBucketProjection getStepBucketsForDay(
            @Param("userId") UUID userId, 
            @Param("startOfDay") LocalDateTime startOfDay, 
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT SUM(h.value) FROM HealthMetric h " +
           "WHERE h.userId = :userId " +
           "AND h.metricType = 'STEP_COUNT' " +
           "AND h.loggedAt >= :startOfDay " +
           "AND h.loggedAt <= :endOfDay")
    Integer getTotalStepsForDay(
            @Param("userId") UUID userId, 
            @Param("startOfDay") LocalDateTime startOfDay, 
            @Param("endOfDay") LocalDateTime endOfDay
    );
}

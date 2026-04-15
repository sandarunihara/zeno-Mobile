package com.zeno.core_service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zeno.core_service.entity.Tasks;

@Repository
public interface TasksRepository extends JpaRepository<Tasks, Long> {
    
    List<Tasks> findByUserId(UUID userId);

    Tasks findByIdAndUserId(Long id, UUID userId);
}

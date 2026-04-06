package com.zeno.auth_service.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.zeno.auth_service.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User,UUID> {
    User findByEmail(String email);
    
}

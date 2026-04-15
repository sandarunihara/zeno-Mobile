package com.zeno.core_service.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.core_service.dto.AiTaskResponce;
import com.zeno.core_service.dto.AiTranscriptRequest;
import com.zeno.core_service.dto.ManualTaskRequest;
import com.zeno.core_service.dto.TaskResponce;
import com.zeno.core_service.service.AuthServiceClient;
import com.zeno.core_service.service.TaskService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core/tasks")
@RequiredArgsConstructor
public class TaskController {
    
    private final TaskService taskService;
    private final AuthServiceClient authServiceClient;

    private UUID getUserIdFromAuthService(HttpServletRequest request){
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid Authorization header.");
        }
        String token = authHeader.substring(7);
        
        // Pass the token to the Auth Service via Eureka!
        return authServiceClient.validateAndGetUserId(token);
    }

    @PostMapping("/manual")
    public ResponseEntity<TaskResponce> createmanualTask(HttpServletRequest httprequest , @RequestBody ManualTaskRequest request){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.createmanualtask(userId, request));
    }

    @PostMapping("/ai-transcript")
    public ResponseEntity<AiTaskResponce> createTaskFromTranscript(HttpServletRequest httprequest ,@RequestBody AiTranscriptRequest request){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.createTaskFromTranscript(userId, request));
    }

    @PostMapping("/updatetask/{id}")
    public ResponseEntity<TaskResponce> updateTask(HttpServletRequest httprequest, @PathVariable Long id, @RequestBody ManualTaskRequest request){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.UpdateTask(userId, id, request));
    }

    @GetMapping("/deletetask/{id}")
    public ResponseEntity<TaskResponce> deleteTask(HttpServletRequest httprequest, @PathVariable Long id){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.deleteTask(userId, id));
    }

}

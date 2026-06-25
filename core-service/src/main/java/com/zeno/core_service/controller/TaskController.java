package com.zeno.core_service.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zeno.core_service.dto.AiTaskResponce;
import com.zeno.core_service.dto.AiTranscriptRequest;
import com.zeno.core_service.dto.DashboardResponse;
import com.zeno.core_service.dto.ManualTaskRequest;
import com.zeno.core_service.dto.TaskResponce;
import com.zeno.core_service.dto.Taskfullresponce;
import com.zeno.core_service.service.AuthServiceClient;
import com.zeno.core_service.service.TaskService;
import com.zeno.core_service.service.GoogleCalendarService;
import com.zeno.core_service.dto.GoogleConnectedUserDto;
import com.zeno.core_service.dto.FreeTimeResponse;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core/tasks")
@RequiredArgsConstructor
public class TaskController {
    
    private final TaskService taskService;
    private final AuthServiceClient authServiceClient;
    private final GoogleCalendarService googleCalendarService;


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

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> getSmartDashboard(
            @RequestParam(required = false) Boolean keepItLight,
            HttpServletRequest httpRequest) {

        UUID userId = getUserIdFromAuthService(httpRequest);
        
        // Passes the user ID and their potential answer to the "Keep it light?" question
        DashboardResponse dashboard = taskService.getSmartDashboard(userId, keepItLight);
        
        return ResponseEntity.ok(dashboard);
    }

    @PostMapping("/updatetask/{id}")
    public ResponseEntity<TaskResponce> updateTask(HttpServletRequest httprequest, @PathVariable Long id, @RequestBody ManualTaskRequest request){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.UpdateTask(userId, id, request));
    }

    @PostMapping("/completetask/{id}")
    public ResponseEntity<TaskResponce> completeTask(HttpServletRequest httprequest, @PathVariable Long id){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.completeTask(userId, id));
    }

    @GetMapping("/deletetask/{id}")
    public ResponseEntity<TaskResponce> deleteTask(HttpServletRequest httprequest, @PathVariable Long id){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.deleteTask(userId, id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Taskfullresponce> getTask(HttpServletRequest httprequest, @PathVariable Long id){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.getTask(userId, id));
    }

    @GetMapping("/all")
    public ResponseEntity<?> getTasks(HttpServletRequest httprequest){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.getTasks(userId));
    }

    @GetMapping("/freetime")
    public ResponseEntity<FreeTimeResponse> getTodaysFreeTime(HttpServletRequest httprequest){
        UUID userId = getUserIdFromAuthService(httprequest);
        return ResponseEntity.ok(taskService.getTodaysFreeTime(userId));
    }

    @PostMapping("/sync-calendar")
    public ResponseEntity<?> syncGoogleCalendar(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("Missing or invalid Authorization header.");
        }
        
        try {
            GoogleConnectedUserDto connectedUser = authServiceClient.getConnectedUser(authHeader);
            if (connectedUser == null || connectedUser.getGmailToken() == null) {
                return ResponseEntity.badRequest().body("No Google account connected. Please connect Gmail/Calendar first.");
            }
            
            googleCalendarService.syncCalendarForUser(connectedUser.getId(), connectedUser.getGmailToken());
            return ResponseEntity.ok(Map.of("success", true, "message", "Google Calendar synced successfully."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Calendar sync failed: " + e.getMessage());
        }
    }
}


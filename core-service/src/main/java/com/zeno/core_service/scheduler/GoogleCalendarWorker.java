package com.zeno.core_service.scheduler;

import com.zeno.core_service.dto.GoogleConnectedUserDto;
import com.zeno.core_service.service.GoogleCalendarService;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Component
@Configuration
@EnableScheduling
public class GoogleCalendarWorker {

    private final GoogleCalendarService googleCalendarService;
    private final RestTemplate restTemplate;

    public GoogleCalendarWorker(GoogleCalendarService googleCalendarService, RestTemplate restTemplate) {
        this.googleCalendarService = googleCalendarService;
        this.restTemplate = restTemplate; // Eureka load-balanced RestTemplate
    }

    // Runs at 07:00 AM every day
    @Scheduled(cron = "0 03 17 * * ?")
    public void runGoogleCalendarSync() {
        System.out.println("Starting Google Calendar Sync Job at 06:00 AM...");

        try {
            // 1. Get users with connected Google accounts from Auth Service
            ResponseEntity<List<GoogleConnectedUserDto>> response = restTemplate.exchange(
                    "http://AUTH-SERVICE/api/auth/google-connected-users",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<GoogleConnectedUserDto>>() {}
            );

            List<GoogleConnectedUserDto> users = response.getBody();
            if (users == null || users.isEmpty()) {
                System.out.println("No users with connected Google accounts found for calendar sync.");
                return;
            }

            // 2. Sync calendar events and generate tasks for each user
            for (GoogleConnectedUserDto user : users) {
                try {
                    googleCalendarService.syncCalendarForUser(user.getId(), user.getGmailToken());
                } catch (Exception e) {
                    System.err.println("Error processing calendar sync for user " + user.getId() + ": " + e.getMessage());
                }
            }

        } catch (Exception e) {
            System.err.println("Error calling auth-service for calendar sync: " + e.getMessage());
        }

        System.out.println("Finished Google Calendar Sync Job.");
    }
}

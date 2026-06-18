package com.zeno.core_service.scheduler;

import com.zeno.core_service.dto.GoogleConnectedUserDto;
import com.zeno.core_service.entity.Subscription;
import com.zeno.core_service.repository.SubscriptionRepository;
import com.zeno.core_service.service.GmailService;
import com.zeno.core_service.service.SubscriptionExtractorService;
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
public class SubscriptionWorker {

    private final SubscriptionRepository subscriptionRepository;
    private final GmailService gmailService;
    private final SubscriptionExtractorService subscriptionExtractorService;
    private final RestTemplate restTemplate;

    public SubscriptionWorker(SubscriptionRepository subscriptionRepository,
                              GmailService gmailService,
                              SubscriptionExtractorService subscriptionExtractorService,
                              RestTemplate restTemplate) {
        this.subscriptionRepository = subscriptionRepository;
        this.gmailService = gmailService;
        this.subscriptionExtractorService = subscriptionExtractorService;
        this.restTemplate = restTemplate; // Load balanced RestTemplate injected here
    }

    // Runs at midnight and 6:00 PM
    @Scheduled(cron = "0 36 18 * * ?")
    public void runSubscriptionExtraction() {
        System.out.println("Starting Subscription Extraction Job...");

        try {
            // 1. Get users with connected Gmails from Auth Service
            ResponseEntity<List<GoogleConnectedUserDto>> response = restTemplate.exchange(
                    "http://AUTH-SERVICE/api/auth/google-connected-users",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<GoogleConnectedUserDto>>() {}
            );

            List<GoogleConnectedUserDto> users = response.getBody();
            if (users == null || users.isEmpty()) {
                System.out.println("No users with connected Gmails found.");
                return;
            }

            // 2. Iterate and process
            for (GoogleConnectedUserDto user : users) {
                try {
                    // a. Get fresh access token
                    String accessToken = gmailService.getAccessToken(user.getGmailToken());

                    // b. Fetch recent receipt emails
                    List<String> emails = gmailService.fetchRecentReceiptEmails(accessToken);

                    // c. Extract subscription data and save
                    for (String emailText : emails) {
                        Subscription sub = subscriptionExtractorService.extractSubscriptionData(emailText);
                        if (sub != null && sub.getServiceName() != null) {
                            sub.setUserId(user.getId());
                            subscriptionRepository.save(sub);
                            System.out.println("Saved new subscription for user " + user.getId() + ": " + sub.getServiceName());
                        }
                    }

                } catch (Exception e) {
                    System.err.println("Error processing user " + user.getId() + ": " + e.getMessage());
                }
            }

        } catch (Exception e) {
            System.err.println("Error calling auth-service: " + e.getMessage());
        }

        System.out.println("Finished Subscription Extraction Job.");
    }
}

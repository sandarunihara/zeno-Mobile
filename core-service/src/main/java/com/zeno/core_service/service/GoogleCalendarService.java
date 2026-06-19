package com.zeno.core_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zeno.core_service.entity.Tasks;
import com.zeno.core_service.repository.TasksRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class GoogleCalendarService {

    private final TasksRepository tasksRepository;
    private final GmailService gmailService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    public GoogleCalendarService(TasksRepository tasksRepository, 
                                 GmailService gmailService, 
                                 ObjectMapper objectMapper) {
        this.tasksRepository = tasksRepository;
        this.gmailService = gmailService;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate(); // Standard RestTemplate for external API calls (avoids Eureka load-balancer)
    }

    public void syncCalendarForUser(UUID userId, String gmailToken) {
        if (gmailToken == null || gmailToken.isEmpty()) {
            System.out.println("Skipping calendar sync for user " + userId + " as gmailToken is empty.");
            return;
        }

        try {
            System.out.println("Syncing calendar for user: " + userId);
            // 1. Get fresh access token
            String accessToken = gmailService.getAccessToken(gmailToken);

            // 2. Fetch today's events from Google Calendar
            List<CalendarEventDto> todayEvents = fetchTodayCalendarEvents(accessToken);
            if (todayEvents == null || todayEvents.isEmpty()) {
                System.out.println("No calendar events found for user " + userId + " today.");
                return;
            }

            // 3. Process events using Groq AI
            List<ExtractedCalendarTask> extractedTasks = extractTasksFromEvents(todayEvents);
            if (extractedTasks == null || extractedTasks.isEmpty()) {
                System.out.println("No actionable tasks extracted from calendar events for user " + userId);
                return;
            }

            // 4. Map, format, and save tasks
            saveExtractedTasks(userId, extractedTasks, todayEvents);

            System.out.println("Successfully completed calendar sync for user: " + userId);
        } catch (Exception e) {
            System.err.println("Error syncing calendar for user " + userId + ": " + e.getMessage());
        }
    }

    private List<CalendarEventDto> fetchTodayCalendarEvents(String accessToken) {
        try {
            // Get today's start and end bounds in the local/system timezone, then convert to UTC Instant string
            ZonedDateTime now = ZonedDateTime.now();
            ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(now.getZone());
            ZonedDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

            String timeMin = startOfDay.toInstant().toString(); // e.g. "2026-06-18T18:30:00Z"
            String timeMax = endOfDay.toInstant().toString();   // e.g. "2026-06-19T18:29:59Z"

            java.net.URI uri = UriComponentsBuilder.fromUriString("https://www.googleapis.com/calendar/v3/calendars/primary/events")
                    .queryParam("timeMin", timeMin)
                    .queryParam("timeMax", timeMax)
                    .queryParam("singleEvents", true)
                    .queryParam("orderBy", "startTime")
                    .build()
                    .encode()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(uri, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null) {
                    List<CalendarEventDto> events = new ArrayList<>();
                    for (int i = 0; i < items.size(); i++) {
                        Map<String, Object> item = items.get(i);
                        
                        String eventId = (String) item.get("id");
                        String etag = (String) item.get("etag");
                        String summary = (String) item.get("summary");
                        String description = (String) item.get("description");
                        String hangoutLink = (String) item.get("hangoutLink");
                        String location = (String) item.get("location");

                        // Extract start date/time
                        String startVal = null;
                        Map<String, Object> startMap = (Map<String, Object>) item.get("start");
                        if (startMap != null) {
                            if (startMap.get("dateTime") != null) {
                                startVal = (String) startMap.get("dateTime");
                            } else if (startMap.get("date") != null) {
                                startVal = (String) startMap.get("date") + "T00:00:00"; // All-day event starts at midnight
                            }
                        }

                        // Determine meeting link
                        String meetingLink = null;
                        if (hangoutLink != null && !hangoutLink.isEmpty()) {
                            meetingLink = hangoutLink;
                        } else {
                            Map<String, Object> conferenceData = (Map<String, Object>) item.get("conferenceData");
                            if (conferenceData != null) {
                                List<Map<String, Object>> entryPoints = (List<Map<String, Object>>) conferenceData.get("entryPoints");
                                if (entryPoints != null) {
                                    for (Map<String, Object> ep : entryPoints) {
                                        if ("video".equalsIgnoreCase((String) ep.get("entryPointType")) && ep.get("uri") != null) {
                                            meetingLink = (String) ep.get("uri");
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // Fallback to location if it is a url
                        if (meetingLink == null && location != null) {
                            String trimmedLoc = location.trim();
                            if (trimmedLoc.startsWith("http://") || trimmedLoc.startsWith("https://")) {
                                meetingLink = trimmedLoc;
                            }
                        }

                        CalendarEventDto dto = new CalendarEventDto();
                        dto.setId(i);
                        dto.setEventId(eventId);
                        dto.setEtag(etag);
                        dto.setSummary(summary != null ? summary : "Untitled Calendar Event");
                        dto.setDescription(description != null ? description : "");
                        dto.setStart(startVal);
                        dto.setMeetingLink(meetingLink);
                        events.add(dto);
                    }
                    return events;
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch Google Calendar events: " + e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<ExtractedCalendarTask> extractTasksFromEvents(List<CalendarEventDto> events) {
        try {
            String eventsJson = objectMapper.writeValueAsString(events);
            String currentDateTime = LocalDateTime.now().withNano(0).toString();

            String systemPrompt = "You are a task-planning assistant. Convert the provided Google Calendar events list into clear, actionable tasks for today. "
                    + "For each event, evaluate if it is a meeting, task, or commitment, and return a clean task title and description. "
                    + "Return ONLY a valid JSON object with a key 'tasks' containing an array of objects. "
                    + "Each task object MUST have: "
                    + "1. 'id' (integer, matching the input event's id precisely), "
                    + "2. 'title' (string, a clean clear task name derived from the event summary), "
                    + "3. 'description' (string, a summary of details. If a meetingLink is present, you MUST explicitly include it in the description formatted as 'Meeting Link: <link>'), "
                    + "4. 'effortLevel' (string, either 'Low' or 'High' based on event complexity), "
                    + "5. 'deadline' (string, ISO-8601 format matching the event start time). "
                    + "Ensure the response format is strictly JSON.";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            Map<String, Object> messageSystem = Map.of("role", "system", "content", systemPrompt);
            Map<String, Object> messageUser = Map.of("role", "user", "content", eventsJson);

            Map<String, Object> requestBodyMap = Map.of(
                    "model", "llama-3.3-70b-versatile",
                    "messages", List.of(messageSystem, messageUser),
                    "response_format", Map.of("type", "json_object"),
                    "temperature", 0.1
            );

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> responseEntity = restTemplate.postForEntity(groqApiUrl, entity, String.class);
            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                JsonNode rootNode = objectMapper.readTree(responseEntity.getBody());
                String content = rootNode.path("choices").get(0).path("message").path("content").asText();
                
                CalendarExtractionResponse extractionResponse = objectMapper.readValue(content, CalendarExtractionResponse.class);
                if (extractionResponse != null) {
                    return extractionResponse.tasks();
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to extract tasks using Groq AI: " + e.getMessage());
        }
        return Collections.emptyList();
    }

    private void saveExtractedTasks(UUID userId, List<ExtractedCalendarTask> extractedTasks, List<CalendarEventDto> originalEvents) {
        for (ExtractedCalendarTask extTask : extractedTasks) {
            if (extTask.id() == null || extTask.id() < 0 || extTask.id() >= originalEvents.size()) {
                continue;
            }
            CalendarEventDto origEvent = originalEvents.get(extTask.id());

            // 1. Format the description and append the meeting link
            String meetingLink = origEvent.getMeetingLink();
            String description = extTask.description();
            if (meetingLink != null && !meetingLink.isEmpty()) {
                if (description == null || description.isEmpty()) {
                    description = "Meeting Link: " + meetingLink;
                } else if (!description.contains(meetingLink)) {
                    description = description + "\n\nMeeting Link: " + meetingLink;
                }
            }

            // 2. Parse the task deadline
            LocalDateTime deadline = null;
            if (extTask.deadline() != null && !extTask.deadline().isEmpty()) {
                try {
                    deadline = OffsetDateTime.parse(extTask.deadline()).toLocalDateTime();
                } catch (Exception e) {
                    try {
                        deadline = LocalDateTime.parse(extTask.deadline());
                    } catch (Exception ex) {
                        // ignore and use fallback
                    }
                }
            }
            if (deadline == null && origEvent.getStart() != null) {
                try {
                    deadline = OffsetDateTime.parse(origEvent.getStart()).toLocalDateTime();
                } catch (Exception e) {
                    try {
                        deadline = LocalDateTime.parse(origEvent.getStart());
                    } catch (Exception ex) {
                        // ignore and use fallback
                    }
                }
            }
            if (deadline == null) {
                deadline = LocalDateTime.now();
            }

            // 3. Save if the task is not a duplicate
            String taskTitle = extTask.title() != null ? extTask.title() : origEvent.getSummary();
            boolean isCritical = "High".equalsIgnoreCase(extTask.effortLevel());

            boolean exists = false;
            if (origEvent.getEventId() != null) {
                exists = tasksRepository.existsByUserIdAndCalenderEventId(userId, origEvent.getEventId());
            } else {
                exists = tasksRepository.existsByUserIdAndTitleAndDeadline(userId, taskTitle, deadline);
            }

            if (!exists) {
                Tasks task = Tasks.builder()
                        .userId(userId)
                        .title(taskTitle)
                        .description(description)
                        .effort_level(extTask.effortLevel() != null ? extTask.effortLevel() : "Low")
                        .deadline(deadline)
                        .is_critical(isCritical)
                        .status("PENDING")
                        .hasMicroSteps(false)
                        .isFromCalender(true)
                        .calenderEventId(origEvent.getEventId())
                        .calenderEventEtag(origEvent.getEtag())
                        .build();

                tasksRepository.save(task);
                System.out.println("Saved calendar event task for user: " + userId + " - Title: " + taskTitle);
                System.out.println("Saved calendar event task for user: " + task);
            } else {
                System.out.println("Task already exists for user: " + userId + " - Title: " + taskTitle + " at " + deadline);
            }
        }
    }

    // Helper DTO for internal event formatting
    public static class CalendarEventDto {
        private int id;
        private String eventId;
        private String etag;
        private String summary;
        private String description;
        private String start;
        private String meetingLink;

        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getEventId() { return eventId; }
        public void setEventId(String eventId) { this.eventId = eventId; }
        public String getEtag() { return etag; }
        public void setEtag(String etag) { this.etag = etag; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getStart() { return start; }
        public void setStart(String start) { this.start = start; }
        public String getMeetingLink() { return meetingLink; }
        public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
    }

    // Helper records for Groq API response parsing
    public record CalendarExtractionResponse(List<ExtractedCalendarTask> tasks) {}
    public record ExtractedCalendarTask(Integer id, String title, String description, String effortLevel, String deadline) {}
}

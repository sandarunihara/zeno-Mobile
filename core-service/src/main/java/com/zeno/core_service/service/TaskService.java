package com.zeno.core_service.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zeno.core_service.dto.AiTaskResponce;
import com.zeno.core_service.dto.AiTaskWrapper;
import com.zeno.core_service.dto.AiTranscriptRequest;
import com.zeno.core_service.dto.ManualTaskRequest;
import com.zeno.core_service.dto.TaskResponce;
import com.zeno.core_service.entity.Tasks;
import com.zeno.core_service.repository.TasksRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class TaskService {
    
    private final TasksRepository tasksRepository;
    private final ObjectMapper objectMapper;

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    public TaskResponce createmanualtask(UUID userId,ManualTaskRequest request){
        Tasks task = Tasks.builder()
            .userId(userId)
            .title(request.title())
            .description(request.description())
            .effort_level(request.effortLevel())
            .deadline(request.deadline() != null ? java.time.LocalDateTime.parse(request.deadline()) : null)
            .is_critical(request.isCritical())
            .status("PENDING")
            .build();
        return new TaskResponce(true,tasksRepository.save(task), "Task created successfully");
    }

    //  createTaskFromAi method
    public AiTaskResponce createTaskFromTranscript(UUID userId,AiTranscriptRequest request){

        try{

            // A. Prepare the strict prompt for MULTIPLE tasks
            String prompt = "You are a data-extraction assistant. Extract ALL actionable task details from this user transcript: '" 
                    + request.transcript() + "'. "
                    + "Return ONLY a valid JSON object with a single key 'tasks' which contains an array of objects. "
                    + "Each object in the array must have these exact keys: "
                    + "'title' (string, a short clean task name), "
                    + "'effortLevel' (string, either 'Low' or 'High'), "
                    + "'deadline' (string, ISO-8601 format like '2026-04-16T17:00:00', or null if no time is mentioned).";

            // B. Build the Groq Request Body
            Map<String, Object> message = Map.of(
                    "role", "user",
                    "content", prompt
            );
            
            Map<String, Object> requestBodyMap = Map.of(
                    "model", "llama-3.3-70b-versatile",
                    "messages", List.of(message),
                    "response_format", Map.of("type", "json_object"),
                    "temperature", 0.1 
            );

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);

            // C. Set up Headers
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            // D. Send the request
            String response = restTemplate.postForObject(groqApiUrl, entity, String.class);

            // E. Parse the response
            JsonNode rootNode = objectMapper.readTree(response);
            String aiJsonString = rootNode.path("choices").get(0)
                                          .path("message").path("content").asText();

            // F. Convert the AI's JSON array into our Java Wrapper
            AiTaskWrapper extractedData = objectMapper.readValue(aiJsonString, AiTaskWrapper.class);

            // G. Loop through the extracted tasks and build our Entities
            List<Tasks> newTasks = extractedData.tasks().stream().map(dto -> 
                Tasks.builder()
                    .userId(userId)
                    .title(dto.title())
                    .description(dto.description())
                    .effort_level(dto.effortLevel())
                    .deadline(dto.deadline() != null ? java.time.LocalDateTime.parse(dto.deadline()) : null)
                    .is_critical(false) // AI doesn't determine criticality, default to false
                    .status("PENDING")
                    .build()
            ).toList();
            
            tasksRepository.saveAll(newTasks);

            return new AiTaskResponce(true, newTasks, "Tasks created successfully from transcript");

        }catch (Exception e){
            return new AiTaskResponce(false, List.of(), "Error processing transcript: " + e.getMessage());
        }
    }

    public TaskResponce UpdateTask(UUID userId,Long taskId,ManualTaskRequest request){

        Tasks existingTask = tasksRepository.findByIdAndUserId(taskId, userId);
        if (existingTask == null) {
            return new TaskResponce(false, null, "Task not found");
        }

        try{
            existingTask.setTitle(request.title()== null ? existingTask.getTitle() : request.title());
            existingTask.setDescription(request.description()== null ? existingTask.getDescription() : request.description());
            existingTask.setEffort_level(request.effortLevel()== null ? existingTask.getEffort_level() : request.effortLevel());
            existingTask.setDeadline(request.deadline() != null ? java.time.LocalDateTime.parse(request.deadline()) : existingTask.getDeadline());
            existingTask.setIs_critical(request.isCritical()== null ? existingTask.getIs_critical() : request.isCritical());
        }catch (Exception e){
            return new TaskResponce(false, null, "Invalid input: " + e.getMessage());
        }

        return new TaskResponce(true, tasksRepository.save(existingTask), "Task updated successfully");
    }

    public TaskResponce deleteTask(UUID userId, Long taskId){
        Tasks existingTask = tasksRepository.findByIdAndUserId(taskId, userId);
        if (existingTask == null) {
            return new TaskResponce(false, null, "Task not found");
        }
        tasksRepository.delete(existingTask);
        return new TaskResponce(true, null, "Task deleted successfully");
    }

    // TODO: Implement getTasks and getTaskById methods
}

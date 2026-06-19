package com.zeno.core_service.service;

import com.zeno.core_service.repository.MoodLogRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zeno.core_service.dto.AiExtractionResponse;
import com.zeno.core_service.dto.AiTaskResponce;
import com.zeno.core_service.dto.AiTranscriptRequest;
import com.zeno.core_service.dto.DashboardResponse;
import com.zeno.core_service.dto.ManualTaskRequest;
import com.zeno.core_service.dto.TaskResponce;
import com.zeno.core_service.dto.Taskfullresponce;
import com.zeno.core_service.dto.TaskDto;
import com.zeno.core_service.entity.MoodLog;
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
    private final MoodLogRepository moodLogRepository;
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
            .hasMicroSteps(false)
            .build();
        return new TaskResponce(true,tasksRepository.save(task), "Task created successfully");
    }

    //  createTaskFromAi method
    public AiTaskResponce createTaskFromTranscript(UUID userId,AiTranscriptRequest request){

        try{

            String currentDateTime = LocalDateTime.now().withNano(0).toString();
            
            // A. Prepare the strict prompt for MULTIPLE tasks
            String prompt = "You are a data-extraction assistant. The current date and time is " + currentDateTime + ". "
                            + "Analyze this user transcript: '" + request.transcript() + "'. "
                            + "Return ONLY a valid JSON object with two keys: 'tasks' and 'mood'. "
                            + "1. 'tasks': An array of objects. Each object must have: "
                            + "'title' (string, a short clean task name), "
                            + "'description' (string, a more detailed explanation), "
                            + "'effortLevel' (string, either 'Low' or 'High'), "
                            + "'deadline' (string, ISO-8601 format like '" + currentDateTime + "', calculate accurate relative dates based on the current date, or null if no deadline). "
                            + "2. 'mood': guess their current state. An object containing: "
                            + "'energyScore' (integer 1 to 10 based on their vibe), "
                            + "'sentiment' (short string like 'anxious', 'calm', or 'motivated'), and "
                            + "'isLight' (boolean, true if the user prefers to avoid deep thinking, complex creative work, or heavy cognitive effort — for example, they want to focus on tactical execution, quick wins, routine admin, or setup/prep work rather than deep strategizing or creating from scratch, even if their energy is high and they are being very productive; false if they are ready and willing to dive into demanding, high-concentration, deep-focus work like writing narratives, strategic planning, or complex problem-solving). "
                            + "Ensure the response is strictly valid JSON.";

            String response = callGroqApi(prompt);

            // F. Convert the AI's JSON array into our Java Wrapper
            AiExtractionResponse extractedData = objectMapper.readValue(response, AiExtractionResponse.class);

            MoodLog latestMood = moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userId).orElse(null);

            // Save the Mood! [cite: 154]
            if (extractedData.mood() != null) {

                if(latestMood == null){
                    MoodLog mood = MoodLog.builder()
                            .userId(userId)
                            .energyScore(extractedData.mood().energyScore())
                            .sentiment(extractedData.mood().sentiment())
                            .isLight(extractedData.mood().isLight())
                            .dataSource("audio_transcript")
                            .build();

                    moodLogRepository.save(mood);
                    
                }else{
                    latestMood.setEnergyScore(extractedData.mood().energyScore());
                    latestMood.setSentiment(extractedData.mood().sentiment());
                    latestMood.setIsLight(extractedData.mood().isLight());
                    latestMood.setLoggedAt(LocalDateTime.now());
                    latestMood.setDataSource("audio_transcript");
                    moodLogRepository.save(latestMood);
                }

            }

            // Save the Tasks [cite: 153]
            if (extractedData.tasks() == null || extractedData.tasks().isEmpty()) {
                return new AiTaskResponce(true, List.of(), "No actionable tasks found in transcript");
            }

            List<Tasks> newTasks = extractedData.tasks().stream()
                    .filter(dto -> !isNoTaskPlaceholder(dto.title(), dto.description()))
                    .map(dto ->
                    Tasks.builder()
                            .userId(userId)
                            .title(dto.title())
                            .description(dto.description())
                            .effort_level(dto.effortLevel())
                            .deadline(dto.deadline())
                            .is_critical("High".equalsIgnoreCase(dto.effortLevel()))
                            .status("PENDING")
                            .hasMicroSteps(false)
                            .build()
                        ).toList();

            if (newTasks.isEmpty()) {
                return new AiTaskResponce(true, List.of(), "No actionable tasks found in transcript");
            }

            tasksRepository.saveAll(newTasks);

            //todo: here create a new method to create a micro task for each task using Groq API
            // Optional<MoodLog> mooddata1 =moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userId);
            // if (mooddata1.isPresent()) {
            //     MoodLog moodLog = mooddata1.get();
                
            //     int energyScore = moodLog.getEnergyScore();
            //     boolean isLight = Boolean.TRUE.equals(moodLog.getIsLight());
            // } else {
            //     // Handle the case where no data was found for this user
            //     System.out.println("No mood log found for this user.");
            // }
            // for(Tasks task : newTasks){

            // }
            

            return new AiTaskResponce(true, newTasks, "Tasks created successfully from transcript");

        }catch (Exception e){
            return new AiTaskResponce(false, List.of(), "Error processing transcript: " + e.getMessage());
        }
    }

    public DashboardResponse getSmartDashboard(UUID userId,Boolean keepItLightConsent){

        List<Tasks> allpending = tasksRepository.findByUserIdAndStatus(userId, "PENDING");

        // We wrap the entire stream result inside a new ArrayList<>() to unlock it!
        List<Tasks> mainTasks = new ArrayList<>(allpending.stream()
                .filter(t -> t.getParentTaskId() == null && (t.getDeadline() == null || !t.getDeadline().isBefore(LocalDateTime.now())))
                .toList());

        if(mainTasks.isEmpty()){
            int currentEnergy =moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userId)
                .map(MoodLog::getEnergyScore)
                .orElse(5); 
            return new DashboardResponse(currentEnergy, "No tasks on the horizon! Take a deep breath and enjoy the calm.", false, new ArrayList<>());
        }

        // Now it is perfectly safe to sort!
        mainTasks.sort(Comparator.comparing(Tasks::getDeadline, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Tasks> displayTasks = new ArrayList<>();

        int currentEnergy =moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userId)
                .map(MoodLog::getEnergyScore)
                .orElse(5);

        System.out.println(moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userId));

        LocalDateTime now = LocalDateTime.now();

        if (currentEnergy >= 8) {
            boolean hasHighEffortTasks = mainTasks.stream().anyMatch(t -> "High".equalsIgnoreCase(t.getEffort_level()));

            //TODO : no need
            if (hasHighEffortTasks && keepItLightConsent == null) {
                return new DashboardResponse(currentEnergy, "You have great energy today! Do you want to tackle your big tasks, or keep it light?", true, new ArrayList<>());
            }

            if (Boolean.TRUE.equals(keepItLightConsent)) {

                for (Tasks task : mainTasks) {
                    Boolean isUrgent = task.getDeadline() != null && ChronoUnit.HOURS.between(now, task.getDeadline()) <= 48;

                    if (isUrgent && "High".equalsIgnoreCase(task.getEffort_level())) {
                        // THE FIX: Fetch steps, nest them inside the parent, then add the parent!
                        task.setMicroSteps(getOrGenerateMicroSteps(task, userId));
                        displayTasks.add(task);
                    } else if ("Low".equalsIgnoreCase(task.getEffort_level())) {
                        // If a low-effort task happens to have existing steps, attach them
                        if (Boolean.TRUE.equals(task.getHasMicroSteps())) {
                            task.setMicroSteps(tasksRepository.findByParentTaskId(task.getId()));
                        }
                        displayTasks.add(task);
                    }
                }
                return new DashboardResponse(currentEnergy, "Respecting your boundaries. I hid the big stuff, but broke down your urgent tasks so you don't fall behind.", false, displayTasks);
            }
            
            attachExistingMicroSteps(mainTasks);
            return new DashboardResponse(currentEnergy, "Let's crush it today!", false, mainTasks);
        }

        if (currentEnergy <= 4) {
            int nonUrgentRoutineCount = 0;

            for (Tasks task : mainTasks) {
                Boolean isUrgent = task.getDeadline() != null && ChronoUnit.HOURS.between(now, task.getDeadline()) <= 48;

                if (isUrgent) {
                    if ("High".equalsIgnoreCase(task.getEffort_level())) {
                        task.setMicroSteps(getOrGenerateMicroSteps(task, userId));
                        displayTasks.add(task);
                    } else {
                        if (Boolean.TRUE.equals(task.getHasMicroSteps())) task.setMicroSteps(tasksRepository.findByParentTaskId(task.getId()));
                        displayTasks.add(task);
                    }
                } else {
                    if ("Low".equalsIgnoreCase(task.getEffort_level()) && nonUrgentRoutineCount < 3) {
                        if (Boolean.TRUE.equals(task.getHasMicroSteps())) task.setMicroSteps(tasksRepository.findByParentTaskId(task.getId()));
                        displayTasks.add(task);
                        nonUrgentRoutineCount++;
                    }
                }
            }
            return new DashboardResponse(currentEnergy, "You're running on empty. I've isolated your urgent deadlines and a few easy wins.", false, displayTasks);
        }

        attachExistingMicroSteps(mainTasks);
        return new DashboardResponse(currentEnergy, "Here is your agenda for today.", false, mainTasks);
    }

    // Helper method to keep code clean
    private String callGroqApi(String prompt) throws Exception {
        Map<String, Object> message = Map.of("role", "user", "content", prompt);
        Map<String, Object> requestBodyMap = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", List.of(message),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.1
        );

        String requestBody = objectMapper.writeValueAsString(requestBodyMap);
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        String response = restTemplate.postForObject(groqApiUrl, entity, String.class);
        JsonNode rootNode = objectMapper.readTree(response);
        return rootNode.path("choices").get(0).path("message").path("content").asText();
    }

    private List<Tasks> getOrGenerateMicroSteps(Tasks parentTask, UUID userId) {
        // Check if we already broke this down previously
        List<Tasks> existingSteps = tasksRepository.findByParentTaskId(parentTask.getId());
        if (!existingSteps.isEmpty()) return existingSteps;

        // If not, ask Groq to break it down into 3 tiny steps
        try {
            String parentDeadlineStr = parentTask.getDeadline() != null ? parentTask.getDeadline().toString() : "No strict deadline";

            String prompt = "Break down this main task: '" + parentTask.getTitle() + " - " + parentTask.getDescription() + "' into exactly 3 incredibly tiny, low-effort micro-steps. "
                    + "The final deadline for this main task is exactly: " + parentDeadlineStr + ". "
                    + "I need you to STAGGER the deadlines for the 3 micro-steps working backwards. "
                    + "For example, make Step 1 due 5 hours before the final deadline, Step 2 due 2 hours before, and Step 3 due exactly at the final deadline. "
                    + "Return a JSON object with a 'tasks' array. Each object needs 'title' (string), 'description' (string), 'effortLevel' ('Low'), and 'deadline' (string, strict ISO-8601 format).";
            String response = callGroqApi(prompt);
            AiExtractionResponse extractedData = objectMapper.readValue(response, AiExtractionResponse.class);

            List<Tasks> microSteps = extractedData.tasks().stream().map(dto ->
                    Tasks.builder()
                            .userId(userId)
                            .title(dto.title())
                            .description(dto.description())
                            .effort_level("Low")
                            .deadline(dto.deadline() != null ? dto.deadline() : parentTask.getDeadline()) // Inherit deadline from parent
                            .is_critical(parentTask.getIs_critical()) // Inherit criticality from parent
                            .status("PENDING")
                            .parentTaskId(parentTask.getId())
                            .build()
            ).toList();

            parentTask.setHasMicroSteps(true);
            tasksRepository.save(parentTask); // Update parent to indicate it has micro-steps now

            return tasksRepository.saveAll(microSteps);

        } catch (Exception e) {
            // Fallback if AI fails: just return the parent task
            return List.of(parentTask);
        }
    }

    private void attachExistingMicroSteps(List<Tasks> tasksList) {
        for (Tasks task : tasksList) {
            if (Boolean.TRUE.equals(task.getHasMicroSteps())) {
                task.setMicroSteps(tasksRepository.findByParentTaskId(task.getId()));
            }
        }
    }

    private boolean isNoTaskPlaceholder(String title, String description) {
        String normalizedTitle = title == null ? "" : title.trim().toLowerCase();
        String normalizedDescription = description == null ? "" : description.trim().toLowerCase();

        return normalizedTitle.equals("no tasks")
                || normalizedTitle.equals("no task")
                || normalizedTitle.contains("nothing to do")
                || normalizedDescription.contains("no tasks")
                || normalizedDescription.contains("no responsibilities")
                || normalizedDescription.contains("nothing to do");
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
            existingTask.setStatus(request.status()== null ? existingTask.getStatus() : request.status());
        }catch (Exception e){
            return new TaskResponce(false, null, "Invalid input: " + e.getMessage());
        }

        return new TaskResponce(true, tasksRepository.save(existingTask), "Task updated successfully");
    }

    public TaskResponce completeTask(UUID userId, Long taskId){
        Tasks existingTask = tasksRepository.findByIdAndUserId(taskId, userId);
        if (existingTask == null) {
            return new TaskResponce(false, null, "Task not found");
        }
        existingTask.setStatus("COMPLETED");
        return new TaskResponce(true, tasksRepository.save(existingTask), "Task marked as completed");
    }

    public TaskResponce deleteTask(UUID userId, Long taskId){
        Tasks existingTask = tasksRepository.findByIdAndUserId(taskId, userId);
        if (existingTask == null) {
            return new TaskResponce(false, null, "Task not found");
        }

        if (existingTask.getHasMicroSteps() != null && existingTask.getHasMicroSteps()) {
            List<Tasks> microSteps = tasksRepository.findByParentTaskId(taskId);
            if (microSteps != null && !microSteps.isEmpty()) {
                tasksRepository.deleteAll(microSteps);
            }
        }

        tasksRepository.delete(existingTask);
        return new TaskResponce(true, null, "Task deleted successfully");
    }


    public Taskfullresponce getTask(UUID userId, Long taskId){
        Tasks task =  tasksRepository.findByIdAndUserId(taskId, userId);
        List<Tasks> microSteps = new ArrayList<>();
        Tasks parentTask = null;

        if (task == null) {
            throw new RuntimeException("Task not found");
        }
        if(task.getHasMicroSteps() != null && task.getHasMicroSteps()){
            microSteps = tasksRepository.findByParentTaskId(task.getId());
        }
        if (task.getParentTaskId() != null) {
            parentTask = tasksRepository.findById(task.getParentTaskId()).orElse(null);
        }

        return new Taskfullresponce(true, task, microSteps, parentTask, "Task found successfully");
    }

    public List<TaskDto> getTasks(UUID userId){
        List<Tasks> allTasks = tasksRepository.findByUserId(userId);
        
        return allTasks.stream()
            .filter(t -> t.getParentTaskId() == null)
            .map(t -> mapToDto(t, allTasks))
            .toList();
    }

    private TaskDto mapToDto(Tasks task, List<Tasks> allTasks) {
        TaskDto dto = TaskDto.builder()
            .id(task.getId())
            .userId(task.getUserId())
            .title(task.getTitle())
            .description(task.getDescription())
            .effort_level(task.getEffort_level())
            .deadline(task.getDeadline())
            .is_critical(task.getIs_critical())
            .status(task.getStatus())
            .parentTaskId(task.getParentTaskId())
            .hasMicroSteps(task.getHasMicroSteps())
            .isFromCalender(task.getIsFromCalender())
            .calenderEventId(task.getCalenderEventId())
            .calenderEventEtag(task.getCalenderEventEtag())
            .build();
            
        if (Boolean.TRUE.equals(task.getHasMicroSteps())) {
            List<TaskDto> microSteps = allTasks.stream()
                .filter(t -> task.getId().equals(t.getParentTaskId()))
                .map(t -> mapToDto(t, allTasks))
                .toList();
            dto.setMicroSteps(microSteps);
        }
        return dto;
    }
}

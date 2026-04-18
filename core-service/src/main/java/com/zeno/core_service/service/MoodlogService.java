package com.zeno.core_service.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.zeno.core_service.dto.Moodlog;
import com.zeno.core_service.entity.MoodLog;
import com.zeno.core_service.repository.MoodLogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MoodlogService {

    private final MoodLogRepository moodLogRepository;

    
    public Moodlog updateorcreateMoodlog(int mood, UUID userid ){
        MoodLog moodLog = moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userid).orElse(null);
        if (moodLog != null) {

            moodLog.setEnergyScore(mood);
            moodLog.setLoggedAt(java.time.LocalDateTime.now());
            moodLog.setDataSource("manual");
            moodLog.setSentiment(calculateSentiment(mood));
            moodLogRepository.save(moodLog);
            return new Moodlog(true, moodLog, "Mood log updated successfully.");
            
        }
        // Otherwise, create a new mood log
        MoodLog newMoodLog = new MoodLog();
        newMoodLog.setUserId(userid);
        newMoodLog.setEnergyScore(mood);
        newMoodLog.setLoggedAt(java.time.LocalDateTime.now());
        newMoodLog.setDataSource("manual");
        newMoodLog.setSentiment(calculateSentiment(mood));
        moodLogRepository.save(newMoodLog);
        return new Moodlog(true, newMoodLog, "Mood log created successfully.");
    }

    private String calculateSentiment(int mood) {
        if (mood >= 8) {
            return "Very Positive";
        } else if (mood >= 6) {
            return "Positive";
        } else if (mood >= 4) {
            return "Neutral";
        } else if (mood >= 2) {
            return "Negative";
        } else {
            return "Very Negative";
        }
    }

    public Moodlog getLatestMoodlog(UUID userid) {
        MoodLog moodLog = moodLogRepository.findFirstByUserIdOrderByLoggedAtDesc(userid).orElse(null);
        if (moodLog != null) {
            if(moodLog.getLoggedAt() == LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.DAYS)){
                return new Moodlog(true, moodLog, "Latest mood log retrieved successfully.");
            }
            return new Moodlog(false, moodLog, "Needed update.");
        } else {
            return new Moodlog(false, null, "No mood logs found for this user.");
        }
    }



}

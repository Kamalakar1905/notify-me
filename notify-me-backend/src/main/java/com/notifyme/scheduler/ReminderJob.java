package com.notifyme.scheduler;

import com.notifyme.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Slf4j
public class ReminderJob implements Job {

    @Autowired
    private NotificationService notificationService;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        String taskId = context.getJobDetail().getJobDataMap().getString("taskId");
        String userId = context.getJobDetail().getJobDataMap().getString("userId");
        log.info("Executing reminder job for task: {}", taskId);
        try {
            notificationService.sendTaskReminder(UUID.fromString(taskId), UUID.fromString(userId));
        } catch (Exception e) {
            log.error("Reminder job failed for task {}: {}", taskId, e.getMessage());
            throw new JobExecutionException(e, false);
        }
    }
}

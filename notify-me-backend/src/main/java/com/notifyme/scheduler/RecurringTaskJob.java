package com.notifyme.scheduler;

import com.notifyme.model.Task;
import com.notifyme.model.enums.TaskStatus;
import com.notifyme.repository.TaskRepository;
import com.notifyme.service.SchedulerService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
@Slf4j
public class RecurringTaskJob implements Job {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private SchedulerService schedulerService;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        String taskId = context.getJobDetail().getJobDataMap().getString("taskId");
        log.info("Generating next occurrence for recurring task: {}", taskId);

        try {
            Optional<Task> parentOpt = taskRepository.findById(UUID.fromString(taskId));
            if (parentOpt.isEmpty()) {
                log.warn("Parent task {} not found, skipping recurrence", taskId);
                return;
            }
            Task parent = parentOpt.get();

            // Create next occurrence as a child task
            Task occurrence = Task.builder()
                    .user(parent.getUser())
                    .category(parent.getCategory())
                    .title(parent.getTitle())
                    .description(parent.getDescription())
                    .priority(parent.getPriority())
                    .status(TaskStatus.PENDING)
                    .timezone(parent.getTimezone())
                    .parentTask(parent)
                    .suggestionEnabled(parent.getSuggestionEnabled())
                    .build();

            // Set reminder based on next fire time
            Instant nextFire = context.getNextFireTime() != null
                    ? context.getNextFireTime().toInstant()
                    : Instant.now().plusSeconds(86400);
            occurrence.setReminderAt(nextFire);
            occurrence.setDueDate(nextFire.plusSeconds(3600));

            occurrence = taskRepository.save(occurrence);
            schedulerService.scheduleReminder(occurrence);
            log.info("Recurring occurrence created: {} from parent: {}", occurrence.getId(), taskId);
        } catch (Exception e) {
            log.error("RecurringTaskJob failed for task {}: {}", taskId, e.getMessage());
            throw new JobExecutionException(e, false);
        }
    }
}

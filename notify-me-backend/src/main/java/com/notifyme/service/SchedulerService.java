package com.notifyme.service;

import com.notifyme.model.Task;
import com.notifyme.scheduler.EscalationJob;
import com.notifyme.scheduler.RecurringTaskJob;
import com.notifyme.scheduler.ReminderJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private final Scheduler scheduler;

    private static final String REMINDER_GROUP = "REMINDERS";
    private static final String RECURRING_GROUP = "RECURRING";
    private static final String ESCALATION_GROUP = "ESCALATIONS";

    public void scheduleReminder(Task task) {
        if (task.getReminderAt() == null || task.getReminderAt().isBefore(Instant.now())) {
            return;
        }
        try {
            String jobKey = "reminder-" + task.getId();
            JobDetail job = JobBuilder.newJob(ReminderJob.class)
                    .withIdentity(jobKey, REMINDER_GROUP)
                    .usingJobData("taskId", task.getId().toString())
                    .usingJobData("userId", task.getUser().getId().toString())
                    .storeDurably(false)
                    .build();

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(jobKey + "-trigger", REMINDER_GROUP)
                    .startAt(Date.from(task.getReminderAt()))
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule().withMisfireHandlingInstructionFireNow())
                    .build();

            if (scheduler.checkExists(job.getKey())) {
                scheduler.deleteJob(job.getKey());
            }
            scheduler.scheduleJob(job, trigger);
            log.info("Reminder scheduled for task {} at {}", task.getId(), task.getReminderAt());

            // Schedule escalation for CRITICAL tasks
            if (task.getPriority() != null && task.getPriority().name().equals("CRITICAL")) {
                scheduleEscalation(task);
            }
        } catch (SchedulerException e) {
            log.error("Failed to schedule reminder for task {}: {}", task.getId(), e.getMessage());
        }
    }

    public void rescheduleReminder(Task task) {
        cancelReminder(task.getId());
        scheduleReminder(task);
    }

    public void cancelReminder(UUID taskId) {
        try {
            JobKey key = new JobKey("reminder-" + taskId, REMINDER_GROUP);
            if (scheduler.checkExists(key)) {
                scheduler.deleteJob(key);
                log.info("Reminder cancelled for task {}", taskId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to cancel reminder for task {}: {}", taskId, e.getMessage());
        }
    }

    public void scheduleRecurring(Task task) {
        if (task.getRecurrenceRule() == null) return;
        try {
            String jobKey = "recurring-" + task.getId();
            String cronExpression = buildCronExpression(task.getRecurrenceRule());

            JobDetail job = JobBuilder.newJob(RecurringTaskJob.class)
                    .withIdentity(jobKey, RECURRING_GROUP)
                    .usingJobData("taskId", task.getId().toString())
                    .usingJobData("userId", task.getUser().getId().toString())
                    .storeDurably(true)
                    .build();

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(jobKey + "-trigger", RECURRING_GROUP)
                    .withSchedule(CronScheduleBuilder.cronSchedule(cronExpression)
                            .withMisfireHandlingInstructionDoNothing())
                    .build();

            if (scheduler.checkExists(job.getKey())) {
                scheduler.deleteJob(job.getKey());
            }
            scheduler.scheduleJob(job, trigger);
            log.info("Recurring task scheduled for task {} with rule {}", task.getId(), task.getRecurrenceRule());
        } catch (SchedulerException e) {
            log.error("Failed to schedule recurring task {}: {}", task.getId(), e.getMessage());
        }
    }

    private void scheduleEscalation(Task task) {
        try {
            // Escalate 30 minutes after initial reminder if not opened
            Instant escalationTime = task.getReminderAt().plusSeconds(1800);
            String jobKey = "escalation-" + task.getId();

            JobDetail job = JobBuilder.newJob(EscalationJob.class)
                    .withIdentity(jobKey, ESCALATION_GROUP)
                    .usingJobData("taskId", task.getId().toString())
                    .usingJobData("userId", task.getUser().getId().toString())
                    .build();

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(jobKey + "-trigger", ESCALATION_GROUP)
                    .startAt(Date.from(escalationTime))
                    .build();

            scheduler.scheduleJob(job, trigger);
        } catch (SchedulerException e) {
            log.error("Failed to schedule escalation for task {}: {}", task.getId(), e.getMessage());
        }
    }

    private String buildCronExpression(java.util.Map<String, Object> rule) {
        String type = (String) rule.getOrDefault("type", "DAILY");
        return switch (type) {
            case "DAILY" -> "0 0 9 * * ?";       // Every day at 9 AM
            case "WEEKLY" -> "0 0 9 ? * MON";    // Every Monday at 9 AM
            case "MONTHLY" -> "0 0 9 1 * ?";     // 1st of every month at 9 AM
            default -> "0 0 9 * * ?";
        };
    }
}

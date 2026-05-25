package com.notifyme.service;

import com.notifyme.dto.request.CreateTaskRequest;
import com.notifyme.dto.request.UpdatePriorityRequest;
import com.notifyme.dto.response.TaskResponse;
import com.notifyme.exception.ResourceNotFoundException;
import com.notifyme.model.Category;
import com.notifyme.model.Task;
import com.notifyme.model.User;
import com.notifyme.model.enums.TaskStatus;
import com.notifyme.repository.CategoryRepository;
import com.notifyme.repository.TaskRepository;
import com.notifyme.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.notifyme.exception.BadRequestException;
import com.notifyme.repository.TaskShareRepository;
import com.notifyme.model.TaskShare;
import com.notifyme.dto.response.TaskShareResponse;
import java.util.List;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SchedulerService schedulerService;
    private final ReminderSuggestionService suggestionService;
    private final UserBehaviorService behaviorService;
    private final TaskShareRepository taskShareRepository;

    public TaskResponse createTask(UUID userId, CreateTaskRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getDueDate() != null) {
            List<Task> conflicts = taskRepository.findConflictingTasks(userId, request.getDueDate());
            if (!conflicts.isEmpty()) {
                Task conflict = conflicts.get(0);
                throw new BadRequestException("Task: " + conflict.getTitle() + " - already a task is scheduled for that time. please try with other time.");
            }
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
                    .orElse(null);
        }

        Task task = Task.builder()
                .user(user)
                .category(category)
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority())
                .dueDate(request.getDueDate())
                .reminderAt(request.getReminderAt())
                .timezone(request.getTimezone() != null ? request.getTimezone() : user.getTimezone())
                .isRecurring(request.getIsRecurring())
                .recurrenceRule(request.getRecurrenceRule())
                .suggestionEnabled(request.getSuggestionEnabled())
                .build();

        // Generate smart suggestion if enabled
        if (Boolean.TRUE.equals(request.getSuggestionEnabled()) && user.getSmartSuggestionsEnabled()) {
            Instant suggested = suggestionService.suggestReminderTime(userId, request.getDueDate());
            task.setSuggestedReminder(suggested);
        }

        task = taskRepository.save(task);

        // Schedule reminder
        if (task.getReminderAt() != null) {
            schedulerService.scheduleReminder(task);
        }

        // Schedule recurring occurrences
        if (Boolean.TRUE.equals(task.getIsRecurring()) && task.getRecurrenceRule() != null) {
            schedulerService.scheduleRecurring(task);
        }

        log.info("Task created: {} for user: {}", task.getId(), userId);
        return mapToResponse(task);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getUserTasks(UUID userId, Pageable pageable) {
        return taskRepository.findByUserIdOrderByPriorityAndReminder(userId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        return mapToResponse(task);
    }

    public TaskResponse updateTask(UUID taskId, UUID userId, CreateTaskRequest request) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (request.getDueDate() != null && !request.getDueDate().equals(task.getDueDate())) {
            List<Task> conflicts = taskRepository.findConflictingTasks(userId, request.getDueDate());
            if (!conflicts.isEmpty()) {
                Task conflict = conflicts.get(0);
                throw new BadRequestException("Task: " + conflict.getTitle() + " - already a task is scheduled for that time. please try with other time.");
            }
        }

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setDueDate(request.getDueDate());
        task.setTimezone(request.getTimezone());

        if (request.getReminderAt() != null && !request.getReminderAt().equals(task.getReminderAt())) {
            task.setReminderAt(request.getReminderAt());
            schedulerService.rescheduleReminder(task);
        }

        task = taskRepository.save(task);
        return mapToResponse(task);
    }

    public TaskResponse updatePriority(UUID taskId, UUID userId, UpdatePriorityRequest request) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setPriority(request.getPriority());
        task = taskRepository.save(task);
        log.info("Priority updated for task {} to {}", taskId, request.getPriority());
        return mapToResponse(task);
    }

    public TaskResponse completeTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(Instant.now());
        task = taskRepository.save(task);

        // Update behavior stats for smart suggestions
        behaviorService.recordCompletion(userId, task.getCompletedAt());

        // Cancel scheduled reminder
        schedulerService.cancelReminder(task.getId());

        return mapToResponse(task);
    }

    public TaskResponse snoozeTask(UUID taskId, UUID userId, Instant snoozeUntil) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setSnoozedUntil(snoozeUntil);
        task.setSnoozeCount(task.getSnoozeCount() + 1);
        task.setReminderAt(snoozeUntil);
        task = taskRepository.save(task);

        schedulerService.rescheduleReminder(task);
        behaviorService.recordSnooze(userId, snoozeUntil);

        return mapToResponse(task);
    }

    public TaskResponse skipTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setStatus(TaskStatus.SKIPPED);
        task = taskRepository.save(task);
        schedulerService.cancelReminder(task.getId());
        return mapToResponse(task);
    }

    public void deleteTask(UUID taskId, UUID userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setDeletedAt(Instant.now());
        taskRepository.save(task);
        schedulerService.cancelReminder(task.getId());
        log.info("Task soft-deleted: {}", taskId);
    }

    public TaskResponse mapToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .reminderAt(task.getReminderAt())
                .timezone(task.getTimezone())
                .isRecurring(task.getIsRecurring())
                .recurrenceRule(task.getRecurrenceRule())
                .parentTaskId(task.getParentTask() != null ? task.getParentTask().getId() : null)
                .suggestionEnabled(task.getSuggestionEnabled())
                .suggestedReminder(task.getSuggestedReminder())
                .completedAt(task.getCompletedAt())
                .snoozedUntil(task.getSnoozedUntil())
                .snoozeCount(task.getSnoozeCount())
                .categoryId(task.getCategory() != null ? task.getCategory().getId() : null)
                .categoryName(task.getCategory() != null ? task.getCategory().getName() : null)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    public void shareTask(UUID taskId, UUID ownerId, String emailOrMobile) {
        Task task = taskRepository.findByIdAndUserId(taskId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found or you are not the owner"));

        User recipient = userRepository.findByEmail(emailOrMobile)
                .orElseGet(() -> userRepository.findByMobileNumber(emailOrMobile)
                .orElseThrow(() -> new BadRequestException("User not found with matching email or mobile number")));

        if (recipient.getId().equals(ownerId)) {
            throw new BadRequestException("You cannot share a task with yourself");
        }

        if (taskShareRepository.existsByTaskIdAndSharedWithId(taskId, recipient.getId())) {
            throw new BadRequestException("Task has already been shared with this user");
        }

        TaskShare share = TaskShare.builder()
                .task(task)
                .owner(task.getUser())
                .sharedWith(recipient)
                .status(com.notifyme.model.enums.ShareStatus.PENDING)
                .build();

        taskShareRepository.save(share);
    }

    @Transactional(readOnly = true)
    public List<TaskShareResponse> getPendingShares(UUID userId) {
        return taskShareRepository.findBySharedWithIdAndStatus(userId, com.notifyme.model.enums.ShareStatus.PENDING)
                .stream()
                .map(this::mapToShareResponse)
                .toList();
    }

    public TaskResponse acceptShare(UUID shareId, UUID userId, boolean postponeConflicts) {
        TaskShare share = taskShareRepository.findByIdAndSharedWithId(shareId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task share invitation not found"));

        if (share.getStatus() != com.notifyme.model.enums.ShareStatus.PENDING) {
            throw new BadRequestException("Invitation is not pending");
        }

        Task sharedTask = share.getTask();
        Instant dueDate = sharedTask.getDueDate();

        if (dueDate != null) {
            List<Task> conflicts = taskRepository.findConflictingTasks(userId, dueDate);
            if (!conflicts.isEmpty()) {
                if (postponeConflicts) {
                    for (Task conflict : conflicts) {
                        conflict.setDueDate(conflict.getDueDate().plus(java.time.Duration.ofHours(1)));
                        if (conflict.getReminderAt() != null) {
                            conflict.setReminderAt(conflict.getReminderAt().plus(java.time.Duration.ofHours(1)));
                        }
                        taskRepository.save(conflict);
                        if (conflict.getReminderAt() != null) {
                            schedulerService.rescheduleReminder(conflict);
                        }
                    }
                } else {
                    Task conflict = conflicts.get(0);
                    throw new BadRequestException("Task: " + conflict.getTitle() + " - already a task is scheduled for that time. please try with other time.");
                }
            }
        }

        share.setStatus(com.notifyme.model.enums.ShareStatus.ACCEPTED);
        taskShareRepository.save(share);

        Task userTask = Task.builder()
                .user(share.getSharedWith())
                .category(null)
                .title("[Shared] " + sharedTask.getTitle())
                .description(sharedTask.getDescription())
                .priority(sharedTask.getPriority())
                .dueDate(sharedTask.getDueDate())
                .reminderAt(sharedTask.getReminderAt())
                .timezone(sharedTask.getTimezone())
                .isRecurring(sharedTask.getIsRecurring())
                .recurrenceRule(sharedTask.getRecurrenceRule())
                .suggestionEnabled(sharedTask.getSuggestionEnabled())
                .build();

        userTask = taskRepository.save(userTask);

        if (userTask.getReminderAt() != null) {
            schedulerService.scheduleReminder(userTask);
        }

        return mapToResponse(userTask);
    }

    public void rejectShare(UUID shareId, UUID userId) {
        TaskShare share = taskShareRepository.findByIdAndSharedWithId(shareId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task share invitation not found"));

        if (share.getStatus() != com.notifyme.model.enums.ShareStatus.PENDING) {
            throw new BadRequestException("Invitation is not pending");
        }

        share.setStatus(com.notifyme.model.enums.ShareStatus.REJECTED);
        taskShareRepository.save(share);
    }

    private TaskShareResponse mapToShareResponse(TaskShare share) {
        return TaskShareResponse.builder()
                .id(share.getId())
                .task(mapToResponse(share.getTask()))
                .ownerName(share.getOwner().getFullName())
                .ownerEmail(share.getOwner().getEmail())
                .status(share.getStatus())
                .createdAt(share.getCreatedAt())
                .build();
    }
}

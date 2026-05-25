package com.notifyme.controller;

import com.notifyme.dto.request.CreateTaskRequest;
import com.notifyme.dto.request.ShareTaskRequest;
import com.notifyme.dto.request.UpdatePriorityRequest;
import com.notifyme.dto.response.ApiResponse;
import com.notifyme.dto.response.TaskResponse;
import com.notifyme.security.SecurityUtils;
import com.notifyme.service.ReminderSuggestionService;
import com.notifyme.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import com.notifyme.dto.response.TaskShareResponse;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final ReminderSuggestionService suggestionService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<TaskResponse>>> getTasks(
            @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.getUserTasks(userId, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @Valid @RequestBody CreateTaskRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        TaskResponse task = taskService.createTask(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Task created", task));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.getTask(id, userId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTaskRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.updateTask(id, userId, request)));
    }

    @PatchMapping("/{id}/priority")
    public ResponseEntity<ApiResponse<TaskResponse>> updatePriority(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePriorityRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.updatePriority(id, userId, request)));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<TaskResponse>> completeTask(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.completeTask(id, userId)));
    }

    @PatchMapping("/{id}/snooze")
    public ResponseEntity<ApiResponse<TaskResponse>> snoozeTask(
            @PathVariable UUID id,
            @RequestParam Instant snoozeUntil) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.snoozeTask(id, userId, snoozeUntil)));
    }

    @PatchMapping("/{id}/skip")
    public ResponseEntity<ApiResponse<TaskResponse>> skipTask(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.skipTask(id, userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        taskService.deleteTask(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Task deleted", null));
    }

    @GetMapping("/reminder-suggestions")
    public ResponseEntity<ApiResponse<List<ReminderSuggestionService.SuggestionCard>>> getSuggestions(
            @RequestParam(required = false) Instant dueDate) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(suggestionService.getSuggestions(userId, dueDate)));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<ApiResponse<Void>> shareTask(
            @PathVariable UUID id,
            @Valid @RequestBody ShareTaskRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        taskService.shareTask(id, userId, request.getEmailOrMobile());
        return ResponseEntity.ok(ApiResponse.success("Task share invitation sent successfully", null));
    }

    @GetMapping("/shares/pending")
    public ResponseEntity<ApiResponse<List<TaskShareResponse>>> getPendingShares() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(taskService.getPendingShares(userId)));
    }

    @PostMapping("/shares/{shareId}/accept")
    public ResponseEntity<ApiResponse<TaskResponse>> acceptShare(
            @PathVariable UUID shareId,
            @RequestParam(defaultValue = "false") boolean postponeConflicts) {
        UUID userId = SecurityUtils.getCurrentUserId();
        TaskResponse accepted = taskService.acceptShare(shareId, userId, postponeConflicts);
        return ResponseEntity.ok(ApiResponse.success("Task share accepted and added to your tasks", accepted));
    }

    @PostMapping("/shares/{shareId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectShare(@PathVariable UUID shareId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        taskService.rejectShare(shareId, userId);
        return ResponseEntity.ok(ApiResponse.success("Task share invitation rejected", null));
    }
}

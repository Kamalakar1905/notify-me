package com.notifyme.service;

import com.google.firebase.messaging.*;
import com.notifyme.model.NotificationHistory;
import com.notifyme.model.User;
import com.notifyme.model.enums.NotificationStatus;
import com.notifyme.model.enums.NotificationType;
import com.notifyme.repository.NotificationHistoryRepository;
import com.notifyme.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationHistoryRepository notificationHistoryRepository;
    private final UserRepository userRepository;
    private final UserBehaviorService behaviorService;

    @Async
    @Transactional
    public void sendTaskReminder(UUID taskId, UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getFcmToken() == null) {
            log.warn("Cannot send reminder: user {} has no FCM token", userId);
            return;
        }

        // Create history record first
        NotificationHistory history = NotificationHistory.builder()
                .user(user)
                .notificationType(NotificationType.REMINDER)
                .title("Task Reminder")
                .body("You have a task due soon")
                .status(NotificationStatus.PENDING)
                .build();
        history = notificationHistoryRepository.save(history);

        sendFcmNotification(user.getFcmToken(), "Task Reminder", "You have a task due soon",
                Map.of("taskId", taskId.toString(), "type", "REMINDER"), history);
    }

    @Async
    @Transactional
    public void sendEscalation(UUID taskId, UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getFcmToken() == null)
            return;

        NotificationHistory history = NotificationHistory.builder()
                .user(user)
                .notificationType(NotificationType.ESCALATION)
                .title("⚠️ Critical Task Reminder")
                .body("This critical task still needs your attention!")
                .status(NotificationStatus.PENDING)
                .build();
        history = notificationHistoryRepository.save(history);

        sendFcmNotification(user.getFcmToken(), "⚠️ Critical Task Reminder",
                "This critical task still needs your attention!",
                Map.of("taskId", taskId.toString(), "type", "ESCALATION"), history);
    }

    private void sendFcmNotification(String fcmToken, String title, String body,
            Map<String, String> data, NotificationHistory history) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putAllData(data)
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .build())
                    .setApnsConfig(ApnsConfig.builder()
                            .setAps(Aps.builder()
                                    .setSound("default")
                                    .setBadge(1)
                                    .build())
                            .build())
                    .build();

            String messageId = FirebaseMessaging.getInstance().send(message);
            history.setStatus(NotificationStatus.SENT);
            history.setSentAtUtc(Instant.now());
            history.setFcmMessageId(messageId);
            notificationHistoryRepository.save(history);
            log.info("FCM notification sent: {}", messageId);

        } catch (FirebaseMessagingException e) {
            log.error("FCM send failed: {}", e.getMessage());
            history.setStatus(NotificationStatus.FAILED);
            history.setErrorMessage(e.getMessage());
            history.setRetryCount(history.getRetryCount() + 1);
            if (history.getRetryCount() < history.getMaxRetries()) {
                // Exponential backoff: 30s, 60s, 120s, 240s, 480s
                long delaySeconds = (long) (30 * Math.pow(2, history.getRetryCount() - 1));
                history.setNextRetryAt(Instant.now().plusSeconds(delaySeconds));
            }
            notificationHistoryRepository.save(history);
        }
    }

    @Transactional
    public void markOpened(UUID notificationId, UUID userId) {
        notificationHistoryRepository.findByIdAndUserId(notificationId, userId).ifPresent(n -> {
            n.setStatus(NotificationStatus.OPENED);
            n.setOpenedAtUtc(Instant.now());
            notificationHistoryRepository.save(n);
            behaviorService.recordReminderOpen(userId, Instant.now());
        });
    }

    @Transactional
    public void retryFailedNotifications() {
        var pending = notificationHistoryRepository.findPendingRetries(Instant.now());
        log.info("Retrying {} failed notifications", pending.size());
        for (NotificationHistory n : pending) {
            if (n.getUser().getFcmToken() != null) {
                Map<String, String> data = new HashMap<>();
                if (n.getTask() != null)
                    data.put("taskId", n.getTask().getId().toString());
                data.put("type", n.getNotificationType().name());
                sendFcmNotification(n.getUser().getFcmToken(), n.getTitle(), n.getBody(), data, n);
            }
        }
    }
}

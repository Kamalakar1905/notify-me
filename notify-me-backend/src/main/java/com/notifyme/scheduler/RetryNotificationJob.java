package com.notifyme.scheduler;

import com.notifyme.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RetryNotificationJob {

    private final NotificationService notificationService;

    // Run every 2 minutes
    @Scheduled(fixedDelay = 120000)
    public void retryFailedNotifications() {
        log.debug("Running notification retry job");
        notificationService.retryFailedNotifications();
    }
}

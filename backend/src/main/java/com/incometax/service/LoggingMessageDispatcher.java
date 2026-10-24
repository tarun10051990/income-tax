package com.incometax.service;

import com.incometax.entity.NotificationRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Default dispatcher: records the outbound attempt without claiming external delivery. */
@Component
@Slf4j
public class LoggingMessageDispatcher implements MessageDispatcher {

    @Override
    public boolean supports(NotificationRecord.Channel channel) {
        return true;
    }

    @Override
    public void dispatch(NotificationRecord notification) {
        log.info("Notification queued channel={} event={} recipient={} subject={}",
                notification.getChannel(), notification.getEventKey(),
                notification.getRecipient().getId(), notification.getSubject());
    }
}

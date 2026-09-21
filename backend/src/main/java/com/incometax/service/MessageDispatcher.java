package com.incometax.service;

import com.incometax.entity.NotificationRecord;

/**
 * Outbound channel abstraction. The shipped implementation records the intent to send; email and
 * SMS/WhatsApp providers are wired per deployment with credentials from the secret store.
 */
public interface MessageDispatcher {

    boolean supports(NotificationRecord.Channel channel);

    void dispatch(NotificationRecord notification);
}

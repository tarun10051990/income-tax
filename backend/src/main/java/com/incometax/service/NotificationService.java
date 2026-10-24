package com.incometax.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.FilingQuery;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.NotificationRecord;
import com.incometax.entity.NotificationTemplate;
import com.incometax.entity.PaymentRecord;
import com.incometax.entity.User;
import com.incometax.repository.NotificationRepository;
import com.incometax.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Template-driven notifications; administrators own the template content. */
@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final String FILING_STARTED = "FILING_STARTED";
    public static final String DOCUMENT_REQUIRED = "DOCUMENT_REQUIRED";
    public static final String QUERY_RAISED = "QUERY_RAISED";
    public static final String QUERY_ANSWERED = "QUERY_ANSWERED";
    public static final String FILING_APPROVED = "FILING_APPROVED";
    public static final String FILING_REJECTED = "FILING_REJECTED";
    public static final String FILING_SUBMITTED = "FILING_SUBMITTED";
    public static final String FILING_COMPLETED = "FILING_COMPLETED";
    public static final String DEADLINE_APPROACHING = "DEADLINE_APPROACHING";
    public static final String PAYMENT_REQUIRED = "PAYMENT_REQUIRED";
    public static final String STATUS_CHANGED = "FILING_STATUS_CHANGED";

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final List<MessageDispatcher> dispatchers;

    public void send(User recipient, String eventKey, Map<String, String> variables, String caseId) {
        NotificationTemplate template = templateRepository.findByEventKey(eventKey).orElse(null);
        if (template != null && !template.isActive()) {
            return;
        }
        String subject = render(template == null ? eventKey : template.getSubject(), variables);
        String body = render(template == null ? eventKey : template.getBody(), variables);

        for (NotificationRecord.Channel channel : channels(template)) {
            NotificationRecord notification = notificationRepository.save(NotificationRecord.builder()
                    .recipient(recipient)
                    .eventKey(eventKey)
                    .subject(subject)
                    .body(body)
                    .caseId(caseId)
                    .channel(channel)
                    .build());
            dispatchers.stream()
                    .filter(dispatcher -> dispatcher.supports(channel))
                    .findFirst()
                    .ifPresent(dispatcher -> dispatcher.dispatch(notification));
        }
    }

    public void notifyStatusChange(FilingCase filingCase, FilingStatus from, FilingStatus to) {
        String eventKey = switch (to) {
            case APPROVED -> FILING_APPROVED;
            case REJECTED -> FILING_REJECTED;
            case COMPLETED -> FILING_COMPLETED;
            case DOCUMENTS_PENDING, DATA_PENDING -> DOCUMENT_REQUIRED;
            case UNDER_REVIEW -> FILING_SUBMITTED;
            default -> STATUS_CHANGED;
        };
        send(filingCase.getCustomer(), eventKey, Map.of(
                "caseNumber", filingCase.getCaseNumber(),
                "taxType", filingCase.getTaxType().name(),
                "fromStatus", from.name(),
                "toStatus", to.name()), filingCase.getId());
    }

    public void notifyQueryRaised(FilingQuery query) {
        send(query.getFilingCase().getCustomer(), QUERY_RAISED, Map.of(
                "queryNumber", query.getQueryNumber(),
                "caseNumber", query.getFilingCase().getCaseNumber(),
                "question", query.getQuestion()), query.getFilingCase().getId());
    }

    public void notifyQueryAnswered(FilingQuery query, User staffRecipient) {
        if (staffRecipient == null) {
            return;
        }
        send(staffRecipient, QUERY_ANSWERED, Map.of(
                "queryNumber", query.getQueryNumber(),
                "caseNumber", query.getFilingCase().getCaseNumber()), query.getFilingCase().getId());
    }

    public void notifyPaymentRequired(PaymentRecord payment) {
        send(payment.getCustomer(), PAYMENT_REQUIRED, Map.of(
                "invoiceNumber", payment.getInvoiceNumber(),
                "amount", payment.totalAmount().toPlainString()),
                payment.getFilingCase() == null ? null : payment.getFilingCase().getId());
    }

    public org.springframework.data.domain.Page<NotificationRecord> inbox(
            User recipient, org.springframework.data.domain.Pageable pageable) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipient.getId(), pageable);
    }

    public long unreadCount(User recipient) {
        return notificationRepository.countByRecipientIdAndReadFalse(recipient.getId());
    }

    @org.springframework.transaction.annotation.Transactional
    public NotificationRecord markRead(String notificationId, User recipient) {
        NotificationRecord notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> com.incometax.exception.ApiException.notFound("Notification", notificationId));
        if (!notification.getRecipient().getId().equals(recipient.getId())) {
            throw com.incometax.exception.ApiException.forbidden("That notification belongs to another user");
        }
        notification.setRead(true);
        notification.setReadAt(java.time.LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    @org.springframework.transaction.annotation.Transactional
    public int markAllRead(User recipient) {
        List<NotificationRecord> unread = notificationRepository.findByRecipientIdAndReadFalse(recipient.getId());
        unread.forEach(notification -> {
            notification.setRead(true);
            notification.setReadAt(java.time.LocalDateTime.now());
        });
        notificationRepository.saveAll(unread);
        return unread.size();
    }

    public void notifyDeadline(FilingCase filingCase) {
        send(filingCase.getCustomer(), DEADLINE_APPROACHING, Map.of(
                "caseNumber", filingCase.getCaseNumber(),
                "dueDate", String.valueOf(filingCase.getDueDate())), filingCase.getId());
    }

    private List<NotificationRecord.Channel> channels(NotificationTemplate template) {
        List<NotificationRecord.Channel> channels = new ArrayList<>();
        if (template == null || template.isInApp()) {
            channels.add(NotificationRecord.Channel.IN_APP);
        }
        if (template != null && template.isEmail()) {
            channels.add(NotificationRecord.Channel.EMAIL);
        }
        if (template != null && template.isSms()) {
            channels.add(NotificationRecord.Channel.SMS);
        }
        return channels;
    }

    private String render(String text, Map<String, String> variables) {
        String rendered = text;
        for (Map.Entry<String, String> variable : variables.entrySet()) {
            rendered = rendered.replace("{{" + variable.getKey() + "}}", String.valueOf(variable.getValue()));
        }
        return rendered;
    }
}

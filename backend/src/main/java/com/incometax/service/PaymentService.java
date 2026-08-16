package com.incometax.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.PaymentRecord;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.PaymentRepository;
import com.incometax.repository.UserRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.Map;

/** Professional/platform service fees only; government tax payable is never handled here. */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final FilingCaseService filingCaseService;
    private final RbacService rbacService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public PaymentRecord raiseInvoice(String customerId, String caseId, String description, BigDecimal amount,
                                     BigDecimal taxAmount, LocalDate dueDate, User actor) {
        rbacService.require(actor, Permission.PAYMENT_MANAGE);
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> ApiException.notFound("Customer", customerId));
        FilingCase filingCase = caseId == null ? null : filingCaseService.require(caseId);

        PaymentRecord payment = paymentRepository.save(PaymentRecord.builder()
                .invoiceNumber(nextInvoiceNumber())
                .customer(customer)
                .filingCase(filingCase)
                .description(description)
                .amount(amount)
                .taxAmount(taxAmount == null ? BigDecimal.ZERO : taxAmount)
                .dueDate(dueDate)
                .build());

        auditService.record("PAYMENT_INVOICE_RAISED", "PaymentRecord", payment.getId(), null,
                Map.of("invoiceNumber", payment.getInvoiceNumber(), "amount", payment.totalAmount()));
        notificationService.notifyPaymentRequired(payment);
        return payment;
    }

    public Page<PaymentRecord> forCustomer(String customerId, Pageable pageable) {
        return paymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    public Page<PaymentRecord> all(PaymentRecord.Status status, Pageable pageable) {
        return status == null ? paymentRepository.findAll(pageable)
                : paymentRepository.findByStatus(status, pageable);
    }

    @Transactional
    public PaymentRecord recordOutcome(String paymentId, PaymentRecord.Status status, String providerReference,
                                      String failureReason, User actor) {
        PaymentRecord payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> ApiException.notFound("Payment", paymentId));
        boolean ownInvoice = payment.getCustomer().getId().equals(actor.getId());
        if (!ownInvoice) {
            rbacService.require(actor, Permission.PAYMENT_MANAGE);
        } else if (status != PaymentRecord.Status.PAID && status != PaymentRecord.Status.FAILED) {
            throw ApiException.forbidden("Only the platform can move an invoice to " + status);
        }
        if (payment.getStatus() == PaymentRecord.Status.PAID && status != PaymentRecord.Status.REFUNDED) {
            throw ApiException.conflict("PAYMENT_ALREADY_SETTLED", "This invoice has already been paid");
        }

        PaymentRecord.Status previous = payment.getStatus();
        payment.setStatus(status);
        payment.setProviderReference(providerReference);
        payment.setFailureReason(status == PaymentRecord.Status.FAILED ? failureReason : null);
        payment.setPaidAt(status == PaymentRecord.Status.PAID ? LocalDateTime.now() : payment.getPaidAt());
        PaymentRecord saved = paymentRepository.save(payment);

        auditService.record("PAYMENT_STATUS_CHANGED", "PaymentRecord", paymentId, previous.name(), status.name());
        return saved;
    }

    private String nextInvoiceNumber() {
        long sequence = paymentRepository.count() + 1;
        return String.format("INV-%d-%05d", Year.now().getValue(), sequence);
    }
}

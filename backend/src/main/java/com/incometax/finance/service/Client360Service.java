package com.incometax.finance.service;

import com.incometax.entity.FilingCase;
import com.incometax.entity.User;
import com.incometax.finance.dto.FinanceViews.Client360;
import com.incometax.finance.dto.FinanceViews.TrackingRow;
import com.incometax.finance.entity.Investment;
import com.incometax.finance.entity.TaxPayment;
import com.incometax.finance.entity.VerificationStatus;
import com.incometax.finance.repository.InvestmentRepository;
import com.incometax.finance.repository.TaxPaymentRepository;
import com.incometax.finance.repository.TaxRefundRepository;
import com.incometax.marketplace.repository.ConsultationBookingRepository;
import com.incometax.marketplace.service.MarketplaceMapper;
import com.incometax.repository.AuditLogRepository;
import com.incometax.repository.DocumentRepository;
import com.incometax.repository.FilingCaseRepository;
import com.incometax.repository.GstProfileRepository;
import com.incometax.repository.NotificationRepository;
import com.incometax.repository.TaxpayerProfileRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.ResponseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Staff-only, read-only aggregate of everything the platform knows about one client. */
@Service
@RequiredArgsConstructor
public class Client360Service {

    private final RbacService rbacService;
    private final FinanceLedgerService ledger;
    private final FinanceAnalyticsService analytics;
    private final FinanceMapper financeMapper;
    private final ResponseMapper responseMapper;
    private final MarketplaceMapper marketplaceMapper;
    private final TaxpayerProfileRepository taxpayerProfileRepository;
    private final GstProfileRepository gstProfileRepository;
    private final FilingCaseRepository filingCaseRepository;
    private final DocumentRepository documentRepository;
    private final InvestmentRepository investmentRepository;
    private final TaxPaymentRepository paymentRepository;
    private final TaxRefundRepository refundRepository;
    private final ConsultationBookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Client360 view(User staff, String clientId, String financialYear) {
        rbacService.require(staff, Permission.FINANCE_READ_ALL);
        User client = ledger.requireCustomerById(clientId);
        List<FilingCase> cases = filingCaseRepository.findByCustomerIdAndDeletedFalse(clientId);
        List<Investment> investments = investmentRepository.findByOwnerIdOrderByInvestedOnDesc(clientId);
        List<TaxPayment> payments = paymentRepository.findByOwnerIdOrderByPaidOnDesc(clientId);
        List<TrackingRow> tracking = analytics.tracking(client, null);

        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        totals.put("totalInvestment", sum(investments.stream().map(Investment::getAmount).toList()));
        totals.put("verifiedTaxPaid", sum(payments.stream()
                .filter(p -> p.getVerificationStatus() == VerificationStatus.VERIFIED)
                .map(TaxPayment::getAmount).toList()));
        totals.put("unverifiedTaxPaid", sum(payments.stream()
                .filter(p -> p.getVerificationStatus() != VerificationStatus.VERIFIED)
                .map(TaxPayment::getAmount).toList()));
        totals.put("totalLiability", sum(tracking.stream().map(TrackingRow::liability).toList()));
        totals.put("outstanding", sum(tracking.stream().map(TrackingRow::outstanding).toList()));
        totals.put("refundReceived", sum(tracking.stream().map(TrackingRow::refundReceived).toList()));

        return new Client360(
                responseMapper.user(client),
                responseMapper.taxpayerProfile(taxpayerProfileRepository.findByUserId(clientId).orElse(null)),
                gstProfileRepository.findByUserId(clientId).stream().findFirst()
                        .map(responseMapper::gstProfile).orElse(null),
                cases.stream().map(c -> (Object) responseMapper.filingCase(c)).toList(),
                documentRepository.findByOwnerId(clientId, PageRequest.of(0, 50)).getContent().stream()
                        .map(d -> (Object) responseMapper.document(d)).toList(),
                investments.stream().map(i -> financeMapper.investment(i, false)).toList(),
                payments.stream().map(p -> financeMapper.payment(p, false)).toList(),
                tracking,
                analytics.savings(client, financialYear),
                refundRepository.findByOwnerIdOrderByCreatedAtDesc(clientId).stream()
                        .map(r -> financeMapper.refund(r, false)).toList(),
                bookingRepository.findByClientIdOrderByScheduledStartDesc(clientId, PageRequest.of(0, 20))
                        .getContent().stream().map(b -> (Object) marketplaceMapper.booking(b, staff)).toList(),
                notificationRepository.findByRecipientIdOrderByCreatedAtDesc(clientId, PageRequest.of(0, 20))
                        .getContent().stream().map(n -> (Object) responseMapper.notification(n)).toList(),
                auditLogRepository.findByActorIdOrderByCreatedAtDesc(clientId, PageRequest.of(0, 30))
                        .getContent().stream().map(a -> (Object) responseMapper.audit(a)).toList(),
                totals);
    }

    private static BigDecimal sum(List<BigDecimal> values) {
        return values.stream().filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

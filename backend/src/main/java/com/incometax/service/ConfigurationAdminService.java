package com.incometax.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.dto.AdminRequests;
import com.incometax.entity.NotificationTemplate;
import com.incometax.entity.TaxRule;
import com.incometax.entity.TaxType;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.repository.NotificationTemplateRepository;
import com.incometax.repository.TaxRuleRepository;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Administrative maintenance of tax rules and notification templates. A rule change is published as
 * a new effective-dated version so that historical computations stay reproducible.
 */
@Service
@RequiredArgsConstructor
public class ConfigurationAdminService {

    private final TaxRuleRepository taxRuleRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;
    private final TaxRuleService taxRuleService;
    private final ObjectMapper objectMapper;
    private final RbacService rbacService;
    private final AuditService auditService;

    public List<TaxRule> taxRules(TaxType taxType, User actor) {
        rbacService.require(actor, Permission.CONFIG_READ);
        List<TaxRule> rules = taxType == null
                ? taxRuleRepository.findAll()
                : taxRuleRepository.findByTaxTypeOrderByRuleKeyAsc(taxType);
        return rules.stream()
                .sorted(Comparator.comparing(TaxRule::getRuleKey)
                        .thenComparing(TaxRule::getVersion, Comparator.reverseOrder()))
                .toList();
    }

    @Transactional
    public TaxRule publishTaxRule(AdminRequests.UpsertTaxRule request, User actor) {
        rbacService.require(actor, Permission.CONFIG_MANAGE);
        try {
            objectMapper.readTree(request.getConfiguration());
        } catch (Exception ex) {
            throw ApiException.badRequest("INVALID_RULE_CONFIGURATION",
                    "The configuration must be valid JSON");
        }

        int nextVersion = taxRuleRepository.findEffective(request.getRuleKey(), request.getEffectiveFrom()).stream()
                .mapToInt(TaxRule::getVersion)
                .max()
                .orElse(0) + 1;

        TaxRule rule = taxRuleService.save(TaxRule.builder()
                .ruleKey(request.getRuleKey())
                .taxType(request.getTaxType())
                .category(request.getCategory())
                .description(request.getDescription())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .version(nextVersion)
                .configuration(request.getConfiguration())
                .active(request.getActive() == null || request.getActive())
                .createdBy(actor.getEmail())
                .approvedBy(request.getApprovedBy())
                .build());

        auditService.record("TAX_RULE_PUBLISHED", "TaxRule", rule.getId(), null,
                Map.of("ruleKey", rule.getRuleKey(), "version", String.valueOf(rule.getVersion())));
        return rule;
    }

    public List<NotificationTemplate> templates(User actor) {
        rbacService.require(actor, Permission.NOTIFICATION_TEMPLATE_MANAGE);
        return notificationTemplateRepository.findAll();
    }

    @Transactional
    public NotificationTemplate upsertTemplate(AdminRequests.UpsertNotificationTemplate request, User actor) {
        rbacService.require(actor, Permission.NOTIFICATION_TEMPLATE_MANAGE);
        NotificationTemplate template = notificationTemplateRepository.findByEventKey(request.getEventKey())
                .orElseGet(() -> NotificationTemplate.builder().eventKey(request.getEventKey()).build());
        template.setSubject(request.getSubject());
        template.setBody(request.getBody());
        template.setInApp(request.isInApp());
        template.setEmail(request.isEmail());
        template.setSms(request.isSms());
        template.setActive(request.isActive());

        NotificationTemplate saved = notificationTemplateRepository.save(template);
        auditService.record("NOTIFICATION_TEMPLATE_SAVED", "NotificationTemplate", saved.getId(), null,
                Map.of("eventKey", saved.getEventKey()));
        return saved;
    }
}

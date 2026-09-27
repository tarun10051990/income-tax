package com.incometax.marketplace.config;

import com.incometax.entity.User;
import com.incometax.marketplace.entity.*;
import com.incometax.marketplace.repository.*;
import com.incometax.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Seeds the admin-editable marketplace configuration (professional types, consultation categories,
 * pricing rules). Existing rows are never overwritten so administrators' changes survive restarts.
 * Demo consultants are only created when {@code app.seed-demo-users} is enabled.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class MarketplaceSeeder {

    private final ProfessionalTypeRepository typeRepository;
    private final ConsultationCategoryRepository categoryRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final ConsultantProfileRepository profileRepository;
    private final ConsultantServiceRepository serviceRepository;
    private final AvailabilityRuleRepository availabilityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-demo-users:false}")
    private boolean seedDemoUsers;

    @Value("${app.seed-user-password:}")
    private String seedPassword;

    @Bean
    @Order(10)
    ApplicationRunner seedMarketplace() {
        return args -> {
            seedTypes();
            seedCategories();
            seedPricing();
            if (seedDemoUsers && seedPassword != null && !seedPassword.isBlank()) {
                seedDemoConsultants();
            }
        };
    }

    private void seedTypes() {
        type("CA", "Chartered Accountant", "CA", ProfessionalType.Regulator.ICAI, 1);
        type("TAX_CONSULTANT", "Tax Consultant", "Tax Consultant", ProfessionalType.Regulator.NONE, 2);
        type("GST_CONSULTANT", "GST Consultant", "GST Practitioner", ProfessionalType.Regulator.NONE, 3);
        type("INCOME_TAX_LAWYER", "Income Tax Lawyer", "Advocate", ProfessionalType.Regulator.BAR_COUNCIL, 4);
        type("CORPORATE_LAWYER", "Corporate Lawyer", "Advocate", ProfessionalType.Regulator.BAR_COUNCIL, 5);
        type("LAWYER", "Lawyer", "Advocate", ProfessionalType.Regulator.BAR_COUNCIL, 6);
        type("FINANCIAL_ADVISOR", "Financial / Tax Advisor", "Financial Advisor", ProfessionalType.Regulator.NONE, 7);
        type("COMPANY_SECRETARY", "Company Secretary", "CS", ProfessionalType.Regulator.NONE, 8);
    }

    private void type(String code, String label, String designation, ProfessionalType.Regulator reg, int order) {
        if (typeRepository.findByCode(code).isPresent()) {
            return;
        }
        typeRepository.save(ProfessionalType.builder().code(code).label(label).designation(designation)
                .regulator(reg).sortOrder(order).build());
    }

    private void seedCategories() {
        category("itr-filing", "ITR Filing", ConsultationCategory.Domain.INCOME_TAX,
                "Help choosing the right form and filing your income tax return", "CA,TAX_CONSULTANT", 1);
        category("tax-planning", "Tax Planning", ConsultationCategory.Domain.INCOME_TAX,
                "Salary structuring, 80C/80D, HRA, home loan and regime selection", "CA,FINANCIAL_ADVISOR", 2);
        category("capital-gains", "Capital Gains", ConsultationCategory.Domain.INCOME_TAX,
                "Shares, mutual funds, property and crypto gains", "CA,TAX_CONSULTANT", 3);
        category("income-tax-notice", "Income Tax Notice", ConsultationCategory.Domain.INCOME_TAX,
                "Replying to 143(1), 139(9), 148 and other notices", "CA,INCOME_TAX_LAWYER", 4);
        category("nri-taxation", "NRI Taxation", ConsultationCategory.Domain.INCOME_TAX,
                "Residential status, DTAA and foreign income", "CA,TAX_CONSULTANT", 5);
        category("gst-registration", "GST Registration", ConsultationCategory.Domain.GST,
                "New registration, amendments and cancellation", "GST_CONSULTANT,CA", 10);
        category("gst-returns", "GST Returns", ConsultationCategory.Domain.GST,
                "GSTR-1, GSTR-3B, GSTR-9 and reconciliation", "GST_CONSULTANT,CA", 11);
        category("gst-notice", "GST Notice / Litigation", ConsultationCategory.Domain.GST,
                "Show-cause notices, appeals and departmental audits", "GST_CONSULTANT,INCOME_TAX_LAWYER", 12);
        category("business-registration", "Business Registration", ConsultationCategory.Domain.LEGAL,
                "Company, LLP, partnership and MSME registration", "CORPORATE_LAWYER,COMPANY_SECRETARY,CA", 20);
        category("contracts", "Contracts & Agreements", ConsultationCategory.Domain.LEGAL,
                "Drafting and review of commercial agreements", "CORPORATE_LAWYER,LAWYER", 21);
        category("compliance", "Corporate Compliance", ConsultationCategory.Domain.LEGAL,
                "ROC filings, board resolutions and annual compliance", "COMPANY_SECRETARY,CORPORATE_LAWYER", 22);
        category("bookkeeping", "Bookkeeping & Accounting", ConsultationCategory.Domain.ACCOUNTING,
                "Accounts, TDS, payroll and audit readiness", "CA,TAX_CONSULTANT", 30);
    }

    private void category(String slug, String name, ConsultationCategory.Domain domain, String description,
                          String recommended, int order) {
        if (categoryRepository.findBySlug(slug).isPresent()) {
            return;
        }
        categoryRepository.save(ConsultationCategory.builder().slug(slug).name(name).domain(domain)
                .description(description).recommendedTypes(recommended).sortOrder(order).build());
    }

    private void seedPricing() {
        rule(PricingRule.MIN_CONSULTATION_FEE, "Minimum consultation fee", PricingRule.ValueType.AMOUNT, "99",
                "Lowest price a consultant may charge for any consultation.");
        rule(PricingRule.PLATFORM_COMMISSION_PERCENT, "Platform commission", PricingRule.ValueType.PERCENT, "15",
                "Percentage of the consultation fee retained by the platform; the rest is the consultant's earning.");
        rule(PricingRule.PLATFORM_FEE_FIXED, "Fixed platform fee", PricingRule.ValueType.AMOUNT, "0",
                "Flat convenience fee added to every booking on top of the consultation fee.");
        rule(PricingRule.TAX_ON_FEES_PERCENT, "GST on fees", PricingRule.ValueType.PERCENT, "18",
                "Indirect tax applied to the consultation fee and platform fee.");
        rule(PricingRule.URGENT_SURCHARGE_PERCENT, "Urgent consultation surcharge", PricingRule.ValueType.PERCENT,
                "25", "Added when the client requests a same-day / priority consultation.");
        rule(PricingRule.MODE_SURCHARGE_VIDEO, "Video call surcharge", PricingRule.ValueType.AMOUNT, "0", null);
        rule(PricingRule.MODE_SURCHARGE_PHONE, "Phone call surcharge", PricingRule.ValueType.AMOUNT, "0", null);
        rule(PricingRule.MODE_SURCHARGE_CHAT, "Chat consultation surcharge", PricingRule.ValueType.AMOUNT, "0", null);
        rule(PricingRule.MODE_SURCHARGE_IN_PERSON, "In-person surcharge", PricingRule.ValueType.AMOUNT, "200", null);
        rule(PricingRule.CANCELLATION_FULL_REFUND_HOURS, "Full refund window", PricingRule.ValueType.HOURS, "24",
                "Client cancellations at least this many hours before the slot are refunded automatically.");
    }

    private void rule(String code, String label, PricingRule.ValueType type, String value, String description) {
        if (pricingRuleRepository.findByCode(code).isPresent()) {
            return;
        }
        pricingRuleRepository.save(PricingRule.builder().code(code).label(label).valueType(type)
                .value(new BigDecimal(value)).description(description).build());
    }

    private void seedDemoConsultants() {
        demoConsultant("Priya Sharma", "ca.demo@taxfiler.in", "CA", "ICAI-123456", "B.Com, FCA", 12,
                "Income Tax,Capital Gains,Tax Planning", "itr-filing,tax-planning,capital-gains", "Mumbai",
                "Maharashtra", "English,Hindi,Marathi", "499",
                "Fellow Chartered Accountant helping salaried professionals and investors file accurately and plan ahead.",
                List.<String[]>of(new String[]{"itr-filing", "ITR filing review call", "30", "499"},
                        new String[]{"capital-gains", "Capital gains computation", "45", "999"}));
        demoConsultant("Arjun Mehta", "gst.demo@taxfiler.in", "GST_CONSULTANT", "GSTP-778899", "M.Com, GSTP", 7,
                "GST Returns,GST Registration,E-invoicing", "gst-registration,gst-returns,gst-notice", "Bengaluru",
                "Karnataka", "English,Kannada,Hindi", "299",
                "GST practitioner working with small businesses and online sellers on registrations, returns and notices.",
                List.<String[]>of(new String[]{"gst-returns", "Monthly GST return health check", "30", "299"},
                        new String[]{"gst-notice", "GST notice reply strategy", "45", "1499"}));
        demoConsultant("Adv. Neha Iyer", "lawyer.demo@taxfiler.in", "INCOME_TAX_LAWYER", "MAH/2345/2012",
                "LL.B., LL.M. (Taxation)", 11, "Income Tax Litigation,Appeals,Search & Seizure",
                "income-tax-notice,gst-notice,contracts", "Pune", "Maharashtra", "English,Hindi,Marathi", "1499",
                "Tax litigator representing clients before CIT(A), ITAT and High Court.",
                List.<String[]>of(new String[]{"income-tax-notice", "Notice assessment & reply", "45", "1999"}));
    }

    private void demoConsultant(String name, String email, String typeCode, String regNo, String qualification,
                                int years, String specs, String cats, String city, String state, String langs,
                                String fee, String bio, List<String[]> services) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User user = userRepository.save(User.builder().name(name).email(email)
                .password(passwordEncoder.encode(seedPassword)).role(User.Role.CONSULTANT)
                .onboardingComplete(true).build());
        ConsultantProfile profile = profileRepository.save(ConsultantProfile.builder()
                .user(user)
                .professionalType(typeRepository.findByCode(typeCode).orElseThrow())
                .registrationNumber(regNo).qualification(qualification).experienceYears(years)
                .specializations(specs).categorySlugs(cats).city(city).state(state).languages(langs)
                .bio(bio).baseFee(new BigDecimal(fee)).consultationModes("VIDEO,PHONE,CHAT")
                .status(ConsultantProfile.Status.ACTIVE).verified(true).verifiedAt(LocalDateTime.now())
                .verificationNotes("Seeded demo profile").build());
        for (String[] s : services) {
            serviceRepository.save(ConsultantService.builder().consultant(profile)
                    .category(categoryRepository.findBySlug(s[0]).orElse(null)).title(s[1])
                    .durationMinutes(Integer.parseInt(s[2])).fee(new BigDecimal(s[3])).build());
        }
        for (DayOfWeek day : List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY)) {
            availabilityRepository.save(AvailabilityRule.builder().consultant(profile).dayOfWeek(day)
                    .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(13, 0)).build());
            availabilityRepository.save(AvailabilityRule.builder().consultant(profile).dayOfWeek(day)
                    .startTime(LocalTime.of(15, 0)).endTime(LocalTime.of(19, 0)).build());
        }
        log.info("Seeded demo consultant {}", email);
    }
}

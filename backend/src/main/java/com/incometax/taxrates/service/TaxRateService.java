package com.incometax.taxrates.service;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.service.AuditService;
import com.incometax.taxrates.dto.TaxRateDtos;
import com.incometax.taxrates.entity.TaxCategoryRate;
import com.incometax.taxrates.entity.TaxRegimeSetting;
import com.incometax.taxrates.entity.TaxSlab;
import com.incometax.taxrates.repository.TaxCategoryRateRepository;
import com.incometax.taxrates.repository.TaxRegimeSettingRepository;
import com.incometax.taxrates.repository.TaxSlabRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Reads and maintains the income-tax rate tables (slabs, regime settings and category rates). */
@Service
@RequiredArgsConstructor
public class TaxRateService {

    private static final Set<User.Role> EDITORS = Set.of(User.Role.SUPER_ADMIN, User.Role.ADMIN);

    private final TaxRegimeSettingRepository settingRepository;
    private final TaxSlabRepository slabRepository;
    private final TaxCategoryRateRepository categoryRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<TaxRateDtos.YearView> years() {
        Map<String, TaxRateDtos.YearView> years = new LinkedHashMap<>();
        settingRepository.findByActiveTrueOrderByFinancialYearDesc().forEach(s ->
                years.putIfAbsent(s.getFinancialYear(), new TaxRateDtos.YearView(s.getFinancialYear(), s.getAssessmentYear())));
        return List.copyOf(years.values());
    }

    @Transactional(readOnly = true)
    public TaxEngine.RateBook book(String financialYear) {
        List<TaxRegimeSetting> settings = settingRepository.findByFinancialYearOrderByRegimeAsc(financialYear);
        if (settings.isEmpty()) {
            throw ApiException.notFound("Tax rates for financial year", financialYear);
        }
        return new TaxEngine.RateBook(financialYear, settings.get(0).getAssessmentYear(), settings,
                slabRepository.findByFinancialYearOrderByRegimeAscSlabTypeAscAgeGroupAscSortOrderAsc(financialYear),
                categoryRepository.findByFinancialYearOrderBySortOrderAsc(financialYear));
    }

    @Transactional(readOnly = true)
    public TaxRateDtos.RateBookView view(String financialYear, boolean activeOnly) {
        TaxEngine.RateBook book = book(financialYear);
        List<TaxCategoryRate> categories = activeOnly
                ? book.categories().stream().filter(TaxCategoryRate::isActive).toList()
                : book.categories();
        return new TaxRateDtos.RateBookView(book.financialYear(), book.assessmentYear(), book.settings(), book.slabs(), categories);
    }

    public String latestYear() {
        return years().stream().map(TaxRateDtos.YearView::financialYear).max(Comparator.naturalOrder())
                .orElseThrow(() -> ApiException.notFound("Tax rates", "any year"));
    }

    @Transactional
    public TaxCategoryRate updateCategory(String id, TaxRateDtos.CategoryUpdate update, User actor) {
        requireEditor(actor);
        TaxCategoryRate category = categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Tax category", id));
        if (update.treatment() == TaxCategoryRate.Treatment.SPECIAL_RATE && update.rate() == null) {
            throw ApiException.badRequest("RATE_REQUIRED", "A flat-rate category needs a rate");
        }
        String before = snapshot(category);
        category.setName(update.name());
        category.setHint(update.hint());
        category.setSection(update.section());
        category.setTreatment(update.treatment());
        category.setRate(fraction(update.rate()));
        category.setExemptionLimit(update.exemptionLimit());
        category.setExemptionGroup(blankToNull(update.exemptionGroup()));
        category.setStandardDeductionRate(fraction(update.standardDeductionRate()));
        category.setBasicExemptionAdjustable(update.basicExemptionAdjustable());
        category.setRebateRegimes(blankToNull(update.rebateRegimes()));
        category.setSurchargeCap(fraction(update.surchargeCap()));
        category.setDeductionLimit(update.deductionLimit());
        category.setSeniorDeductionLimit(update.seniorDeductionLimit());
        category.setAllowedRegimes(update.allowedRegimes());
        category.setAgeGroups(blankToNull(update.ageGroups()));
        category.setAutoFromCodes(blankToNull(update.autoFromCodes()));
        if (update.sortOrder() != null) {
            category.setSortOrder(update.sortOrder());
        }
        category.setActive(update.active());
        category.setUpdatedBy(actor.getEmail());
        category.setUpdatedAt(LocalDateTime.now());
        TaxCategoryRate saved = categoryRepository.save(category);
        auditService.record("TAX_CATEGORY_RATE_UPDATED", "TaxCategoryRate", id, before, snapshot(saved));
        return saved;
    }

    @Transactional
    public TaxRegimeSetting updateSetting(String id, TaxRateDtos.SettingUpdate update, User actor) {
        requireEditor(actor);
        TaxRegimeSetting setting = settingRepository.findById(id).orElseThrow(() -> ApiException.notFound("Regime setting", id));
        String before = setting.toString();
        setting.setStandardDeduction(update.standardDeduction());
        setting.setRebateIncomeLimit(update.rebateIncomeLimit());
        setting.setRebateMaxAmount(update.rebateMaxAmount());
        setting.setRebateMarginalRelief(update.rebateMarginalRelief());
        setting.setCessRate(fraction(update.cessRate()));
        setting.setMaxSurchargeRate(fraction(update.maxSurchargeRate()));
        setting.setUpdatedBy(actor.getEmail());
        setting.setUpdatedAt(LocalDateTime.now());
        TaxRegimeSetting saved = settingRepository.save(setting);
        auditService.record("TAX_REGIME_SETTING_UPDATED", "TaxRegimeSetting", id, before, saved.toString());
        return saved;
    }

    @Transactional
    public TaxSlab updateSlab(String id, TaxRateDtos.SlabUpdate update, User actor) {
        requireEditor(actor);
        TaxSlab slab = slabRepository.findById(id).orElseThrow(() -> ApiException.notFound("Tax slab", id));
        if (update.incomeTo() != null && update.incomeTo().compareTo(update.incomeFrom()) <= 0) {
            throw ApiException.badRequest("INVALID_SLAB", "Slab 'to' amount must be more than the 'from' amount");
        }
        String before = slab.toString();
        slab.setIncomeFrom(update.incomeFrom());
        slab.setIncomeTo(update.incomeTo());
        slab.setRate(fraction(update.rate()));
        TaxSlab saved = slabRepository.save(slab);
        auditService.record("TAX_SLAB_UPDATED", "TaxSlab", id, before, saved.toString());
        return saved;
    }

    /** Starts a new financial year as a copy of an existing one, ready for the admin to apply Budget changes. */
    @Transactional
    public TaxRateDtos.RateBookView copyYear(TaxRateDtos.CopyYearRequest request, User actor) {
        requireEditor(actor);
        if (!settingRepository.findByFinancialYearOrderByRegimeAsc(request.toFinancialYear()).isEmpty()) {
            throw ApiException.conflict("YEAR_EXISTS", "Rates for FY " + request.toFinancialYear() + " already exist");
        }
        TaxEngine.RateBook source = book(request.fromFinancialYear());
        String fy = request.toFinancialYear();
        for (TaxRegimeSetting s : source.settings()) {
            settingRepository.save(TaxRegimeSetting.builder().financialYear(fy).assessmentYear(request.toAssessmentYear())
                    .regime(s.getRegime()).standardDeduction(s.getStandardDeduction()).rebateIncomeLimit(s.getRebateIncomeLimit())
                    .rebateMaxAmount(s.getRebateMaxAmount()).rebateMarginalRelief(s.isRebateMarginalRelief())
                    .cessRate(s.getCessRate()).maxSurchargeRate(s.getMaxSurchargeRate()).active(true)
                    .updatedBy(actor.getEmail()).build());
        }
        for (TaxSlab s : source.slabs()) {
            slabRepository.save(TaxSlab.builder().financialYear(fy).regime(s.getRegime()).slabType(s.getSlabType())
                    .ageGroup(s.getAgeGroup()).incomeFrom(s.getIncomeFrom()).incomeTo(s.getIncomeTo()).rate(s.getRate())
                    .sortOrder(s.getSortOrder()).build());
        }
        for (TaxCategoryRate c : source.categories()) {
            if (c.getCode().endsWith("_PRE")) {
                continue;
            }
            categoryRepository.save(c.toBuilder().id(null).financialYear(fy).updatedBy(actor.getEmail())
                    .updatedAt(LocalDateTime.now()).build());
        }
        auditService.record("TAX_RATES_YEAR_COPIED", "TaxRates", fy, request.fromFinancialYear(), fy);
        return view(fy, false);
    }

    private static void requireEditor(User actor) {
        if (actor == null || !EDITORS.contains(actor.getRole())) {
            throw ApiException.forbidden("Only an admin can change tax rates");
        }
    }

    /** Accepts 20 or 0.20 for 20%. */
    private static BigDecimal fraction(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.compareTo(BigDecimal.ONE) > 0 ? value.movePointLeft(2) : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String snapshot(TaxCategoryRate c) {
        return c.getCode() + " " + c.getTreatment() + " rate=" + c.getRate() + " exemption=" + c.getExemptionLimit()
                + " limit=" + c.getDeductionLimit() + " regimes=" + c.getAllowedRegimes() + " active=" + c.isActive();
    }
}

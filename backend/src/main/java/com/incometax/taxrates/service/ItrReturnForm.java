package com.incometax.taxrates.service;

import com.incometax.entity.User;
import com.incometax.taxrates.dto.TaxRateDtos;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lays out a saved computation the way the Income Tax Department's ITR-1 (Sahaj) Excel utility does:
 * the same sheets, parts, item codes (B1, B2 ... D14) and wording. Shared by the Excel and PDF downloads.
 */
final class ItrReturnForm {

    enum Kind { HEADING, ITEM, TOTAL, TABLE_HEAD, NOTE }

    /** One printed line. {@code input} marks figures the taxpayer entered (green cells in the utility). */
    record Row(Kind kind, String code, String label, List<Object> values, boolean input) {
    }

    /** A boxed part of a sheet with its vertical caption on the left (e.g. "SALARY / PENSION"). */
    record Block(String caption, List<Row> rows) {
        int columns() {
            return rows.stream().mapToInt(r -> r.values().size()).max().orElse(1);
        }
    }

    record Sheet(String name, String heading, List<Block> blocks) {
    }

    record Form(String formName, String subtitle, String assessmentYear, String regime, List<Sheet> sheets) {
    }

    private static final Set<String> OTHER_SOURCES = Set.of(
            "INTEREST_SAVINGS", "INTEREST_DEPOSITS", "DIVIDEND", "OTHER_INCOME", "LOTTERY_GAMES");
    private static final Map<String, String> NATURE_OF_INCOME = Map.of(
            "INTEREST_SAVINGS", "Interest from Saving Account",
            "INTEREST_DEPOSITS", "Interest from Deposit (Bank/Post Office/Cooperative Society)",
            "DIVIDEND", "Dividend",
            "OTHER_INCOME", "Any Other",
            "LOTTERY_GAMES", "Winnings from lottery, crossword puzzles, online games etc. u/s 115BB / 115BBJ");
    private static final List<String[]> CHAPTER_VI_A = List.of(
            new String[]{"5a", "80C - Life insurance premium, deferred annuity, contributions to provident fund, subscription to certain equity shares or debentures, etc.", "DED_80C"},
            new String[]{"5d", "80CCD(1B) - Contribution to pension scheme of Central Government", "DED_80CCD1B"},
            new String[]{"5e", "80CCD(2) - Contribution to pension scheme of Central Government by employer", "DED_80CCD2"},
            new String[]{"5f", "80D - Deduction in respect of Health Insurance premia", "DED_80D_SELF,DED_80D_PARENTS,DED_80D_PARENTS_SENIOR"},
            new String[]{"5i", "80E - Interest on loan taken for higher education", "DED_80E"},
            new String[]{"5m", "80G - Donations to certain funds, charitable institutions, etc.", "DED_80G"},
            new String[]{"5q", "80TTA - Interest on saving bank Accounts in case of other than Resident senior citizens", "DED_80TTA"},
            new String[]{"5r", "80TTB - Interest on deposits in case of Resident senior citizens", "DED_80TTB"},
            new String[]{"5u", "Any Other deductions (80DD / 80U / 80EEB etc.)", "DED_OTHER"});
    private static final String PROF_TAX = "DED_PROF_TAX";
    private static final String HOME_LOAN = "DED_24B_SELF";

    private final TaxRateDtos.SavedComputation saved;
    private final TaxRateDtos.ExportRequest request;
    private final User user;
    private final TaxEngine.RegimeResult r;

    private ItrReturnForm(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        this.saved = saved;
        this.request = request;
        this.user = user;
        this.r = "OLD".equalsIgnoreCase(saved.result().recommendedRegime())
                ? saved.result().oldRegime() : saved.result().newRegime();
    }

    static Form build(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        return new ItrReturnForm(saved, request, user).form();
    }

    private Form form() {
        String itr = isBlank(request.itrType()) ? "ITR-1" : request.itrType().toUpperCase();
        BigDecimal salaryHead = salaryHead();
        BigDecimal houseProperty = houseProperty();
        BigDecimal otherSources = sum(lines(OTHER_SOURCES, true));
        BigDecimal otherHeads = sum(otherHeadLines());
        BigDecimal gti = salaryHead.add(houseProperty).add(otherSources).add(otherHeads);
        BigDecimal chapterVIA = r.totalDeductions().subtract(allowed(PROF_TAX)).subtract(allowed(HOME_LOAN)).max(BigDecimal.ZERO);
        BigDecimal totalIncome = gti.subtract(chapterVIA).max(BigDecimal.ZERO);

        List<Block> income = new ArrayList<>();
        income.add(partA());
        income.add(salary());
        income.add(housePropertyBlock(houseProperty));
        income.add(otherSourcesBlock(otherSources));
        if (!otherHeadLines().isEmpty()) {
            income.add(otherHeadsBlock(otherHeads));
        }
        income.add(new Block("GROSS TOTAL INCOME", List.of(
                total("B4", "Gross Total Income (B1+B2+B3+C3a(iii)) (If loss, put the figure in negative)", gti))));
        income.add(deductions(chapterVIA, totalIncome));
        income.add(taxComputation());

        String heading = formName(itr) + "  -  Assessment Year " + saved.result().assessmentYear();
        return new Form(formName(itr), subtitle(itr), saved.result().assessmentYear(),
                "OLD".equalsIgnoreCase(r.regime()) ? "Old tax regime" : "New tax regime (u/s 115BAC)",
                List.of(new Sheet("Income Details", heading, income),
                        new Sheet("TDS", heading, List.of(tds())),
                        new Sheet("Taxes Paid and Verification", heading,
                                List.of(taxesPaid(), bankAccounts(), exemptIncome(), verification()))));
    }

    private Block partA() {
        String[] name = splitName(firstNonBlank(request.name(), user.getName()));
        String ay = saved.result().assessmentYear();
        List<Row> rows = new ArrayList<>();
        rows.add(input("", "First Name", name[0]));
        rows.add(input("", "Middle Name", name[1]));
        rows.add(input("", "Last Name", name[2]));
        rows.add(input("", "PAN", firstNonBlank(request.pan(), user.getPan()).toUpperCase()));
        rows.add(input("", "Aadhaar Number [12 Digits]", nz(user.getAadhaar())));
        rows.add(input("", "Residential Status", "RES - Resident"));
        rows.add(input("", "Primary Email ID of the taxpayer", nz(user.getEmail())));
        rows.add(input("", "Primary Mobile No. of the taxpayer", nz(user.getPhone())));
        rows.add(input("", "Do you wish to exercise the option u/s 115BAC(6) of Opting out of new tax regime ? (default is \"No\")",
                "OLD".equalsIgnoreCase(r.regime()) ? "Yes" : "No"));
        rows.add(input("", "Filed u/s", "139(1)-On or before due date"));
        rows.add(item("", "Due Date of filing of ITR", "31/07/" + ay.substring(0, Math.min(4, ay.length()))));
        rows.add(item("", "Financial Year (previous year)", saved.result().financialYear()));
        return new Block("PART A GENERAL INFORMATION", rows);
    }

    private Block salary() {
        BigDecimal gross = entered("SALARY");
        BigDecimal hra = r.hraExemption();
        BigDecimal net = gross.subtract(hra).max(BigDecimal.ZERO);
        BigDecimal profTax = allowed(PROF_TAX);
        BigDecimal sec16 = r.standardDeduction().add(profTax);
        List<Row> rows = new ArrayList<>();
        rows.add(total("B1 i", "Gross Salary (ia + ib + ic)", gross));
        rows.add(input("a", "Salary as per section 17(1)", gross));
        rows.add(input("b", "Value of perquisites as per section 17(2)", BigDecimal.ZERO));
        rows.add(input("c", "Profit in lieu of salary as per section 17(3)", BigDecimal.ZERO));
        rows.add(item("ii", "Less : Allowances to the extent exempt u/s 10 (Ensure that it is included in salary income u/s 17(1)/17(2)/17(3))", hra));
        rows.add(item("", "Sec 10(13A) - Allowance to meet expenditure incurred on house rent", hra));
        rows.add(item("iii", "Net Salary (i - ii)", net));
        rows.add(item("iv", "Deductions u/s 16 (iva + ivb + ivc)", sec16));
        rows.add(item("a", "Standard Deduction u/s 16(ia)", r.standardDeduction()));
        rows.add(item("b", "Entertainment Allowance u/s 16(ii)", BigDecimal.ZERO));
        rows.add(input("c", "Professional Tax u/s 16(iii)", profTax));
        rows.add(total("v", "Income chargeable under the Head 'Salaries' (iii - iv)", salaryHead()));
        if (!isBlank(request.employerName()) || !isBlank(request.employerTan())) {
            rows.add(input("", "Name of Employer / TAN", join(request.employerName(), request.employerTan())));
        }
        return new Block("SALARY / PENSION", rows);
    }

    private Block housePropertyBlock(BigDecimal head) {
        TaxEngine.Line rent = incomeLine("RENT_RECEIVED");
        BigDecimal gross = rent == null ? BigDecimal.ZERO : rent.amount();
        BigDecimal thirty = rent == null ? BigDecimal.ZERO : rent.exemptAmount();
        BigDecimal interest = allowed(HOME_LOAN);
        String type = gross.signum() > 0 ? "Let Out" : interest.signum() > 0 ? "Self Occupied" : "";
        List<Row> rows = new ArrayList<>();
        rows.add(input("B2", "Type of House Property", type));
        rows.add(input("i", "Gross rent received/ receivable/ lettable value during the year", gross));
        rows.add(input("ii", "Tax paid to local authorities", BigDecimal.ZERO));
        rows.add(item("iii", "Annual Value (i - ii)", gross));
        rows.add(item("iv", "30% of Annual Value (30% * iii)", thirty));
        rows.add(input("v", "Interest payable on borrowed capital", interest));
        rows.add(input("vi", "Arrears/Unrealised Rent received during the year Less 30%", BigDecimal.ZERO));
        rows.add(total("", "Income chargeable under the head 'House Property' (iii - iv - v + vi) (If loss, put the figure in negative)", head));
        return new Block("HOUSE PROPERTY", rows);
    }

    private Block otherSourcesBlock(BigDecimal head) {
        List<Row> rows = new ArrayList<>();
        rows.add(head("Sl.No.", "Nature of Income", "Amount"));
        int i = 1;
        for (TaxEngine.Line line : lines(OTHER_SOURCES, true)) {
            rows.add(input(String.valueOf(i++), NATURE_OF_INCOME.getOrDefault(line.code(), line.name()), line.amount()));
        }
        if (i == 1) {
            rows.add(input("1", "(Select)", BigDecimal.ZERO));
        }
        rows.add(input("", "Less: Deduction u/s 57(iia) (In case of family pension only)", BigDecimal.ZERO));
        rows.add(total("B3", "Income from Other Sources", head));
        return new Block("INCOME FROM OTHER SOURCES", rows);
    }

    /** Income ITR-1 has no head for (business, trading, capital gains, crypto); filed in ITR-2/3/4 schedules. */
    private Block otherHeadsBlock(BigDecimal head) {
        List<Row> rows = new ArrayList<>();
        rows.add(head("Section", "Nature of Income", "Amount", "Rate", "Tax"));
        for (TaxEngine.Line line : otherHeadLines()) {
            rows.add(new Row(Kind.ITEM, nz(line.section()), line.name(),
                    List.of(rupees(line.amount()), line.rate() == null ? "Slab" : percent(line.rate()),
                            line.rate() == null ? "In slab tax" : rupees(line.tax())), true));
        }
        rows.add(total("", "Total of Schedule CG / BP / VDA (report in ITR-2 / ITR-3 / ITR-4)", head));
        return new Block("CAPITAL GAINS / BUSINESS / SPECIAL RATE INCOME", rows);
    }

    private Block deductions(BigDecimal chapterVIA, BigDecimal totalIncome) {
        List<Row> rows = new ArrayList<>();
        rows.add(new Row(Kind.HEADING, "C", "Part C - Deductions and Taxable Total Income", List.of("Amount", "System Calculated"), false));
        for (String[] d : CHAPTER_VI_A) {
            BigDecimal claimed = BigDecimal.ZERO;
            BigDecimal allowed = BigDecimal.ZERO;
            for (String code : d[2].split(",")) {
                TaxEngine.Line line = deductionLine(code);
                if (line != null) {
                    claimed = claimed.add(line.amount());
                    allowed = allowed.add(line.exemptAmount());
                }
            }
            rows.add(new Row(Kind.ITEM, d[0], d[1], List.of(rupees(claimed), rupees(allowed)), true));
        }
        rows.add(new Row(Kind.TOTAL, "C1", "Total Deductions (Total of 5a to 5u)",
                List.of(rupees(sumClaimed()), rupees(chapterVIA)), false));
        rows.add(new Row(Kind.TOTAL, "C2", "Total Income (B4 - C1)  Note: The Total Income Field includes LTCG u/s 112A. However, no tax would be payable on the said income.",
                List.of("", rupees(totalIncome)), false));
        return new Block("DEDUCTIONS", rows);
    }

    private Block taxComputation() {
        BigDecimal taxOnIncome = r.slabTax().add(r.specialRateTax());
        BigDecimal afterRebate = taxOnIncome.subtract(r.rebate87A()).max(BigDecimal.ZERO);
        List<Row> rows = new ArrayList<>();
        rows.add(item("D1", "Tax Payable on Total Income", taxOnIncome));
        rows.add(item("D2", "Rebate u/s 87A", r.rebate87A()));
        rows.add(item("D3", "Tax payable after Rebate", afterRebate));
        if (r.surcharge().signum() > 0) {
            rows.add(item("", "Surcharge @ " + percent(r.surchargeRate()) + " on (D3)", r.surcharge()));
        }
        rows.add(item("D4", "Health and Education Cess @4% on (D3)", r.cess()));
        rows.add(total("D5", "Total Tax and Cess (D3+D4)", r.totalTax()));
        rows.add(input("D6", "Relief u/s 89 (Please ensure to submit Form 10E to claim this relief)", BigDecimal.ZERO));
        rows.add(item("", "Balance Tax after Relief (D5 - D6)", r.totalTax()));
        rows.add(item("D7", "Interest u/s 234 A", BigDecimal.ZERO));
        rows.add(item("D8", "Interest u/s 234 B", BigDecimal.ZERO));
        rows.add(item("D9", "Interest u/s 234 C", BigDecimal.ZERO));
        rows.add(item("D10", "Fee u/s 234F", BigDecimal.ZERO));
        rows.add(item("", "Total Interest, Fee Payable (D7+D8+D9+D10)", BigDecimal.ZERO));
        rows.add(total("D11", "Total Tax, Fee and Interest (D5+D7+D8+D9+D10-D6)", r.totalTax()));
        rows.add(note("Interest u/s 234A/234B/234C and fee u/s 234F are not worked out by TaxFilr. Check them in the official utility before filing."));
        return new Block("COMPUTATION OF TAX PAYABLE", rows);
    }

    private Block tds() {
        TaxRateDtos.ComputeRequest in = saved.input();
        List<Row> rows = new ArrayList<>();
        rows.add(new Row(Kind.HEADING, "18 TDS1", "Details of Tax Deducted at Source from SALARY [As per FORM 16 issued by Employer(s)]", List.of(), false));
        rows.add(head("Sl.No.", "Tax Deduction Account Number (TAN) of the Deductor", "Name of Deductor", "Income chargeable under Salaries", "Total Tax Deducted"));
        rows.add(new Row(Kind.ITEM, "1", nz(request.employerTan()).toUpperCase(),
                List.of(nz(request.employerName()), rupees(salaryHead()), rupees(nz(in.tdsOnSalary()))), true));
        rows.add(new Row(Kind.TOTAL, "", "Total", List.of("", "", rupees(nz(in.tdsOnSalary()))), false));
        rows.add(new Row(Kind.HEADING, "19 TDS2", "Details of Tax Deducted at Source from Income OTHER THAN Salary [As per FORM 16A issued by Deductor(s)]", List.of(), false));
        rows.add(head("Sl.No.", "Nature of payment", "", "", "TDS credit claimed this year"));
        rows.add(new Row(Kind.ITEM, "1", "Interest / other income", List.of("", "", rupees(nz(in.otherTds()))), true));
        rows.add(new Row(Kind.HEADING, "21 IT", "Details of Advance tax and Self Assessment tax payments", List.of(), false));
        rows.add(head("Sl.No.", "BSR Code", "Date of Deposit (DD/MM/YYYY)", "Serial Number of Challan", "Tax Paid"));
        rows.add(new Row(Kind.ITEM, "1", "", List.of("", "", rupees(nz(in.advanceTax()))), true));
        return new Block("TDS / TAX PAID", rows);
    }

    private Block taxesPaid() {
        TaxRateDtos.ComputeRequest in = saved.input();
        List<Row> rows = new ArrayList<>();
        rows.add(item("D12(a)", "Total Advance Tax Paid (from item 21)", nz(in.advanceTax())));
        rows.add(item("D12(b)", "Total Self Assessment Tax Paid (from item 21)", BigDecimal.ZERO));
        rows.add(item("D12(c)", "Total TDS Claimed (Total from item 18 + item 19 + item 20)", nz(in.tdsOnSalary()).add(nz(in.otherTds()))));
        rows.add(item("D12(d)", "Total TCS Claimed (Total from item 22)", BigDecimal.ZERO));
        rows.add(total("D12", "Total Taxes Paid D12(a+b+c+d)", r.taxesPaid()));
        rows.add(total("D13", "Amount payable (D11 - D12) (if D11 > D12)", r.netPayable()));
        rows.add(total("D14", "Refund (D12 - D11) (if D12 > D11)", r.refund()));
        return new Block("TAXES PAID", rows);
    }

    private Block bankAccounts() {
        List<Row> rows = new ArrayList<>();
        rows.add(input("", "Do you have a bank account in India?", "YES"));
        rows.add(head("Sl.No.", "IFS Code of the Bank", "Name of the Bank", "Account Number", "Type of account / Select for refund"));
        rows.add(new Row(Kind.ITEM, "1", nz(request.ifsc()).toUpperCase(),
                List.of(nz(request.bankName()), nz(request.accountNumber()), join(request.accountType(), "Yes")), true));
        return new Block("BANK ACCOUNT", rows);
    }

    private Block exemptIncome() {
        List<Row> rows = new ArrayList<>();
        rows.add(head("Sl.No.", "Nature of Income", "Amount"));
        int i = 1;
        for (TaxEngine.Line line : r.incomeLines() == null ? List.<TaxEngine.Line>of() : r.incomeLines()) {
            if ("EXEMPT".equals(line.treatment())) {
                String nature = "AGRICULTURE".equals(line.code()) ? "Agriculture Income (<= Rs.5000)" : line.name();
                rows.add(input(String.valueOf(i++), nature, line.amount()));
            }
        }
        TaxEngine.Line ltcg = incomeLine("EQUITY_LTCG_112A");
        if (ltcg != null && ltcg.exemptAmount().signum() > 0) {
            rows.add(item("C3(a)", "Long Term capital gains u/s 112A not chargeable to Income-tax", ltcg.exemptAmount()));
        }
        rows.add(total("", "Total Exempt Income", sumExempt(ltcg)));
        return new Block("EXEMPT INCOME", rows);
    }

    private Block verification() {
        String name = firstNonBlank(request.name(), user.getName()).toUpperCase();
        String pan = firstNonBlank(request.pan(), user.getPan()).toUpperCase();
        List<Row> rows = new ArrayList<>();
        rows.add(note("I, " + name + " (full name in block letters), solemnly declare that to the best of my knowledge and belief, "
                + "the information given in the return is correct and complete and is in accordance with the provisions of the "
                + "Income-tax Act, 1961. I further declare that I am making this return in my capacity as Self and I am also "
                + "competent to make this return and verify it. I am holding Permanent Account Number " + pan + "."));
        rows.add(item("", "Date", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
        rows.add(input("", "Place", ""));
        rows.add(note("Prepared by TaxFilr from your saved tax computation in the layout of the ITR utility. "
                + "It is not the Income Tax Department's upload file. Check the figures before filing."));
        return new Block("VERIFICATION", rows);
    }

    private BigDecimal salaryHead() {
        BigDecimal net = entered("SALARY").subtract(r.hraExemption()).max(BigDecimal.ZERO);
        return net.subtract(r.standardDeduction()).subtract(allowed(PROF_TAX)).max(BigDecimal.ZERO);
    }

    private BigDecimal houseProperty() {
        TaxEngine.Line rent = incomeLine("RENT_RECEIVED");
        BigDecimal annual = rent == null ? BigDecimal.ZERO : rent.amount().subtract(rent.exemptAmount());
        return annual.subtract(allowed(HOME_LOAN));
    }

    private List<TaxEngine.Line> otherHeadLines() {
        List<TaxEngine.Line> out = new ArrayList<>();
        for (TaxEngine.Line line : safe(r.incomeLines())) {
            if (!"SALARY".equals(line.code()) && !"RENT_RECEIVED".equals(line.code())
                    && !OTHER_SOURCES.contains(line.code()) && !"EXEMPT".equals(line.treatment())) {
                out.add(line);
            }
        }
        return out;
    }

    private List<TaxEngine.Line> lines(Set<String> codes, boolean include) {
        return safe(r.incomeLines()).stream().filter(l -> codes.contains(l.code()) == include).toList();
    }

    private TaxEngine.Line incomeLine(String code) {
        return safe(r.incomeLines()).stream().filter(l -> code.equals(l.code())).findFirst().orElse(null);
    }

    private TaxEngine.Line deductionLine(String code) {
        return safe(r.deductionLines()).stream().filter(l -> code.equals(l.code())).findFirst().orElse(null);
    }

    private BigDecimal allowed(String code) {
        TaxEngine.Line line = deductionLine(code);
        return line == null ? BigDecimal.ZERO : line.exemptAmount();
    }

    private BigDecimal entered(String code) {
        TaxEngine.Line line = incomeLine(code);
        if (line != null) return line.amount();
        Map<String, BigDecimal> amounts = saved.input() == null ? null : saved.input().amounts();
        return amounts == null ? BigDecimal.ZERO : nz(amounts.get(code));
    }

    private BigDecimal sumClaimed() {
        BigDecimal total = BigDecimal.ZERO;
        for (TaxEngine.Line line : safe(r.deductionLines())) {
            if (!PROF_TAX.equals(line.code()) && !HOME_LOAN.equals(line.code())) total = total.add(line.amount());
        }
        return total;
    }

    private BigDecimal sumExempt(TaxEngine.Line ltcg) {
        BigDecimal total = ltcg == null ? BigDecimal.ZERO : ltcg.exemptAmount();
        for (TaxEngine.Line line : safe(r.incomeLines())) {
            if ("EXEMPT".equals(line.treatment())) total = total.add(line.amount());
        }
        return total;
    }

    private static BigDecimal sum(List<TaxEngine.Line> lines) {
        return lines.stream().map(TaxEngine.Line::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static String formName(String itr) {
        return switch (itr) {
            case "ITR-1" -> "ITR-1 SAHAJ";
            case "ITR-4" -> "ITR-4 SUGAM";
            default -> itr;
        };
    }

    private static String subtitle(String itr) {
        return switch (itr) {
            case "ITR-2" -> "[For Individuals and HUFs not having income under the head \"profits and gains of business or profession\"]";
            case "ITR-3" -> "[For individuals and HUFs having income under the head \"profits and gains of business or profession\"]";
            case "ITR-4" -> "[For Individuals, HUFs and Firms (other than LLP) being a resident having total income up to Rs.50 lakh "
                    + "and having income from business and profession which is computed under sections 44AD, 44ADA or 44AE]";
            default -> "[For individuals being a RESIDENT (OTHER THAN NOT ORDINARILY RESIDENT) having total income up to Rs.50 lakh "
                    + "and having Income from Salaries, two house properties, other sources (Interest etc.), long-term capital gains "
                    + "under section 112A upto Rs. 1.25 lakh, and agricultural income up to Rs.5 thousand]";
        };
    }

    private static Row item(String code, String label, Object value) {
        return new Row(Kind.ITEM, code, label, List.of(value instanceof BigDecimal b ? rupees(b) : value), false);
    }

    private static Row input(String code, String label, Object value) {
        return new Row(Kind.ITEM, code, label, List.of(value instanceof BigDecimal b ? rupees(b) : value), true);
    }

    private static Row total(String code, String label, BigDecimal value) {
        return new Row(Kind.TOTAL, code, label, List.of(rupees(value)), false);
    }

    private static Row head(String code, String label, String... values) {
        return new Row(Kind.TABLE_HEAD, code, label, Arrays.asList((Object[]) values), false);
    }

    private static Row note(String text) {
        return new Row(Kind.NOTE, "", text, List.of(), false);
    }

    /** Whole rupees, as the utility shows them. */
    static BigDecimal rupees(BigDecimal value) {
        return nz(value).setScale(0, RoundingMode.HALF_UP);
    }

    static String percent(BigDecimal rate) {
        return rate.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private static String[] splitName(String full) {
        String[] parts = full.trim().split("\\s+");
        if (full.isBlank()) return new String[]{"", "", ""};
        if (parts.length == 1) return new String[]{parts[0], "", ""};
        return new String[]{parts[0], String.join(" ", Arrays.copyOfRange(parts, 1, parts.length - 1)), parts[parts.length - 1]};
    }

    private static String join(String a, String b) {
        if (isBlank(a)) return nz(b);
        if (isBlank(b)) return a;
        return a + " / " + b;
    }

    private static List<TaxEngine.Line> safe(List<TaxEngine.Line> lines) {
        return lines == null ? List.of() : lines;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static String firstNonBlank(String a, String b) {
        return isBlank(a) ? nz(b) : a;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}

package com.incometax.taxrates.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.taxrates.dto.TaxRateDtos;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Builds the downloadable return (JSON, Excel, PDF) from the user's saved ITR computation. */
@Service
@RequiredArgsConstructor
public class ItrExporter {

    private static final String NOTE = "Prepared by TaxFilr from your saved tax computation. "
            + "This is a summary of your return, not the Income Tax Department's upload file. Check the figures before filing.";

    private final ObjectMapper objectMapper;

    public enum Format {
        JSON("application/json", "json"),
        EXCEL("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
        PDF("application/pdf", "pdf");

        private final String contentType;
        private final String extension;

        Format(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        public String contentType() {
            return contentType;
        }

        public String extension() {
            return extension;
        }
    }

    public String fileName(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request) {
        return "TaxFilr_" + itrType(request) + "_AY" + saved.result().assessmentYear() + "." + request.format().extension();
    }

    public byte[] export(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        return switch (request.format()) {
            case JSON -> json(saved, request, user);
            case EXCEL -> excel(saved, request, user);
            case PDF -> pdf(saved, request, user);
        };
    }

    private byte[] json(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("preparedBy", "TaxFilr");
        body.put("note", NOTE);
        body.put("generatedOn", LocalDate.now().toString());
        body.put("itrType", itrType(request));
        body.put("financialYear", saved.result().financialYear());
        body.put("assessmentYear", saved.result().assessmentYear());
        body.put("chosenRegime", saved.result().recommendedRegime());
        body.put("taxpayer", details(taxpayer(request, user)));
        body.put("employer", details(employer(request)));
        body.put("bank", details(bank(request)));
        body.put("formInput", saved.input());
        body.put("taxComputation", saved.result());
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(body);
        } catch (Exception ex) {
            throw failed("JSON");
        }
    }

    private byte[] excel(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        TaxEngine.Result result = saved.result();
        TaxEngine.RegimeResult chosen = chosen(result);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle bold = workbook.createCellStyle();
            var font = workbook.createFont();
            font.setBold(true);
            bold.setFont(font);

            Sheet summary = workbook.createSheet("Summary");
            int r = 0;
            r = textRow(summary, r, bold, "TaxFilr - " + itrType(request) + " summary, AY " + result.assessmentYear());
            r = textRow(summary, r, null, NOTE);
            r++;
            for (String[] pair : concat(taxpayer(request, user), employer(request), bank(request), List.of(
                    new String[]{"Financial year", result.financialYear()},
                    new String[]{"Assessment year", result.assessmentYear()},
                    new String[]{"Regime used", regimeName(result.recommendedRegime())}))) {
                Row row = summary.createRow(r++);
                row.createCell(0).setCellValue(pair[0]);
                row.createCell(1).setCellValue(pair[1]);
            }
            r++;
            Row head = summary.createRow(r++);
            String[] heads = {"", "Old regime", "New regime"};
            for (int i = 0; i < heads.length; i++) {
                head.createCell(i).setCellValue(heads[i]);
                head.getCell(i).setCellStyle(bold);
            }
            for (Object[] line : comparison(result)) {
                Row row = summary.createRow(r++);
                row.createCell(0).setCellValue((String) line[0]);
                row.createCell(1).setCellValue(num((BigDecimal) line[1]));
                row.createCell(2).setCellValue(num((BigDecimal) line[2]));
            }
            summary.setColumnWidth(0, 40 * 256);
            summary.setColumnWidth(1, 22 * 256);
            summary.setColumnWidth(2, 22 * 256);

            lineSheet(workbook.createSheet("Income"), bold, chosen.incomeLines(), true);
            lineSheet(workbook.createSheet("Deductions"), bold, chosen.deductionLines(), false);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw failed("Excel");
        }
    }

    private void lineSheet(Sheet sheet, CellStyle bold, List<TaxEngine.Line> lines, boolean income) {
        String[] heads = income
                ? new String[]{"Income", "Section", "Amount", "Tax-free part", "Taxable", "Rate", "Tax", "How it is taxed"}
                : new String[]{"Deduction", "Section", "Claimed", "Allowed", "", "", "", "Note"};
        Row head = sheet.createRow(0);
        for (int i = 0; i < heads.length; i++) {
            head.createCell(i).setCellValue(heads[i]);
            head.getCell(i).setCellStyle(bold);
        }
        int r = 1;
        for (TaxEngine.Line line : lines == null ? List.<TaxEngine.Line>of() : lines) {
            Row row = sheet.createRow(r++);
            row.createCell(0).setCellValue(line.name());
            row.createCell(1).setCellValue(line.section() == null ? "" : line.section());
            row.createCell(2).setCellValue(num(line.amount()));
            row.createCell(3).setCellValue(num(line.exemptAmount()));
            if (income) {
                row.createCell(4).setCellValue(num(line.taxableAmount()));
                row.createCell(5).setCellValue(line.rate() == null ? "Slab" : percent(line.rate()));
                row.createCell(6).setCellValue(num(line.tax()));
            }
            row.createCell(7).setCellValue(line.note() == null ? "" : line.note());
        }
        sheet.setColumnWidth(0, 40 * 256);
        sheet.setColumnWidth(7, 50 * 256);
    }

    private byte[] pdf(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        TaxEngine.Result result = saved.result();
        TaxEngine.RegimeResult chosen = chosen(result);
        Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Font heading = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font body = FontFactory.getFont(FontFactory.HELVETICA, 9);
        Font bodyBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();
            document.add(new Paragraph(itrType(request) + " summary - AY " + result.assessmentYear(), title));
            document.add(new Paragraph("Financial year " + result.financialYear() + "  |  Regime used: "
                    + regimeName(result.recommendedRegime()) + "  |  Generated on " + LocalDate.now(), body));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Your details", heading));
            PdfPTable details = new PdfPTable(2);
            details.setWidthPercentage(100);
            details.setSpacingBefore(4);
            for (String[] pair : concat(taxpayer(request, user), employer(request), bank(request), List.of())) {
                details.addCell(cell(pair[0], bodyBold));
                details.addCell(cell(pair[1], body));
            }
            document.add(details);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Old vs new regime (amounts in Rs.)", heading));
            PdfPTable compare = new PdfPTable(new float[]{3, 2, 2});
            compare.setWidthPercentage(100);
            compare.setSpacingBefore(4);
            compare.addCell(cell("", bodyBold));
            compare.addCell(cell("Old regime", bodyBold));
            compare.addCell(cell("New regime", bodyBold));
            for (Object[] line : comparison(result)) {
                compare.addCell(cell((String) line[0], body));
                compare.addCell(cell(money((BigDecimal) line[1]), body));
                compare.addCell(cell(money((BigDecimal) line[2]), body));
            }
            document.add(compare);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("How each income is taxed (" + regimeName(result.recommendedRegime()) + ")", heading));
            PdfPTable income = new PdfPTable(new float[]{4, 2, 2, 2, 1.3f, 2});
            income.setWidthPercentage(100);
            income.setSpacingBefore(4);
            for (String h : new String[]{"Income", "Amount", "Tax-free", "Taxable", "Rate", "Tax"}) {
                income.addCell(cell(h, bodyBold));
            }
            for (TaxEngine.Line line : safe(chosen.incomeLines())) {
                income.addCell(cell(line.name() + (line.section() == null ? "" : " (" + line.section() + ")"), body));
                income.addCell(cell(money(line.amount()), body));
                income.addCell(cell(money(line.exemptAmount()), body));
                income.addCell(cell(money(line.taxableAmount()), body));
                income.addCell(cell(line.rate() == null ? "Slab" : percent(line.rate()), body));
                income.addCell(cell(line.rate() == null ? "In slab tax" : money(line.tax()), body));
            }
            document.add(income);

            if (!safe(chosen.deductionLines()).isEmpty()) {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Deductions", heading));
                PdfPTable deductions = new PdfPTable(new float[]{4, 2, 2});
                deductions.setWidthPercentage(100);
                deductions.setSpacingBefore(4);
                for (String h : new String[]{"Deduction", "Claimed", "Allowed"}) {
                    deductions.addCell(cell(h, bodyBold));
                }
                for (TaxEngine.Line line : chosen.deductionLines()) {
                    deductions.addCell(cell(line.name() + (line.section() == null ? "" : " (" + line.section() + ")"), body));
                    deductions.addCell(cell(money(line.amount()), body));
                    deductions.addCell(cell(money(line.exemptAmount()), body));
                }
                document.add(deductions);
            }

            document.add(new Paragraph(" "));
            document.add(new Paragraph(NOTE, FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8)));
            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw failed("PDF");
        }
    }

    private static List<Object[]> comparison(TaxEngine.Result result) {
        TaxEngine.RegimeResult o = result.oldRegime();
        TaxEngine.RegimeResult n = result.newRegime();
        List<Object[]> rows = new ArrayList<>();
        BigDecimal incomeOld = totalIncome(o);
        BigDecimal incomeNew = totalIncome(n);
        rows.add(new Object[]{"Total income", incomeOld, incomeNew});
        rows.add(new Object[]{"Standard deduction", o.standardDeduction(), n.standardDeduction()});
        rows.add(new Object[]{"HRA exemption", o.hraExemption(), n.hraExemption()});
        rows.add(new Object[]{"Other deductions (80C, 80D etc.)", o.totalDeductions(), n.totalDeductions()});
        rows.add(new Object[]{"Total deductions", incomeOld.subtract(o.taxableIncome()).max(BigDecimal.ZERO),
                incomeNew.subtract(n.taxableIncome()).max(BigDecimal.ZERO)});
        rows.add(new Object[]{"Taxable income", o.taxableIncome(), n.taxableIncome()});
        rows.add(new Object[]{"Tax at slab rates", o.slabTax(), n.slabTax()});
        rows.add(new Object[]{"Tax at special rates", o.specialRateTax(), n.specialRateTax()});
        rows.add(new Object[]{"Rebate u/s 87A", o.rebate87A(), n.rebate87A()});
        rows.add(new Object[]{"Surcharge", o.surcharge(), n.surcharge()});
        rows.add(new Object[]{"Health & education cess", o.cess(), n.cess()});
        rows.add(new Object[]{"Total tax", o.totalTax(), n.totalTax()});
        rows.add(new Object[]{"Tax already paid (TDS / advance tax)", o.taxesPaid(), n.taxesPaid()});
        rows.add(new Object[]{"Tax still to pay", o.netPayable(), n.netPayable()});
        rows.add(new Object[]{"Refund", o.refund(), n.refund()});
        return rows;
    }

    private static List<String[]> taxpayer(TaxRateDtos.ExportRequest request, User user) {
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[]{"Name", firstNonBlank(request.name(), user.getName())});
        rows.add(new String[]{"PAN", firstNonBlank(request.pan(), user.getPan())});
        rows.add(new String[]{"Email", nz(user.getEmail())});
        rows.add(new String[]{"Phone", nz(user.getPhone())});
        return rows;
    }

    private static List<String[]> employer(TaxRateDtos.ExportRequest request) {
        List<String[]> rows = new ArrayList<>();
        if (!isBlank(request.employerName())) rows.add(new String[]{"Employer", request.employerName()});
        if (!isBlank(request.employerTan())) rows.add(new String[]{"Employer TAN", request.employerTan()});
        return rows;
    }

    private static List<String[]> bank(TaxRateDtos.ExportRequest request) {
        List<String[]> rows = new ArrayList<>();
        if (!isBlank(request.bankName())) rows.add(new String[]{"Bank", request.bankName()});
        if (!isBlank(request.accountNumber())) rows.add(new String[]{"Account number", request.accountNumber()});
        if (!isBlank(request.ifsc())) rows.add(new String[]{"IFSC", request.ifsc()});
        if (!isBlank(request.accountType())) rows.add(new String[]{"Account type", request.accountType()});
        return rows;
    }

    private static Map<String, String> details(List<String[]> rows) {
        Map<String, String> map = new LinkedHashMap<>();
        rows.forEach(r -> map.put(r[0], r[1]));
        return map;
    }

    @SafeVarargs
    private static List<String[]> concat(List<String[]>... parts) {
        List<String[]> all = new ArrayList<>();
        for (List<String[]> part : parts) all.addAll(part);
        return all;
    }

    private static int textRow(Sheet sheet, int r, CellStyle style, String text) {
        Row row = sheet.createRow(r);
        row.createCell(0).setCellValue(text);
        if (style != null) row.getCell(0).setCellStyle(style);
        return r + 1;
    }

    private static TaxEngine.RegimeResult chosen(TaxEngine.Result result) {
        return "OLD".equalsIgnoreCase(result.recommendedRegime()) ? result.oldRegime() : result.newRegime();
    }

    private static String regimeName(String regime) {
        return "OLD".equalsIgnoreCase(regime) ? "Old regime" : "New regime";
    }

    private static String itrType(TaxRateDtos.ExportRequest request) {
        return isBlank(request.itrType()) ? "ITR" : request.itrType();
    }

    private static PdfPCell cell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
        cell.setPadding(4);
        return cell;
    }

    private static List<TaxEngine.Line> safe(List<TaxEngine.Line> lines) {
        return lines == null ? List.of() : lines;
    }

    private static double num(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }

    /** Income before the standard deduction and HRA exemption, as shown on the "Your tax" page. */
    private static BigDecimal totalIncome(TaxEngine.RegimeResult r) {
        return r.grossTotalIncome().add(r.standardDeduction()).add(r.hraExemption());
    }

    /** Rates are stored as fractions (0.20), shown as 20%. */
    private static String percent(BigDecimal rate) {
        return rate.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private static String money(BigDecimal value) {
        BigDecimal v = value == null ? BigDecimal.ZERO : value.setScale(0, RoundingMode.HALF_UP);
        return String.format(java.util.Locale.ENGLISH, "%,d", v.longValueExact());
    }

    private static String firstNonBlank(String a, String b) {
        return isBlank(a) ? nz(b) : a;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static ApiException failed(String what) {
        return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ITR_EXPORT_FAILED", "Could not build the " + what + " file");
    }
}

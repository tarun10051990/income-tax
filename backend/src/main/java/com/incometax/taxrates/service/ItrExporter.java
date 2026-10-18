package com.incometax.taxrates.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import com.incometax.taxrates.dto.TaxRateDtos;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.PrintSetup;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
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
        ItrReturnForm.Form form = ItrReturnForm.build(saved, request, user);
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ExcelStyles styles = new ExcelStyles(workbook);
            for (ItrReturnForm.Sheet page : form.sheets()) {
                XSSFSheet sheet = workbook.createSheet(page.name());
                sheet.setDisplayGridlines(false);
                sheet.setColumnWidth(0, 2 * 256);
                sheet.setColumnWidth(1, 16 * 256);
                sheet.setColumnWidth(2, 9 * 256);
                sheet.setColumnWidth(3, 62 * 256);
                for (int c = 0; c < VALUE_COLUMNS; c++) {
                    sheet.setColumnWidth(FIRST_VALUE + c, 20 * 256);
                }
                sheet.getPrintSetup().setPaperSize(PrintSetup.A4_PAPERSIZE);
                sheet.getPrintSetup().setFitWidth((short) 1);
                sheet.getPrintSetup().setFitHeight((short) 0);
                sheet.setFitToPage(true);
                int r = excelHeader(sheet, styles, form);
                for (ItrReturnForm.Block block : page.blocks()) {
                    r = excelBlock(sheet, styles, block, r) + 1;
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw failed("Excel");
        }
    }

    private static final int FIRST_VALUE = 4;
    private static final int VALUE_COLUMNS = 4;
    private static final int LAST_COLUMN = FIRST_VALUE + VALUE_COLUMNS - 1;

    private int excelHeader(XSSFSheet sheet, ExcelStyles s, ItrReturnForm.Form form) {
        Row top = sheet.createRow(1);
        top.setHeightInPoints(24);
        put(top, 1, "FORM", s.formLabel);
        put(top, 2, form.formName(), s.title);
        put(top, 3, "INDIAN INCOME TAX RETURN", s.title);
        put(top, FIRST_VALUE, "Assessment Year " + form.assessmentYear(), s.bigTitle);
        for (int c = FIRST_VALUE + 1; c <= LAST_COLUMN; c++) put(top, c, "", s.bigTitle);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, FIRST_VALUE, LAST_COLUMN));
        Row sub = sheet.createRow(2);
        sub.setHeightInPoints(42);
        put(sub, 1, "", s.subtitle);
        put(sub, 2, "", s.subtitle);
        put(sub, 3, form.subtitle(), s.subtitle);
        for (int c = FIRST_VALUE; c <= LAST_COLUMN; c++) put(sub, c, "", s.subtitle);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 1, 2));
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 3, LAST_COLUMN));
        Row regime = sheet.createRow(3);
        put(regime, 1, "Tax regime: " + form.regime(), s.note);
        sheet.addMergedRegion(new CellRangeAddress(3, 3, 1, LAST_COLUMN));
        return 5;
    }

    private int excelBlock(XSSFSheet sheet, ExcelStyles s, ItrReturnForm.Block block, int first) {
        int r = first;
        int columns = block.columns();
        for (ItrReturnForm.Row line : block.rows()) {
            Row row = sheet.createRow(r);
            boolean bold = line.kind() != ItrReturnForm.Kind.ITEM;
            put(row, 1, "", s.caption);
            put(row, 2, line.code(), bold ? s.codeBold : s.code);
            CellStyle labelStyle = switch (line.kind()) {
                case NOTE -> s.note;
                case TABLE_HEAD -> s.tableHead;
                case ITEM -> s.label;
                default -> s.labelBold;
            };
            put(row, 3, line.label(), labelStyle);
            List<Object> values = line.values();
            for (int c = 0; c < VALUE_COLUMNS; c++) {
                Object value = c < values.size() ? values.get(c) : "";
                CellStyle style = switch (line.kind()) {
                    case TABLE_HEAD, HEADING -> s.tableHead;
                    case TOTAL -> value instanceof BigDecimal ? s.totalAmount : s.totalText;
                    case NOTE -> s.note;
                    default -> c >= columns ? s.blank
                            : value instanceof BigDecimal ? (line.input() ? s.inputAmount : s.amount)
                            : (line.input() ? s.inputText : s.text);
                };
                put(row, FIRST_VALUE + c, value, style);
            }
            if (values.isEmpty()) {
                sheet.addMergedRegion(new CellRangeAddress(r, r, 3, LAST_COLUMN));
            } else if (values.size() == 1 && columns > 1) {
                sheet.addMergedRegion(new CellRangeAddress(r, r, FIRST_VALUE, FIRST_VALUE + columns - 1));
            }
            int width = values.isEmpty() ? 140 : 70;
            int lines = Math.max(1, (int) Math.ceil(line.label().length() / (double) width));
            row.setHeightInPoints(Math.max(15, 13f * lines + 2));
            r++;
        }
        sheet.getRow(first).getCell(1).setCellValue(block.caption());
        if (r - 1 > first) {
            sheet.addMergedRegion(new CellRangeAddress(first, r - 1, 1, 1));
        }
        return r;
    }

    private static void put(Row row, int column, Object value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value instanceof BigDecimal number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(value == null ? "" : value.toString());
        }
        cell.setCellStyle(style);
    }

    /** Cell styles copied from the ITR utility: Times New Roman, thin borders, green input cells. */
    private static final class ExcelStyles {
        final CellStyle formLabel, title, bigTitle, subtitle, caption, code, codeBold, label, labelBold, tableHead,
                note, text, inputText, amount, inputAmount, totalAmount, totalText, blank;

        ExcelStyles(XSSFWorkbook wb) {
            short money = wb.createDataFormat().getFormat("#,##0");
            formLabel = style(wb, font(wb, 10, true, false), HorizontalAlignment.RIGHT, null, false, false);
            title = style(wb, font(wb, 12, true, false), HorizontalAlignment.CENTER, null, false, false);
            bigTitle = style(wb, font(wb, 14, true, false), HorizontalAlignment.CENTER, null, false, false);
            subtitle = style(wb, font(wb, 9, true, false), HorizontalAlignment.CENTER, null, true, true);
            caption = style(wb, font(wb, 10, true, false), HorizontalAlignment.CENTER, null, true, true);
            code = style(wb, font(wb, 10, false, false), HorizontalAlignment.CENTER, null, true, true);
            codeBold = style(wb, font(wb, 10, true, false), HorizontalAlignment.CENTER, null, true, true);
            label = style(wb, font(wb, 10, false, false), HorizontalAlignment.LEFT, null, true, true);
            labelBold = style(wb, font(wb, 10, true, false), HorizontalAlignment.LEFT, null, true, true);
            tableHead = style(wb, font(wb, 10, true, false), HorizontalAlignment.CENTER, GREY, true, true);
            note = style(wb, font(wb, 9, false, true), HorizontalAlignment.LEFT, null, true, true);
            text = style(wb, font(wb, 10, false, false), HorizontalAlignment.LEFT, null, true, true);
            inputText = style(wb, font(wb, 10, false, false), HorizontalAlignment.LEFT, GREEN, true, true);
            amount = style(wb, font(wb, 10, false, false), HorizontalAlignment.RIGHT, null, true, true);
            inputAmount = style(wb, font(wb, 10, false, false), HorizontalAlignment.RIGHT, GREEN, true, true);
            totalAmount = style(wb, font(wb, 10, true, false), HorizontalAlignment.RIGHT, YELLOW, true, true);
            totalText = style(wb, font(wb, 10, true, false), HorizontalAlignment.LEFT, YELLOW, true, true);
            blank = style(wb, font(wb, 10, false, false), HorizontalAlignment.LEFT, null, false, false);
            for (CellStyle st : List.of(amount, inputAmount, totalAmount)) st.setDataFormat(money);
        }

        private static XSSFFont font(XSSFWorkbook wb, int size, boolean bold, boolean italic) {
            XSSFFont f = wb.createFont();
            f.setFontName("Times New Roman");
            f.setFontHeightInPoints((short) size);
            f.setBold(bold);
            f.setItalic(italic);
            return f;
        }

        private static CellStyle style(XSSFWorkbook wb, XSSFFont font, HorizontalAlignment align, byte[] fill,
                                       boolean border, boolean wrap) {
            XSSFCellStyle st = wb.createCellStyle();
            st.setFont(font);
            st.setAlignment(align);
            st.setVerticalAlignment(VerticalAlignment.CENTER);
            st.setWrapText(wrap);
            if (fill != null) {
                st.setFillForegroundColor(new XSSFColor(fill, null));
                st.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            if (border) {
                st.setBorderTop(BorderStyle.THIN);
                st.setBorderBottom(BorderStyle.THIN);
                st.setBorderLeft(BorderStyle.THIN);
                st.setBorderRight(BorderStyle.THIN);
            }
            return st;
        }
    }

    private static final byte[] GREEN = {(byte) 0xCC, (byte) 0xFF, (byte) 0xCC};
    private static final byte[] YELLOW = {(byte) 0xFF, (byte) 0xFF, (byte) 0xCC};
    private static final byte[] GREY = {(byte) 0xD9, (byte) 0xD9, (byte) 0xD9};

    private byte[] pdf(TaxRateDtos.SavedComputation saved, TaxRateDtos.ExportRequest request, User user) {
        ItrReturnForm.Form form = ItrReturnForm.build(saved, request, user);
        Font body = FontFactory.getFont(FontFactory.TIMES_ROMAN, 8);
        Font bold = FontFactory.getFont(FontFactory.TIMES_BOLD, 8);
        Font italic = FontFactory.getFont(FontFactory.TIMES_ITALIC, 7);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 24, 24, 24, 24);
            PdfWriter.getInstance(document, out);
            document.open();
            boolean firstPage = true;
            for (ItrReturnForm.Sheet page : form.sheets()) {
                if (!firstPage) document.newPage();
                firstPage = false;
                document.add(pdfHeader(form));
                PdfPTable bar = new PdfPTable(1);
                bar.setWidthPercentage(100);
                bar.setSpacingBefore(6);
                PdfPCell name = cell(page.name().toUpperCase(), FontFactory.getFont(FontFactory.TIMES_BOLD, 10), PDF_GREY);
                name.setHorizontalAlignment(Element.ALIGN_CENTER);
                bar.addCell(name);
                document.add(bar);
                for (ItrReturnForm.Block block : page.blocks()) {
                    document.add(pdfBlock(block, body, bold, italic));
                }
            }
            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw failed("PDF");
        }
    }

    private static PdfPTable pdfHeader(ItrReturnForm.Form form) {
        PdfPTable head = new PdfPTable(new float[]{1, 2, 4, 2.6f});
        head.setWidthPercentage(100);
        Font f10 = FontFactory.getFont(FontFactory.TIMES_BOLD, 10);
        Font f12 = FontFactory.getFont(FontFactory.TIMES_BOLD, 12);
        head.addCell(cell("FORM", f10, null));
        head.addCell(cell(form.formName(), f12, null));
        PdfPCell title = cell("INDIAN INCOME TAX RETURN", f12, null);
        title.setHorizontalAlignment(Element.ALIGN_CENTER);
        head.addCell(title);
        PdfPCell ay = cell("Assessment Year " + form.assessmentYear(), FontFactory.getFont(FontFactory.TIMES_BOLD, 13), null);
        ay.setHorizontalAlignment(Element.ALIGN_CENTER);
        ay.setRowspan(2);
        head.addCell(ay);
        PdfPCell sub = cell(form.subtitle(), FontFactory.getFont(FontFactory.TIMES_BOLD, 7), null);
        sub.setColspan(3);
        sub.setHorizontalAlignment(Element.ALIGN_CENTER);
        head.addCell(sub);
        PdfPCell regime = cell("Tax regime: " + form.regime(), FontFactory.getFont(FontFactory.TIMES_ITALIC, 8), null);
        regime.setColspan(4);
        head.addCell(regime);
        return head;
    }

    private static PdfPTable pdfBlock(ItrReturnForm.Block block, Font body, Font bold, Font italic) throws Exception {
        int columns = block.columns();
        float[] widths = new float[3 + columns];
        widths[0] = 1.5f;
        widths[1] = 0.8f;
        widths[2] = columns > 2 ? 3.2f : 5.6f;
        for (int i = 0; i < columns; i++) widths[3 + i] = columns > 2 ? 1.6f : 1.9f;
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        table.setSpacingBefore(5);
        table.setSplitLate(false);
        PdfPCell caption = cell(block.caption(), bold, null);
        caption.setRowspan(block.rows().size());
        caption.setHorizontalAlignment(Element.ALIGN_CENTER);
        caption.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(caption);
        for (ItrReturnForm.Row line : block.rows()) {
            boolean strong = line.kind() != ItrReturnForm.Kind.ITEM && line.kind() != ItrReturnForm.Kind.NOTE;
            boolean head = line.kind() == ItrReturnForm.Kind.TABLE_HEAD || line.kind() == ItrReturnForm.Kind.HEADING;
            PdfPCell code = cell(line.code(), strong ? bold : body, head ? PDF_GREY : null);
            code.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(code);
            PdfPCell label = cell(line.label(), line.kind() == ItrReturnForm.Kind.NOTE ? italic : strong ? bold : body,
                    head ? PDF_GREY : null);
            List<Object> values = line.values();
            if (values.isEmpty()) {
                label.setColspan(1 + columns);
                table.addCell(label);
                continue;
            }
            table.addCell(label);
            for (int i = 0; i < columns; i++) {
                Object value = i < values.size() ? values.get(i) : "";
                Color fill = head ? PDF_GREY
                        : line.kind() == ItrReturnForm.Kind.TOTAL ? PDF_YELLOW
                        : line.input() ? PDF_GREEN : null;
                PdfPCell v = cell(value instanceof BigDecimal n ? money(n) : String.valueOf(value), strong ? bold : body, fill);
                v.setHorizontalAlignment(value instanceof BigDecimal || head ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                if (head) v.setHorizontalAlignment(Element.ALIGN_CENTER);
                if (values.size() == 1 && columns > 1) {
                    v.setColspan(columns);
                    table.addCell(v);
                    break;
                }
                table.addCell(v);
            }
        }
        return table;
    }

    private static final Color PDF_GREEN = new Color(0xCC, 0xFF, 0xCC);
    private static final Color PDF_YELLOW = new Color(0xFF, 0xFF, 0xCC);
    private static final Color PDF_GREY = new Color(0xD9, 0xD9, 0xD9);

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

    private static String itrType(TaxRateDtos.ExportRequest request) {
        return isBlank(request.itrType()) ? "ITR" : request.itrType();
    }

    private static PdfPCell cell(String text, Font font, Color fill) {
        PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
        cell.setPadding(3);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        if (fill != null) cell.setBackgroundColor(fill);
        return cell;
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

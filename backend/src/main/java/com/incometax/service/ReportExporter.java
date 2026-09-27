package com.incometax.service;

import com.incometax.exception.ApiException;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

@Service
public class ReportExporter {

    public byte[] export(ReportService.ReportData report, Format format) {
        return switch (format) {
            case CSV -> csv(report);
            case EXCEL -> excel(report);
            case PDF -> pdf(report);
        };
    }

    private byte[] csv(ReportService.ReportData report) {
        StringBuilder csv = new StringBuilder();
        csv.append(String.join(",", report.headers().stream().map(this::escape).toList())).append('\n');
        for (List<Object> row : report.rows()) {
            csv.append(String.join(",", row.stream().map(value -> escape(String.valueOf(value))).toList()))
                    .append('\n');
        }
        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private byte[] excel(ReportService.ReportData report) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(report.title().length() > 31
                    ? report.title().substring(0, 31) : report.title());
            Row header = sheet.createRow(0);
            for (int column = 0; column < report.headers().size(); column++) {
                header.createCell(column).setCellValue(report.headers().get(column));
            }
            for (int rowIndex = 0; rowIndex < report.rows().size(); rowIndex++) {
                Row row = sheet.createRow(rowIndex + 1);
                List<Object> values = report.rows().get(rowIndex);
                for (int column = 0; column < values.size(); column++) {
                    Cell cell = row.createCell(column);
                    Object value = values.get(column);
                    if (value instanceof BigDecimal number) {
                        cell.setCellValue(number.doubleValue());
                    } else if (value instanceof Number number) {
                        cell.setCellValue(number.doubleValue());
                    } else {
                        cell.setCellValue(String.valueOf(value));
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "REPORT_EXPORT_FAILED", "Could not build the Excel export");
        }
    }

    private byte[] pdf(ReportService.ReportData report) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);
            document.open();
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Paragraph title = new Paragraph(report.title(), titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            document.add(title);
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(report.headers().size());
            table.setWidthPercentage(100);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            for (String heading : report.headers()) {
                PdfPCell cell = new PdfPCell(new Paragraph(heading, headerFont));
                table.addCell(cell);
            }
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
            for (List<Object> row : report.rows()) {
                for (Object value : row) {
                    table.addCell(new PdfPCell(new Paragraph(String.valueOf(value), bodyFont)));
                }
            }
            document.add(table);
            document.add(new Paragraph(" "));
            document.add(new Paragraph(
                    "Prepared by TaxFilr for return preparation purposes. Verify figures before filing.",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8)));
            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "REPORT_EXPORT_FAILED", "Could not build the PDF export");
        }
    }

    private String escape(String value) {
        String normalised = value == null ? "" : value.replace("\"", "\"\"");
        return normalised.contains(",") || normalised.contains("\"") || normalised.contains("\n")
                ? "\"" + normalised + "\""
                : normalised;
    }

    public enum Format {
        CSV("text/csv", "csv"),
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
}

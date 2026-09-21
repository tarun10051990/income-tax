package com.incometax.controller;

import com.incometax.dto.GstRequests;
import com.incometax.entity.GstInvoice;
import com.incometax.exception.ApiException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parses the documented CSV layout used for bulk GST imports. Column order is irrelevant: the
 * header row names the fields.
 */
@Component
public class GstInvoiceCsvParser {

    public List<GstRequests.InvoiceInput> parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "The import file is empty");
        }
        List<GstRequests.InvoiceInput> inputs = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw ApiException.badRequest("EMPTY_FILE", "The import file has no header row");
            }
            Map<String, Integer> columns = new HashMap<>();
            String[] headers = headerLine.split(",", -1);
            for (int index = 0; index < headers.length; index++) {
                columns.put(normalise(headers[index]), index);
            }
            requireColumns(columns, "documenttype", "invoicenumber", "invoicedate", "taxablevalue");

            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) {
                    continue;
                }
                String[] cells = line.split(",", -1);
                GstRequests.InvoiceInput input = new GstRequests.InvoiceInput();
                try {
                    input.setDocumentType(GstInvoice.DocumentType.valueOf(
                            value(cells, columns, "documenttype").toUpperCase()));
                    String source = value(cells, columns, "source");
                    input.setSource(source.isBlank() ? GstInvoice.Source.TAXPAYER_BOOKS
                            : GstInvoice.Source.valueOf(source.toUpperCase()));
                    String supplyType = value(cells, columns, "supplytype");
                    input.setSupplyType(supplyType.isBlank() ? GstInvoice.SupplyType.TAXABLE
                            : GstInvoice.SupplyType.valueOf(supplyType.toUpperCase()));
                    input.setInvoiceNumber(value(cells, columns, "invoicenumber"));
                    input.setInvoiceDate(LocalDate.parse(value(cells, columns, "invoicedate")));
                    input.setCounterpartyGstin(blankToNull(value(cells, columns, "counterpartygstin")));
                    input.setCounterpartyName(blankToNull(value(cells, columns, "counterpartyname")));
                    input.setPlaceOfSupply(blankToNull(value(cells, columns, "placeofsupply")));
                    input.setHsnSacCode(blankToNull(value(cells, columns, "hsnsaccode")));
                    input.setTaxableValue(decimal(value(cells, columns, "taxablevalue")));
                    input.setCgst(decimal(value(cells, columns, "cgst")));
                    input.setSgst(decimal(value(cells, columns, "sgst")));
                    input.setIgst(decimal(value(cells, columns, "igst")));
                    input.setCess(decimal(value(cells, columns, "cess")));
                    input.setReverseCharge(Boolean.parseBoolean(value(cells, columns, "reversecharge")));
                    String itc = value(cells, columns, "itceligible");
                    input.setItcEligible(itc.isBlank() ? Boolean.TRUE : Boolean.valueOf(itc));
                } catch (IllegalArgumentException | java.time.format.DateTimeParseException ex) {
                    throw ApiException.badRequest("INVALID_CSV_ROW",
                            "Row " + rowNumber + " could not be parsed: " + ex.getMessage());
                }
                inputs.add(input);
            }
        } catch (java.io.IOException ex) {
            throw ApiException.badRequest("UPLOAD_READ_FAILED", "The import file could not be read");
        }
        if (inputs.isEmpty()) {
            throw ApiException.badRequest("EMPTY_FILE", "The import file contains no data rows");
        }
        return inputs;
    }

    private void requireColumns(Map<String, Integer> columns, String... required) {
        for (String column : required) {
            if (!columns.containsKey(column)) {
                throw ApiException.badRequest("MISSING_CSV_COLUMN", "The import file needs a " + column + " column");
            }
        }
    }

    private String value(String[] cells, Map<String, Integer> columns, String column) {
        Integer index = columns.get(column);
        if (index == null || index >= cells.length) {
            return "";
        }
        return cells[index].trim().replaceAll("^\"|\"$", "");
    }

    private BigDecimal decimal(String value) {
        return value == null || value.isBlank() ? BigDecimal.ZERO : new BigDecimal(value);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String normalise(String header) {
        return header.toLowerCase().replaceAll("[^a-z0-9]", "");
    }
}

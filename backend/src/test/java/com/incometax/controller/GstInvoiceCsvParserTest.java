package com.incometax.controller;

import com.incometax.dto.GstRequests;
import com.incometax.entity.GstInvoice;
import com.incometax.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GstInvoiceCsvParserTest {

    private final GstInvoiceCsvParser parser = new GstInvoiceCsvParser();

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "invoices.csv", "text/csv",
                content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void parsesInvoicesRegardlessOfColumnOrderOrHeaderFormatting() {
        List<GstRequests.InvoiceInput> inputs = parser.parse(csv(
                "Invoice Date,Document Type,Taxable Value,Invoice Number,CGST,SGST,Counterparty GSTIN\n"
                        + "2026-07-05,SALES,100000,INV-1,9000,9000,27AAACR5055K1Z5\n"));

        assertThat(inputs).hasSize(1);
        GstRequests.InvoiceInput input = inputs.get(0);
        assertThat(input.getDocumentType()).isEqualTo(GstInvoice.DocumentType.SALES);
        assertThat(input.getInvoiceNumber()).isEqualTo("INV-1");
        assertThat(input.getTaxableValue()).isEqualByComparingTo(new BigDecimal("100000"));
        assertThat(input.getCgst()).isEqualByComparingTo(new BigDecimal("9000"));
        assertThat(input.getSource()).isEqualTo(GstInvoice.Source.TAXPAYER_BOOKS);
    }

    @Test
    void skipsBlankLines() {
        List<GstRequests.InvoiceInput> inputs = parser.parse(csv(
                "Document Type,Invoice Number,Invoice Date,Taxable Value\n"
                        + "SALES,INV-1,2026-07-05,100\n"
                        + "\n"
                        + "PURCHASE,PUR-1,2026-07-06,50\n"));

        assertThat(inputs).hasSize(2);
        assertThat(inputs.get(1).getDocumentType()).isEqualTo(GstInvoice.DocumentType.PURCHASE);
    }

    @Test
    void rejectsFilesMissingMandatoryColumns() {
        assertThatThrownBy(() -> parser.parse(csv("Invoice Number,Taxable Value\nINV-1,100\n")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("documenttype");
    }

    @Test
    void rejectsEmptyFiles() {
        assertThatThrownBy(() -> parser.parse(csv(""))).isInstanceOf(ApiException.class);
    }

    @Test
    void rejectsRowsWithUnparseableValues() {
        assertThatThrownBy(() -> parser.parse(csv(
                "Document Type,Invoice Number,Invoice Date,Taxable Value\n"
                        + "SALES,INV-1,not-a-date,100000\n")))
                .isInstanceOf(ApiException.class);
    }
}

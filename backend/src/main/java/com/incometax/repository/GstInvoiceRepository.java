package com.incometax.repository;

import com.incometax.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GstInvoiceRepository extends JpaRepository<GstInvoice, String> {
    List<GstInvoice> findByFilingId(String filingId);

    Page<GstInvoice> findByFilingId(String filingId, Pageable pageable);

    Page<GstInvoice> findByFilingIdAndDocumentType(String filingId, GstInvoice.DocumentType documentType,
                                                  Pageable pageable);

    List<GstInvoice> findByFilingIdAndSource(String filingId, GstInvoice.Source source);

    boolean existsByFilingIdAndDocumentTypeAndSourceAndInvoiceNumberAndCounterpartyGstin(
            String filingId, GstInvoice.DocumentType documentType, GstInvoice.Source source,
            String invoiceNumber, String counterpartyGstin);
}

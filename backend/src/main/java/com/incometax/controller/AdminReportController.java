package com.incometax.controller;

import com.incometax.common.ApiResponse;
import com.incometax.entity.FilingStatus;
import com.incometax.entity.TaxType;
import com.incometax.security.CurrentUser;
import com.incometax.security.Permission;
import com.incometax.security.RbacService;
import com.incometax.service.CaseSearchCriteria;
import com.incometax.service.ReportExporter;
import com.incometax.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@Tag(name = "Admin reports")
public class AdminReportController {

    private final ReportService reportService;
    private final ReportExporter reportExporter;
    private final RbacService rbacService;
    private final CurrentUser currentUser;

    @GetMapping("/{reportKey}")
    @Operation(summary = "Generate a report as JSON")
    public ApiResponse<ReportService.ReportData> report(@PathVariable String reportKey,
                                                       @RequestParam(required = false) TaxType taxType,
                                                       @RequestParam(required = false) List<FilingStatus> status,
                                                       @RequestParam(required = false) String financialYear,
                                                       @RequestParam(required = false) String period) {
        rbacService.require(currentUser.require(), Permission.REPORT_READ);
        return ApiResponse.ok(reportService.generate(reportKey, criteria(taxType, status, financialYear, period)));
    }

    @GetMapping("/{reportKey}/export")
    @Operation(summary = "Export a report as CSV, Excel or PDF")
    public ResponseEntity<byte[]> export(@PathVariable String reportKey,
                                         @RequestParam(defaultValue = "CSV") ReportExporter.Format format,
                                         @RequestParam(required = false) TaxType taxType,
                                         @RequestParam(required = false) List<FilingStatus> status,
                                         @RequestParam(required = false) String financialYear,
                                         @RequestParam(required = false) String period) {
        rbacService.require(currentUser.require(), Permission.REPORT_READ);
        ReportService.ReportData data = reportService.generate(reportKey,
                criteria(taxType, status, financialYear, period));
        byte[] body = reportExporter.export(data, format);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(reportKey + format.extension())
                        .build()
                        .toString())
                .contentType(MediaType.parseMediaType(format.contentType()))
                .body(body);
    }

    private CaseSearchCriteria criteria(TaxType taxType, List<FilingStatus> status, String financialYear,
                                        String period) {
        return CaseSearchCriteria.builder()
                .taxType(taxType)
                .statuses(status)
                .financialYear(financialYear)
                .period(period)
                .build();
    }
}

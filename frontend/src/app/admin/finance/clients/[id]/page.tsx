"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import StatusBadge from "@/components/platform/StatusBadge";
import Kpi from "@/components/finance/Kpi";
import TrackingTable from "@/components/finance/TrackingTable";
import { useApiData } from "@/hooks/useApiData";
import { adminFinanceApi } from "@/lib/finance-api";
import { InvestmentView, RefundView, TaxPaymentView, labelize } from "@/lib/finance-types";
import { BookingView } from "@/lib/marketplace-types";
import { AuditView, CaseSummary, DocumentView, NotificationView } from "@/lib/platform-types";
import { formatCurrency } from "@/lib/utils";

const dt = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "-");

export default function Client360Page() {
  const params = useParams<{ id: string }>();
  const view = useApiData(() => adminFinanceApi.client360(params.id), [params.id]);
  const c = view.data;

  if (view.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-danger">{view.error}</p>
        <Link href="/admin/customers" className="text-sm text-primary underline">Back to taxpayers</Link>
      </div>
    );
  }
  if (!c) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-muted">Loading client view…</div>;
  }

  const t = c.totals;
  const itr = c.cases.filter((k) => k.taxType === "INCOME_TAX");
  const gst = c.cases.filter((k) => k.taxType === "GST");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/customers" className="text-xs text-muted hover:text-foreground">← Taxpayers</Link>
          <h1 className="text-2xl font-semibold text-foreground">{c.user.name}</h1>
          <p className="text-sm text-muted">
            {c.user.email} · {c.user.phone ?? "no phone"} · PAN <span className="font-mono">{c.user.pan ?? c.taxpayerProfile?.pan ?? "-"}</span>
            {c.gstProfile && <> · GSTIN <span className="font-mono">{c.gstProfile.gstin}</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={c.user.active ? "success" : "danger"}>{c.user.active ? "Active" : "Disabled"}</Badge>
          {c.taxpayerProfile?.taxpayerType && <Badge variant="info">{labelize(c.taxpayerProfile.taxpayerType)}</Badge>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Investments" value={t.totalInvestment} hint={`${c.investments.length} records`} />
        <Kpi label="Tax paid (verified)" value={t.verifiedTaxPaid} tone="success" hint={`${formatCurrency(t.unverifiedTaxPaid ?? 0)} unverified`} />
        <Kpi label="Tax liability" value={t.totalLiability} hint={`Outstanding ${formatCurrency(t.outstanding ?? 0)}`} />
        <Kpi label="Refunds received" value={t.refundReceived} />
        <Kpi label="Estimated tax benefit" value={c.savings.estimatedTaxBenefit} estimate hint={`Eligible deductions ${formatCurrency(c.savings.eligibleDeduction ?? 0)}`} />
        <Kpi label="ITR cases" value={itr.length} kind="count" hint={itr[0] ? `Latest: ${labelize(itr[0].status)}` : "None"} />
        <Kpi label="GST cases" value={gst.length} kind="count" hint={gst[0] ? `Latest: ${labelize(gst[0].status)}` : "None"} />
        <Kpi label="Documents" value={c.documents.length} kind="count" hint={`${c.documents.filter((d) => d.status === "PENDING" || d.status === "UPLOADED").length} awaiting review`} />
      </div>

      <Card variant="bordered">
        <CardTitle>Tax tracking</CardTitle>
        <CardDescription>Liability vs verified payments per financial year and tax type.</CardDescription>
        <div className="mt-3"><TrackingTable rows={c.tracking} /></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="bordered">
          <CardTitle>Filings</CardTitle>
          <DataTable<CaseSummary>
            rows={c.cases}
            rowKey={(k) => k.id}
            emptyMessage="No cases."
            columns={[
              { header: "Case", cell: (k) => <Link href={`/admin/cases/${k.id}`} className="text-primary hover:underline font-mono text-xs">{k.caseNumber}</Link> },
              { header: "Type", cell: (k) => `${labelize(k.taxType)}${k.returnType ? ` · ${k.returnType}` : ""}` },
              { header: "FY", cell: (k) => k.financialYear ?? k.period ?? "-" },
              { header: "Status", cell: (k) => <StatusBadge status={k.status} /> },
              { header: "Due", cell: (k) => k.dueDate ?? "-" },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Documents</CardTitle>
          <DataTable<DocumentView>
            rows={c.documents}
            rowKey={(d) => d.id}
            emptyMessage="No documents."
            columns={[
              { header: "File", cell: (d) => <span className="text-xs">{d.fileName}</span> },
              { header: "Category", cell: (d) => labelize(d.category) },
              { header: "Case", cell: (d) => d.caseNumber ?? "-" },
              { header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
              { header: "Uploaded", cell: (d) => dt(d.createdAt) },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Investments</CardTitle>
          <DataTable<InvestmentView>
            rows={c.investments}
            rowKey={(r) => r.id}
            emptyMessage="No investments recorded."
            columns={[
              { header: "Date", cell: (r) => r.investedOn },
              { header: "Type", cell: (r) => `${labelize(r.type)}${r.name ? ` · ${r.name}` : ""}` },
              { header: "Section", cell: (r) => r.section ?? "-" },
              { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
              { header: "Eligible", align: "right", cell: (r) => formatCurrency(r.taxSavingEligibleAmount) },
              { header: "Status", cell: (r) => <StatusBadge status={r.verificationStatus} /> },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Tax payments</CardTitle>
          <DataTable<TaxPaymentView>
            rows={c.payments}
            rowKey={(r) => r.id}
            emptyMessage="No tax payments recorded."
            columns={[
              { header: "Paid on", cell: (r) => r.paidOn },
              { header: "FY", cell: (r) => r.financialYear },
              { header: "Type", cell: (r) => labelize(r.type) },
              { header: "Challan", cell: (r) => <span className="font-mono text-xs">{r.challanNumber ?? "-"}</span> },
              { header: "Amount", align: "right", cell: (r) => formatCurrency(r.amount) },
              { header: "Status", cell: (r) => <StatusBadge status={r.verificationStatus} /> },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Refunds</CardTitle>
          <DataTable<RefundView>
            rows={c.refunds}
            rowKey={(r) => r.id}
            emptyMessage="No refunds."
            columns={[
              { header: "FY", cell: (r) => r.financialYear },
              { header: "Tax", cell: (r) => labelize(r.taxType) },
              { header: "Claimed", align: "right", cell: (r) => formatCurrency(r.amountClaimed) },
              { header: "Received", align: "right", cell: (r) => formatCurrency(r.amountReceived) },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Consultations</CardTitle>
          <DataTable<BookingView>
            rows={c.consultations}
            rowKey={(b) => b.id}
            emptyMessage="No consultations booked."
            columns={[
              { header: "When", cell: (b) => dt(b.scheduledStart) },
              { header: "Consultant", cell: (b) => `${b.consultantName} (${labelize(b.consultantType)})` },
              { header: "Service", cell: (b) => b.serviceTitle ?? b.categoryName ?? "-" },
              { header: "Amount", align: "right", cell: (b) => formatCurrency(b.totalAmount) },
              { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Recent notifications</CardTitle>
          <DataTable<NotificationView>
            rows={c.notifications}
            rowKey={(n) => n.id}
            emptyMessage="No notifications."
            columns={[
              { header: "Sent", cell: (n) => dt(n.createdAt) },
              { header: "Subject", cell: (n) => n.subject },
              { header: "Channel", cell: (n) => labelize(n.channel) },
              { header: "Read", cell: (n) => (n.read ? "Yes" : "No") },
            ]}
          />
        </Card>
        <Card variant="bordered">
          <CardTitle>Recent activity</CardTitle>
          <DataTable<AuditView>
            rows={c.activity}
            rowKey={(a) => a.id}
            emptyMessage="No activity."
            columns={[
              { header: "When", cell: (a) => dt(a.createdAt) },
              { header: "Action", cell: (a) => labelize(a.action) },
              { header: "Entity", cell: (a) => <span className="text-xs">{a.entityType ?? "-"}</span> },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

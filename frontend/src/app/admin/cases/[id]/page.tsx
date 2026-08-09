"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/platform/DataTable";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { adminApi } from "@/lib/endpoints";
import { DocumentView, QueryView } from "@/lib/platform-types";

const QUERY_CATEGORIES = ["MISSING_DOCUMENT", "CLARIFICATION", "MISMATCH", "ADDITIONAL_INFORMATION", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function AdminCaseWorkspacePage() {
  const params = useParams<{ id: string }>();
  const caseId = typeof params.id === "string" ? params.id : "";

  const detail = useApiData(() => adminApi.caseDetail(caseId), [caseId]);
  const staff = useApiData(() => adminApi.staff());
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [queryDraft, setQueryDraft] = useState({ category: "MISSING_DOCUMENT", question: "", priority: "MEDIUM", dueDate: "" });
  const [acknowledgement, setAcknowledgement] = useState("");

  const summary = detail.data?.summary;

  const guard = async (action: () => Promise<unknown>, message: string) => {
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "ok", message });
      detail.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  if (detail.error !== null) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-danger">{detail.error}</div>;
  }

  if (summary === undefined) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-muted">Loading case…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{summary.caseNumber}</h1>
          <p className="text-sm text-muted">
            {humanise(summary.taxType)} · {humanise(summary.returnType ?? "-")} ·{" "}
            {summary.period ?? summary.financialYear ?? "-"} · due {summary.dueDate ?? "not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={summary.status} />
          <StatusBadge status={summary.priority} />
        </div>
      </div>

      {feedback !== null && (
        <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="bordered">
            <CardTitle>Move the case forward</CardTitle>
            <CardDescription>
              Only transitions allowed by the workflow configuration are offered.
            </CardDescription>
            <Input
              className="mt-3"
              label="Note for the trail"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {(detail.data?.availableTransitions ?? []).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "REJECTED" ? "danger" : "outline"}
                  onClick={() => guard(
                    () => adminApi.transition(caseId, { targetStatus: status, note: note.length > 0 ? note : undefined }),
                    `Case moved to ${humanise(status).toLowerCase()}.`,
                  )}
                >
                  {humanise(status)}
                </Button>
              ))}
              {(detail.data?.availableTransitions ?? []).length === 0 && (
                <p className="text-sm text-muted">No transitions are available from this status for your role.</p>
              )}
            </div>
          </Card>

          <Card variant="bordered">
            <CardTitle>Documents</CardTitle>
            <DataTable<DocumentView>
              rows={detail.data?.documents ?? []}
              rowKey={(row) => row.id}
              emptyMessage="The taxpayer has not uploaded anything yet."
              columns={[
                { header: "File", cell: (row) => row.fileName },
                { header: "Category", cell: (row) => humanise(row.category) },
                { header: "Version", cell: (row) => `v${row.versionNumber}` },
                { header: "Scan", cell: (row) => <Badge variant={row.scanStatus === "CLEAN" ? "success" : "warning"}>{humanise(row.scanStatus)}</Badge> },
                { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
                {
                  header: "",
                  align: "right",
                  cell: (row) => (
                    <span className="flex gap-2 justify-end">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => guard(
                          () => adminApi.verifyDocument(row.id, { approve: true }),
                          "Document verified.",
                        )}
                      >
                        Verify
                      </button>
                      <button
                        className="text-danger hover:underline"
                        onClick={() => guard(
                          () => adminApi.verifyDocument(row.id, { approve: false, reason: "Not legible" }),
                          "Document rejected.",
                        )}
                      >
                        Reject
                      </button>
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          <Card variant="bordered">
            <CardTitle>Queries</CardTitle>
            <div className="grid gap-3 md:grid-cols-4 mt-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={queryDraft.category}
                  onChange={(event) => setQueryDraft({ ...queryDraft, category: event.target.value })}
                >
                  {QUERY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{humanise(category)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  value={queryDraft.priority}
                  onChange={(event) => setQueryDraft({ ...queryDraft, priority: event.target.value })}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{humanise(priority)}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Respond by"
                type="date"
                value={queryDraft.dueDate}
                onChange={(event) => setQueryDraft({ ...queryDraft, dueDate: event.target.value })}
              />
              <div className="md:col-span-4">
                <label className="block text-sm font-medium mb-1.5">Question</label>
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  rows={2}
                  value={queryDraft.question}
                  onChange={(event) => setQueryDraft({ ...queryDraft, question: event.target.value })}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => guard(
                () => adminApi.raiseQuery({
                  caseId,
                  category: queryDraft.category,
                  question: queryDraft.question,
                  priority: queryDraft.priority,
                  dueDate: queryDraft.dueDate.length > 0 ? queryDraft.dueDate : undefined,
                }),
                "Query raised and the taxpayer notified.",
              )}
            >
              Raise query
            </Button>

            <div className="mt-6">
              <DataTable<QueryView>
                rows={detail.data?.queries ?? []}
                rowKey={(row) => row.id}
                emptyMessage="No queries on this case."
                columns={[
                  { header: "Number", cell: (row) => row.queryNumber },
                  { header: "Question", cell: (row) => row.question },
                  { header: "Responses", cell: (row) => row.responses.length },
                  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
                  {
                    header: "",
                    align: "right",
                    cell: (row) => (
                      <span className="flex gap-2 justify-end">
                        <button
                          className="text-primary hover:underline"
                          onClick={() => guard(
                            () => adminApi.reviewQuery(row.id, { accept: true }),
                            "Response accepted.",
                          )}
                        >
                          Accept
                        </button>
                        <button
                          className="text-danger hover:underline"
                          onClick={() => guard(
                            () => adminApi.reviewQuery(row.id, { accept: false, note: "More detail needed" }),
                            "Sent back to the taxpayer.",
                          )}
                        >
                          Send back
                        </button>
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>

          <Card variant="bordered">
            <CardTitle>Notes</CardTitle>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm mt-3"
              rows={3}
              placeholder="Add a note"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
              Internal only (hidden from the taxpayer)
            </label>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => guard(async () => {
                await adminApi.comment(caseId, { message: comment, internal });
                setComment("");
              }, "Note added.")}
            >
              Add note
            </Button>
            <div className="mt-4 space-y-2">
              {(detail.data?.comments ?? []).map((entry) => (
                <div key={entry.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <p className="whitespace-pre-line">{entry.message}</p>
                  <p className="text-xs text-muted mt-1">
                    {entry.author ?? "System"} · {new Date(entry.createdAt).toLocaleString("en-IN")}
                    {entry.internal ? " · internal" : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="bordered">
            <CardTitle>Taxpayer</CardTitle>
            <p className="text-sm mt-2">{summary.customer?.name ?? "-"}</p>
            <p className="text-sm text-muted">{summary.customer?.email ?? "-"}</p>
            <p className="text-sm text-muted">{summary.customer?.phone ?? "-"}</p>
            <p className="text-sm text-muted">PAN {summary.customer?.pan ?? "-"}</p>
          </Card>

          <Card variant="bordered">
            <CardTitle>Assignment</CardTitle>
            <label className="block text-sm font-medium mb-1.5 mt-3">Owner</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={summary.assignedTo?.id ?? ""}
              onChange={(event) => guard(
                () => adminApi.assign(caseId, event.target.value),
                "Case reassigned.",
              )}
            >
              <option value="">Unassigned</option>
              {(staff.data ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {humanise(member.role)}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium mb-1.5 mt-4">Priority</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={summary.priority}
              onChange={(event) => guard(
                () => adminApi.setPriority(caseId, event.target.value),
                "Priority updated.",
              )}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{humanise(priority)}</option>
              ))}
            </select>
          </Card>

          <Card variant="bordered">
            <CardTitle>Government filing</CardTitle>
            <CardDescription>
              Submit through the configured adapter, or record the acknowledgement number the portal returned after a
              manual filing. The platform never invents one.
            </CardDescription>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => guard(async () => {
                const result = await adminApi.submitToGovernment(caseId);
                setFeedback({ tone: "ok", message: result.message });
              }, "Submission attempted.")}
            >
              Submit to portal
            </Button>
            <Input
              className="mt-4"
              label="Acknowledgement number"
              value={acknowledgement}
              onChange={(event) => setAcknowledgement(event.target.value)}
            />
            <Button
              size="sm"
              className="mt-3"
              disabled={acknowledgement.trim().length === 0}
              onClick={() => guard(
                () => adminApi.recordAcknowledgement(caseId, { acknowledgementNumber: acknowledgement.trim() }),
                "Acknowledgement recorded.",
              )}
            >
              Record acknowledgement
            </Button>
          </Card>

          <Card variant="bordered">
            <CardTitle>History</CardTitle>
            <ol className="mt-3 space-y-3">
              {(detail.data?.events ?? []).map((event) => (
                <li key={event.id} className="text-sm">
                  <p>
                    {event.fromStatus === null ? "Created as " : `${humanise(event.fromStatus)} → `}
                    <span className="font-medium">{humanise(event.toStatus)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {event.actor ?? "System"} · {new Date(event.createdAt).toLocaleString("en-IN")}
                  </p>
                  {event.note !== null && <p className="text-xs text-muted">{event.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

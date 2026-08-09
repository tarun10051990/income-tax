"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CaseSelector from "@/components/platform/CaseSelector";
import StatusBadge, { humanise } from "@/components/platform/StatusBadge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";

export default function SupportPage() {
  const cases = useApiData(() => customerApi.cases());
  const [selectedId, setSelectedId] = useState("");
  const caseId = selectedId.length > 0 ? selectedId : cases.data?.content[0]?.id ?? "";
  const queries = useApiData(
    () => (caseId.length === 0 ? Promise.resolve(null) : customerApi.queries(caseId)),
    [caseId],
  );
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  const respond = async (queryId: string) => {
    const message = replies[queryId] ?? "";
    if (message.trim().length === 0) {
      return;
    }
    setFeedback(null);
    try {
      await customerApi.respondToQuery(queryId, message);
      setReplies({ ...replies, [queryId]: "" });
      setFeedback({ tone: "ok", message: "Response sent to your tax team." });
      queries.reload();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Queries and support</h1>
          <p className="text-sm text-muted">Questions your tax team has raised while reviewing your filings.</p>
        </div>
        <CaseSelector
          cases={cases.data?.content ?? []}
          selectedId={caseId}
          onSelect={setSelectedId}
          label="Filing"
        />
      </div>

      {feedback !== null && (
        <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>
      )}
      {queries.error !== null && <p className="text-sm text-danger">{queries.error}</p>}

      {(queries.data ?? []).length === 0 && !queries.isLoading && (
        <Card variant="bordered">
          <p className="text-sm text-muted">No open queries. You will be notified if the reviewer needs anything.</p>
        </Card>
      )}

      <div className="space-y-4">
        {(queries.data ?? []).map((query) => (
          <Card key={query.id} variant="bordered">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{query.queryNumber} · {humanise(query.category)}</CardTitle>
                <CardDescription>
                  Raised {new Date(query.createdAt).toLocaleDateString("en-IN")}
                  {query.dueDate === null ? "" : ` · respond by ${query.dueDate}`}
                </CardDescription>
              </div>
              <StatusBadge status={query.status} />
            </div>
            <p className="text-sm mt-3 whitespace-pre-line">{query.question}</p>

            <div className="mt-4 space-y-2">
              {query.responses.map((response) => (
                <div key={response.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <p className="whitespace-pre-line">{response.message}</p>
                  <p className="text-xs text-muted mt-1">
                    {response.respondedBy ?? "You"} · {new Date(response.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>

            {query.status !== "CLOSED" && (
              <div className="mt-4 space-y-2">
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Type your response"
                  value={replies[query.id] ?? ""}
                  onChange={(event) => setReplies({ ...replies, [query.id]: event.target.value })}
                />
                <Button size="sm" onClick={() => respond(query.id)}>Send response</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

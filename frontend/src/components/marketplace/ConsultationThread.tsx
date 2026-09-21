"use client";

import { useState } from "react";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { Scope } from "@/lib/api";
import { bookingApi } from "@/lib/marketplace-api";
import { formatDateTime } from "@/lib/marketplace-types";

/** Consultation-scoped chat, shared by the client and consultant views of a booking. */
export function MessageThread({ bookingId, scope }: { bookingId: string; scope: Scope }) {
  const api = bookingApi(scope);
  const messages = useApiData(() => api.messages(bookingId), [bookingId, scope]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (body.trim().length === 0) {
      return;
    }
    setError(null);
    try {
      await api.send(bookingId, body.trim());
      setBody("");
      messages.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Messages</CardTitle>
      <CardDescription>Only you and the other party to this consultation can read these.</CardDescription>
      <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
        {(messages.data ?? []).length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        {(messages.data ?? []).map((message) => (
          <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.mine ? "bg-primary text-white" : "bg-gray-100"}`}>
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className={`mt-1 text-[10px] ${message.mine ? "text-white/70" : "text-muted"}`}>
                {message.senderName} · {formatDateTime(message.createdAt)}
                {message.mine && message.readAt ? " · Read" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          placeholder="Write a message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
        />
        <Button type="submit" size="sm">Send</Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

export function SharedDocuments({
  bookingId,
  scope,
  canShare,
  documentOptions,
}: {
  bookingId: string;
  scope: Scope;
  /** Only the client who owns the documents can share or revoke them. */
  canShare: boolean;
  documentOptions?: { id: string; label: string }[];
}) {
  const api = bookingApi(scope);
  const shares = useApiData(() => api.documents(bookingId), [bookingId, scope]);
  const [documentId, setDocumentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      setDocumentId("");
      shares.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <Card variant="bordered">
      <CardTitle>Shared documents</CardTitle>
      <CardDescription>
        {canShare
          ? "Share only the documents this consultation needs; you can revoke access at any time."
          : "Documents the client has explicitly shared for this consultation."}
      </CardDescription>
      <ul className="mt-4 space-y-2 text-sm">
        {(shares.data ?? []).length === 0 && <li className="text-muted">Nothing shared yet.</li>}
        {(shares.data ?? []).map((share) => (
          <li key={share.shareId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <div>
              <p className="font-medium">{share.fileName}</p>
              <p className="text-xs text-muted">
                {share.category.replace(/_/g, " ")} · {(share.sizeBytes / 1024).toFixed(0)} KB · shared {formatDateTime(share.sharedAt)}
              </p>
            </div>
            {canShare && (
              <Button variant="ghost" size="sm" onClick={() => void run(() => api.revoke(bookingId, share.shareId))}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canShare && documentOptions && (
        <div className="mt-4 flex gap-2">
          <select
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            <option value="">Select a document from your filings</option>
            {documentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <Button size="sm" disabled={documentId.length === 0} onClick={() => void run(() => api.share(bookingId, documentId))}>
            Share
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

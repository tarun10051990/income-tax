"use client";

import { useState } from "react";
import Card, { CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { customerApi } from "@/lib/endpoints";

export default function NotificationsPage() {
  const inbox = useApiData(() => customerApi.notifications());
  const [feedback, setFeedback] = useState<string | null>(null);

  const markAll = async () => {
    try {
      await customerApi.markAllRead();
      inbox.reload();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  const markOne = async (notificationId: string) => {
    try {
      await customerApi.markRead(notificationId);
      inbox.reload();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  const rows = inbox.data?.content ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted">Status changes, queries from your tax team and deadline reminders.</p>
        </div>
        <Button variant="outline" onClick={markAll} disabled={rows.every((row) => row.read)}>
          Mark all as read
        </Button>
      </div>

      {feedback !== null && <p className="text-sm text-danger">{feedback}</p>}
      {inbox.error !== null && <p className="text-sm text-danger">{inbox.error}</p>}

      {rows.length === 0 && !inbox.isLoading && (
        <Card variant="bordered"><p className="text-sm text-muted">Your inbox is empty.</p></Card>
      )}

      <div className="space-y-3">
        {rows.map((notification) => (
          <Card key={notification.id} variant="bordered" className={notification.read ? "opacity-70" : ""}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{notification.subject}</CardTitle>
                  {!notification.read && <Badge variant="info">New</Badge>}
                </div>
                <p className="text-sm text-muted mt-1 whitespace-pre-line">{notification.body}</p>
                <p className="text-xs text-muted mt-2">{new Date(notification.createdAt).toLocaleString("en-IN")}</p>
              </div>
              {!notification.read && (
                <button className="text-sm text-primary hover:underline" onClick={() => markOne(notification.id)}>
                  Mark read
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

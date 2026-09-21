"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { consultantApi } from "@/lib/marketplace-api";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface Rule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

function label(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export default function ConsultantAvailabilityPage() {
  const availability = useApiData(() => consultantApi.availability());
  const holidays = useApiData(() => consultantApi.holidays());
  const [rules, setRules] = useState<Rule[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [holiday, setHoliday] = useState({ date: "", reason: "" });

  const [seededFrom, setSeededFrom] = useState<typeof availability.data>(null);
  if (availability.data && availability.data !== seededFrom) {
    setSeededFrom(availability.data);
    setRules(availability.data.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime.slice(0, 5), endTime: r.endTime.slice(0, 5) })));
  }

  const act = async (action: () => Promise<unknown>, success: string, after: () => void) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "ok", message: success });
      after();
    } catch (cause) {
      setFeedback({ tone: "error", message: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  const update = (index: number, patch: Partial<Rule>) =>
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Availability</h1>
        <p className="text-sm text-muted">Weekly working hours are turned into bookable slots; holidays block whole days.</p>
      </div>

      {feedback && <p className={`text-sm ${feedback.tone === "ok" ? "text-secondary" : "text-danger"}`}>{feedback.message}</p>}

      <Card variant="bordered">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Weekly hours</CardTitle>
            <CardDescription>Add more than one window per day for breaks (e.g. 10:00–13:00 and 15:00–18:00).</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRules([...rules, { dayOfWeek: "MONDAY", startTime: "10:00", endTime: "18:00" }])}>Add window</Button>
        </div>
        <div className="mt-4 space-y-2">
          {rules.length === 0 && <p className="text-sm text-muted">No working hours set — clients cannot book until you add some.</p>}
          {rules.map((rule, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
              <label className="block text-sm">
                <span className="text-muted text-xs">Day</span>
                <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={rule.dayOfWeek} onChange={(e) => update(index, { dayOfWeek: e.target.value })}>
                  {DAYS.map((day) => <option key={day} value={day}>{label(day)}</option>)}
                </select>
              </label>
              <Input label="From" type="time" value={rule.startTime} onChange={(e) => update(index, { startTime: e.target.value })} />
              <Input label="To" type="time" value={rule.endTime} onChange={(e) => update(index, { endTime: e.target.value })} />
              <Button variant="ghost" size="sm" onClick={() => setRules(rules.filter((_, i) => i !== index))}>Remove</Button>
            </div>
          ))}
        </div>
        <Button
          className="mt-4"
          loading={busy}
          onClick={() => void act(() => consultantApi.saveAvailability(rules), "Working hours saved.", () => availability.reload())}
        >
          Save hours
        </Button>
      </Card>

      <Card variant="bordered">
        <CardTitle>Holidays and days off</CardTitle>
        <CardDescription>Existing confirmed bookings are not cancelled automatically; reschedule them from the appointment page.</CardDescription>
        <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto] items-end">
          <Input label="Date" type="date" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} />
          <Input label="Reason (optional)" value={holiday.reason} onChange={(e) => setHoliday({ ...holiday, reason: e.target.value })} />
          <Button
            variant="outline"
            disabled={holiday.date === ""}
            loading={busy}
            onClick={() => void act(
              () => consultantApi.addHoliday({ date: holiday.date, reason: holiday.reason || undefined }),
              "Day off added.",
              () => { setHoliday({ date: "", reason: "" }); holidays.reload(); },
            )}
          >
            Add
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-border text-sm">
          {(holidays.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2">
              <span>{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{item.reason ? ` · ${item.reason}` : ""}</span>
              <Button variant="ghost" size="sm" loading={busy} onClick={() => void act(() => consultantApi.removeHoliday(item.id), "Day off removed.", () => holidays.reload())}>Remove</Button>
            </li>
          ))}
          {(holidays.data ?? []).length === 0 && <li className="py-2 text-muted">No days off scheduled.</li>}
        </ul>
      </Card>
    </div>
  );
}

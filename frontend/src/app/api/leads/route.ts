import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { normaliseLead, validateLead, type LeadInput } from "@/lib/leads";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

/**
 * Lead delivery. Forwards to LEAD_WEBHOOK_URL (CRM / Slack / email service) when configured,
 * otherwise appends to a local JSONL file so no enquiry is ever lost in development.
 */
async function deliver(lead: LeadInput & { receivedAt: string }): Promise<void> {
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    if (!response.ok) throw new Error(`Lead webhook responded ${response.status}`);
    return;
  }
  const dir = process.env.LEAD_STORE_DIR ?? path.join(process.cwd(), ".leads");
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "leads.jsonl"), `${JSON.stringify(lead)}\n`, "utf8");
}

export async function POST(request: Request) {
  let body: Partial<LeadInput>;
  try {
    body = (await request.json()) as Partial<LeadInput>;
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  if (body.website) {
    return Response.json({ ok: true });
  }

  const input: LeadInput = {
    fullName: body.fullName ?? "",
    mobile: body.mobile ?? "",
    email: body.email ?? "",
    leadType: body.leadType ?? "",
    service: body.service ?? "",
    message: body.message ?? "",
    source: typeof body.source === "string" ? body.source.slice(0, 200) : undefined,
  };

  const errors = validateLead(input, { requireService: body.service !== undefined });
  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, message: "Please correct the highlighted fields.", errors }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { ok: false, message: "Too many requests. Please try again in a few minutes or call us directly." },
      { status: 429 },
    );
  }

  try {
    await deliver({ ...normaliseLead(input), receivedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Lead delivery failed", error);
    return Response.json(
      { ok: false, message: "We could not record your request right now. Please call or WhatsApp us." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, message: "Thanks! An expert will call you within one working day." });
}

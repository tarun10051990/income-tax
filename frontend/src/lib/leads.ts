export const LEAD_TYPES = ["Individual", "Startup", "Business"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export interface LeadInput {
  fullName: string;
  mobile: string;
  email: string;
  leadType: LeadType | "";
  service: string;
  message: string;
  /** Page the lead was submitted from (analytics only). */
  source?: string;
  /** Honeypot — must stay empty. */
  website?: string;
}

export type LeadErrors = Partial<Record<keyof LeadInput, string>>;

const MOBILE_PATTERN = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLead(input: LeadInput, options: { requireService?: boolean } = {}): LeadErrors {
  const errors: LeadErrors = {};
  const name = input.fullName.trim();
  if (name.length < 2) errors.fullName = "Please enter your full name.";
  else if (name.length > 120) errors.fullName = "Name is too long.";

  const mobile = input.mobile.replace(/[\s-]/g, "");
  if (!MOBILE_PATTERN.test(mobile)) errors.mobile = "Enter a valid 10-digit Indian mobile number.";

  if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "Enter a valid email address.";

  if (!LEAD_TYPES.includes(input.leadType as LeadType)) errors.leadType = "Tell us who you are.";

  if (options.requireService !== false && !input.service.trim()) errors.service = "Select the service you need.";

  if (input.message.length > 2000) errors.message = "Message must be under 2000 characters.";

  return errors;
}

export function normaliseLead(input: LeadInput): LeadInput {
  return {
    fullName: input.fullName.trim(),
    mobile: input.mobile.replace(/[\s-]/g, ""),
    email: input.email.trim().toLowerCase(),
    leadType: input.leadType,
    service: input.service.trim(),
    message: input.message.trim(),
    source: input.source,
  };
}

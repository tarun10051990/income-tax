import type { LegalSection } from "@/components/marketing/LegalPage";
import { siteConfig } from "./site";

/**
 * Placeholder legal copy. Have this reviewed by counsel before going live.
 */
export const legalUpdated = "1 April 2026";

export const privacySections: LegalSection[] = [
  {
    heading: "Information we collect",
    paragraphs: [
      `When you request a callback, book a consultation or use the ${siteConfig.name} client portal, we collect the information you provide: your name, mobile number, email address, the type of client you are and the service you need.`,
      "When you become a client we additionally collect the identity, income, business and financial documents required to prepare your filings — for example PAN, Aadhaar, Form 16, bank statements, invoices and GST registration details.",
    ],
  },
  {
    heading: "How we use it",
    paragraphs: ["We use your information only to:"],
    bullets: [
      "Contact you about your enquiry and deliver the services you engage us for.",
      "Prepare, review and file returns and forms with the relevant authorities on your instruction.",
      "Send deadline reminders, filing status updates and service notifications.",
      "Meet our legal, professional and record-keeping obligations.",
    ],
  },
  {
    heading: "Sharing and disclosure",
    paragraphs: [
      "We do not sell your personal information. We share it only with government portals when filing on your behalf, with regulated sub-processors (cloud hosting, communication tools) bound by confidentiality, and where required by law.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "Documents are stored encrypted at rest and in transit, access is limited to the professionals assigned to your engagement, and every access is logged. Staff accounts require multi-factor authentication.",
    ],
  },
  {
    heading: "Retention and your rights",
    paragraphs: [
      "We retain engagement records for the period required by applicable tax and professional regulations, after which they are securely deleted. You may request access to, correction of, or deletion of your personal information (subject to legal retention requirements) by contacting us.",
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    heading: "Engagement",
    paragraphs: [
      `These terms govern the professional services provided by ${siteConfig.legalName} ("we", "us"). By requesting a service, paying a fee or using the client portal you agree to these terms.`,
      "Each engagement is scoped by the plan or proposal you accept. Work outside that scope is quoted separately before it begins.",
    ],
  },
  {
    heading: "Fees and government charges",
    paragraphs: [
      "Our professional fees are fixed and communicated in advance. Government fees, stamp duty, penalties, interest and taxes payable to any authority are separate, are your responsibility and are never included in our fees unless stated in writing.",
    ],
  },
  {
    heading: "Your responsibilities",
    paragraphs: ["Timely and accurate filing depends on you providing complete and correct information. You agree to:"],
    bullets: [
      "Share all documents and information reasonably requested, within the timelines communicated.",
      "Review and approve computations, returns and drafts before we submit them.",
      "Inform us promptly of notices, changes in business structure or other events affecting your compliance.",
    ],
  },
  {
    heading: "Filing and acknowledgements",
    paragraphs: [
      "Where we file on your behalf we do so using official government channels or, where electronic integration is unavailable, manually with your authorisation. We record acknowledgement numbers exactly as issued by the authority and never generate or represent an acknowledgement that has not been issued.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "We exercise professional care and skill. Our aggregate liability for any engagement is limited to the professional fees paid for that engagement. We are not liable for penalties or interest arising from information provided late or inaccurately, or from decisions of any authority.",
    ],
  },
  {
    heading: "Governing law",
    paragraphs: [`These terms are governed by the laws of India and subject to the exclusive jurisdiction of the courts of ${siteConfig.contact.address.city}.`],
  },
];

export const disclaimerSections: LegalSection[] = [
  {
    heading: "General information only",
    paragraphs: [
      "Content on this website, including articles, calculators, guides and FAQs, is provided for general information and does not constitute professional, legal, tax or financial advice. Laws and rates change frequently and outcomes depend on individual facts.",
    ],
  },
  {
    heading: "No government affiliation",
    paragraphs: [
      `${siteConfig.name} is an independent professional services firm. We are not affiliated with, endorsed by or acting on behalf of the Income Tax Department, the Goods and Services Tax Network, the Ministry of Corporate Affairs or any other government body.`,
    ],
  },
  {
    heading: "Illustrative figures",
    paragraphs: [
      "Statistics, testimonials, savings examples and pricing displayed on this website are illustrative and may be updated at any time. Actual fees are confirmed in your engagement proposal.",
    ],
  },
];

export const refundSections: LegalSection[] = [
  {
    heading: "Before work begins",
    paragraphs: ["If you cancel before we have started work on your engagement, professional fees paid are refunded in full within 7–10 working days to the original payment method."],
  },
  {
    heading: "After work begins",
    paragraphs: [
      "Once our professionals have begun reviewing documents or preparing your filing, fees for work completed are non-refundable. Any unused portion of a multi-service package may be refunded at our discretion, less work already performed.",
    ],
  },
  {
    heading: "Government fees",
    paragraphs: ["Statutory fees, stamp duty and taxes paid to any authority on your behalf are non-refundable once remitted."],
  },
  {
    heading: "How to request a refund",
    paragraphs: [`Email ${siteConfig.contact.supportEmail} with your registered mobile number and engagement reference. We respond to every request within 3 working days.`],
  },
];

/**
 * Short screen-recorded walkthroughs of the customer portal.
 *
 * Files live in `public/videos/` by default. Set NEXT_PUBLIC_VIDEO_BASE_URL to
 * serve them from a CDN / object store instead (same file names).
 */
const VIDEO_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? "/videos";

export interface HowToVideo {
  id: string;
  title: string;
  description: string;
  /** Rounded running time shown on the card, e.g. "2 min". */
  duration: string;
  file: string;
  /** Where the viewer should go to do it themselves. */
  startHref: string;
  startLabel: string;
  steps: string[];
}

export const howToVideos: HowToVideo[] = [
  {
    id: "itr",
    title: "How to file your Income Tax Return (ITR) with TaxFilr",
    description:
      "Upload Form 16, review the extracted salary and TDS, add other income and deductions, compare the Old and New regimes and generate your ITR JSON — then download it or hand it to an expert for filing.",
    duration: "2 min",
    file: "taxfilr-itr-walkthrough",
    startHref: "/filing/upload",
    startLabel: "Start my ITR",
    steps: [
      "Log in or register from Get Started.",
      "Open Filing → Upload Form 16 (drag & drop the PDF, or try the sample).",
      "Review the extracted salary, TDS and employer details.",
      "Add other income and deductions (80C, 80D, HRA…).",
      "Compare tax under the Old and New regimes.",
      "Check the tax-saving suggestions.",
      "Enter your refund bank account and generate the ITR JSON.",
      "Download the JSON or send it to a TaxFilr expert; track status on the summary page.",
    ],
  },
  {
    id: "gst",
    title: "How to prepare and file a GST return with TaxFilr",
    description:
      "Register your GSTIN, start a GSTR-1 / GSTR-3B return for a period, record sales and purchase invoices, reconcile against GSTR-2B and send the return to a GST professional for filing.",
    duration: "2 min",
    file: "taxfilr-gst-walkthrough",
    startHref: "/gst",
    startLabel: "Open GST",
    steps: [
      "Log in and open GST from the top menu.",
      "Add your business under Registrations: GSTIN, legal name, state and signatory.",
      "Go to GST returns, pick the registration, return type and period, then Create return.",
      "Record sales and purchase invoices in the Invoice book, or upload a CSV.",
      "Run Reconciliation to match your books against GSTR-2B and fix mismatches.",
      "Click Send for review — a GST professional files it and the ARN appears on your return.",
    ],
  },
];

export function videoSrc(video: HowToVideo): string {
  return `${VIDEO_BASE_URL}/${video.file}.mp4`;
}

export function videoPoster(video: HowToVideo): string {
  return `${VIDEO_BASE_URL}/${video.file}.jpg`;
}

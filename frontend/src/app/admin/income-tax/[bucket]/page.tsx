"use client";

import { useParams } from "next/navigation";
import CaseQueue from "@/components/platform/CaseQueue";

export default function IncomeTaxQueuePage() {
  const params = useParams<{ bucket: string }>();
  const bucket = typeof params.bucket === "string" ? params.bucket : "queue";
  return <CaseQueue taxType="INCOME_TAX" bucket={bucket} basePath="/admin/income-tax" />;
}

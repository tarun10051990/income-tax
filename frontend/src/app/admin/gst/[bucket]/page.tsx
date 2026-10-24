"use client";

import { useParams } from "next/navigation";
import CaseQueue from "@/components/platform/CaseQueue";

export default function GstQueuePage() {
  const params = useParams<{ bucket: string }>();
  const bucket = typeof params.bucket === "string" ? params.bucket : "queue";
  return <CaseQueue taxType="GST" bucket={bucket} basePath="/admin/gst" />;
}

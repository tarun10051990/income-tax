import Link from "next/link";
import Card from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize">privacy</h1>
        <p className="text-muted mt-1">This page is under construction.</p>
      </div>
      <Card variant="bordered">
        <div className="p-6">
          <p className="text-sm text-muted">Content coming soon. For assistance, please email support@taxfilr.in</p>
          <Link href="/" className="text-primary text-sm hover:underline mt-4 inline-block">
            &larr; Back to Home
          </Link>
        </div>
      </Card>
    </div>
  );
}

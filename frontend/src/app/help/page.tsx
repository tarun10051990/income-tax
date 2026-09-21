import Link from "next/link";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import HowToVideos from "@/components/marketing/HowToVideos";

const quickLinks = [
  { href: "/filing/upload", label: "Start or continue my ITR" },
  { href: "/gst", label: "GST registrations and returns" },
  { href: "/support", label: "Raise a support ticket" },
  { href: "/faq", label: "Frequently asked questions" },
  { href: "/contact", label: "Talk to a tax professional" },
];

export default function HelpPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Help Center</h1>
        <p className="text-sm text-muted mt-1">
          Watch a two-minute walkthrough of each filing, or jump straight to the page you need.
        </p>
      </div>

      <HowToVideos />

      <Card variant="bordered">
        <CardTitle>Quick links</CardTitle>
        <CardDescription>Common places to go next.</CardDescription>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-sm text-primary hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Still stuck? Email{" "}
          <a href="mailto:support@taxfilr.in" className="text-primary hover:underline">
            support@taxfilr.in
          </a>
          .
        </p>
      </Card>
    </div>
  );
}

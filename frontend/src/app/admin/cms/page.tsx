"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import DataTable from "@/components/platform/DataTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { cmsApi, CmsImportResult } from "@/lib/cms-api";
import { CMS_COLLECTIONS, collectionName, defaultImportPayload } from "@/lib/site-content";

interface Row {
  key: string;
  collection: string;
  label: string;
  description: string;
  singleton: boolean;
  published: number;
  drafts: number;
}

export default function CmsOverviewPage() {
  const summary = useApiData(() => cmsApi.summary());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<CmsImportResult | null>(null);

  const counts = new Map((summary.data ?? []).map((s) => [s.collection, s]));
  const rows: Row[] = CMS_COLLECTIONS.map((c) => {
    const name = collectionName(c.key);
    const found = counts.get(name);
    return {
      key: c.key,
      collection: name,
      label: c.label,
      description: c.description,
      singleton: c.singleton === true,
      published: found?.published ?? 0,
      drafts: found?.drafts ?? 0,
    };
  });
  const totalManaged = rows.reduce((sum, r) => sum + r.published + r.drafts, 0);

  const importDefaults = async () => {
    setBusy(true);
    setError(null);
    setImported(null);
    try {
      setImported(await cmsApi.importDefaults(defaultImportPayload(), true));
      summary.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Website content</h1>
          <p className="text-sm text-muted">
            Every word on the public site and in the ITR/GST screens (services, pricing, FAQs, field help, button labels,
            legal pages, branding and contact details) is stored in the database and edited here. Only{" "}
            <strong>published</strong> entries are shown to visitors. Changes go live within about a minute.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={importDefaults} loading={busy} variant={totalManaged === 0 ? "primary" : "outline"}>
            Import bundled defaults
          </Button>
          <span className="text-xs text-muted">Adds any built-in entries missing from the database; existing entries are never overwritten.</span>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {imported && (
        <p className="text-sm text-success">
          Imported {imported.created} entries{imported.skipped > 0 ? `, skipped ${imported.skipped} that already existed` : ""}.
        </p>
      )}
      {summary.error && <p className="text-sm text-danger">{summary.error}</p>}

      <Card variant="bordered">
        <CardTitle>Collections</CardTitle>
        <CardDescription>
          {totalManaged === 0 && !summary.isLoading
            ? "No content is managed in the CMS yet — the site is serving its bundled defaults. Import them to start editing."
            : `${totalManaged} entries across ${rows.filter((r) => r.published + r.drafts > 0).length} collections.`}
        </CardDescription>
        <DataTable<Row>
          rows={rows}
          rowKey={(r) => r.collection}
          columns={[
            {
              header: "Collection",
              cell: (r) => (
                <Link href={`/admin/cms/${r.collection}`} className="font-medium text-primary hover:underline">
                  {r.label}
                </Link>
              ),
            },
            { header: "Contents", cell: (r) => <span className="text-xs text-muted">{r.description}</span> },
            { header: "Type", cell: (r) => <Badge variant="default">{r.singleton ? "Single document" : "List"}</Badge> },
            { header: "Published", align: "right", cell: (r) => r.published },
            { header: "Drafts", align: "right", cell: (r) => (r.drafts > 0 ? <Badge variant="warning">{r.drafts}</Badge> : 0) },
            {
              header: "Source",
              cell: (r) =>
                r.published > 0 ? <Badge variant="success">CMS</Badge> : <Badge variant="info">Bundled defaults</Badge>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

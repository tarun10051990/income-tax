"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/platform/DataTable";
import { errorMessage, useApiData } from "@/hooks/useApiData";
import { cmsApi, CmsEntryView } from "@/lib/cms-api";
import { CMS_COLLECTIONS, collectionName, defaultContent, entrySlug, entryTitle, SiteContent } from "@/lib/site-content";

interface EditorState {
  mode: "create" | "edit";
  original?: CmsEntryView;
  slug: string;
  title: string;
  json: string;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Bundled default entries for a collection, used as templates when creating new entries. */
function templatesFor(key: keyof SiteContent): Array<{ slug: string; title?: string; data: unknown }> {
  const value = defaultContent[key];
  const items: unknown[] = key === "legal" ? Object.values(value as SiteContent["legal"]) : Array.isArray(value) ? value : [value];
  return items.map((item, index) => ({ slug: key === "site" ? "site" : entrySlug(key, item, index), title: entryTitle(item), data: item }));
}

export default function CmsCollectionPage() {
  const params = useParams<{ collection: string }>();
  const collection = params.collection;
  const meta = CMS_COLLECTIONS.find((c) => collectionName(c.key) === collection);
  const entries = useApiData(() => cmsApi.list(collection), [collection]);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CmsEntryView | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      entries.reload();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openCreate = (template?: { slug: string; title?: string; data: unknown }) => {
    setEditorError(null);
    setEditor({
      mode: "create",
      slug: template?.slug ?? "",
      title: template?.title ?? "",
      json: pretty(template?.data ?? {}),
    });
  };

  const openEdit = (entry: CmsEntryView) => {
    setEditorError(null);
    setEditor({ mode: "edit", original: entry, slug: entry.slug, title: entry.title ?? "", json: pretty(entry.data) });
  };

  const save = async (event: FormEvent, publish: boolean) => {
    event.preventDefault();
    if (!editor) return;
    let data: unknown;
    try {
      data = JSON.parse(editor.json);
    } catch (cause) {
      setEditorError(`Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    setEditorError(null);
    const body = {
      slug: editor.slug.trim(),
      title: editor.title.trim() || undefined,
      sortOrder: editor.original?.sortOrder,
      data,
      publish,
    };
    setBusy(true);
    try {
      if (editor.mode === "create") {
        await cmsApi.create(collection, body);
      } else if (editor.original) {
        await cmsApi.update(collection, editor.original.slug, body);
      }
      setEditor(null);
      entries.reload();
    } catch (cause) {
      setEditorError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const list = entries.data ?? [];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const slugs = list.map((e) => e.slug);
    [slugs[index], slugs[target]] = [slugs[target], slugs[index]];
    void run(() => cmsApi.reorder(collection, slugs));
  };

  const list = entries.data ?? [];
  const existing = new Set(list.map((e) => e.slug));
  const templates = meta ? templatesFor(meta.key).filter((t) => !existing.has(t.slug)) : [];
  const singleton = meta?.singleton === true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/cms" className="text-xs text-muted hover:underline">
            ← All collections
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{meta?.label ?? collection}</h1>
          <p className="text-sm text-muted">
            {meta?.description ?? "Custom collection."} Entries are JSON documents; visitors only see published entries
            {singleton ? "." : ", in the order shown here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.length > 0 && !singleton && (
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.slug === e.target.value);
                if (t) openCreate(t);
              }}
            >
              <option value="">Add from bundled default…</option>
              {templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title ?? t.slug}
                </option>
              ))}
            </select>
          )}
          {(!singleton || list.length === 0) && (
            <Button onClick={() => openCreate(singleton ? templates[0] : undefined)}>
              {singleton ? "Create site settings" : "New entry"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {entries.error && <p className="text-sm text-danger">{entries.error}</p>}

      <Card variant="bordered">
        <CardTitle>Entries</CardTitle>
        <CardDescription>
          {list.length === 0 && !entries.isLoading
            ? "Nothing here yet — the site shows the bundled defaults for this collection."
            : `${list.filter((e) => e.status === "PUBLISHED").length} published, ${list.filter((e) => e.status === "DRAFT").length} draft.`}
        </CardDescription>
        <DataTable<CmsEntryView>
          rows={list}
          rowKey={(e) => e.id}
          emptyMessage={entries.isLoading ? "Loading…" : "No entries."}
          columns={[
            ...(singleton
              ? []
              : [
                  {
                    header: "#",
                    cell: (e: CmsEntryView) => {
                      const index = list.indexOf(e);
                      return (
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <button type="button" className="px-1 text-muted hover:text-foreground disabled:opacity-30" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                            ▲
                          </button>
                          <span className="w-5 text-center">{index + 1}</span>
                          <button type="button" className="px-1 text-muted hover:text-foreground disabled:opacity-30" disabled={busy || index === list.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                            ▼
                          </button>
                        </span>
                      );
                    },
                  },
                ]),
            {
              header: "Entry",
              cell: (e) => (
                <button type="button" className="text-left" onClick={() => openEdit(e)}>
                  <span className="font-medium text-primary hover:underline">{e.title ?? e.slug}</span>
                  <span className="block text-xs text-muted font-mono">{e.slug}</span>
                </button>
              ),
            },
            {
              header: "Status",
              cell: (e) => <Badge variant={e.status === "PUBLISHED" ? "success" : "warning"}>{e.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>,
            },
            { header: "Version", align: "right", cell: (e) => `v${e.version}` },
            {
              header: "Updated",
              cell: (e) => (
                <span className="text-xs text-muted">
                  {new Date(e.updatedAt).toLocaleString("en-IN")}
                  {e.updatedBy ? ` · ${e.updatedBy}` : ""}
                </span>
              ),
            },
            {
              header: "",
              align: "right",
              cell: (e) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => openEdit(e)}>
                    Edit
                  </Button>
                  {e.status === "PUBLISHED" ? (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => cmsApi.unpublish(collection, e.slug))}>
                      Unpublish
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => cmsApi.publish(collection, e.slug))}>
                      Publish
                    </Button>
                  )}
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDelete(e)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal isOpen={editor !== null} onClose={() => setEditor(null)} title={editor?.mode === "create" ? "New entry" : `Edit ${editor?.title || editor?.slug}`} size="lg">
        {editor && (
          <form onSubmit={(e) => save(e, true)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Slug"
                required
                pattern="[a-z0-9][a-z0-9\-_.]*"
                title="Lowercase letters, digits, dashes, underscores and dots"
                value={editor.slug}
                disabled={editor.mode === "edit"}
                onChange={(e) => setEditor({ ...editor, slug: e.target.value })}
              />
              <Input label="Title (admin only)" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
            </div>
            <label className="block text-sm font-medium">Content (JSON)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono"
              rows={22}
              spellCheck={false}
              value={editor.json}
              onChange={(e) => setEditor({ ...editor, json: e.target.value })}
            />
            <p className="text-xs text-muted">
              Keep the same field names as the bundled defaults so the page renders correctly.
              {editor.original ? ` Saving creates version ${editor.original.version + 1}.` : ""}
            </p>
            {editorError && <p className="text-sm text-danger">{editorError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditor(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" variant="outline" loading={busy} onClick={(e) => save(e, false)}>
                {editor.original?.status === "PUBLISHED" ? "Save as draft (unpublish)" : "Save draft"}
              </Button>
              <Button type="submit" loading={busy}>
                Save and publish
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete entry" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm">
              Delete <strong>{confirmDelete.title ?? confirmDelete.slug}</strong>? If this leaves the collection without published
              entries, the site falls back to the bundled defaults.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={async () => {
                  if (await run(() => cmsApi.remove(collection, confirmDelete.slug))) setConfirmDelete(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

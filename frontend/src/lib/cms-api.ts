import { apiRequest } from "@/lib/api";
import type { ImportPayload } from "@/lib/site-content";

const admin = { scope: "admin" as const };

export type CmsStatus = "DRAFT" | "PUBLISHED";

export interface CmsEntryView {
  id: string;
  collection: string;
  slug: string;
  title: string | null;
  status: CmsStatus;
  sortOrder: number;
  data: unknown;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CmsCollectionSummary {
  collection: string;
  published: number;
  drafts: number;
}

export interface CmsEntryRequest {
  slug: string;
  title?: string;
  sortOrder?: number;
  data: unknown;
  publish?: boolean;
}

export interface CmsImportResult {
  created: number;
  skipped: number;
}

export const cmsApi = {
  summary: () => apiRequest<CmsCollectionSummary[]>("/admin/cms", admin),
  list: (collection: string) => apiRequest<CmsEntryView[]>(`/admin/cms/${collection}`, admin),
  get: (collection: string, slug: string) => apiRequest<CmsEntryView>(`/admin/cms/${collection}/${slug}`, admin),
  create: (collection: string, body: CmsEntryRequest) =>
    apiRequest<CmsEntryView>(`/admin/cms/${collection}`, { ...admin, method: "POST", body }),
  update: (collection: string, slug: string, body: CmsEntryRequest) =>
    apiRequest<CmsEntryView>(`/admin/cms/${collection}/${slug}`, { ...admin, method: "PUT", body }),
  publish: (collection: string, slug: string) =>
    apiRequest<CmsEntryView>(`/admin/cms/${collection}/${slug}/publish`, { ...admin, method: "POST" }),
  unpublish: (collection: string, slug: string) =>
    apiRequest<CmsEntryView>(`/admin/cms/${collection}/${slug}/unpublish`, { ...admin, method: "POST" }),
  remove: (collection: string, slug: string) =>
    apiRequest<void>(`/admin/cms/${collection}/${slug}`, { ...admin, method: "DELETE" }),
  reorder: (collection: string, slugs: string[]) =>
    apiRequest<CmsEntryView[]>(`/admin/cms/${collection}/reorder`, { ...admin, method: "PUT", body: { slugs } }),
  importDefaults: (collections: ImportPayload, publish = true) =>
    apiRequest<CmsImportResult>("/admin/cms/import", { ...admin, method: "POST", body: { collections, publish } }),
};

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import JsonLd, { articleSchema, breadcrumbSchema } from "@/components/marketing/JsonLd";
import { Container, CtaLink, Section } from "@/components/marketing/primitives";
import { LeadCta, ResourceCard } from "@/components/marketing/sections";
import { getCategoryLabel, getResourcePost, resourcePosts } from "@/content/resources";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return resourcePosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getResourcePost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/resources/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.date, url: `/resources/${post.slug}` },
  };
}

export default async function ResourceArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getResourcePost(slug);
  if (!post) notFound();

  const related = resourcePosts.filter((item) => item.slug !== post.slug && item.category === post.category).slice(0, 3);
  const fallback = resourcePosts.filter((item) => item.slug !== post.slug).slice(0, 3);
  const more = related.length > 0 ? related : fallback;

  return (
    <>
      <JsonLd
        data={[
          articleSchema(post),
          breadcrumbSchema([
            { name: "Home", href: "/" },
            { name: "Resources", href: "/resources" },
            { name: post.title, href: `/resources/${post.slug}` },
          ]),
        ]}
      />
      <article>
        <header className="border-b border-slate-200 bg-slate-50">
          <Container className="max-w-3xl py-14 lg:py-20">
            <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-emerald">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All resources
            </Link>
            <p className="mt-6 inline-flex rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
              {getCategoryLabel(post.category)}
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-navy-deep sm:text-4xl lg:text-5xl">{post.title}</h1>
            <p className="mt-5 text-lg text-slate-600">{post.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-500">
              <time dateTime={post.date} className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </time>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {post.readingTime}
              </span>
            </div>
          </Container>
        </header>

        <Container className="max-w-3xl py-12 lg:py-16">
          <div className="marketing-prose">
            {post.body.map((paragraph, i) =>
              paragraph.startsWith("## ") ? (
                <h2 key={i}>{paragraph.replace(/^## /, "")}</h2>
              ) : (
                <p key={i}>{paragraph}</p>
              ),
            )}
          </div>
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-semibold text-navy-deep">Want this handled for you?</p>
              <p className="mt-1 text-sm text-slate-600">Talk to a professional about how this applies to your situation.</p>
            </div>
            <CtaLink href="/contact" className="mt-4 shrink-0 sm:mt-0" arrow>
              Talk to an Expert
            </CtaLink>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            This article is for general information only and does not constitute professional advice. Tax laws change frequently;
            please confirm current provisions with a qualified professional before acting.
          </p>
        </Container>
      </article>

      <Section tone="muted">
        <Container>
          <h2 className="text-2xl font-bold text-navy-deep">Keep reading</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {more.map((item, i) => (
              <ResourceCard key={item.slug} post={item} index={i} />
            ))}
          </div>
        </Container>
      </Section>

      <LeadCta source={`resource-${post.slug}`} />
    </>
  );
}

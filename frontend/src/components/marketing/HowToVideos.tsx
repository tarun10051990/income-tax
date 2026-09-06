import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { howToVideos, videoPoster, videoSrc, type HowToVideo } from "@/content/videos";
import { cn } from "@/lib/utils";

export function HowToVideoCard({ video, showSteps = true }: { video: HowToVideo; showSteps?: boolean }) {
  return (
    <article
      id={`video-${video.id}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <video
        className="aspect-video w-full bg-navy-deep"
        controls
        preload="metadata"
        playsInline
        poster={videoPoster(video)}
        aria-label={video.title}
      >
        <source src={videoSrc(video)} type="video/mp4" />
        Your browser does not support embedded video.{" "}
        <a href={videoSrc(video)} download>
          Download the video
        </a>
        .
      </video>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full bg-emerald/10 px-2.5 py-1 font-semibold uppercase tracking-wider text-emerald">
            {video.id === "itr" ? "Income Tax" : "GST"}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {video.duration}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold leading-snug text-navy-deep">{video.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{video.description}</p>
        {showSteps && (
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            {video.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        <Link
          href={video.startHref}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-emerald"
        >
          {video.startLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function HowToVideos({ showSteps = true, className }: { showSteps?: boolean; className?: string }) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-2", className)}>
      {howToVideos.map((video) => (
        <HowToVideoCard key={video.id} video={video} showSteps={showSteps} />
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { testimonials } from "@/content/marketing";
import { cn } from "@/lib/utils";

export default function TestimonialCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = (next + testimonials.length) % testimonials.length;
    const card = track.children[clamped] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setIndex(clamped);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const cardWidth = (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
      const gap = 24;
      setIndex(Math.round(track.scrollLeft / (cardWidth + gap)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="Client testimonials"
      >
        {testimonials.map((item, i) => (
          <figure
            key={item.name}
            className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${testimonials.length}`}
          >
            <Quote className="h-7 w-7 text-emerald/60" aria-hidden="true" />
            <div className="mt-3 flex items-center gap-0.5" aria-label={`${item.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, star) => (
                <Star
                  key={star}
                  className={cn("h-4 w-4", star < item.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")}
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{item.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                {item.initials}
              </span>
              <span>
                <span className="block text-sm font-semibold text-navy-deep">{item.name}</span>
                <span className="block text-xs text-slate-500">{item.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => scrollTo(index - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {testimonials.map((_, dot) => (
            <span
              key={dot}
              className={cn("h-1.5 rounded-full transition-all", dot === index ? "w-6 bg-navy" : "w-1.5 bg-slate-300")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollTo(index + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";

// The references' ambient light, shared by every page: a huge circle whose
// top-left inner edge glows violet (the arc on the left), and a thin light
// streak coming in from the top right. Pure CSS, behind everything, no events.
export function Ambient({ hero }: { hero?: boolean }) {
  // On the feed the arc frames the hero, as in the homepage reference; on
  // other pages it sits outside the content column, as in the others.
  const path = usePathname();
  const centered = hero ?? (path === "/feed" || path === "/");
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[1300px] overflow-hidden [mask-image:linear-gradient(180deg,#000_70%,transparent)]"
    >
      {/* Top haze, so the nav and hero don't sit on flat black. */}
      <div className="absolute left-1/2 top-[-420px] h-[700px] w-[1300px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(102_49_251/0.16),transparent)]" />

      {/* The arc: the left rim of a tall ellipse. Inset shadows light the rim
          and a soft band just inside it; the mask hides the right half, so
          the rim fades out near the top like the references. */}
      <div
        className={`absolute max-md:left-[-140px] max-md:top-[110px] max-md:h-[1200px] max-md:w-[560px] ${centered ? "left-[calc(50%-698px)] top-[168px] h-[1900px] w-[900px]" : "left-[max(-40px,calc(50%-836px))] top-[-50px] h-[1400px] w-[600px]"} rounded-[50%]`}
        style={{
          boxShadow: centered
            ? "inset 2px 1px 0 -0.5px rgb(225 210 255 / 0.95), inset 9px 5px 14px -6px rgb(170 130 255 / 0.9), inset 40px 22px 70px -30px rgb(120 70 250 / 0.55), inset 120px 60px 160px -90px rgb(90 40 220 / 0.3)"
            : "inset 2px 1px 0 -0.5px rgb(225 210 255 / 0.9), inset 8px 4px 12px -6px rgb(170 130 255 / 0.85), inset 30px 16px 50px -24px rgb(120 70 250 / 0.5), inset 80px 40px 110px -60px rgb(90 40 220 / 0.25)",
          WebkitMaskImage: `linear-gradient(90deg, #000 0%, #000 30%, rgb(0 0 0 / 0.5) 44%, transparent 56%), linear-gradient(180deg, ${centered ? "#000 55%" : "transparent 6%, #000 16%, #000 50%"}, transparent 95%)`,
          WebkitMaskComposite: "source-in",
          maskImage: `linear-gradient(90deg, #000 0%, #000 30%, rgb(0 0 0 / 0.5) 44%, transparent 56%), linear-gradient(180deg, ${centered ? "#000 55%" : "transparent 6%, #000 16%, #000 50%"}, transparent 95%)`,
          maskComposite: "intersect",
        }}
      />

      {/* The streak: a thin line rising to the top-right corner, brightest at
          its far end, with a faint glow around it. */}
      <div
        className="absolute right-0 top-[128px] h-[2px] w-[380px] origin-right -rotate-[31deg] rounded-full max-md:hidden"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgb(170 140 255 / 0.35) 25%, rgb(220 205 255 / 0.95) 80%, #fff 100%)",
          boxShadow: "0 0 8px 0.5px rgb(150 110 255 / 0.7), 0 0 26px 3px rgb(110 60 250 / 0.3)",
        }}
      />
      <div className="absolute right-[-60px] top-[60px] h-[260px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(102_49_251/0.2),transparent)] blur-2xl max-md:hidden" />
    </div>
  );
}

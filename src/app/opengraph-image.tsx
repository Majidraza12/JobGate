import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/site";

// The preview card LinkedIn, Slack, X, and iMessage show for a jobgate.dev
// link. Drawn at build time from this markup; no image file to keep in sync.
export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  { label: "Graduation window", quote: "graduating between Dec 2026 and Jun 2027", status: "Meets", color: "#88F9C0" },
  { label: "Sponsorship", quote: "unable to sponsor now or in the future", status: "Check", color: "#FBBF24" },
  { label: "Citizenship", quote: null as string | null, status: "Not stated", color: "#9C94B8" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px",
          background: "radial-gradient(120% 120% at 0% 0%, #2a1a5e 0%, #110d1f 45%, #07060d 100%)",
          color: "#F4F1FF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 56, height: 56, borderRadius: 14, background: "#6631FB", position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: 14, width: 7, height: 28, borderRadius: 2, background: "#fff" }} />
            <div style={{ position: "absolute", left: 35, top: 14, width: 7, height: 28, borderRadius: 2, background: "#fff" }} />
            <div style={{ position: "absolute", left: 14, top: 24, width: 28, height: 7, borderRadius: 2, background: "#88F9C0" }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>JobGate</div>
          <div style={{ marginLeft: "auto", fontSize: 26, color: "#B9A8FF" }}>jobgate.dev</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          <div>Know if you can apply</div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#B49BFF", fontStyle: "italic" }}>before</span>
            <span style={{ marginLeft: 20 }}>you apply</span>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 27, color: "#C9C2E0" }}>Internships and new-grad jobs, checked against your profile.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 34 }}>
          {ROWS.map((r) => (
            <div
              key={r.label}
              style={{ display: "flex", alignItems: "center", padding: "12px 22px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 23 }}
            >
              <div style={{ width: 250, fontWeight: 600 }}>{r.label}</div>
              <div style={{ flex: 1, color: "#C9C2E0" }}>{r.quote ? `"${r.quote}"` : "Not mentioned in the posting"}</div>
              <div style={{ color: r.color, fontWeight: 600 }}>{r.status}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

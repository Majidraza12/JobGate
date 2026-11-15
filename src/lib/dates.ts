// Dates are rendered on the server (UTC on Vercel) and again in the browser
// (the viewer's zone). Formatting in one fixed zone makes both agree, so React
// never sees a hydration mismatch. US Central, since the MVP is US-only.
export const DISPLAY_TZ = "America/Chicago";

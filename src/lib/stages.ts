// Application stages, shared by the server page and the client rows. Kept out
// of the "use client" file: a server component can't read values exported
// from a client module.
export const STAGES = [
  { value: "applied", label: "Applied" },
  { value: "online_assessment", label: "Online assessment" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
] as const;

export type Stage = (typeof STAGES)[number]["value"];

// Pill colours and icons per stage, in the references' tinted style.
export const STAGE_STYLE: Record<Stage, { pill: string; text: string; icon: "send" | "file" | "calendar" | "check" | "x" }> = {
  applied: { pill: "bg-lav/12 text-lav ring-lav/25", text: "text-lav", icon: "send" },
  online_assessment: { pill: "bg-sky/12 text-sky ring-sky/25", text: "text-sky", icon: "file" },
  interview: { pill: "bg-[#c084fc]/12 text-[#d8b4fe] ring-[#c084fc]/25", text: "text-[#d8b4fe]", icon: "calendar" },
  offer: { pill: "bg-mint/12 text-mint ring-mint/25", text: "text-mint", icon: "check" },
  rejected: { pill: "bg-rose/12 text-rose ring-rose/25", text: "text-rose", icon: "x" },
};

// Anything past "applied" means the company answered.
export const responded = (s: Stage) => s !== "applied";

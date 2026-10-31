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

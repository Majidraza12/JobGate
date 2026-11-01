import type { GateField } from "@core/requirements";
import { highlight } from "@/lib/highlight";

// A verbatim evidence quote with its deciding phrase marked in `mark` colours.
export function Quote({ text, field, mark }: { text: string; field: GateField | null; mark: string }) {
  return (
    <>
      “
      {highlight(text, field).map((s, i) =>
        s.hit && mark ? (
          <mark key={i} className={`rounded-[4px] px-[3px] font-semibold ${mark}`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      ”
    </>
  );
}

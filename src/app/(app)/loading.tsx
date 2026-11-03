// Shown instantly while an app page loads on the server, so a click on a tab
// or menu item always gives feedback. The nav stays (it's in the layout).
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-9 w-48 rounded-[12px] bg-surface" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-[8px] bg-surface" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-40 rounded-[20px] border-2 border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}

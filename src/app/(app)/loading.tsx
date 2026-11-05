// Shown instantly while an app page loads on the server, so a click on a tab
// or menu item always gives feedback. The nav stays (it's in the layout).
const bar = "rounded-full bg-white/[0.06]";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse pt-10">
      <div className="mx-auto flex max-w-[900px] flex-col items-center">
        <div className={`h-10 w-72 ${bar}`} />
        <div className={`mt-6 h-14 w-full max-w-[760px] rounded-[16px] bg-white/[0.06]`} />
        <div className={`mt-4 h-5 w-[420px] max-w-full ${bar}`} />
      </div>
      <div className="mt-14 grid grid-cols-1 gap-[35px] lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_330px]">
        <div className="glass hidden h-[520px] rounded-[18px] lg:block" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass flex h-[150px] gap-6 rounded-[16px] p-5">
              <div className="size-16 flex-none rounded-[14px] bg-white/[0.06]" />
              <div className="flex flex-1 flex-col gap-3 pt-1">
                <div className={`h-4 w-32 ${bar}`} />
                <div className={`h-5 w-2/3 ${bar}`} />
                <div className={`h-4 w-1/2 ${bar}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="glass hidden h-[300px] rounded-[18px] xl:block" />
      </div>
    </div>
  );
}

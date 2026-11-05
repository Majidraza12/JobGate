import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { Ambient } from "@/components/Ambient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [applied, saved] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("saved_listings").select("listing_id", { count: "exact", head: true }),
  ]);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient />
      <TopNav email={user.email ?? ""} appliedCount={applied.count ?? 0} savedCount={saved.count ?? 0} />
      <main className="relative z-10 mx-auto max-w-[1460px] px-4 pb-24 md:px-8">{children}</main>
    </div>
  );
}

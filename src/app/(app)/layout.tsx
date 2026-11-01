import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("applications").select("id", { count: "exact", head: true });

  return (
    <div className="min-h-screen">
      <TopNav email={user.email ?? ""} appliedCount={count ?? 0} />
      <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 md:px-8">{children}</main>
    </div>
  );
}

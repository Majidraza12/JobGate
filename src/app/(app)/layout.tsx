import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("applications").select("id", { count: "exact", head: true });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar email={user.email ?? ""} appliedCount={count ?? 0} />
      <main className="min-w-0 px-4 pb-16 pt-6 md:px-8 md:pt-9">{children}</main>
    </div>
  );
}

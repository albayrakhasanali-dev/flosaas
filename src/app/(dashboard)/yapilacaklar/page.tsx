import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/layout/sidebar";
import YapilacaklarClient from "@/components/yapilacak/yapilacaklar-client";

export default async function YapilacaklarPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-6 pt-[72px] md:pt-6">
        <YapilacaklarClient />
      </main>
    </div>
  );
}

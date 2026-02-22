import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/layout/sidebar";
import KullanicilarClient from "@/components/kullanicilar/kullanicilar-client";

export default async function KullanicilarPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Only admins can access
  const role = (session.user as Record<string, unknown>)?.role as string;
  if (role === "lokasyon_sefi") redirect("/");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <KullanicilarClient />
      </main>
    </div>
  );
}

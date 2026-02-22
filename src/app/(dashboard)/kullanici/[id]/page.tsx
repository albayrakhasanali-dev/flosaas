import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/layout/sidebar";
import KullaniciFormClient from "@/components/kullanicilar/kullanici-form-client";

export default async function KullaniciDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as Record<string, unknown>)?.role as string;
  if (role === "lokasyon_sefi") redirect("/");

  const { id } = await params;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <KullaniciFormClient kullaniciId={id} />
      </main>
    </div>
  );
}

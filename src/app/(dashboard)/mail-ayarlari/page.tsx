import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/layout/sidebar";
import MailAyarlariClient from "@/components/mail/mail-ayarlari-client";

export default async function MailAyarlariPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <MailAyarlariClient />
      </main>
    </div>
  );
}

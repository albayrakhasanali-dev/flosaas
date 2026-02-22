import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Sidebar from "@/components/layout/sidebar";
import MuayeneTakipClient from "@/components/muayene/muayene-takip-client";

export default async function MuayeneTakipPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-6">
        <MuayeneTakipClient />
      </main>
    </div>
  );
}

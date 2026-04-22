"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Truck,
  CheckCircle,
  PauseCircle,
  AlertTriangle,
  Radio,
  CircleDollarSign,
  Ban,
  LogOut,
  User,
  FileWarning,
  ClipboardCheck,
  Shield,
  ListTodo,
  Users,
  Mail,
} from "lucide-react";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: string;
  section?: string;
  requiredRole?: string; // minimum role needed: "admin"
}

const menuItems: MenuItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/filo?filter=all", label: "Tum Filo", icon: Truck, section: "Filo Yonetimi" },
  { href: "/filo?filter=aktif", label: "Aktif Filo", icon: CheckCircle, badge: "🟢" },
  { href: "/filo?filter=pasif", label: "Pasif / Yatan", icon: PauseCircle, badge: "⚫" },
  { href: "/filo?filter=hukuki", label: "Hukuki ve Satis", icon: AlertTriangle, badge: "🔴" },
  { href: "/filo?filter=utts_eksik", label: "UTTS Montaj Bekleyenler", icon: Radio, badge: "⚠️" },
  { href: "/filo?filter=satildi", label: "Satilan Araclar", icon: CircleDollarSign, badge: "🟣" },
  { href: "/filo?filter=trafikten_cekilen", label: "Trafikten Cekilen", icon: Ban, badge: "🟠" },
  { href: "/trafik-cezalari", label: "Trafik Cezalari", icon: FileWarning, section: "Takip Modulleri", badge: "🚨" },
  { href: "/muayene-takip", label: "Muayene Takip", icon: ClipboardCheck, section: "Takip Modulleri", badge: "🔍" },
  { href: "/sigorta-takip", label: "Sigorta Takip", icon: Shield, section: "Takip Modulleri", badge: "🛡️" },
  { href: "/yapilacaklar", label: "Yapilacaklar", icon: ListTodo, section: "Takip Modulleri", badge: "📋" },
  { href: "/mail-ayarlari", label: "Mail Ayarlari", icon: Mail, section: "Takip Modulleri", badge: "✉️", requiredRole: "admin" },
  { href: "/kullanicilar", label: "Kullanici Yonetimi", icon: Users, section: "Yonetim", badge: "👥", requiredRole: "admin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    personel: "Personel",
  };

  const userRole = (session?.user as Record<string, unknown>)?.role as string;

  // Role hierarchy check: admin >= personel
  const roleHierarchy: Record<string, number> = {
    admin: 2,
    personel: 1,
  };

  const hasRequiredRole = (requiredRole?: string) => {
    if (!requiredRole) return true;
    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-[#1a0a2e] via-[#2a1040] to-[#1a1535] text-white flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-[#4a2050]/50">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-[#89CFF0]">Flo</span>SaaS
        </h1>
        <p className="text-xs text-[#a08090] mt-1">Filo Yonetim Kokpiti</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {(() => {
          const visibleItems = menuItems.filter((item) => hasRequiredRole(item.requiredRole));
          return visibleItems.map((item, index) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href.startsWith("/filo")
              ? pathname.startsWith("/filo") &&
                item.href.includes(new URLSearchParams(item.href.split("?")[1]).get("filter") || "")
              : pathname.startsWith(item.href.split("?")[0]);

          // Show section header
          const showSection = item.section && (index === 0 || visibleItems[index - 1]?.section !== item.section);

          return (
            <div key={item.href}>
              {showSection && (
                <p className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-wider text-[#8a6080] font-semibold">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-[#6B1D3A]/30 text-[#89CFF0] border-r-2 border-[#89CFF0]"
                    : "text-[#c0b0c0] hover:bg-[#3a1845]/50 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="text-xs">{item.badge}</span>}
              </Link>
            </div>
          );
        });
        })()}
      </nav>

      {/* User Section */}
      {session?.user && (
        <div className="p-4 border-t border-[#4a2050]/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B1D3A] to-[#2C3E8C] flex items-center justify-center">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-[#a08090]">
                {roleLabels[(session.user as Record<string, unknown>).role as string] || "Kullanici"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 text-sm text-[#a08090] hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={14} />
            Cikis Yap
          </button>
        </div>
      )}
    </aside>
  );
}

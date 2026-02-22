"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  X,
  Users,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";

interface KullaniciItem {
  id: number;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
  createdAt: string;
}

interface KullaniciResponse {
  data: KullaniciItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    toplamKullanici: number;
    aktifKullanici: number;
    pasifKullanici: number;
    superAdminSayisi: number;
    yoneticiSayisi: number;
    sefSayisi: number;
  };
}

interface Sirket {
  id: number;
  sirketAdi: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  sirket_yoneticisi: "Sirket Yoneticisi",
  lokasyon_sefi: "Lokasyon Sefi",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("tr-TR");

export default function KullanicilarClient() {
  const router = useRouter();
  const [data, setData] = useState<KullaniciResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [sirketler, setSirketler] = useState<Sirket[]>([]);

  // Filters
  const [fRole, setFRole] = useState("");
  const [fIsActive, setFIsActive] = useState("");
  const [fSirketId, setFSirketId] = useState("");

  const activeFilterCount = [fRole, fIsActive, fSirketId].filter(Boolean).length;

  // Load lookup data
  useEffect(() => {
    fetch("/api/lookups")
      .then((r) => r.json())
      .then((data) => {
        if (data?.sirketler) setSirketler(data.sirketler);
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");
    if (fRole) params.set("role", fRole);
    if (fIsActive) params.set("isActive", fIsActive);
    if (fSirketId) params.set("sirketId", fSirketId);

    const res = await fetch(`/api/kullanicilar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, page, fRole, fIsActive, fSirketId]);

  useEffect(() => {
    setPage(1);
  }, [search, fRole, fIsActive, fSirketId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFRole("");
    setFIsActive("");
    setFSirketId("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kullanici Yonetimi</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} kullanici kaydi` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/kullanici/new")}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Kullanici Ekle
        </button>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Kullanici</p>
                <p className="text-2xl font-bold mt-1">{data.summary.toplamKullanici}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users size={20} className="text-slate-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-500">Aktif</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{data.summary.aktifKullanici}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <UserCheck size={20} className="text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-500">Pasif</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.pasifKullanici}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <UserX size={20} className="text-red-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-500">Rol Dagilimi</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-purple-600">{data.summary.superAdminSayisi} Admin</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-semibold text-blue-600">{data.summary.yoneticiSayisi} Yonetici</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-semibold text-slate-600">{data.summary.sefSayisi} Sef</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Shield size={20} className="text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya email ile ara..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-violet-50 border-violet-300 text-violet-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter size={16} />
          Filtreler
          {activeFilterCount > 0 && (
            <span className="bg-violet-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
          >
            <X size={14} />
            Temizle
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Rol</label>
              <select
                value={fRole}
                onChange={(e) => setFRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Tumu</option>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
              <select
                value={fIsActive}
                onChange={(e) => setFIsActive(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Tumu</option>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sirket</label>
              <select
                value={fSirketId}
                onChange={(e) => setFSirketId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Tumu</option>
                {sirketler.map((s) => (
                  <option key={s.id} value={s.id}>{s.sirketAdi}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Sirket</th>
                    <th>Lokasyon</th>
                    <th>Durum</th>
                    <th>Kayit Tarihi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((k) => (
                    <tr
                      key={k.id}
                      className={`cursor-pointer ${!k.isActive ? "bg-red-50/50" : ""}`}
                      onClick={() => router.push(`/kullanici/${k.id}`)}
                    >
                      <td className="font-semibold text-sm text-slate-800">
                        {k.name || "-"}
                      </td>
                      <td className="text-sm text-slate-600">{k.email}</td>
                      <td>
                        <span
                          className={`badge text-xs ${
                            k.role === "super_admin"
                              ? "badge-purple"
                              : k.role === "sirket_yoneticisi"
                              ? "badge-info"
                              : "badge-neutral"
                          }`}
                        >
                          {roleLabels[k.role] || k.role}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{k.sirket?.sirketAdi || "-"}</td>
                      <td className="text-xs text-slate-500">{k.lokasyon?.lokasyonAdi || "-"}</td>
                      <td>
                        <span className={`badge text-xs ${k.isActive ? "badge-success" : "badge-danger"}`}>
                          {k.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{formatDate(k.createdAt)}</td>
                      <td>
                        <button className="text-slate-400 hover:text-violet-600">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={32} />
                          <p>Henuz kullanici kaydi yok</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Sayfa {data.pagination.page} / {data.pagination.totalPages} ({data.pagination.total} kayit)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

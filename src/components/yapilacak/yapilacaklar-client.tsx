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
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface YapilacakArac {
  id: number;
  plaka: string;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
}

interface YapilacakUser {
  id: number;
  name: string | null;
  email: string;
}

interface Yapilacak {
  id: number;
  baslik: string;
  aciklama: string | null;
  durum: string;
  oncelik: string;
  sonTarih: string | null;
  tamamlanmaTarihi: string | null;
  kategori: string | null;
  createdAt: string;
  arac: YapilacakArac | null;
  atanan: YapilacakUser | null;
  ekleyen: { id: number; name: string | null } | null;
}

interface YapilacakResponse {
  data: Yapilacak[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    toplamGorev: number;
    acikGorev: number;
    devamEdenGorev: number;
    tamamlananGorev: number;
    gecikmisSayisi: number;
  };
}

const durumLabels: Record<string, string> = {
  acik: "Acik",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandi",
  iptal: "Iptal",
};

const oncelikLabels: Record<string, string> = {
  dusuk: "Dusuk",
  normal: "Normal",
  yuksek: "Yuksek",
  kritik: "Kritik",
};

const kategoriLabels: Record<string, string> = {
  bakim: "Bakim",
  transfer: "Transfer",
  idari: "Idari",
  diger: "Diger",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("tr-TR");

const computeKalanGun = (tarih: string) =>
  Math.ceil((new Date(tarih).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

export default function YapilacaklarClient() {
  const router = useRouter();
  const [data, setData] = useState<YapilacakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fDurum, setFDurum] = useState("");
  const [fOncelik, setFOncelik] = useState("");
  const [fKategori, setFKategori] = useState("");

  const activeFilterCount = [fDurum, fOncelik, fKategori].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");
    if (fDurum) params.set("durum", fDurum);
    if (fOncelik) params.set("oncelik", fOncelik);
    if (fKategori) params.set("kategori", fKategori);

    const res = await fetch(`/api/yapilacaklar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, page, fDurum, fOncelik, fKategori]);

  useEffect(() => {
    setPage(1);
  }, [search, fDurum, fOncelik, fKategori]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFDurum("");
    setFOncelik("");
    setFKategori("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Yapilacaklar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} gorev kaydi` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/yapilacak/new")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Gorev Ekle
        </button>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Gorev</p>
                <p className="text-2xl font-bold mt-1">{data.summary.toplamGorev}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <ListTodo size={20} className="text-slate-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-500">Acik Gorevler</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{data.summary.acikGorev}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock size={20} className="text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-500">Devam Eden</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.devamEdenGorev}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Loader2 size={20} className="text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-500">Gecikmis</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.gecikmisSayisi}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
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
            placeholder="Gorev, plaka, kullanici ara..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter size={16} />
          Filtreler
          {activeFilterCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
              <select
                value={fDurum}
                onChange={(e) => setFDurum(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(durumLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Oncelik</label>
              <select
                value={fOncelik}
                onChange={(e) => setFOncelik(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(oncelikLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
              <select
                value={fKategori}
                onChange={(e) => setFKategori(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(kategoriLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Baslik</th>
                    <th>Plaka</th>
                    <th>Atanan</th>
                    <th>Oncelik</th>
                    <th>Durum</th>
                    <th>Kategori</th>
                    <th>Son Tarih</th>
                    <th>Kalan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((y) => {
                    const kalanGun = y.sonTarih ? computeKalanGun(y.sonTarih) : null;
                    const isGecikmis =
                      kalanGun !== null &&
                      kalanGun < 0 &&
                      y.durum !== "tamamlandi" &&
                      y.durum !== "iptal";
                    const isYaklasiyor =
                      kalanGun !== null &&
                      kalanGun >= 0 &&
                      kalanGun <= 3 &&
                      y.durum !== "tamamlandi" &&
                      y.durum !== "iptal";
                    const isTamamlandi = y.durum === "tamamlandi";

                    return (
                      <tr
                        key={y.id}
                        className={`cursor-pointer ${
                          isTamamlandi
                            ? "bg-green-50"
                            : isGecikmis
                            ? "bg-red-50"
                            : isYaklasiyor
                            ? "bg-amber-50"
                            : ""
                        }`}
                        onClick={() => router.push(`/yapilacak/${y.id}`)}
                      >
                        <td>
                          <div className="max-w-[250px]">
                            <p className={`font-semibold text-sm ${isTamamlandi ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {y.baslik}
                            </p>
                            {y.aciklama && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{y.aciklama}</p>
                            )}
                          </div>
                        </td>
                        <td className="font-bold text-blue-600 text-sm">
                          {y.arac?.plaka || "-"}
                        </td>
                        <td className="text-xs">
                          {y.atanan?.name || y.atanan?.email || "-"}
                        </td>
                        <td>
                          <span
                            className={`badge text-xs ${
                              y.oncelik === "kritik"
                                ? "badge-danger"
                                : y.oncelik === "yuksek"
                                ? "badge-warning"
                                : y.oncelik === "normal"
                                ? "badge-info"
                                : "badge-neutral"
                            }`}
                          >
                            {oncelikLabels[y.oncelik] || y.oncelik}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge text-xs ${
                              y.durum === "tamamlandi"
                                ? "badge-success"
                                : y.durum === "devam_ediyor"
                                ? "badge-warning"
                                : y.durum === "acik"
                                ? "badge-info"
                                : "badge-neutral"
                            }`}
                          >
                            {durumLabels[y.durum] || y.durum}
                          </span>
                        </td>
                        <td className="text-xs">
                          {y.kategori ? (kategoriLabels[y.kategori] || y.kategori) : "-"}
                        </td>
                        <td className="text-xs">
                          {y.sonTarih ? formatDate(y.sonTarih) : "-"}
                        </td>
                        <td>
                          {kalanGun !== null && y.durum !== "tamamlandi" && y.durum !== "iptal" ? (
                            <span
                              className={`text-xs font-semibold ${
                                kalanGun < 0
                                  ? "text-red-600"
                                  : kalanGun <= 3
                                  ? "text-amber-600"
                                  : "text-green-600"
                              }`}
                            >
                              {kalanGun < 0
                                ? `${Math.abs(kalanGun)}g gecmis`
                                : `${kalanGun}g`}
                            </span>
                          ) : y.durum === "tamamlandi" ? (
                            <CheckCircle2 size={16} className="text-green-500" />
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td>
                          <button className="text-slate-400 hover:text-indigo-600">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <ListTodo size={32} />
                          <p>Henuz gorev kaydi yok</p>
                          <button
                            onClick={() => router.push("/yapilacak/new")}
                            className="text-indigo-600 hover:underline text-sm"
                          >
                            Yeni gorev ekle
                          </button>
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

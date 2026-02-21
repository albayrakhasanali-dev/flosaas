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
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Ban,
} from "lucide-react";

interface CezaArac {
  id: number;
  plaka: string;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
}

interface Ceza {
  id: number;
  tutanakNo: string | null;
  cezaTarihi: string;
  tebligTarihi: string | null;
  sonOdemeTarihi: string | null;
  cezaTuru: string;
  aciklama: string | null;
  cezaTutari: number;
  indirimlitutar: number | null;
  odemeDurumu: string;
  odemeTarihi: string | null;
  sorumluKisi: string | null;
  plaka: string | null;
  ihlalYeri: string | null;
  kaynakKurum: string | null;
  itirazDurumu: string | null;
  arac: CezaArac;
}

interface CezaResponse {
  data: Ceza[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    toplamCeza: number;
    toplamTutar: number;
    odenmemisCeza: number;
    odenmemisTutar: number;
    itirazEdilen: number;
  };
}

const cezaTuruLabels: Record<string, string> = {
  hiz: "Hiz Ihlali",
  park: "Park Ihlali",
  kirmizi_isik: "Kirmizi Isik",
  emniyet_kemeri: "Emniyet Kemeri",
  cep_telefonu: "Cep Telefonu",
  gecis_ihlali: "Gecis Ihlali",
  tonaj: "Tonaj Asimi",
  diger: "Diger",
};

const odemeDurumuLabels: Record<string, string> = {
  odenmedi: "Odenmedi",
  odendi: "Odendi",
  itiraz_edildi: "Itiraz Edildi",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("tr-TR");

export default function TrafikCezalariClient() {
  const router = useRouter();
  const [data, setData] = useState<CezaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fOdemeDurumu, setFOdemeDurumu] = useState("");
  const [fCezaTuru, setFCezaTuru] = useState("");

  const activeFilterCount = [fOdemeDurumu, fCezaTuru].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");
    if (fOdemeDurumu) params.set("odemeDurumu", fOdemeDurumu);
    if (fCezaTuru) params.set("cezaTuru", fCezaTuru);

    const res = await fetch(`/api/cezalar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, page, fOdemeDurumu, fCezaTuru]);

  useEffect(() => {
    setPage(1);
  }, [search, fOdemeDurumu, fCezaTuru]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFOdemeDurumu("");
    setFCezaTuru("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trafik Cezalari Takip</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} ceza kaydi` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/ceza/new")}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Ceza Ekle
        </button>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Ceza</p>
                <p className="text-2xl font-bold mt-1">{data.summary.toplamCeza}</p>
                <p className="text-xs text-slate-400 mt-1">{formatCurrency(data.summary.toplamTutar)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-slate-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-500">Odenmemis</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.odenmemisCeza}</p>
                <p className="text-xs text-red-400 mt-1">{formatCurrency(data.summary.odenmemisTutar)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-500">Odenmis</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {data.summary.toplamCeza - data.summary.odenmemisCeza - data.summary.itirazEdilen}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-500">Itiraz Edilen</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.itirazEdilen}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Ban size={20} className="text-amber-500" />
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
            placeholder="Plaka, tutanak no, sorumlu ara..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter size={16} />
          Filtreler
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Odeme Durumu</label>
              <select
                value={fOdemeDurumu}
                onChange={(e) => setFOdemeDurumu(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                <option value="odenmedi">Odenmedi</option>
                <option value="odendi">Odendi</option>
                <option value="itiraz_edildi">Itiraz Edildi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ceza Turu</label>
              <select
                value={fCezaTuru}
                onChange={(e) => setFCezaTuru(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(cezaTuruLabels).map(([key, label]) => (
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Plaka</th>
                    <th>Tutanak No</th>
                    <th>Ceza Tarihi</th>
                    <th>Ceza Turu</th>
                    <th>Tutar</th>
                    <th>Odeme Durumu</th>
                    <th>Sorumlu</th>
                    <th>Ihlal Yeri</th>
                    <th>Kurum</th>
                    <th>Son Odeme</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/ceza/${c.id}`)}
                    >
                      <td className="font-bold text-blue-600">{c.plaka || c.arac.plaka}</td>
                      <td className="text-xs font-mono">{c.tutanakNo || "-"}</td>
                      <td className="text-xs">{formatDate(c.cezaTarihi)}</td>
                      <td>
                        <span className="badge badge-neutral text-xs">
                          {cezaTuruLabels[c.cezaTuru] || c.cezaTuru}
                        </span>
                      </td>
                      <td className="font-semibold text-sm">{formatCurrency(c.cezaTutari)}</td>
                      <td>
                        <span
                          className={`badge ${
                            c.odemeDurumu === "odendi"
                              ? "badge-success"
                              : c.odemeDurumu === "itiraz_edildi"
                              ? "badge-warning"
                              : "badge-danger"
                          }`}
                        >
                          {odemeDurumuLabels[c.odemeDurumu] || c.odemeDurumu}
                        </span>
                      </td>
                      <td className="text-xs">{c.sorumluKisi || "-"}</td>
                      <td className="text-xs">{c.ihlalYeri || "-"}</td>
                      <td className="text-xs">{c.kaynakKurum || "-"}</td>
                      <td className="text-xs">
                        {c.sonOdemeTarihi ? (
                          <span
                            className={
                              new Date(c.sonOdemeTarihi) < new Date()
                                ? "text-red-600 font-semibold"
                                : "text-slate-600"
                            }
                          >
                            {formatDate(c.sonOdemeTarihi)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button className="text-slate-400 hover:text-blue-600">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Clock size={32} />
                          <p>Henuz ceza kaydi yok</p>
                          <button
                            onClick={() => router.push("/ceza/new")}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Yeni ceza ekle
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

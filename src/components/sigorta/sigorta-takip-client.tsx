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
  AlertTriangle,
} from "lucide-react";

interface SigortaArac {
  id: number;
  plaka: string;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
}

interface Sigorta {
  id: number;
  sigortaTuru: string;
  policeNo: string | null;
  sigortaSirketi: string | null;
  acenteAdi: string | null;
  baslangicTarihi: string;
  bitisTarihi: string;
  primTutari: number | null;
  odemeDurumu: string;
  odemeSekli: string | null;
  arac: SigortaArac;
}

interface SigortaResponse {
  data: Sigorta[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    toplamPolice: number;
    suresiGecmis: number;
    yaklasiyor: number;
    toplamPrim: number;
    odenmemisPrim: number;
  };
}

const sigortaTuruLabels: Record<string, string> = {
  trafik: "Zorunlu Trafik",
  kasko: "Kasko",
  imm: "IMM",
};

const odemeDurumuLabels: Record<string, string> = {
  odenmedi: "Odenmedi",
  odendi: "Odendi",
  kismen_odendi: "Kismen Odendi",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("tr-TR");

const computeKalanGun = (bitisTarihi: string) => {
  const diff = Math.ceil(
    (new Date(bitisTarihi).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
};

export default function SigortaTakipClient() {
  const router = useRouter();
  const [data, setData] = useState<SigortaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fSigortaTuru, setFSigortaTuru] = useState("");
  const [fOdemeDurumu, setFOdemeDurumu] = useState("");
  const [fDurum, setFDurum] = useState("");

  const activeFilterCount = [fSigortaTuru, fOdemeDurumu, fDurum].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");
    if (fSigortaTuru) params.set("sigortaTuru", fSigortaTuru);
    if (fOdemeDurumu) params.set("odemeDurumu", fOdemeDurumu);
    if (fDurum) params.set("durum", fDurum);

    const res = await fetch(`/api/sigortalar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, page, fSigortaTuru, fOdemeDurumu, fDurum]);

  useEffect(() => {
    setPage(1);
  }, [search, fSigortaTuru, fOdemeDurumu, fDurum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFSigortaTuru("");
    setFOdemeDurumu("");
    setFDurum("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sigorta Takip</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} police kaydi` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/sigorta/new")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Police Ekle
        </button>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Police</p>
                <p className="text-2xl font-bold mt-1">{data.summary.toplamPolice}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-slate-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-500">Suresi Gecmis</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.suresiGecmis}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-500">Yaklasiyor (30 Gun)</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.yaklasiyor}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-500">Toplam Prim</p>
                <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(data.summary.toplamPrim)}</p>
                {data.summary.odenmemisPrim > 0 && (
                  <p className="text-xs text-red-500 mt-0.5">Odenmemis: {formatCurrency(data.summary.odenmemisPrim)}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-500" />
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
            placeholder="Plaka, police no, sigorta sirketi ara..."
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Sigorta Turu</label>
              <select
                value={fSigortaTuru}
                onChange={(e) => setFSigortaTuru(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(sigortaTuruLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Odeme Durumu</label>
              <select
                value={fOdemeDurumu}
                onChange={(e) => setFOdemeDurumu(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(odemeDurumuLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gecerlilik Durumu</label>
              <select
                value={fDurum}
                onChange={(e) => setFDurum(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                <option value="gecerli">Gecerli</option>
                <option value="yaklasiyor">Yaklasiyor (30 Gun)</option>
                <option value="suresi_gecmis">Suresi Gecmis</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Plaka</th>
                    <th>Sigorta Turu</th>
                    <th>Police No</th>
                    <th>Sigorta Sirketi</th>
                    <th>Baslangic</th>
                    <th>Bitis</th>
                    <th>Kalan Gun</th>
                    <th>Prim</th>
                    <th>Odeme Durumu</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((s) => {
                    const kalanGun = computeKalanGun(s.bitisTarihi);
                    const isExpired = kalanGun < 0;
                    const isNearExpiry = kalanGun >= 0 && kalanGun <= 30;

                    return (
                      <tr
                        key={s.id}
                        className={`cursor-pointer ${
                          isExpired ? "bg-red-50" : isNearExpiry ? "bg-amber-50" : ""
                        }`}
                        onClick={() => router.push(`/sigorta/${s.id}`)}
                      >
                        <td className="font-bold text-blue-600">{s.arac.plaka}</td>
                        <td>
                          <span
                            className={`badge text-xs ${
                              s.sigortaTuru === "trafik"
                                ? "badge-info"
                                : s.sigortaTuru === "kasko"
                                ? "badge-purple"
                                : "badge-neutral"
                            }`}
                          >
                            {sigortaTuruLabels[s.sigortaTuru] || s.sigortaTuru}
                          </span>
                        </td>
                        <td className="text-xs font-mono">{s.policeNo || "-"}</td>
                        <td className="text-xs">{s.sigortaSirketi || "-"}</td>
                        <td className="text-xs">{formatDate(s.baslangicTarihi)}</td>
                        <td className="text-xs">{formatDate(s.bitisTarihi)}</td>
                        <td>
                          <span
                            className={`text-xs font-semibold ${
                              kalanGun < 0
                                ? "text-red-600"
                                : kalanGun <= 30
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}
                          >
                            {kalanGun < 0 ? `${Math.abs(kalanGun)} gun gecmis` : `${kalanGun} gun`}
                          </span>
                        </td>
                        <td className="text-sm font-semibold">
                          {s.primTutari ? formatCurrency(s.primTutari) : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              s.odemeDurumu === "odendi"
                                ? "badge-success"
                                : s.odemeDurumu === "kismen_odendi"
                                ? "badge-warning"
                                : "badge-danger"
                            }`}
                          >
                            {odemeDurumuLabels[s.odemeDurumu] || s.odemeDurumu}
                          </span>
                        </td>
                        <td>
                          <button className="text-slate-400 hover:text-blue-600">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Clock size={32} />
                          <p>Henuz sigorta kaydi yok</p>
                          <button
                            onClick={() => router.push("/sigorta/new")}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Yeni police ekle
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

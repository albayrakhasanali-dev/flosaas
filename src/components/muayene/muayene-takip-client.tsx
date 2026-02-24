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
  Download,
} from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

interface MuayeneArac {
  id: number;
  plaka: string;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
}

interface Muayene {
  id: number;
  muayeneTarihi: string;
  gecerlilikBitisTarihi: string;
  sonuc: string;
  muayeneIstasyonu: string | null;
  muayeneIstasyonuIl: string | null;
  raporNo: string | null;
  muayeneTipi: string;
  muayeneUcreti: number | null;
  basarisizNeden: string | null;
  arac: MuayeneArac;
}

interface MuayeneResponse {
  data: Muayene[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    toplamMuayene: number;
    gecenMuayene: number;
    kalanMuayene: number;
    suresiGecmis: number;
    yaklasiyor: number;
    gecmeOrani: number;
  };
}

const sonucLabels: Record<string, string> = {
  gecti: "Gecti",
  kaldi: "Kaldi",
};

const muayeneTipiLabels: Record<string, string> = {
  periyodik: "Periyodik",
  ek_muayene: "Ek Muayene",
  ozel: "Ozel",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("tr-TR");

const computeKalanGun = (bitisTarihi: string) => {
  const diff = Math.ceil(
    (new Date(bitisTarihi).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
};

export default function MuayeneTakipClient() {
  const router = useRouter();
  const [data, setData] = useState<MuayeneResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [fSonuc, setFSonuc] = useState("");
  const [fMuayeneTipi, setFMuayeneTipi] = useState("");
  const [fDurum, setFDurum] = useState("");

  const activeFilterCount = [fSonuc, fMuayeneTipi, fDurum].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");
    if (fSonuc) params.set("sonuc", fSonuc);
    if (fMuayeneTipi) params.set("muayeneTipi", fMuayeneTipi);
    if (fDurum) params.set("durum", fDurum);

    const res = await fetch(`/api/muayeneler?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, page, fSonuc, fMuayeneTipi, fDurum]);

  useEffect(() => {
    setPage(1);
  }, [search, fSonuc, fMuayeneTipi, fDurum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [exporting, setExporting] = useState(false);

  const clearFilters = () => {
    setFSonuc("");
    setFMuayeneTipi("");
    setFDurum("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "5000");
      if (fSonuc) params.set("sonuc", fSonuc);
      if (fMuayeneTipi) params.set("muayeneTipi", fMuayeneTipi);
      if (fDurum) params.set("durum", fDurum);

      const res = await fetch(`/api/muayeneler?${params}`);
      const json = await res.json();

      const rows = (json.data || []).map((m: Muayene) => {
        const kalanGun = computeKalanGun(m.gecerlilikBitisTarihi);
        return {
          plaka: m.arac.plaka,
          sirket: m.arac.sirket?.sirketAdi || "",
          lokasyon: m.arac.lokasyon?.lokasyonAdi || "",
          muayeneTarihi: formatDate(m.muayeneTarihi),
          gecerlilikBitis: formatDate(m.gecerlilikBitisTarihi),
          kalanGun: kalanGun < 0 ? `${Math.abs(kalanGun)} gun gecmis` : `${kalanGun} gun`,
          sonuc: sonucLabels[m.sonuc] || m.sonuc,
          tipi: muayeneTipiLabels[m.muayeneTipi] || m.muayeneTipi,
          istasyon: m.muayeneIstasyonu || "",
          il: m.muayeneIstasyonuIl || "",
          raporNo: m.raporNo || "",
          ucret: m.muayeneUcreti || "",
        };
      });

      exportToExcel(rows, [
        { header: "Plaka", key: "plaka", width: 14 },
        { header: "Sirket", key: "sirket", width: 25 },
        { header: "Lokasyon", key: "lokasyon", width: 25 },
        { header: "Muayene Tarihi", key: "muayeneTarihi", width: 14 },
        { header: "Gecerlilik Bitis", key: "gecerlilikBitis", width: 14 },
        { header: "Kalan Gun", key: "kalanGun", width: 16 },
        { header: "Sonuc", key: "sonuc", width: 10 },
        { header: "Tipi", key: "tipi", width: 14 },
        { header: "Istasyon", key: "istasyon", width: 25 },
        { header: "Il", key: "il", width: 12 },
        { header: "Rapor No", key: "raporNo", width: 14 },
        { header: "Ucret (TL)", key: "ucret", width: 12 },
      ], `Muayene_Takip_${new Date().toISOString().split("T")[0]}`);
    } catch {
      alert("Excel export sirasinda hata olustu");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Muayene Takip</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} muayene kaydi` : "Yukleniyor..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || !data?.data.length}
            className="flex items-center gap-2 px-4 py-2.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "Hazirlaniyor..." : "Excel Indir"}
          </button>
          <button
            onClick={() => router.push("/muayene/new")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Yeni Muayene Ekle
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Muayene</p>
                <p className="text-2xl font-bold mt-1">{data.summary.toplamMuayene}</p>
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
                <p className="text-xs text-green-500">Gecme Orani</p>
                <p className="text-2xl font-bold text-green-600 mt-1">%{data.summary.gecmeOrani}</p>
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
            placeholder="Plaka, istasyon, rapor no ara..."
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Sonuc</label>
              <select
                value={fSonuc}
                onChange={(e) => setFSonuc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                <option value="gecti">Gecti</option>
                <option value="kaldi">Kaldi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Muayene Tipi</label>
              <select
                value={fMuayeneTipi}
                onChange={(e) => setFMuayeneTipi(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tumu</option>
                {Object.entries(muayeneTipiLabels).map(([key, label]) => (
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Plaka</th>
                    <th>Muayene Tarihi</th>
                    <th>Gecerlilik Bitis</th>
                    <th>Kalan Gun</th>
                    <th>Sonuc</th>
                    <th>Istasyon</th>
                    <th>Rapor No</th>
                    <th>Tipi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((m) => {
                    const kalanGun = computeKalanGun(m.gecerlilikBitisTarihi);
                    const isExpired = kalanGun < 0;
                    const isNearExpiry = kalanGun >= 0 && kalanGun <= 30;

                    return (
                      <tr
                        key={m.id}
                        className={`cursor-pointer ${
                          isExpired && m.sonuc === "gecti"
                            ? "bg-red-50"
                            : isNearExpiry && m.sonuc === "gecti"
                            ? "bg-amber-50"
                            : ""
                        }`}
                        onClick={() => router.push(`/muayene/${m.id}`)}
                      >
                        <td className="font-bold text-blue-600">{m.arac.plaka}</td>
                        <td className="text-xs">{formatDate(m.muayeneTarihi)}</td>
                        <td className="text-xs">{formatDate(m.gecerlilikBitisTarihi)}</td>
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
                        <td>
                          <span
                            className={`badge ${
                              m.sonuc === "gecti" ? "badge-success" : "badge-danger"
                            }`}
                          >
                            {sonucLabels[m.sonuc] || m.sonuc}
                          </span>
                        </td>
                        <td className="text-xs">{m.muayeneIstasyonu || "-"}</td>
                        <td className="text-xs font-mono">{m.raporNo || "-"}</td>
                        <td>
                          <span className="badge badge-neutral text-xs">
                            {muayeneTipiLabels[m.muayeneTipi] || m.muayeneTipi}
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
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Clock size={32} />
                          <p>Henuz muayene kaydi yok</p>
                          <button
                            onClick={() => router.push("/muayene/new")}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Yeni muayene ekle
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

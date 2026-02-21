"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, ChevronLeft, ChevronRight, Eye, Filter, X } from "lucide-react";

interface Arac {
  id: number;
  plaka: string;
  durum: { durumAdi: string } | null;
  sirket: { sirketAdi: string } | null;
  lokasyon: { lokasyonAdi: string } | null;
  mulkiyetTipi: string | null;
  markaModelTicariAdi: string | null;
  kullanimSekli: string | null;
  uttsDurum: string | null;
  muayeneAlarm: string;
  sigortaAlarm: string;
  muayeneKalanGun: number | null;
  sigortaKalanGun: number | null;
}

interface PaginatedResponse {
  data: Arac[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Lookups {
  sirketler: { id: number; sirketAdi: string }[];
  lokasyonlar: { id: number; lokasyonAdi: string }[];
  durumlar: { id: number; durumAdi: string }[];
  kullanimSekilleri: string[];
}

const filterLabels: Record<string, string> = {
  all: "Tum Filo",
  aktif: "🟢 Aktif Filo",
  pasif: "⚫ Pasif / Yatan Araclar",
  hukuki: "🔴 Hukuki ve Satis",
  utts_eksik: "⚠️ UTTS Montaj Bekleyenler",
};

export default function FiloClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get("filter") || "all";

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filter states
  const [fLokasyon, setFLokasyon] = useState("");
  const [fSirket, setFSirket] = useState("");
  const [fDurum, setFDurum] = useState("");
  const [fKullanim, setFKullanim] = useState("");
  const [fMulkiyet, setFMulkiyet] = useState("");
  const [fUtts, setFUtts] = useState("");

  // Count active filters
  const activeFilterCount = [fLokasyon, fSirket, fDurum, fKullanim, fMulkiyet, fUtts].filter(Boolean).length;

  // Load lookups
  useEffect(() => {
    fetch("/api/lookups")
      .then((r) => r.json())
      .then((data) => setLookups(data))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", "25");

    // Advanced filters
    if (fLokasyon) params.set("lokasyonId", fLokasyon);
    if (fSirket) params.set("sirketId", fSirket);
    if (fDurum) params.set("durumId", fDurum);
    if (fKullanim) params.set("kullanimSekli", fKullanim);
    if (fMulkiyet) params.set("mulkiyetTipi", fMulkiyet);
    if (fUtts) params.set("uttsDurum", fUtts);

    const res = await fetch(`/api/araclar?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [filter, search, page, fLokasyon, fSirket, fDurum, fKullanim, fMulkiyet, fUtts]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, fLokasyon, fSirket, fDurum, fKullanim, fMulkiyet, fUtts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setFLokasyon("");
    setFSirket("");
    setFDurum("");
    setFKullanim("");
    setFMulkiyet("");
    setFUtts("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {filterLabels[filter] || "Filo"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data ? `${data.pagination.total} arac listeleniyor` : "Yukleniyor..."}
          </p>
        </div>
        <button
          onClick={() => router.push("/arac/new")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Yeni Arac
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Plaka, marka veya model ara..."
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

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Lokasyon */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Lokasyon</label>
              <select
                value={fLokasyon}
                onChange={(e) => setFLokasyon(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                {lookups?.lokasyonlar.map((l) => (
                  <option key={l.id} value={l.id}>{l.lokasyonAdi}</option>
                ))}
              </select>
            </div>

            {/* Sirket */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sirket</label>
              <select
                value={fSirket}
                onChange={(e) => setFSirket(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                {lookups?.sirketler.map((s) => (
                  <option key={s.id} value={s.id}>{s.sirketAdi}</option>
                ))}
              </select>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
              <select
                value={fDurum}
                onChange={(e) => setFDurum(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                {lookups?.durumlar.map((d) => (
                  <option key={d.id} value={d.id}>{d.durumAdi}</option>
                ))}
              </select>
            </div>

            {/* Kullanim Sekli */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kullanim Sekli</label>
              <select
                value={fKullanim}
                onChange={(e) => setFKullanim(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                {lookups?.kullanimSekilleri.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Mulkiyet Tipi */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mulkiyet Tipi</label>
              <select
                value={fMulkiyet}
                onChange={(e) => setFMulkiyet(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                <option value="Özmal">Ozmal</option>
                <option value="Kiralık">Kiralik</option>
              </select>
            </div>

            {/* UTTS Durum */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">UTTS Durum</label>
              <select
                value={fUtts}
                onChange={(e) => setFUtts(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tumu</option>
                <option value="Takılı">Takili</option>
                <option value="Eksik">Eksik</option>
                <option value="Bilinmiyor">Bilinmiyor</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {fLokasyon && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Lokasyon: {lookups?.lokasyonlar.find((l) => String(l.id) === fLokasyon)?.lokasyonAdi}
              <button onClick={() => setFLokasyon("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
          {fSirket && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Sirket: {lookups?.sirketler.find((s) => String(s.id) === fSirket)?.sirketAdi}
              <button onClick={() => setFSirket("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
          {fDurum && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Durum: {lookups?.durumlar.find((d) => String(d.id) === fDurum)?.durumAdi}
              <button onClick={() => setFDurum("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
          {fKullanim && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Kullanim: {fKullanim}
              <button onClick={() => setFKullanim("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
          {fMulkiyet && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Mulkiyet: {fMulkiyet}
              <button onClick={() => setFMulkiyet("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
          {fUtts && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              UTTS: {fUtts}
              <button onClick={() => setFUtts("")} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          )}
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
                    <th>Durum</th>
                    <th>Sirket</th>
                    <th>Lokasyon</th>
                    <th>Mulkiyet</th>
                    <th>Marka/Model</th>
                    <th>Kullanim</th>
                    <th>UTTS</th>
                    <th>Muayene</th>
                    <th>Sigorta</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((a) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => router.push(`/arac/${a.id}`)}>
                      <td className="font-bold text-blue-600">{a.plaka}</td>
                      <td>
                        <span className={`badge ${
                          a.durum?.durumAdi.includes("AKTİF") ? "badge-success" :
                          a.durum?.durumAdi.includes("HUKUKİ") ? "badge-danger" :
                          a.durum?.durumAdi.includes("BAKIMDA") ? "badge-warning" :
                          "badge-neutral"
                        }`}>
                          {a.durum?.durumAdi || "-"}
                        </span>
                      </td>
                      <td className="text-xs">{a.sirket?.sirketAdi || "-"}</td>
                      <td className="text-xs">{a.lokasyon?.lokasyonAdi || "-"}</td>
                      <td>
                        <span className={`badge ${a.mulkiyetTipi === "Kiralık" ? "badge-warning" : "badge-neutral"}`}>
                          {a.mulkiyetTipi || "-"}
                        </span>
                      </td>
                      <td className="text-xs">{a.markaModelTicariAdi || "-"}</td>
                      <td className="text-xs">{a.kullanimSekli || "-"}</td>
                      <td>
                        <span className={`badge ${
                          a.uttsDurum === "Takılı" ? "badge-success" :
                          a.uttsDurum === "Eksik" ? "badge-danger" : "badge-neutral"
                        }`}>
                          {a.uttsDurum || "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          a.muayeneAlarm.includes("GEÇTİ") ? "badge-danger" :
                          a.muayeneAlarm.includes("YAKLAŞIYOR") ? "badge-warning" :
                          a.muayeneAlarm.includes("GEÇERLİ") ? "badge-success" : "badge-neutral"
                        }`}>
                          {a.muayeneKalanGun !== null ? `${a.muayeneKalanGun}g` : "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          a.sigortaAlarm.includes("GEÇTİ") ? "badge-danger" :
                          a.sigortaAlarm.includes("YAKLAŞIYOR") ? "badge-warning" :
                          a.sigortaAlarm.includes("GEÇERLİ") ? "badge-success" : "badge-neutral"
                        }`}>
                          {a.sigortaKalanGun !== null ? `${a.sigortaKalanGun}g` : "-"}
                        </span>
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
                        Sonuc bulunamadi
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

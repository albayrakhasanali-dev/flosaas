"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Upload, X } from "lucide-react";

interface AracOption {
  id: number;
  plaka: string;
  k1YetkiBelgesi?: string | null;
  ruhsatSeriNo?: string | null;
}

interface MuayeneData {
  aracId: string;
  muayeneTarihi: string;
  gecerlilikBitisTarihi: string;
  sonuc: string;
  muayeneIstasyonu: string;
  muayeneIstasyonuIl: string;
  raporNo: string;
  muayeneTipi: string;
  muayeneUcreti: string;
  basarisizNeden: string;
  basarisizDetay: string;
  notlar: string;
  plaka: string;
  ruhsatSeriNo: string;
  k1YetkiBelgesi: string;
}

const emptyMuayene: MuayeneData = {
  aracId: "",
  muayeneTarihi: "",
  gecerlilikBitisTarihi: "",
  sonuc: "gecti",
  muayeneIstasyonu: "",
  muayeneIstasyonuIl: "",
  raporNo: "",
  muayeneTipi: "periyodik",
  muayeneUcreti: "",
  basarisizNeden: "",
  basarisizDetay: "",
  notlar: "",
  plaka: "",
  ruhsatSeriNo: "",
  k1YetkiBelgesi: "",
};

const muayeneTipleri = [
  { value: "periyodik", label: "Periyodik Muayene" },
  { value: "ek_muayene", label: "Ek Muayene" },
  { value: "ozel", label: "Ozel Muayene" },
];

const basarisizNedenler = [
  { value: "fren_sistemi", label: "Fren Sistemi" },
  { value: "egzoz_emisyon", label: "Egzoz / Emisyon" },
  { value: "aydinlatma", label: "Aydinlatma Sistemi" },
  { value: "lastik", label: "Lastik / Jant" },
  { value: "sasi_kaporta", label: "Sasi / Kaporta" },
  { value: "direksiyon", label: "Direksiyon / Suspansiyon" },
  { value: "cam_ayna", label: "Cam / Ayna" },
  { value: "diger", label: "Diger" },
];

const formatDateForInput = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
};

export default function MuayeneFormClient({ muayeneId }: { muayeneId?: string }) {
  const router = useRouter();
  const isNew = !muayeneId || muayeneId === "new";
  const [form, setForm] = useState<MuayeneData>(emptyMuayene);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [araclar, setAraclar] = useState<AracOption[]>([]);
  const [aracSearch, setAracSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"bilgiler" | "sonuc">("bilgiler");
  const [raporFile, setRaporFile] = useState<File | null>(null);
  const [showAracDropdown, setShowAracDropdown] = useState(false);
  const aracDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aracDropdownRef.current && !aracDropdownRef.current.contains(e.target as Node)) {
        setShowAracDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load arac list
  useEffect(() => {
    fetch("/api/araclar?limit=500")
      .then((r) => r.json())
      .then((data) => {
        setAraclar(
          data.data.map((a: { id: number; plaka: string; k1YetkiBelgesi?: string | null; ruhsatSeriNo?: string | null }) => ({
            id: a.id,
            plaka: a.plaka,
            k1YetkiBelgesi: a.k1YetkiBelgesi,
            ruhsatSeriNo: a.ruhsatSeriNo,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Load existing muayene
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/muayeneler/${muayeneId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            aracId: String(data.aracId),
            muayeneTarihi: formatDateForInput(data.muayeneTarihi),
            gecerlilikBitisTarihi: formatDateForInput(data.gecerlilikBitisTarihi),
            sonuc: data.sonuc || "gecti",
            muayeneIstasyonu: data.muayeneIstasyonu || "",
            muayeneIstasyonuIl: data.muayeneIstasyonuIl || "",
            raporNo: data.raporNo || "",
            muayeneTipi: data.muayeneTipi || "periyodik",
            muayeneUcreti: data.muayeneUcreti ? String(data.muayeneUcreti) : "",
            basarisizNeden: data.basarisizNeden || "",
            basarisizDetay: data.basarisizDetay || "",
            notlar: data.notlar || "",
            plaka: data.arac?.plaka || "",
            ruhsatSeriNo: data.arac?.ruhsatSeriNo || "",
            k1YetkiBelgesi: data.arac?.k1YetkiBelgesi || "",
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [muayeneId, isNew]);

  const handleChange = (field: keyof MuayeneData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "aracId" && value) {
      const selected = araclar.find((a) => String(a.id) === value);
      if (selected) setForm((prev) => ({ ...prev, [field]: value, plaka: selected.plaka, ruhsatSeriNo: selected.ruhsatSeriNo || "", k1YetkiBelgesi: selected.k1YetkiBelgesi || "" }));
    }
  };

  const handleSave = async () => {
    if (!form.aracId || !form.muayeneTarihi || !form.gecerlilikBitisTarihi) {
      alert("Arac, muayene tarihi ve gecerlilik bitis tarihi zorunludur");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/muayeneler" : `/api/muayeneler/${muayeneId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // Update K1 on vehicle if changed
        if (form.aracId && form.k1YetkiBelgesi) {
          await fetch(`/api/araclar/${form.aracId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ k1YetkiBelgesi: form.k1YetkiBelgesi }),
          }).catch(() => {});
        }
        if (raporFile && form.aracId) {
          const fd = new FormData();
          fd.append("file", raporFile);
          fd.append("aracId", form.aracId);
          fd.append("belgeTipi", "muayene");
          fd.append("aciklama", `Muayene Raporu - ${form.raporNo || form.plaka || "Belirtilmedi"}`);
          await fetch("/api/belgeler", { method: "POST", body: fd });
        }
        router.push("/muayene-takip");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Bir hata olustu");
      }
    } catch {
      alert("Kaydetme hatasi");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu muayene kaydini silmek istediginizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/muayeneler/${muayeneId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/muayene-takip");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Silme hatasi");
      }
    } catch {
      alert("Silme hatasi");
    }
  };

  const filteredAraclar = aracSearch
    ? araclar.filter((a) => a.plaka.toLowerCase().includes(aracSearch.toLowerCase()))
    : araclar;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const tabs = [
    { key: "bilgiler" as const, label: "Muayene Bilgileri" },
    { key: "sonuc" as const, label: "Sonuc & Notlar" },
  ];

  const inputClass =
    "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/muayene-takip")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Muayene Kaydi" : `Muayene Detay - ${form.plaka}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isNew ? "Yeni muayene kaydi ekle" : "Muayene bilgilerini duzenle"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} />
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* BILGILER TAB */}
        {activeTab === "bilgiler" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arac Secimi */}
            <div className="md:col-span-2">
              <label className={labelClass}>Arac (Plaka) *</label>
              <div className="relative" ref={aracDropdownRef}>
                <input
                  type="text"
                  value={aracSearch}
                  onChange={(e) => {
                    setAracSearch(e.target.value);
                    setShowAracDropdown(true);
                  }}
                  onFocus={() => setShowAracDropdown(true)}
                  placeholder={form.aracId ? `Secili: ${form.plaka}` : "Plaka yazarak arac arayin..."}
                  className={`${inputClass} ${form.aracId ? "border-green-400 bg-green-50" : ""}`}
                />
                {form.aracId && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">{form.plaka}</span>
                    <button
                      type="button"
                      onClick={() => { handleChange("aracId", ""); setForm(prev => ({...prev, plaka: ""})); setAracSearch(""); }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {showAracDropdown && filteredAraclar.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredAraclar.slice(0, 20).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          handleChange("aracId", String(a.id));
                          setAracSearch("");
                          setShowAracDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          String(a.id) === form.aracId ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                        }`}
                      >
                        {a.plaka}
                      </button>
                    ))}
                    {filteredAraclar.length > 20 && (
                      <p className="px-4 py-2 text-xs text-slate-400 border-t">
                        {filteredAraclar.length - 20} arac daha var, aramayi daraltin...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Muayene Tarihi *</label>
              <input
                type="date"
                value={form.muayeneTarihi}
                onChange={(e) => handleChange("muayeneTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gecerlilik Bitis Tarihi *</label>
              <input
                type="date"
                value={form.gecerlilikBitisTarihi}
                onChange={(e) => handleChange("gecerlilikBitisTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Muayene Tipi</label>
              <select
                value={form.muayeneTipi}
                onChange={(e) => handleChange("muayeneTipi", e.target.value)}
                className={inputClass}
              >
                {muayeneTipleri.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rapor No</label>
              <input
                type="text"
                value={form.raporNo}
                onChange={(e) => handleChange("raporNo", e.target.value)}
                placeholder="Muayene rapor numarasi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Muayene Istasyonu</label>
              <input
                type="text"
                value={form.muayeneIstasyonu}
                onChange={(e) => handleChange("muayeneIstasyonu", e.target.value)}
                placeholder="Orn: TUVTURK Ankara Kecioren"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Istasyon Il</label>
              <input
                type="text"
                value={form.muayeneIstasyonuIl}
                onChange={(e) => handleChange("muayeneIstasyonuIl", e.target.value)}
                placeholder="Orn: Ankara"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Muayene Ucreti (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.muayeneUcreti}
                onChange={(e) => handleChange("muayeneUcreti", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Ruhsat Seri No</label>
              <input
                type="text"
                value={form.ruhsatSeriNo}
                disabled
                className={`${inputClass} bg-slate-50 cursor-not-allowed ${form.ruhsatSeriNo ? "text-slate-700 font-medium" : "text-slate-400 italic"}`}
                placeholder="Arac secildiginde otomatik gelir"
              />
            </div>

            <div>
              <label className={labelClass}>K1 Yetki Belgesi</label>
              <select
                value={form.k1YetkiBelgesi}
                onChange={(e) => handleChange("k1YetkiBelgesi", e.target.value)}
                className={`${inputClass} ${form.k1YetkiBelgesi === "var" ? "border-green-400 bg-green-50 text-green-700 font-medium" : form.k1YetkiBelgesi === "yok" ? "border-red-300 bg-red-50 text-red-700 font-medium" : ""}`}
              >
                <option value="">Belirtilmedi</option>
                <option value="var">Var</option>
                <option value="yok">Yok</option>
              </select>
            </div>

            {/* Rapor Dosyasi */}
            <div className="md:col-span-2">
              <label className={labelClass}>Muayene Raporu (PDF/Gorsel)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <Upload size={16} />
                  {raporFile ? raporFile.name : "Rapor dosyasi sec"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setRaporFile(e.target.files?.[0] || null)}
                  />
                </label>
                {raporFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {(raporFile.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setRaporFile(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SONUC TAB */}
        {activeTab === "sonuc" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sonuc *</label>
              <select
                value={form.sonuc}
                onChange={(e) => handleChange("sonuc", e.target.value)}
                className={inputClass}
              >
                <option value="gecti">Gecti</option>
                <option value="kaldi">Kaldi</option>
              </select>
            </div>

            {form.sonuc === "kaldi" && (
              <>
                <div>
                  <label className={labelClass}>Basarisizlik Nedeni</label>
                  <select
                    value={form.basarisizNeden}
                    onChange={(e) => handleChange("basarisizNeden", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Secin</option>
                    {basarisizNedenler.map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Basarisizlik Detayi</label>
                  <textarea
                    value={form.basarisizDetay}
                    onChange={(e) => handleChange("basarisizDetay", e.target.value)}
                    rows={3}
                    placeholder="Muayeneden kalma nedeninin detayli aciklamasi..."
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 font-semibold">
                    Bu arac muayeneden kalmistir.
                  </p>
                  {form.basarisizNeden && (
                    <p className="text-sm text-red-600 mt-1">
                      Neden: {basarisizNedenler.find(n => n.value === form.basarisizNeden)?.label || form.basarisizNeden}
                    </p>
                  )}
                  <p className="text-xs text-red-500 mt-2">
                    Ek muayene icin yeni kayit olusturabilirsiniz.
                  </p>
                </div>
              </>
            )}

            {form.sonuc === "gecti" && (
              <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-semibold">
                  Muayene basarili - Arac muayeneden gecmistir.
                </p>
                {form.gecerlilikBitisTarihi && (
                  <p className="text-sm text-green-600 mt-1">
                    Gecerlilik: {new Date(form.gecerlilikBitisTarihi).toLocaleDateString("tr-TR")} tarihine kadar
                  </p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Notlar</label>
              <textarea
                value={form.notlar}
                onChange={(e) => handleChange("notlar", e.target.value)}
                rows={3}
                placeholder="Ek notlar..."
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

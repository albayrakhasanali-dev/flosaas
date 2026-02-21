"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, FileText, Upload, X } from "lucide-react";

interface AracOption {
  id: number;
  plaka: string;
}

interface CezaData {
  id?: number;
  aracId: string;
  tutanakNo: string;
  cezaTarihi: string;
  tebligTarihi: string;
  sonOdemeTarihi: string;
  cezaTuru: string;
  aciklama: string;
  cezaTutari: string;
  indirimlitutar: string;
  odemeDurumu: string;
  odemeTarihi: string;
  tahsilatYontemi: string;
  tahsilatNotu: string;
  sorumluKisi: string;
  sorumluTc: string;
  plaka: string;
  ihlalYeri: string;
  ihlalHizi: string;
  sinirHizi: string;
  itirazDurumu: string;
  itirazTarihi: string;
  itirazNotu: string;
  kaynakKurum: string;
  notlar: string;
}

const emptyCeza: CezaData = {
  aracId: "",
  tutanakNo: "",
  cezaTarihi: "",
  tebligTarihi: "",
  sonOdemeTarihi: "",
  cezaTuru: "hiz",
  aciklama: "",
  cezaTutari: "",
  indirimlitutar: "",
  odemeDurumu: "odenmedi",
  odemeTarihi: "",
  tahsilatYontemi: "",
  tahsilatNotu: "",
  sorumluKisi: "",
  sorumluTc: "",
  plaka: "",
  ihlalYeri: "",
  ihlalHizi: "",
  sinirHizi: "",
  itirazDurumu: "yapilmadi",
  itirazTarihi: "",
  itirazNotu: "",
  kaynakKurum: "",
  notlar: "",
};

const cezaTurleri = [
  { value: "hiz", label: "Hiz Ihlali" },
  { value: "park", label: "Park Ihlali" },
  { value: "kirmizi_isik", label: "Kirmizi Isik" },
  { value: "emniyet_kemeri", label: "Emniyet Kemeri" },
  { value: "cep_telefonu", label: "Cep Telefonu Kullanimi" },
  { value: "gecis_ihlali", label: "Gecis Ihlali (HGS/OGS)" },
  { value: "tonaj", label: "Tonaj Asimi" },
  { value: "diger", label: "Diger" },
];

const formatDateForInput = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
};

export default function CezaFormClient({ cezaId }: { cezaId?: string }) {
  const router = useRouter();
  const isNew = !cezaId || cezaId === "new";
  const [form, setForm] = useState<CezaData>(emptyCeza);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [araclar, setAraclar] = useState<AracOption[]>([]);
  const [aracSearch, setAracSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"genel" | "ihlal" | "odeme" | "itiraz">("genel");
  const [tutanakFile, setTutanakFile] = useState<File | null>(null);
  const [dekontFile, setDekontFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  // Load arac list for dropdown
  useEffect(() => {
    fetch("/api/araclar?limit=500")
      .then((r) => r.json())
      .then((data) => {
        setAraclar(
          data.data.map((a: { id: number; plaka: string }) => ({
            id: a.id,
            plaka: a.plaka,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Load existing ceza
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/cezalar/${cezaId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            aracId: String(data.aracId),
            tutanakNo: data.tutanakNo || "",
            cezaTarihi: formatDateForInput(data.cezaTarihi),
            tebligTarihi: formatDateForInput(data.tebligTarihi),
            sonOdemeTarihi: formatDateForInput(data.sonOdemeTarihi),
            cezaTuru: data.cezaTuru || "diger",
            aciklama: data.aciklama || "",
            cezaTutari: String(data.cezaTutari || ""),
            indirimlitutar: data.indirimlitutar ? String(data.indirimlitutar) : "",
            odemeDurumu: data.odemeDurumu || "odenmedi",
            odemeTarihi: formatDateForInput(data.odemeTarihi),
            tahsilatYontemi: data.tahsilatYontemi || "",
            tahsilatNotu: data.tahsilatNotu || "",
            sorumluKisi: data.sorumluKisi || "",
            sorumluTc: data.sorumluTc || "",
            plaka: data.plaka || "",
            ihlalYeri: data.ihlalYeri || "",
            ihlalHizi: data.ihlalHizi ? String(data.ihlalHizi) : "",
            sinirHizi: data.sinirHizi ? String(data.sinirHizi) : "",
            itirazDurumu: data.itirazDurumu || "yapilmadi",
            itirazTarihi: formatDateForInput(data.itirazTarihi),
            itirazNotu: data.itirazNotu || "",
            kaynakKurum: data.kaynakKurum || "",
            notlar: data.notlar || "",
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [cezaId, isNew]);

  const handleChange = (field: keyof CezaData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-fill plaka when arac selected
    if (field === "aracId" && value) {
      const selected = araclar.find((a) => String(a.id) === value);
      if (selected) setForm((prev) => ({ ...prev, [field]: value, plaka: selected.plaka }));
    }
  };

  const handleSave = async () => {
    if (!form.aracId || !form.cezaTarihi || !form.cezaTutari) {
      alert("Arac, ceza tarihi ve tutar zorunludur");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/cezalar" : `/api/cezalar/${cezaId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        // Upload tutanak file if selected
        if (tutanakFile && form.aracId) {
          await handleTutanakUpload(form.aracId);
        }
        // Upload dekont file if selected
        if (dekontFile && form.aracId) {
          await handleDekontUpload(form.aracId);
        }
        router.push("/trafik-cezalari");
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
    if (!confirm("Bu ceza kaydini silmek istediginizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/cezalar/${cezaId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/trafik-cezalari");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Silme hatasi");
      }
    } catch {
      alert("Silme hatasi");
    }
  };

  const handleTutanakUpload = async (aracId: string) => {
    if (!tutanakFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", tutanakFile);
    fd.append("aracId", aracId);
    fd.append("belgeTipi", "diger");
    fd.append("aciklama", `Ceza Tutanagi - ${form.tutanakNo || "Belirtilmedi"}`);
    await fetch("/api/belgeler", { method: "POST", body: fd });
    setUploading(false);
    setTutanakFile(null);
  };

  const handleDekontUpload = async (aracId: string) => {
    if (!dekontFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", dekontFile);
    fd.append("aracId", aracId);
    fd.append("belgeTipi", "diger");
    fd.append("aciklama", `Ceza Odeme Dekontu - ${form.tutanakNo || form.plaka || "Belirtilmedi"}`);
    await fetch("/api/belgeler", { method: "POST", body: fd });
    setUploading(false);
    setDekontFile(null);
  };

  const filteredAraclar = aracSearch
    ? araclar.filter((a) => a.plaka.toLowerCase().includes(aracSearch.toLowerCase()))
    : araclar;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  const tabs = [
    { key: "genel" as const, label: "Genel Bilgiler" },
    { key: "ihlal" as const, label: "Ihlal Detaylari" },
    { key: "odeme" as const, label: "Odeme Bilgileri" },
    { key: "itiraz" as const, label: "Itiraz & Notlar" },
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
            onClick={() => router.push("/trafik-cezalari")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Ceza Kaydi" : `Ceza Detay - ${form.tutanakNo || form.plaka}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isNew ? "Yeni trafik cezasi ekle" : "Ceza bilgilerini duzenle"}
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
        {/* GENEL TAB */}
        {activeTab === "genel" && (
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
                  placeholder={form.aracId ? `Secili: ${form.plaka}` : "Plaka yazarak arac arayın..."}
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
                        {filteredAraclar.length - 20} arac daha var, aramayı daraltın...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Tutanak No</label>
              <input
                type="text"
                value={form.tutanakNo}
                onChange={(e) => handleChange("tutanakNo", e.target.value)}
                placeholder="TA-05116049"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ceza Tarihi *</label>
              <input
                type="date"
                value={form.cezaTarihi}
                onChange={(e) => handleChange("cezaTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teblig Tarihi</label>
              <input
                type="date"
                value={form.tebligTarihi}
                onChange={(e) => handleChange("tebligTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ceza Turu *</label>
              <select
                value={form.cezaTuru}
                onChange={(e) => handleChange("cezaTuru", e.target.value)}
                className={inputClass}
              >
                {cezaTurleri.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kaynak Kurum</label>
              <select
                value={form.kaynakKurum}
                onChange={(e) => handleChange("kaynakKurum", e.target.value)}
                className={inputClass}
              >
                <option value="">Secin</option>
                <option value="EGM">Emniyet Genel Mudurlugu</option>
                <option value="Jandarma">Jandarma</option>
                <option value="Belediye">Belediye</option>
                <option value="Diger">Diger</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Sorumlu Kisi</label>
              <input
                type="text"
                value={form.sorumluKisi}
                onChange={(e) => handleChange("sorumluKisi", e.target.value)}
                placeholder="Sofor / sorumlu adi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sorumlu TC</label>
              <input
                type="text"
                value={form.sorumluTc}
                onChange={(e) => handleChange("sorumluTc", e.target.value)}
                placeholder="TC Kimlik No"
                maxLength={11}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Aciklama</label>
              <textarea
                value={form.aciklama}
                onChange={(e) => handleChange("aciklama", e.target.value)}
                rows={2}
                placeholder="Ceza detay aciklamasi..."
                className={inputClass}
              />
            </div>

            {/* Tutanak Dosyasi */}
            <div className="md:col-span-2">
              <label className={labelClass}>Ceza Tutanagi (PDF/Gorsel)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <Upload size={16} />
                  {tutanakFile ? tutanakFile.name : "Tutanak dosyasi sec"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setTutanakFile(e.target.files?.[0] || null)}
                  />
                </label>
                {tutanakFile && (
                  <span className="text-xs text-slate-400">
                    {(tutanakFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IHLAL TAB */}
        {activeTab === "ihlal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Ihlal Yeri</label>
              <input
                type="text"
                value={form.ihlalYeri}
                onChange={(e) => handleChange("ihlalYeri", e.target.value)}
                placeholder="Cezanin kesildigi yer / adres"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ihlal Hizi (km/h)</label>
              <input
                type="number"
                value={form.ihlalHizi}
                onChange={(e) => handleChange("ihlalHizi", e.target.value)}
                placeholder="Tespit edilen hiz"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sinir Hizi (km/h)</label>
              <input
                type="number"
                value={form.sinirHizi}
                onChange={(e) => handleChange("sinirHizi", e.target.value)}
                placeholder="Yolun hiz siniri"
                className={inputClass}
              />
            </div>
            {form.ihlalHizi && form.sinirHizi && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Hiz Asimi:</span>{" "}
                  {parseInt(form.ihlalHizi) - parseInt(form.sinirHizi)} km/h fazla
                  ({form.ihlalHizi} km/h / {form.sinirHizi} km/h sinir)
                </p>
              </div>
            )}
            <div>
              <label className={labelClass}>Plaka (Ihlal Aninda)</label>
              <input
                type="text"
                value={form.plaka}
                onChange={(e) => handleChange("plaka", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ODEME TAB */}
        {activeTab === "odeme" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ceza Tutari (TL) *</label>
              <input
                type="number"
                step="0.01"
                value={form.cezaTutari}
                onChange={(e) => handleChange("cezaTutari", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Indirimli Tutar (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.indirimlitutar}
                onChange={(e) => handleChange("indirimlitutar", e.target.value)}
                placeholder="Erken odeme indirimi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Son Odeme Tarihi</label>
              <input
                type="date"
                value={form.sonOdemeTarihi}
                onChange={(e) => handleChange("sonOdemeTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Odeme Durumu</label>
              <select
                value={form.odemeDurumu}
                onChange={(e) => handleChange("odemeDurumu", e.target.value)}
                className={inputClass}
              >
                <option value="odenmedi">Odenmedi</option>
                <option value="odendi">Odendi</option>
                <option value="itiraz_edildi">Itiraz Edildi</option>
              </select>
            </div>
            {form.odemeDurumu === "odendi" && (
              <>
                <div>
                  <label className={labelClass}>Odeme Tarihi</label>
                  <input
                    type="date"
                    value={form.odemeTarihi}
                    onChange={(e) => handleChange("odemeTarihi", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tahsilat Yontemi</label>
                  <select
                    value={form.tahsilatYontemi}
                    onChange={(e) => handleChange("tahsilatYontemi", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Secin</option>
                    <option value="sirket_odedi">Sirket Odedi</option>
                    <option value="maas_kesinti">Maasindan Kesildi</option>
                    <option value="sofor_odedi">Sofor Kendisi Odedi</option>
                    <option value="taksit">Taksitlendirildi</option>
                    <option value="diger">Diger</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Tahsilat Notu</label>
                  <input
                    type="text"
                    value={form.tahsilatNotu}
                    onChange={(e) => handleChange("tahsilatNotu", e.target.value)}
                    placeholder="Orn: Subat 2026 maasindan kesildi, Dekont no: 12345..."
                    className={inputClass}
                  />
                </div>
                {/* Dekont Dosyasi */}
                <div className="md:col-span-2">
                  <label className={labelClass}>Dekont / Odeme Belgesi</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                      <Upload size={16} />
                      {dekontFile ? dekontFile.name : "Dekont dosyasi sec (PDF/Gorsel)"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => setDekontFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {dekontFile && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {(dekontFile.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => setDekontFile(null)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {/* Tahsilat ozet bilgisi (odenmemis iken) */}
            {form.odemeDurumu !== "odendi" && form.sorumluKisi && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">
                  <span className="font-semibold">Sorumlu:</span> {form.sorumluKisi}
                  {form.sonOdemeTarihi && ` | Son odeme: ${new Date(form.sonOdemeTarihi).toLocaleDateString("tr-TR")}`}
                </p>
              </div>
            )}
            {/* Odeme ozeti */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Ceza Tutari</p>
                  <p className="text-lg font-bold text-slate-800">
                    {form.cezaTutari ? `${parseFloat(form.cezaTutari).toLocaleString("tr-TR")} TL` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Indirimli</p>
                  <p className="text-lg font-bold text-green-600">
                    {form.indirimlitutar ? `${parseFloat(form.indirimlitutar).toLocaleString("tr-TR")} TL` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Durum</p>
                  <p className={`text-lg font-bold ${
                    form.odemeDurumu === "odendi" ? "text-green-600" :
                    form.odemeDurumu === "itiraz_edildi" ? "text-amber-600" : "text-red-600"
                  }`}>
                    {form.odemeDurumu === "odendi" ? "Odendi" :
                     form.odemeDurumu === "itiraz_edildi" ? "Itiraz" : "Odenmedi"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tahsilat</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {form.tahsilatYontemi === "sirket_odedi" ? "Sirket Odedi" :
                     form.tahsilatYontemi === "maas_kesinti" ? "Maastan Kesildi" :
                     form.tahsilatYontemi === "sofor_odedi" ? "Sofor Odedi" :
                     form.tahsilatYontemi === "taksit" ? "Taksit" :
                     form.tahsilatYontemi === "diger" ? "Diger" : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ITIRAZ TAB */}
        {activeTab === "itiraz" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Itiraz Durumu</label>
              <select
                value={form.itirazDurumu}
                onChange={(e) => handleChange("itirazDurumu", e.target.value)}
                className={inputClass}
              >
                <option value="yapilmadi">Yapilmadi</option>
                <option value="yapildi">Yapildi</option>
                <option value="kabul">Kabul Edildi</option>
                <option value="red">Reddedildi</option>
              </select>
            </div>
            {form.itirazDurumu !== "yapilmadi" && (
              <div>
                <label className={labelClass}>Itiraz Tarihi</label>
                <input
                  type="date"
                  value={form.itirazTarihi}
                  onChange={(e) => handleChange("itirazTarihi", e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className={labelClass}>Itiraz Notu</label>
              <textarea
                value={form.itirazNotu}
                onChange={(e) => handleChange("itirazNotu", e.target.value)}
                rows={3}
                placeholder="Itiraz gerekcesi ve detaylari..."
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Genel Notlar</label>
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

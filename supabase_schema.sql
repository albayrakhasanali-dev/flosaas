-- CreateTable
CREATE TABLE "t_sirket" (
    "id" SERIAL NOT NULL,
    "sirket_adi" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_sirket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_lokasyon" (
    "id" SERIAL NOT NULL,
    "lokasyon_adi" TEXT NOT NULL,
    "sorumlu_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_lokasyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_durum" (
    "id" SERIAL NOT NULL,
    "durum_adi" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_durum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_arac_master" (
    "id" SERIAL NOT NULL,
    "plaka" TEXT NOT NULL,
    "durum_id" INTEGER,
    "sirket_id" INTEGER,
    "lokasyon_id" INTEGER,
    "mulkiyet_tipi" TEXT,
    "marka_model_ticari_adi" TEXT,
    "kullanim_sekli" TEXT,
    "model_yili" INTEGER,
    "kapasite" TEXT,
    "arac_marka" TEXT,
    "kasa_marka" TEXT,
    "sasi_no" TEXT,
    "motor_no" TEXT,
    "guncel_km_saat" DOUBLE PRECISION,
    "zimmet_masraf_merkezi" TEXT,
    "utts_durum" TEXT,
    "seyir_takip_cihaz_no" TEXT,
    "hgs_etiket_no" TEXT,
    "hgs_sinif" INTEGER,
    "otomatik_var" BOOLEAN,
    "otomatik_firma" TEXT,
    "otomatik_kod" TEXT,
    "etiket_sinifi" INTEGER,
    "hgs_kime_ait" TEXT,
    "takograf" TEXT,
    "taahhutname" TEXT,
    "kabis_var" BOOLEAN,
    "kabis_sirket" TEXT,
    "tescil_tarihi" TIMESTAMP(3),
    "muayene_bitis_tarihi" TIMESTAMP(3),
    "sigorta_bitis_tarihi" TIMESTAMP(3),
    "kasko_bitis_tarihi" TIMESTAMP(3),
    "arac_kimligi" TEXT,
    "ruhsat_seri_no" TEXT,
    "aciklama_not" TEXT,
    "k1_yetki_belgesi" TEXT,
    "muayene_gerekli" BOOLEAN NOT NULL DEFAULT true,
    "sigorta_gerekli" BOOLEAN NOT NULL DEFAULT true,
    "satis_tarihi" TIMESTAMP(3),
    "satis_notu" TEXT,
    "teker_sayisi" INTEGER,
    "arac_kategorisi" TEXT,
    "belgeler_dosyalar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_arac_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_belge" (
    "id" SERIAL NOT NULL,
    "arac_id" INTEGER NOT NULL,
    "belge_tipi" TEXT NOT NULL,
    "dosya_adi" TEXT NOT NULL,
    "dosya_boyut" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "icerik" BYTEA NOT NULL,
    "yukleyen_id" INTEGER,
    "aciklama" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_belge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ceza" (
    "id" SERIAL NOT NULL,
    "arac_id" INTEGER NOT NULL,
    "tutanak_no" TEXT,
    "ceza_tarihi" TIMESTAMP(3) NOT NULL,
    "teblig_tarihi" TIMESTAMP(3),
    "son_odeme_tarihi" TIMESTAMP(3),
    "ceza_turu" TEXT NOT NULL,
    "aciklama" TEXT,
    "ceza_tutari" DOUBLE PRECISION NOT NULL,
    "indirimli_tutar" DOUBLE PRECISION,
    "odeme_durumu" TEXT NOT NULL DEFAULT 'odenmedi',
    "odeme_tarihi" TIMESTAMP(3),
    "tahsilat_yontemi" TEXT,
    "tahsilat_notu" TEXT,
    "dekont_dosya_id" INTEGER,
    "sorumlu_kisi" TEXT,
    "sorumlu_tc" TEXT,
    "plaka" TEXT,
    "ihlal_yeri" TEXT,
    "ihlal_hizi" INTEGER,
    "sinir_hizi" INTEGER,
    "itiraz_durumu" TEXT,
    "itiraz_tarihi" TIMESTAMP(3),
    "itiraz_notu" TEXT,
    "kaynak_kurum" TEXT,
    "tutanak_dosya_id" INTEGER,
    "ekleyen_id" INTEGER,
    "notlar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_ceza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_muayene" (
    "id" SERIAL NOT NULL,
    "arac_id" INTEGER NOT NULL,
    "muayene_tarihi" TIMESTAMP(3) NOT NULL,
    "gecerlilik_bitis_tarihi" TIMESTAMP(3) NOT NULL,
    "sonuc" TEXT NOT NULL,
    "muayene_istasyonu" TEXT,
    "muayene_istasyonu_il" TEXT,
    "rapor_no" TEXT,
    "muayene_tipi" TEXT NOT NULL DEFAULT 'periyodik',
    "muayene_ucreti" DOUBLE PRECISION,
    "basarisiz_neden" TEXT,
    "basarisiz_detay" TEXT,
    "rapor_dosya_id" INTEGER,
    "ekleyen_id" INTEGER,
    "notlar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_muayene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_sigorta" (
    "id" SERIAL NOT NULL,
    "arac_id" INTEGER NOT NULL,
    "sigorta_turu" TEXT NOT NULL,
    "police_no" TEXT,
    "sigorta_sirketi" TEXT,
    "acente_adi" TEXT,
    "acente_telefon" TEXT,
    "baslangic_tarihi" TIMESTAMP(3) NOT NULL,
    "bitis_tarihi" TIMESTAMP(3) NOT NULL,
    "prim_tutari" DOUBLE PRECISION,
    "odeme_sekli" TEXT,
    "taksit_sayisi" INTEGER,
    "odeme_durumu" TEXT NOT NULL DEFAULT 'odenmedi',
    "odeme_tarihi" TIMESTAMP(3),
    "police_dosya_id" INTEGER,
    "teminat_bilgi" TEXT,
    "ekleyen_id" INTEGER,
    "notlar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_sigorta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'personel',
    "sirket_id" INTEGER,
    "lokasyon_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lokasyon" (
    "user_id" INTEGER NOT NULL,
    "lokasyon_id" INTEGER NOT NULL,

    CONSTRAINT "user_lokasyon_pkey" PRIMARY KEY ("user_id","lokasyon_id")
);

-- CreateTable
CREATE TABLE "t_yapilacak" (
    "id" SERIAL NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "oncelik" TEXT NOT NULL DEFAULT 'normal',
    "arac_id" INTEGER,
    "atanan_kullanici_id" INTEGER,
    "son_tarih" TIMESTAMP(3),
    "tamamlanma_tarihi" TIMESTAMP(3),
    "kategori" TEXT,
    "ekleyen_id" INTEGER,
    "notlar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_yapilacak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_logs" (
    "id" SERIAL NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "affected_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_mail_ayarlari" (
    "id" SERIAL NOT NULL,
    "modul_tipi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "frekans" TEXT NOT NULL DEFAULT 'haftalik',
    "haftanin_gunu" INTEGER NOT NULL DEFAULT 1,
    "gonderim_saati" INTEGER NOT NULL DEFAULT 8,
    "alicilar" TEXT NOT NULL DEFAULT '[]',
    "kriterler" TEXT NOT NULL DEFAULT '["suresi_gecmis","yaklasan_30"]',
    "esik_gunleri" TEXT NOT NULL DEFAULT '[30,15,7]',
    "yoneticilere_gonder" BOOLEAN NOT NULL DEFAULT true,
    "son_gonderim_tarihi" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_mail_ayarlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_sirket_sirket_adi_key" ON "t_sirket"("sirket_adi");

-- CreateIndex
CREATE UNIQUE INDEX "t_lokasyon_lokasyon_adi_key" ON "t_lokasyon"("lokasyon_adi");

-- CreateIndex
CREATE UNIQUE INDEX "t_durum_durum_adi_key" ON "t_durum"("durum_adi");

-- CreateIndex
CREATE UNIQUE INDEX "t_arac_master_plaka_key" ON "t_arac_master"("plaka");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "t_mail_ayarlari_modul_tipi_key" ON "t_mail_ayarlari"("modul_tipi");

-- AddForeignKey
ALTER TABLE "t_arac_master" ADD CONSTRAINT "t_arac_master_durum_id_fkey" FOREIGN KEY ("durum_id") REFERENCES "t_durum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_arac_master" ADD CONSTRAINT "t_arac_master_sirket_id_fkey" FOREIGN KEY ("sirket_id") REFERENCES "t_sirket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_arac_master" ADD CONSTRAINT "t_arac_master_lokasyon_id_fkey" FOREIGN KEY ("lokasyon_id") REFERENCES "t_lokasyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_belge" ADD CONSTRAINT "t_belge_arac_id_fkey" FOREIGN KEY ("arac_id") REFERENCES "t_arac_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_ceza" ADD CONSTRAINT "t_ceza_arac_id_fkey" FOREIGN KEY ("arac_id") REFERENCES "t_arac_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_muayene" ADD CONSTRAINT "t_muayene_arac_id_fkey" FOREIGN KEY ("arac_id") REFERENCES "t_arac_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_sigorta" ADD CONSTRAINT "t_sigorta_arac_id_fkey" FOREIGN KEY ("arac_id") REFERENCES "t_arac_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sirket_id_fkey" FOREIGN KEY ("sirket_id") REFERENCES "t_sirket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lokasyon_id_fkey" FOREIGN KEY ("lokasyon_id") REFERENCES "t_lokasyon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lokasyon" ADD CONSTRAINT "user_lokasyon_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lokasyon" ADD CONSTRAINT "user_lokasyon_lokasyon_id_fkey" FOREIGN KEY ("lokasyon_id") REFERENCES "t_lokasyon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_yapilacak" ADD CONSTRAINT "t_yapilacak_arac_id_fkey" FOREIGN KEY ("arac_id") REFERENCES "t_arac_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_yapilacak" ADD CONSTRAINT "t_yapilacak_atanan_kullanici_id_fkey" FOREIGN KEY ("atanan_kullanici_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_yapilacak" ADD CONSTRAINT "t_yapilacak_ekleyen_id_fkey" FOREIGN KEY ("ekleyen_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


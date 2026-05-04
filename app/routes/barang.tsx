"use client";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { PackagePlus, Search, Plus, X, ImageIcon, AlertCircle, Pencil } from "lucide-react";
import { createClient } from "~/lib/client";
import Layout from "~/components/ui/layout";

// ─────────────────────────────────────────────
// Konstanta kategori — satu sumber kebenaran,
// dipakai di BatchModal dan EditModal
// FIX: sebelumnya hardcoded duplikat di tiap tempat
// ─────────────────────────────────────────────
const KATEGORI_LIST = [
  "Makanan Ringan",
  "Minuman",
  "Sembako",
  "Kebersihan",
  "perlengkapan dapur",
  "lainya"
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface BatchItem {
  kode_product: string;
  nama_product: string;
  kategori: string;
  qty: number;
  harga: number;
  is_active: boolean;
  image_preview: string;
  image_file: File | null;
  image: string;
}

interface Product {
  id: number;
  kode_product: string;
  nama_product: string;
  kategori: string;
  qty: number;
  harga: number;
  is_active: boolean;
  image: string;
  created_at: string;
}

interface EditForm {
  id: number;
  kode_product: string;
  nama_product: string;
  kategori: string;
  qty: number;
  harga: number;
  image: string;
  image_preview: string;
  image_file: File | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const defaultItem = (): BatchItem => ({
  kode_product: "",
  nama_product: "",
  kategori: "",
  qty: 0,
  harga: 0,
  is_active: true,
  image_preview: "",
  image_file: null,
  image: "default.png",
});

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "File harus berupa gambar (jpg, png, webp, dll)";
  if (file.size > 2 * 1024 * 1024) return "Ukuran gambar maksimal 2MB";
  return null;
}

// ─────────────────────────────────────────────
// Shared: native <select> yang works di dalam Portal
// FIX: shadcn Select pakai Radix Portal sendiri — kalau
// dirender di dalam Portal kustom, z-index dan positioning
// dropdown-nya konflik → dropdown muncul di posisi salah / kelihatan
// tapi nggak bisa diklik. Solusi: pakai native <select> dengan
// styling manual yang konsisten dengan design system.
// ─────────────────────────────────────────────
function NativeSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white
                 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600
                 appearance-none cursor-pointer
                 [&>option]:bg-zinc-900 [&>option]:text-white"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: "2rem",
      }}
    >
      <option value="" disabled hidden>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────
// Shared: Image Upload Box
// ─────────────────────────────────────────────
function ImageUploadBox({
  preview,
  onChange,
  size = "md",
}: {
  preview: string;
  onChange: (file: File | undefined) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-24 h-24" : "aspect-square w-full";
  return (
    <label
      className={`${dim} bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-800
                  hover:border-emerald-500/60 transition-all flex flex-col items-center
                  justify-center overflow-hidden relative cursor-pointer group/img`}
    >
      {preview ? (
        <>
          <img src={preview} alt="preview" className="object-cover w-full h-full" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-[9px] font-bold uppercase text-white">Ganti Foto</p>
          </div>
        </>
      ) : (
        <div className="text-center p-2 pointer-events-none">
          <ImageIcon className="mx-auto text-zinc-700 mb-1.5" size={size === "sm" ? 18 : 22} />
          <p className="text-[8px] text-zinc-500 font-bold uppercase">Upload</p>
          <p className="text-[7px] text-zinc-600 mt-0.5">maks 2MB</p>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        // FIX: reset value setelah pilih file yang sama
        // tanpa ini, kalau user pilih file sama dua kali → onChange tidak terpanggil
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </label>
  );
}

// ─────────────────────────────────────────────
// Shared: useModalKeys
// ─────────────────────────────────────────────
function useModalKeys(open: boolean, onClose: () => void, locked: boolean) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !locked) onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, locked]);
}

// ─────────────────────────────────────────────
// Batch Add Modal
// ─────────────────────────────────────────────
function BatchModal({
  open, onClose, batchItems, setBatchItems, onSave, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  onSave: () => void;
  isSaving: boolean;
}) {
  useModalKeys(open, onClose, isSaving);

  const addRow = () => setBatchItems((prev) => [...prev, defaultItem()]);
  const removeRow = (i: number) => setBatchItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleInputChange = (index: number, field: keyof BatchItem, value: unknown) => {
    setBatchItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleImageChange = async (index: number, file: File | undefined) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { alert(err); return; }
    try {
      const base64 = await readFileAsBase64(file);
      setBatchItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], image_preview: base64, image_file: file, image: file.name };
        return next;
      });
    } catch { alert("Gagal membaca file gambar"); }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onClose : undefined}
      />
      <div className="relative z-10 flex flex-col w-[90vw] max-w-2xl max-h-[88vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
              Batch Inventory Entry
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Menambah {batchItems.length} Produk Sekaligus
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-emerald-400 transition-colors"
            >
              <Plus size={13} className="text-emerald-500" /> Tambah Baris
            </button>
            <button
              onClick={!isSaving ? onClose : undefined}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8 overscroll-contain">
          {batchItems.map((item, index) => (
            <div
              key={index}
              className="relative"
              style={{ animation: "fadeSlideIn 0.2s ease both" }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 tracking-widest">
                  ITEM #{index + 1}
                </span>
                {batchItems.length > 1 && (
                  <button
                    onClick={() => removeRow(index)}
                    className="text-zinc-600 hover:text-red-500 transition-colors p-1 rounded"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Foto */}
                <div className="col-span-1">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5 tracking-widest">
                    Foto
                  </label>
                  <ImageUploadBox
                    preview={item.image_preview}
                    onChange={(file) => handleImageChange(index, file)}
                  />
                </div>

                {/* Fields */}
                <div className="col-span-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                        Nama Produk *
                      </label>
                      <Input
                        placeholder="Contoh: indomie goreng"
                        value={item.nama_product}
                        onChange={(e) => handleInputChange(index, "nama_product", e.target.value)}
                        className="bg-zinc-900 border-zinc-800 focus:border-emerald-500 h-9 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                        SKU / Kode
                      </label>
                      <Input
                        placeholder="PROD-001"
                        value={item.kode_product}
                        onChange={(e) => handleInputChange(index, "kode_product", e.target.value)}
                        className="bg-zinc-900 border-zinc-800 focus:border-emerald-500 h-9 text-sm font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                        Kategori
                      </label>
                      {/* FIX: shadcn Select → NativeSelect karena konflik z-index di dalam Portal */}
                      <NativeSelect
                        value={item.kategori}
                        onChange={(val) => handleInputChange(index, "kategori", val)}
                        options={KATEGORI_LIST}
                        placeholder="Pilih Kategori"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                        Harga (Rp)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        // FIX: value="0" bikin user harus hapus angka dulu sebelum ketik
                        // Tampilkan string kosong kalau 0
                        value={item.harga === 0 ? "" : item.harga}
                        onChange={(e) => handleInputChange(index, "harga", parseFloat(e.target.value) || 0)}
                        className="bg-zinc-900 border-zinc-800 h-9 text-sm font-bold text-emerald-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                        Stok
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) => handleInputChange(index, "qty", parseInt(e.target.value) || 0)}
                        className="bg-zinc-900 border-zinc-800 h-9 text-sm font-bold text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {index < batchItems.length - 1 && (
                <hr className="mt-6 border-zinc-800 border-dashed" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 bg-zinc-950 border-t border-zinc-800">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase italic tracking-wider rounded-xl transition-colors text-sm"
          >
            {isSaving ? "Menyimpan..." : "Konfirmasi & Simpan Semua Barang"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────
function EditModal({
  open, onClose, form, setForm, onSave, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  form: EditForm | null;
  setForm: React.Dispatch<React.SetStateAction<EditForm | null>>;
  onSave: () => void;
  isSaving: boolean;
}) {
  useModalKeys(open, onClose, isSaving);

  const handleImageChange = async (file: File | undefined) => {
    if (!file || !form) return;
    const err = validateImageFile(file);
    if (err) { alert(err); return; }
    try {
      const base64 = await readFileAsBase64(file);
      setForm((prev) => prev
        ? { ...prev, image_preview: base64, image_file: file, image: file.name }
        : prev
      );
    } catch { alert("Gagal membaca file gambar"); }
  };

  const update = (field: keyof EditForm, value: unknown) =>
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);

  if (!open || !form) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onClose : undefined}
      />
      <div className="relative z-10 flex flex-col w-[90vw] max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tight text-white">
              Edit Produk
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              ID #{form.id} · {form.kode_product || "No SKU"}
            </p>
          </div>
          <button
            onClick={!isSaving ? onClose : undefined}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          <div className="flex gap-4">
            <div className="shrink-0">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5 tracking-widest">
                Foto
              </label>
              <ImageUploadBox
                preview={form.image_preview}
                onChange={handleImageChange}
                size="sm"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                  Nama Produk *
                </label>
                <Input
                  value={form.nama_product}
                  onChange={(e) => update("nama_product", e.target.value)}
                  className="bg-zinc-900 border-zinc-800 focus:border-emerald-500 h-9 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                  SKU / Kode
                </label>
                <Input
                  value={form.kode_product}
                  onChange={(e) => update("kode_product", e.target.value)}
                  className="bg-zinc-900 border-zinc-800 h-9 text-sm font-mono text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                Kategori
              </label>
              {/* FIX: sama — pakai NativeSelect */}
              <NativeSelect
                value={form.kategori}
                onChange={(val) => update("kategori", val)}
                options={KATEGORI_LIST}
                placeholder="Pilih Kategori"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                Harga (Rp)
              </label>
              <Input
                type="number"
                min={0}
                value={form.harga === 0 ? "" : form.harga}
                onChange={(e) => update("harga", parseFloat(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 h-9 text-sm font-bold text-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                Stok
              </label>
              <Input
                type="number"
                min={0}
                value={form.qty === 0 ? "" : form.qty}
                onChange={(e) => update("qty", parseInt(e.target.value) || 0)}
                className="bg-zinc-900 border-zinc-800 h-9 text-sm font-bold text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={!isSaving ? onClose : undefined}
            className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors text-sm"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors text-sm"
          >
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function ProductManagement() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([defaultItem()]);

  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err: any) {
      console.error("Gagal fetch products:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Batch Save ──
  const handleSaveBatch = async () => {
    // Validasi semua item
    const invalidIdx = batchItems.findIndex((item) => !item.nama_product.trim());
    if (invalidIdx !== -1) {
      alert(`Nama produk item #${invalidIdx + 1} tidak boleh kosong`);
      return;
    }

    // FIX: cek duplikat kode_product di dalam batch itu sendiri
    const kodes = batchItems.map((i) => i.kode_product).filter(Boolean);
    const dupKode = kodes.find((k, i) => kodes.indexOf(k) !== i);
    if (dupKode) {
      alert(`SKU "${dupKode}" duplikat di dalam batch. Pastikan tiap SKU unik.`);
      return;
    }

    setIsBatchSaving(true);
    try {
      // Strip field UI-only sebelum insert
      const finalData = batchItems.map(({ image_preview, image_file, ...rest }) => ({
        ...rest,
        // Kalau image_file ada tapi belum diupload → tetap pakai "default.png"
        // TODO: implement upload ke Supabase Storage atau API Route
      }));

      const { error } = await supabase.from("products").insert(finalData);
      if (error) throw error;

      setIsBatchOpen(false);
      setBatchItems([defaultItem()]);
      await fetchProducts();
    } catch (err: any) {
      // FIX: parse error code dari Supabase untuk pesan yang lebih informatif
      if (err.code === "23505") {
        alert("SKU / kode produk sudah ada di database. Gunakan kode yang berbeda.");
      } else {
        alert("Gagal menyimpan: " + err.message);
      }
    } finally {
      setIsBatchSaving(false);
    }
  };

  // ── Open Edit ──
  const openEdit = (product: Product) => {
    setEditForm({
      id: product.id,
      kode_product: product.kode_product ?? "",
      nama_product: product.nama_product ?? "",
      kategori: product.kategori ?? "",
      qty: product.qty ?? 0,
      harga: product.harga ?? 0,
      image: product.image ?? "default.png",
      image_preview: product.image ? `/assets/img/${product.image}` : "",
      image_file: null,
    });
    setIsEditOpen(true);
  };

  // ── Save Edit ──
  const handleSaveEdit = async () => {
    if (!editForm) return;
    if (!editForm.nama_product.trim()) {
      alert("Nama produk tidak boleh kosong");
      return;
    }

    setIsEditSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          kode_product: editForm.kode_product,
          nama_product: editForm.nama_product,
          kategori: editForm.kategori,
          qty: editForm.qty,
          harga: editForm.harga,
          image: editForm.image,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editForm.id);

      if (error) throw error;

      // Optimistic update tanpa refetch
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editForm.id
            ? {
                ...p,
                kode_product: editForm.kode_product,
                nama_product: editForm.nama_product,
                kategori: editForm.kategori,
                qty: editForm.qty,
                harga: editForm.harga,
                image: editForm.image,
              }
            : p
        )
      );

      setIsEditOpen(false);
      setEditForm(null);
    } catch (err: any) {
      if (err.code === "23505") {
        alert("SKU sudah dipakai produk lain.");
      } else {
        alert("Gagal menyimpan: " + err.message);
      }
    } finally {
      setIsEditSaving(false);
    }
  };

  // ── Toggle Status ──
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    // Optimistic update dulu biar responsif
    setProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, is_active: !currentStatus } : p)
    );

    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      // Rollback kalau gagal
      setProducts((prev) =>
        prev.map((p) => p.id === id ? { ...p, is_active: currentStatus } : p)
      );
      alert("Gagal update status: " + error.message);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.nama_product?.toLowerCase().includes(search.toLowerCase()) ||
    p.kode_product?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseBatch = useCallback(() => {
    if (!isBatchSaving) setIsBatchOpen(false);
  }, [isBatchSaving]);

  const handleCloseEdit = useCallback(() => {
    if (isEditSaving) return;
    setIsEditOpen(false);
    setEditForm(null);
  }, [isEditSaving]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">
              Manajemen Barang
            </h1>
            <p className="text-xs text-zinc-500 font-bold">Inventory & Stock Control</p>
          </div>
          <Button
            onClick={() => setIsBatchOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <PackagePlus size={18} /> Batch Input
          </Button>
        </div>

        {/* Tabel */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <Input
                placeholder="Cari SKU atau Nama Barang..."
                className="pl-10 bg-zinc-950 border-zinc-800 text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 uppercase text-[10px] font-black">Produk</TableHead>
                  <TableHead className="text-zinc-500 uppercase text-[10px] font-black">Kategori</TableHead>
                  <TableHead className="text-zinc-500 uppercase text-[10px] font-black text-right">Stok</TableHead>
                  <TableHead className="text-zinc-500 uppercase text-[10px] font-black text-right">Harga</TableHead>
                  <TableHead className="text-center text-zinc-500 uppercase text-[10px] font-black">Status</TableHead>
                  <TableHead className="text-center text-zinc-500 uppercase text-[10px] font-black">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // FIX: sebelumnya tidak ada loading state — tabel kosong saat fetch
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-500 text-sm">
                      <span className="animate-pulse">Memuat data produk...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-zinc-500 text-sm">
                      {search ? `Tidak ada produk yang cocok dengan "${search}"` : "Belum ada produk. Tambah lewat Batch Input."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => (
                    <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-800/30">
                      <TableCell className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden border border-zinc-700 shrink-0">
                          <img
                            src={`/assets/img/${p.image}`}
                            alt={p.nama_product}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%2327272a'/%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-200 text-sm truncate">{p.nama_product}</p>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">{p.kode_product || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-zinc-800 text-zinc-400 text-[10px] uppercase font-black"
                        >
                          {p.kategori || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-bold ${
                          p.qty === 0 ? "text-red-500" : p.qty <= 5 ? "text-yellow-400" : "text-emerald-400"
                        }`}
                      >
                        {p.qty}
                        {/* FIX: sebelumnya AlertCircle muncul bahkan saat qty=0
                            Bedain warning (kurang) vs habis */}
                        {p.qty === 0 && (
                          <span className="ml-1 text-[9px] font-black text-red-500">HABIS</span>
                        )}
                        {p.qty > 0 && p.qty <= 5 && (
                          <AlertCircle className="inline ml-1 w-3 h-3 text-yellow-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-zinc-300">
                        Rp{(p.harga ?? 0).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={() => handleToggleStatus(p.id, p.is_active)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                          title="Edit produk"
                        >
                          <Pencil size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <BatchModal
        open={isBatchOpen}
        onClose={handleCloseBatch}
        batchItems={batchItems}
        setBatchItems={setBatchItems}
        onSave={handleSaveBatch}
        isSaving={isBatchSaving}
      />

      <EditModal
        open={isEditOpen}
        onClose={handleCloseEdit}
        form={editForm}
        setForm={setEditForm}
        onSave={handleSaveEdit}
        isSaving={isEditSaving}
      />
    </Layout>
  );
}
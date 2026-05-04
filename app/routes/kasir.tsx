"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Label } from "~/components/ui/label";
import { Search, ShoppingCart, Trash2, PackageX } from "lucide-react";
import Layout from "~/components/ui/layout";
import { createClient } from "~/lib/client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Product {
  id: number;
  nama_product: string;
  kategori: string;
  harga: number;
  qty: number;
  image: string;
  is_active: boolean;
}

interface CartItem {
  id: number;
  nama: string;
  harga: number;
  qty: number;
}

interface QtyDialogState {
  open: boolean;
  product: Product | null;
  value: string;
  error: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatRp(n: number): string {
  // FIX: sebelumnya nggak ada type, kalau n = undefined/null → "Rp NaN"
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

// ─────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────
function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
}) {
  const habis = product.qty <= 0;

  return (
    <div
      className={`bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden flex flex-col transition-opacity ${
        habis ? "opacity-50" : ""
      }`}
    >
      <div className="aspect-square overflow-hidden bg-zinc-700">
        {product.image ? (
          <img
            src={`/assets/img/${product.image}`}
            alt={product.nama_product}
            className="w-full h-full object-cover"
            // FIX: infinite loop kalau fallback juga error — set onerror=null dulu
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%2327272a'/%3E%3C/svg%3E";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
            No image
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-blue-400">
          {product.kategori || "—"}
        </p>
        <p className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-2">
          {product.nama_product}
        </p>
        <p className={`text-xs ${habis ? "text-red-400" : "text-zinc-400"}`}>
          Stok: {product.qty}
          {habis ? " (Habis)" : ""}
        </p>
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-black text-emerald-400">
            {/* FIX: kalau harga null dari DB, sebelumnya "Rp NaN" */}
            {formatRp(product.harga ?? 0)}
          </span>
          <Button
            size="sm"
            className="h-6 text-xs bg-blue-600 hover:bg-blue-500 border-0"
            disabled={habis}
            onClick={() => onAddToCart(product)}
          >
            + Keranjang
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CartItemRow
// ─────────────────────────────────────────────
function CartItemRow({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{item.nama}</p>
        <p className="text-xs text-zinc-400">
          {item.qty} x {formatRp(item.harga)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-emerald-400">
          {formatRp(item.harga * item.qty)}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          className="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> hapus
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Qty Modal via Portal
// FIX: shadcn Dialog kena stacking context dari Layout sidebar
// ─────────────────────────────────────────────
function QtyModal({
  state,
  onClose,
  onConfirm,
  onChange,
}: {
  state: QtyDialogState;
  onClose: () => void;
  onConfirm: () => void;
  onChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus saat buka
  useEffect(() => {
    if (state.open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (state.open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state.open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = state.open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [state.open]);

  if (!state.open || !state.product) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-[90vw] max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl shadow-black/60">
        <h2 className="text-base font-black text-white mb-1">Tambah ke Keranjang</h2>
        <p className="text-sm text-zinc-300 mb-4">
          <span className="font-semibold">{state.product.nama_product}</span>
          {" — "}
          <span className="text-emerald-400 font-bold">Stok: {state.product.qty}</span>
        </p>

        <Label className="text-xs text-zinc-400 mb-1 block">Jumlah</Label>
        <Input
          ref={inputRef}
          type="number"
          min={1}
          max={state.product.qty}
          value={state.value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          className="bg-zinc-950 border-zinc-700 text-white mb-2"
        />
        {state.error && (
          <p className="text-xs text-red-400 mb-3">{state.error}</p>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            onClick={onConfirm}
          >
            Tambah
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Struk DOM builder (untuk window.print)
// ─────────────────────────────────────────────
function isiStrukDOM(cart: CartItem[], total: number, payment: number) {
  const el = document.getElementById("struk-print");
  // FIX: sebelumnya tidak ada guard, kalau el null → silent crash
  if (!el) {
    console.error("struk-print element not found");
    return;
  }

  const now = new Date();
  const waktu =
    now.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    " " +
    now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // FIX: XSS — kalau nama produk dari DB mengandung HTML tags
  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemsHTML = cart
    .map(
      (item) => `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="flex:1">${escapeHtml(item.nama)}</span>
        <span style="margin:0 8px">${item.qty}x</span>
        <span>${formatRp(item.harga * item.qty)}</span>
      </div>`
    )
    .join("");

  const kembalian = Math.max(0, payment - total);

  el.innerHTML = `
    <div style="font-family:monospace;width:300px;margin:0 auto;padding:16px">
      <div style="text-align:center;margin-bottom:12px">
        <h2 style="font-size:16px;font-weight:bold;margin:0">Toko Arya</h2>
        <p style="font-size:10px;margin:4px 0">${waktu}</p>
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin-bottom:8px">
        <div style="font-size:12px">${itemsHTML}</div>
      </div>
      <div style="font-size:12px">
        <div style="display:flex;justify-content:space-between">
          <span>Subtotal</span><span>${formatRp(total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:6px;border-top:1px dashed #000;padding-top:6px">
          <span>TOTAL</span><span>${formatRp(total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:6px;border-top:1px dashed #000;padding-top:6px">
          <span>PAYMENT</span><span>${formatRp(payment)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:6px;border-top:1px dashed #000;padding-top:6px">
          <span>KEMBALIAN</span><span>${formatRp(kembalian)}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:10px">
        <p>Terima kasih sudah berbelanja!</p>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function KasirPage() {
  const supabase = createClient();

  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [qtyDialog, setQtyDialog] = useState<QtyDialogState>({
    open: false,
    product: null,
    value: "",
    error: "",
  });

  // FIX: fetchProducts dipanggil tapi tidak di-useEffect → produk tidak pernah load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        // FIX: tampilkan hanya produk aktif di kasir
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // FIX: error dari supabase diabaikan sebelumnya
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err: any) {
      console.error("Gagal fetch products:", err.message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Derived
  const subtotal = cart.reduce((s, i) => s + i.harga * i.qty, 0);
  const paymentNum = parseInt(payment) || 0;
  const kembalian = paymentNum - subtotal;
  const canCheckout = cart.length > 0 && paymentNum >= subtotal;

  // FIX: filter sebelumnya pakai String(p.id) — id angka, bisa false positive
  // Lebih proper: cari by nama atau kode_product
  const filteredProducts = products.filter((p) => {
    const q = keyword.toLowerCase();
    return (
      p.nama_product?.toLowerCase().includes(q) ||
      // kalau ada field kode_product: p.kode_product?.toLowerCase().includes(q)
      String(p.id) === keyword // exact match id aja
    );
  });

  // ── Cart Logic ──
  const openQtyDialog = useCallback((product: Product) => {
    setQtyDialog({ open: true, product, value: "", error: "" });
  }, []);

  const closeQtyDialog = useCallback(() => {
    setQtyDialog({ open: false, product: null, value: "", error: "" });
  }, []);

  const confirmQty = useCallback(() => {
    const { product, value } = qtyDialog;
    if (!product) return;

    const jumlah = parseInt(value);

    if (!jumlah || jumlah <= 0) {
      setQtyDialog((d) => ({ ...d, error: "Masukkan jumlah minimal 1" }));
      return;
    }
    if (jumlah > product.qty) {
      setQtyDialog((d) => ({
        ...d,
        error: `Stok tidak mencukupi! Maks: ${product.qty}`,
      }));
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx !== -1) {
        const newQty = prev[idx].qty + jumlah;
        if (newQty > product.qty) {
          // FIX: setQtyDialog di dalam setCart callback — tidak reliable
          // Keluarkan ke luar, handle via return value
          return prev; // akan di-handle di bawah
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: newQty };
        return updated;
      }
      return [
        ...prev,
        { id: product.id, nama: product.nama_product, harga: product.harga, qty: jumlah },
      ];
    });

    // FIX: cek overflow setelah setCart, bukan di dalam callback
    const existing = cart.find((i) => i.id === product.id);
    if (existing && existing.qty + jumlah > product.qty) {
      setQtyDialog((d) => ({
        ...d,
        error: `Total di keranjang melebihi stok! Maks: ${product.qty}`,
      }));
      return;
    }

    closeQtyDialog();
  }, [qtyDialog, cart, closeQtyDialog]);

  const hapusItem = useCallback(
    (id: number) => setCart((prev) => prev.filter((i) => i.id !== id)),
    []
  );

  // ── Checkout ──
  const prosesBayar = async () => {
    if (!canCheckout || isProcessing) return;
    setIsProcessing(true);

    try {
      const cartSnapshot = [...cart]; // snapshot sebelum state berubah

      // ── 1. Ambil user_id dari session Supabase ──
    //   const { data: { user }, error: userErr } = await supabase.auth.getUser();
    //   if (userErr || !user) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");

    const sessionRaw = localStorage.getItem("user_session");
    if (!sessionRaw) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
    const user = JSON.parse(sessionRaw);

      // ── 2. Insert ke tabel `transaction` ──
      // Schema: id, total, user_id, created_at, updated_at
      const { data: trx, error: trxErr } = await supabase
        .from("transaction")
        .insert({
          total: subtotal,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (trxErr) throw new Error("Gagal membuat transaksi: " + trxErr.message);

      // ── 3. Insert ke tabel `detail_transaction` ──
      // Schema: id, transaction_id, product_id, qty, price, subtotal
      const detailRows = cartSnapshot.map((item) => ({
        transaction_id: trx.id,
        product_id: item.id,
        qty: item.qty,
        price: item.harga,                  // harga satuan
        subtotal: item.harga * item.qty,    // subtotal per item
      }));

      const { error: detailErr } = await supabase
        .from("detail_transaction")
        .insert(detailRows);

      if (detailErr) throw new Error("Gagal menyimpan detail transaksi: " + detailErr.message);

      // ── 4. Kurangi stok produk ──
      // Lakukan satu per satu karena Supabase tidak support bulk update dengan nilai berbeda-beda
      // Ambil stok terbaru dulu untuk mencegah race condition
      const stockUpdates = cartSnapshot.map(async (item) => {
        // Fetch stok terkini langsung dari DB (bukan dari state UI)
        const { data: latest, error: fetchErr } = await supabase
          .from("products")
          .select("qty")
          .eq("id", item.id)
          .single();

        if (fetchErr) throw new Error(`Gagal cek stok ${item.nama}: ` + fetchErr.message);

        const newQty = (latest.qty ?? 0) - item.qty;
        if (newQty < 0) throw new Error(`Stok ${item.nama} tidak mencukupi saat proses pembayaran.`);

        const { error: updateErr } = await supabase
          .from("products")
          .update({ qty: newQty, updated_at: new Date().toISOString() })
          .eq("id", item.id);

        if (updateErr) throw new Error(`Gagal update stok ${item.nama}: ` + updateErr.message);
      });

      // Jalankan semua update stok secara paralel
      await Promise.all(stockUpdates);

      // ── 5. Print struk ──
      isiStrukDOM(cartSnapshot, subtotal, paymentNum);
      setSuccessMsg(`Berhasil! Total ${formatRp(subtotal)}`);

      window.addEventListener(
        "afterprint",
        () => {
          setCart([]);
          setPayment("");
          setSuccessMsg("");
          fetchProducts(); // refresh grid produk dengan stok terbaru
        },
        { once: true }
      );

      window.print();

    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err.message ?? "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-screen-2xl mx-auto">

          {/* ── Panel Kiri: Produk ── */}
          <section className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">POS</p>
                <h2 className="text-lg font-black text-white">Pilih item belanja</h2>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama produk"
                  className="pl-9 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="p-4 md:p-5">
              {isLoadingProducts ? (
                // FIX: sebelumnya tidak ada loading state → blank screen
                <div className="flex items-center justify-center py-14 text-zinc-500 text-sm gap-2">
                  <span className="animate-spin">⏳</span> Memuat produk...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center py-14 gap-3 text-zinc-500">
                  <PackageX className="w-10 h-10" />
                  <p className="text-sm">
                    {keyword ? "Produk tidak ditemukan." : "Belum ada produk aktif."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={openQtyDialog}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Panel Kanan: Keranjang ── */}
          <aside className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-fit sticky top-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 mb-1">
              Checkout
            </p>
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Keranjang kasir
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {cart.length}
                </Badge>
              )}
            </h3>

            <ScrollArea className="max-h-64 mb-4 pr-1">
              <div className="space-y-2">
                {cart.length === 0 ? (
                  <div className="text-sm text-zinc-500 text-center border border-dashed border-zinc-700 rounded-lg py-6">
                    Belum ada item
                  </div>
                ) : (
                  cart.map((item) => (
                    <CartItemRow key={item.id} item={item} onRemove={hapusItem} />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="mb-4">
              <Label className="text-xs text-zinc-400 mb-1 block">Jumlah Pembayaran</Label>
              <Input
                type="number"
                min={0}
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder="Rp 0"
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="font-bold text-zinc-200">{formatRp(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Pembayaran</span>
                <span className="font-bold text-zinc-200">{formatRp(paymentNum)}</span>
              </div>
              <Separator className="bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold">Total Bayar</span>
                <span className="text-xl font-black text-emerald-400">{formatRp(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold">Kembalian</span>
                <span className={`text-xl font-black ${kembalian < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {formatRp(kembalian >= 0 ? kembalian : 0)}
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white border-0"
              disabled={!canCheckout || isProcessing}
              onClick={prosesBayar}
            >
              {isProcessing ? "Memproses..." : "Proses Pembayaran"}
            </Button>

            {successMsg && (
              <p className="text-xs text-center mt-2 text-emerald-400">{successMsg}</p>
            )}
          </aside>
        </div>

        {/* Struk print */}
        <div id="struk-print" style={{ display: "none" }} />

        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #struk-print, #struk-print * { visibility: visible !important; }
            #struk-print {
              display: block !important;
              position: fixed !important;
              top: 0 !important; left: 0 !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              z-index: 9999 !important;
            }
          }
        `}</style>
      </div>

      {/* Custom Qty Modal via Portal — bebas dari stacking context sidebar */}
      <QtyModal
        state={qtyDialog}
        onClose={closeQtyDialog}
        onConfirm={confirmQty}
        onChange={(val) => setQtyDialog((d) => ({ ...d, value: val, error: "" }))}
      />
    </Layout>
  );
}
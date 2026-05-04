"use client";

import { useEffect, useState } from "react";
import Layout from "~/components/ui/layout";
import { createClient } from "~/lib/client";

export default function SalesPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [filterType, setFilterType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState("");

  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    let query = supabase
      .from("transaction")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterType === "daily" && selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      query = query
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }

    const { data } = await query;

    setTransactions(data || []);

    const total =
      data?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

    setFilteredTotal(total);
  };

  const handleDetail = async (id: number) => {
    const { data } = await supabase
      .from("transaction")
      .select(`
        *,
        detail_transaction (
          qty,
          price,
          subtotal,
          products (
            nama_product
          )
        )
      `)
      .eq("id", id)
      .single();

    setSelectedTx(data);
    setOpen(true);
  };

  const handleRollback = async (id: number) => {
  const confirmDelete = confirm("Yakin mau rollback transaksi ini?");
  if (!confirmDelete) return;

  try {
    // 1. ambil detail transaksi
    const { data: details } = await supabase
      .from("detail_transaction")
      .select("*")
      .eq("transaction_id", id);

    if (!details) return;

    // 2. balikin stok
    for (const item of details) {
      const { data: product } = await supabase
        .from("products")
        .select("qty")
        .eq("id", item.product_id)
        .single();

      const newQty = (product?.qty || 0) + item.qty;

      await supabase
        .from("products")
        .update({ qty: newQty })
        .eq("id", item.product_id);
    }

    // 3. hapus detail
    await supabase
      .from("detail_transaction")
      .delete()
      .eq("transaction_id", id);

    // 4. hapus transaksi
    await supabase
      .from("transaction")
      .delete()
      .eq("id", id);

    alert("Rollback berhasil");

    fetchData(); // refresh
  } catch (err) {
    console.error(err);
    alert("Rollback gagal");
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="p-6 text-zinc-100 bg-zinc-950 min-h-screen">

        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold text-purple-400">
            Riwayat Penjualan
          </h1>
        </div>

        {/* FILTER */}
        <div className="bg-zinc-900 p-4 rounded-xl mb-6 flex gap-4 items-end flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-800 p-2 rounded"
          >
            <option value="daily">Harian</option>
            <option value="all">Semua</option>
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-800 p-2 rounded"
          />

          <button onClick={fetchData} className="bg-purple-600 px-4 py-2 rounded">
            Terapkan
          </button>

          <div className="ml-auto">
            <p className="text-xs text-zinc-500">Total</p>
            <p className="text-emerald-400 font-bold">
              Rp {filteredTotal.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm table-fixed">
  <thead className="bg-zinc-800 text-zinc-400">
    <tr>
      <th className="p-4 text-left w-[15%]">ID</th>
      <th className="w-[40%] text-left">Waktu</th>
      <th className="w-[20%] text-right">Total</th>
      <th className="w-[25%] text-center">Aksi</th>
    </tr>
  </thead>

  <tbody>
    {transactions.map((tx) => (
      <tr key={tx.id} className="border-t border-zinc-800">
        <td className="p-4 text-emerald-400 font-bold">
          #{tx.id}
        </td>

        <td className="text-left">
          {new Date(tx.created_at).toLocaleString()}
        </td>

        <td className="text-right text-emerald-400 font-bold">
          Rp {tx.total?.toLocaleString("id-ID")}
        </td>

        <td className="text-center space-x-3">
          <button
            onClick={() => handleDetail(tx.id)}
            className="text-blue-400 hover:underline"
          >
            Detail
          </button>

          <button
            onClick={() => handleRollback(tx.id)}
            className="text-red-400 hover:underline"
          >
            Batalkan
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
        </div>

        {/* MODAL */}
        {open && selectedTx && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-zinc-900 p-6 rounded-xl w-[500px]">

              <h2 className="text-lg font-bold mb-4">
                Transaksi #{selectedTx.id}
              </h2>

              <p className="text-sm text-zinc-400 mb-4">
                {new Date(selectedTx.created_at).toLocaleString()}
              </p>

              <div className="space-y-3">
                {selectedTx.detail_transaction.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between border-b border-zinc-800 pb-2">
                    <span>{item.products?.nama_product}</span>
                    <span>
                      {item.qty} x Rp {item.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-emerald-400">
                  Rp {selectedTx.total.toLocaleString("id-ID")}
                </span>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-6 w-full bg-red-500 py-2 rounded"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
import { useState, useEffect } from "react";
import Sidebar from "../../components/ui/Sidebar";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Input, Select } from "../../components/ui/Input";
import { ConfirmModal } from "../../components/ui/Modal";
import Modal from "../../components/ui/Modal";
import { IconDashboard, IconAdmin, IconStore, IconShield, IconFolder, IconPackage, IconCreditCard, IconBarChart, IconLogout } from "../../components/ui/Icons";
import PanelHeader from "../../components/ui/PanelHeader";
import { useAuth } from "../../app/contexts/AuthContext";
import { productService, type ProductWithUmkm } from "../../services/product.service";
import { categoryService } from "../../services/category.service";
import type { KategoriProduk, ProductStatus } from "../../types/database.types";
import { sanitizeProductImageUrl, getProductFallbackImage } from "../../lib/imageUtils";

const sidebarItems = [
  { to: "/admin", label: "Dashboard", icon: <IconDashboard className="w-4 h-4" /> },
  { to: "/admin/admins", label: "Manajemen User", icon: <IconAdmin className="w-4 h-4" /> },
  { to: "/admin/umkm", label: "UMKM", icon: <IconStore className="w-4 h-4" /> },
  { to: "/admin/umkm/verify", label: "Verifikasi UMKM", icon: <IconShield className="w-4 h-4" /> },
  { to: "/admin/categories", label: "Kategori", icon: <IconFolder className="w-4 h-4" /> },
  { to: "/admin/products", label: "Produk", icon: <IconPackage className="w-4 h-4" /> },
  { to: "/admin/transactions", label: "Transaksi", icon: <IconCreditCard className="w-4 h-4" /> },
  { to: "/admin/reports", label: "Laporan", icon: <IconBarChart className="w-4 h-4" /> },
  { to: "/login", label: "Keluar", icon: <IconLogout className="w-4 h-4" /> },
];

function formatRp(n: number) { return "Rp" + n.toLocaleString("id-ID"); }

export default function AdminProductMonitorPage() {
  const { profile, logout } = useAuth();
  const [products, setProducts] = useState<ProductWithUmkm[]>([]);
  const [categories, setCategories] = useState<KategoriProduk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [fkBlockedProduct, setFkBlockedProduct] = useState<ProductWithUmkm | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await productService.getAllProducts(catFilter || undefined, search || undefined);
      if (error) throw error;
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCategories() {
      const { data } = await categoryService.getKategoriProduk();
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [catFilter, search]);

  const handleToggleStatus = async (productId: string, currentStatus: ProductStatus) => {
    setStatusLoadingId(productId);
    try {
      const nextStatus: ProductStatus = currentStatus === "AKTIF" ? "NONAKTIF" : "AKTIF";
      const { error } = await productService.updateProduct(productId, { status: nextStatus });
      if (error) {
        alert("Gagal mengubah status produk: " + error.message);
      } else {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: nextStatus } : p));
      }
    } catch (err: unknown) {
      alert("Error: " + ((err as Error).message || "Gagal mengubah status"));
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await productService.deleteProduct(deleteId);
      if (error) {
        if ((error as any).isForeignKeyConstraint) {
          const blocked = products.find(p => p.id === deleteId) || null;
          setDeleteId(null);
          setFkBlockedProduct(blocked);
        } else {
          alert("Gagal menghapus produk: " + error.message);
        }
      } else {
        setProducts(prev => prev.filter(p => p.id !== deleteId));
        setDeleteId(null);
      }
    } catch (err: unknown) {
      alert("Error: " + ((err as Error).message || "Gagal"));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = products.filter((p) => {
    if (!stockFilter) return true;
    const totalStock = p.product_variants?.reduce((sum, v) => sum + (v.stock_levels?.sisa_stok ?? 0), 0) ?? 0;
    if (stockFilter === "out") return totalStock === 0;
    if (stockFilter === "low") return totalStock > 0 && totalStock <= 10;
    return true;
  });

  const columns = [
    {
      key: "image",
      header: "Foto",
      render: (r: ProductWithUmkm) => {
        const fallback = getProductFallbackImage(r.kategori_produk?.nama_kategori || r.nama_produk);
        return (
          <img
            src={sanitizeProductImageUrl(r.gambar_url, r.kategori_produk?.nama_kategori || r.nama_produk)}
            alt={r.nama_produk}
            className="w-12 h-12 rounded-xl object-cover border border-[#E8E6E1]"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallback;
            }}
          />
        );
      },
    },
    {
      key: "name",
      header: "Produk",
      render: (r: ProductWithUmkm) => (
        <div>
          <span className="font-semibold text-[#1A1714] block">{r.nama_produk}</span>
          {r.product_variants?.length > 1 && (
            <span className="text-[11px] text-[#A07C10] font-medium">{r.product_variants.length} Varian</span>
          )}
        </div>
      ),
    },
    {
      key: "umkm",
      header: "UMKM",
      render: (r: ProductWithUmkm) => (
        <span className="text-[#C9A227] font-semibold text-[13px]">
          {r.umkm?.nama_toko || "UMKM"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (r: ProductWithUmkm) => (
        <span className="text-[13px] text-[#6B6B6B]">{r.kategori_produk?.nama_kategori || "-"}</span>
      ),
    },
    {
      key: "price",
      header: "Harga",
      render: (r: ProductWithUmkm) => {
        const price = r.product_variants?.[0]?.harga ?? 0;
        return <span className="text-[13px] font-medium text-[#202020]">{formatRp(price)}</span>;
      },
    },
    {
      key: "stock",
      header: "Stok",
      render: (r: ProductWithUmkm) => {
        const totalStock = r.product_variants?.reduce((sum, v) => sum + (v.stock_levels?.sisa_stok ?? 0), 0) ?? 0;
        return (
          <span className={totalStock === 0 ? "text-[#D9534F] font-bold text-[13px]" : "text-[13px] text-[#202020]"}>
            {totalStock === 0 ? "Habis (0)" : totalStock}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r: ProductWithUmkm) => <StatusBadge status={r.status as "AKTIF" | "NONAKTIF"} type="verify" />,
    },
    {
      key: "action",
      header: "Aksi",
      render: (r: ProductWithUmkm) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className={
              r.status === "AKTIF"
                ? "text-[#B7791F] border-[#B7791F]/30 hover:bg-[#FFFBEB]"
                : "text-[#2B8A3E] border-[#2B8A3E]/30 hover:bg-[#EBFBEE]"
            }
            disabled={statusLoadingId === r.id}
            onClick={() => handleToggleStatus(r.id, r.status as ProductStatus)}
          >
            {statusLoadingId === r.id ? "..." : r.status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteId(r.id)}>
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">
      <Sidebar
        items={sidebarItems}
        onItemClick={(item) => {
          if (item.to === "/login") logout();
        }}
        logo={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#C9A227] rounded-[9px] flex items-center justify-center shadow-[0_2px_8px_rgba(201,162,39,0.35)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L4 7.5v7h10v-7L9 2z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7 14.5v-4h4v4" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-[13px] text-white">Aqra<span className="text-[#C9A227]">One</span></p>
              <p className="text-[10px] text-white/40 tracking-wide">Admin Panel</p>
            </div>
          </div>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PanelHeader
          title="Monitoring Produk"
          subtitle={`Semua produk UMKM di platform · ${products.length} produk terdaftar`}
          avatarLabel={profile?.nama?.[0]?.toUpperCase() || "A"}
          notifCount={0}
        />
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Select
              options={[
                { value: "", label: "Semua Kategori" },
                ...categories.map((c) => ({ value: c.id, label: `${c.icon || ""} ${c.nama_kategori}`.trim() })),
              ]}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            />
            <Select
              options={[
                { value: "", label: "Semua Stok" },
                { value: "low", label: "Stok Rendah (≤ 10)" },
                { value: "out", label: "Stok Habis (0)" },
              ]}
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            />
          </div>
          <div className="bg-white rounded-[18px] border border-[#E8E6E1] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {loading ? (
              <div className="py-16 text-center text-sm text-[#8A8780] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                <p>Memuat produk UMKM dari Supabase...</p>
              </div>
            ) : (
              <Table columns={columns} data={filtered} emptyMessage="Tidak ada produk yang ditemukan." />
            )}
          </div>
        </main>
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Produk dari Platform"
        message="Apakah Admin yakin ingin menghapus produk ini dari marketplace? Produk dan seluruh variannya akan dihapus secara permanen dari Supabase."
        confirmLabel={deleting ? "Menghapus..." : "Ya, Hapus Produk"}
      />

      {fkBlockedProduct && (
        <Modal
          open={!!fkBlockedProduct}
          onClose={() => setFkBlockedProduct(null)}
          title="Produk Terhubung Transaksi Pembeli"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="secondary" size="sm" onClick={() => setFkBlockedProduct(null)}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (fkBlockedProduct) {
                    await handleToggleStatus(fkBlockedProduct.id, "AKTIF");
                    setFkBlockedProduct(null);
                  }
                }}
              >
                Nonaktifkan Produk Saja
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-[#505050]">
            <p>
              Produk <strong className="text-[#1A1714] font-semibold">{fkBlockedProduct.nama_produk}</strong> sudah memiliki catatan transaksi/pesanan pembeli di database Supabase (tabel <code className="bg-[#F0EEE6] px-1.5 py-0.5 rounded text-[12px] font-mono">order_items</code>).
            </p>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-[13px] text-[#92400E] space-y-1">
              <p className="font-semibold">💡 Solusi yang direkomendasikan:</p>
              <p>
                Klik tombol <strong>"Nonaktifkan Produk Saja"</strong> di bawah. Produk akan langsung disembunyikan dari katalog toko & pembeli tanpa merusak riwayat transaksi.
              </p>
            </div>
            <p className="text-[12px] text-[#8A8780]">
              *Catatan: Jika Anda sedang testing dan ingin menghapus produk beserta seluruh riwayat pesanannya secara permanen dari Supabase, jalankan file migrasi <code className="font-mono text-[#202020]">supabase/migrations/fix_product_delete_constraint.sql</code> di Supabase SQL Editor.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

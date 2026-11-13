-- ==============================================================================
-- FIX CONSTRAINT: IZINKAN HAPUS PRODUK TANPA TERHALANG RIWAYAT ORDER_ITEMS
-- File: fix_product_delete_constraint.sql
-- ==============================================================================
-- Masalah:
-- Saat menghapus produk, tabel `product_variants` mencoba menghapus variannya (CASCADE),
-- namun dicegah oleh constraint `order_items_varian_id_fkey` yang berstatus ON DELETE RESTRICT.
--
-- Solusi:
-- Mengubah foreign key constraint pada tabel `order_items` agar ON DELETE CASCADE.
-- Dengan ini, jika sebuah produk/varian dihapus permanen, baris item pesanan terkait
-- akan otomatis ikut terhapus secara aman.
--
-- Jalankan query berikut di Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/vjvwtlckhdhygpyplrtp/editor
-- ==============================================================================

-- 1. Lepas constraint lama dan pasang constraint baru dengan ON DELETE CASCADE
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_varian_id_fkey;

ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_varian_id_fkey 
FOREIGN KEY (varian_id) 
REFERENCES public.product_variants(id) 
ON DELETE CASCADE;

-- 2. Tambahkan policy DELETE untuk order_items (Admin & Pemilik UMKM)
DROP POLICY IF EXISTS "Admin and UMKM can delete order items" ON public.order_items;
CREATE POLICY "Admin and UMKM can delete order items"
    ON public.order_items FOR DELETE
    USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.umkm u ON u.id = o.umkm_id
        WHERE o.id = order_items.order_id AND u.user_id = auth.uid()
    ));

-- 3. (Opsional / Info) Cek apakah constraint sudah CASCADE:
SELECT
    conname AS constraint_name,
    confdeltype AS delete_action -- 'c' = CASCADE, 'r' = RESTRICT, 'n' = SET NULL
FROM pg_constraint
WHERE conname = 'order_items_varian_id_fkey';


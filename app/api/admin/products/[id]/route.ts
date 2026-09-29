import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isUuid, parseJsonObject, validateProductInput } from "@/lib/validation";
import { randomUUID } from "crypto";
import { invalidateCache } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const supabase = createAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("*, product_variants(*), product_images(*)")
    .eq("id", id)
    .single();

  if (error) {
    logServerError("Admin product lookup failed", error, { productId: id });
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 200_000) {
    return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = parseJsonObject(body);
  const result = validateProductInput(payload, true);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const { name, description, base_price, discount_percent, category, is_active, images, variants } = result.value;

  const supabase = createAdminClient();

  // Build update payload using only defined fields (typed explicitly for Supabase compatibility)
  type ProductUpdate = {
    name?: string;
    description?: string | null;
    base_price?: number;
    discount_percent?: number;
    category?: string | null;
    is_active?: boolean;
  };
  const updateData: ProductUpdate = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (base_price !== undefined) updateData.base_price = base_price;
  if (discount_percent !== undefined) updateData.discount_percent = discount_percent;
  if (category !== undefined) updateData.category = category;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: product, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select("name, slug, category, description")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update product" }, { status: 500 });

  if (images !== undefined) {
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to update product images" }, { status: 500 });
    }

    if (images.length > 0) {
      const { error: imgError } = await supabase.from("product_images").insert(
        images.map((url, index) => ({
          product_id: id,
          url,
          position: index,
        }))
      );
      if (imgError) {
        return NextResponse.json({ error: "Failed to create product images" }, { status: 500 });
      }
    }
  }

  if (variants !== undefined) {
    // 1. Get all current variant IDs in database
    const { data: currentVariants, error: fetchVarError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", id);

    if (fetchVarError) {
      return NextResponse.json({ error: "Failed to load product variants" }, { status: 500 });
    }

    const currentIds = currentVariants.map((v) => v.id);
    const incomingIds = variants.filter((v) => v.id).map((v) => v.id as string);

    // 2. Delete variants that were removed
    const idsToDelete = currentIds.filter((dbId) => !incomingIds.includes(dbId));
    if (idsToDelete.length > 0) {
      const { error: delVarError } = await supabase
        .from("product_variants")
        .delete()
        .in("id", idsToDelete);

      if (delVarError) {
        return NextResponse.json({ error: "Failed to delete product variants" }, { status: 500 });
      }
    }

    // 3. Update existing variants & Insert new ones
    for (const v of variants) {
      const generatedSku = v.sku?.trim() || `${product.slug}-${v.size || "ALL"}-${v.color || "ALL"}-${randomUUID().slice(0, 8)}`.toUpperCase();
      const variantData = {
        product_id: id,
        size: v.size || "M",
        color: v.color || "Black",
        sku: generatedSku,
        stock_qty: v.stock_qty ?? 0,
        price_override: v.price_override || null,
      };

      if (v.id) {
        const { error: updVarError } = await supabase
          .from("product_variants")
          .update(variantData)
          .eq("id", v.id);

        if (updVarError) {
          return NextResponse.json({ error: "Failed to update product variant" }, { status: 500 });
        }
      } else {
        const { error: insVarError } = await supabase
          .from("product_variants")
          .insert(variantData);

        if (insVarError) {
          return NextResponse.json({ error: "Failed to create product variant" }, { status: 500 });
        }
      }
    }
  }

  // On-demand ISR: bust caches immediately so the edit shows right away
  try {
    await invalidateCache(
      "cache:store:home-products",
      product?.slug ? `cache:store:product:${product.slug}` : "",
      category ? `cache:store:category:${category}` : ""
    );
    if (product?.slug) {
      revalidatePath(`/products/${product.slug}`);
    }
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidateTag("products");
    revalidateTag("home-products");
  } catch {}

  // Refresh AI embedding in background
  (async () => {
    try {
      const textToEmbed = [
        name ?? product.name,
        (category ?? product.category) ? `Category: ${category ?? product.category}` : "",
        (description ?? product.description) ? `Description: ${description ?? product.description}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      const { generateTextEmbedding } = await import("@/lib/ai/embeddings");
      const embedding = await generateTextEmbedding(textToEmbed);
      if (embedding) {
        await (supabase.from("products") as any).update({ embedding: embedding as any }).eq("id", id);
      }
    } catch (embErr) {
      logServerError("Background product embedding update failed", embErr);
    }
  })();

  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  const supabase = createAdminClient();

  // Soft delete — keeps order history intact for past purchases of this product.
  const { data: updatedProduct, error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .select("slug, category")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  
  try {
    await invalidateCache(
      "cache:store:home-products",
      updatedProduct?.slug ? `cache:store:product:${updatedProduct.slug}` : "",
      updatedProduct?.category ? `cache:store:category:${updatedProduct.category}` : ""
    );
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidateTag("products");
    revalidateTag("home-products");
  } catch {}

  return NextResponse.json({ success: true });
}

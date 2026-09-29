export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<RowType, InsertType = Partial<RowType>, UpdateType = Partial<RowType>> = {
  Row: RowType;
  Insert: InsertType;
  Update: UpdateType;
  Relationships: [];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  discount_percent: number;
  category: string | null;
  is_active: boolean;
  embedding?: number[] | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string;
  stock_qty: number;
  price_override: number | null;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  position: number;
};

export type Order = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "processing" | "shipped" | "fulfilled" | "cancelled" | "refunded";
  total: number;
  shipping_address: Json;
  payment_status: "unpaid" | "paid" | "failed";
  payment_method: "stripe" | "cod" | "jazzcash" | "easypaisa";
  payment_reference: string | null;
  courier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  price_at_purchase: number;
};

export type Cart = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  variant_id: string;
  qty: number;
  created_at: string;
};

export type StoreBanner = {
  id: string;
  is_active: boolean;
  media_type: "video" | "image";
  video_url: string | null;
  image_url: string | null;
  poster_url: string | null;
  badge_text: string | null;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text: string | null;
  secondary_cta_link: string | null;
  overlay_opacity: number;
  banner_height?: "screen" | "tall" | "standard" | null;
  image_fit?: "cover" | "contain" | null;
  updated_at: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string | null;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string | null;
  comment: string;
  is_verified_buyer: boolean;
  status: "approved" | "pending" | "rejected";
  helpful_count: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      products: TableDefinition<Product>;
      product_variants: TableDefinition<ProductVariant>;
      product_images: TableDefinition<ProductImage>;
      carts: TableDefinition<Cart>;
      cart_items: TableDefinition<CartItem>;
      orders: TableDefinition<Order>;
      order_items: TableDefinition<OrderItem>;
      store_banners: TableDefinition<StoreBanner>;
      product_reviews: TableDefinition<ProductReview>;
    };
    Views: Record<string, never>;
    Functions: {
      create_pending_order: {
        Args: { p_user_id: string; p_shipping_address: Json; p_items: Json };
        Returns: Json;
      };
      create_cod_order: {
        Args: { p_user_id: string; p_shipping_address: Json; p_items: Json };
        Returns: Json;
      };
      finalize_stripe_order: {
        Args: { p_order_id: string; p_payment_reference: string; p_amount_minor: number; p_currency: string };
        Returns: Json;
      };
      transition_order_status: {
        Args: { p_order_id: string; p_status: Order["status"]; p_courier?: string | null; p_tracking_number?: string | null };
        Returns: Json;
      };
    };
    Enums: {
      order_status: Order["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ProductCard = Pick<Product, "id" | "name" | "slug" | "base_price" | "discount_percent"> & {
  product_images: Pick<ProductImage, "url" | "position">[];
};

export type ProductDetails = Pick<Product, "id" | "name" | "description" | "base_price" | "discount_percent"> & {
  product_images: Pick<ProductImage, "url" | "position">[];
  product_variants: Pick<ProductVariant, "id" | "size" | "color" | "stock_qty" | "price_override">[];
};

export type OrderItemWithProduct = Pick<OrderItem, "id" | "qty" | "price_at_purchase"> & {
  product_variants: (Pick<ProductVariant, "size" | "color"> & {
    products: Pick<Product, "name"> | null;
  }) | null;
};

export type CustomerOrder = Pick<
  Order,
  "id" | "status" | "total" | "payment_status" | "payment_method" | "payment_reference" | "created_at" | "courier" | "tracking_number" | "shipped_at"
> & {
  order_items: OrderItemWithProduct[];
};

export type ShippingAddressRecord = {
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  address: string;
  houseNumber?: string | null;
  streetAddress?: string | null;
  landmark?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  addressType?: "home" | "office" | "other" | null;
  deliveryNotes?: string | null;
};

export type AdminOrder = Pick<
  Order,
  "id" | "status" | "total" | "payment_status" | "payment_method" | "payment_reference" | "created_at" | "courier" | "tracking_number" | "shipped_at"
> & {
  shipping_address: ShippingAddressRecord;
  order_items: OrderItemWithProduct[];
};

export type AdminProduct = Pick<Product, "id" | "name" | "slug" | "description" | "base_price" | "discount_percent" | "category" | "is_active"> & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

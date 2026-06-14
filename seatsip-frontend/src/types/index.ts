export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
  wallet_balance: number;
  loyalty_points: number;
  loyalty_tier?: string;
  terms_accepted_at?: string;
  created_at: string;
}

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  image_url?: string;
  images: string; // JSON array string
  rating: number;
  review_count: number;
  reviewCount?: number; // UI Alias
  price_level: number;
  is_open: number;
  open_time: string;
  close_time: string;
  wifi: number;
  parking: number;
  pet_friendly: number;
  moods: string; // JSON array string
  tags: any;    // Can be JSON string or parsed array
  prep_time_minutes: number;
  delivery_fee: number;
  min_order: number;
  emoji?: string;
  coverColor?: string;
  distance?: string;
  walkTime?: string;
  discount?: string;
}

export interface Table {
  id: string;
  cafe_id: string;
  table_number: string;
  capacity: number;
  floor: string;
  position_x: number;
  position_y: number;
  is_available: number;
}

export interface MenuCategory {
  id: string;
  cafe_id: string;
  name: string;
  description?: string;
  sort_order: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  cafe_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: number;
  is_veg: number;
  is_popular: number;
  prep_time_minutes: number;
  calories?: number;
  tags?: string[];
  caffeine?: number;
  prep_time?: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  user_id: string;
  cafe_id: string;
  cafe_name: string;
  cafe_image: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  order_type: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  payment_status: string;
  payment_method: string;
  special_instructions?: string;
  estimated_ready_at?: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  cafe_id: string;
  cafe_name: string;
  cafe_image: string;
  cafe_address: string;
  table_id?: string;
  table_number?: string;
  table_capacity?: number;
  table_floor?: string;
  date: string;
  time: string;
  duration_minutes: number;
  party_size: number;
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  special_requests?: string;
  pre_order_items: OrderItem[];
  pre_order_total: number;
  confirmation_code: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  cafe_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  menu_item_id: string;
  cafe_id: string;
  cafe_name: string;
  name: string;
  price: number;
  image_url?: string;
  is_veg: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: number;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  type: 'TOPUP' | 'DEBIT' | 'REFUND';
  amount: number;
  description: string;
  created_at: string;
}

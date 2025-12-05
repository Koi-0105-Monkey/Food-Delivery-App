import { Models } from "react-native-appwrite";

export interface MenuItem extends Models.Document {
    name: string;
    price: number;
    image_url: string;
    description: string;
    calories: number;
    protein: number;
    rating: number;
    type: string;
}

export interface Category extends Models.Document {
    name: string;
    description: string;
}

export interface User extends Models.Document {
    name: string;
    email: string;
    avatar: string;
    phone: string;
}

export interface Address {
    $id?: string;
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    isDefault: boolean;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface CartCustomization {
    id: string;
    name: string;
    price: number;
    type: string;
}

export interface CartItemType {
    id: string; // menu item id
    name: string;
    price: number;
    image_url: string;
    quantity: number;
    customizations?: CartCustomization[];
}

export interface CartStore {
    items: CartItemType[];
    addItem: (item: Omit<CartItemType, "quantity">) => void;
    removeItem: (id: string, customizations: CartCustomization[]) => void;
    increaseQty: (id: string, customizations: CartCustomization[]) => void;
    decreaseQty: (id: string, customizations: CartCustomization[]) => void;
    clearCart: () => Promise<void>;
    loadCartFromServer: () => Promise<void>; // 👈 Thêm method mới
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

interface TabBarIconProps {
    focused: boolean;
    icon: ImageSourcePropType;
    title: string;
}

interface PaymentInfoStripeProps {
    label: string;
    value: string;
    labelStyle?: string;
    valueStyle?: string;
}

interface CustomButtonProps {
    onPress?: () => void;
    title?: string;
    style?: string;
    leftIcon?: React.ReactNode;
    textStyle?: string;
    isLoading?: boolean;
}

interface CustomHeaderProps {
    title?: string;
}

interface CustomInputProps {
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    label: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

interface ProfileFieldProps {
    label: string;
    value: string;
    icon: ImageSourcePropType;
}

interface CreateUserParams {
    email: string;
    password: string;
    name: string;
}

interface SignInParams {
    email: string;
    password: string;
}

interface GetMenuParams {
    category: string;
    query: string;
}

// type.d.ts - Thêm vào file type.d.ts hiện có

export type PaymentMethod = 'cod' | 'bidv' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';

export interface PaymentInfo {
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    qrCodeUrl?: string;
    paidAt?: string;
}

export interface OrderItem {
    menu_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url: string;
    customizations?: CartCustomization[];
}

export interface Order extends Models.Document {
    user: string; // Relationship attribute (userId)
    order_number: string;
    items: string; // JSON string of OrderItem[]
    
    // Pricing
    subtotal: number;
    delivery_fee: number;
    discount: number;
    total: number;
    
    // Delivery Info
    delivery_address: string;
    delivery_phone: string;
    delivery_notes?: string;
    
    // Payment
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    transaction_id?: string;
    qr_code_url?: string;
    paid_at?: string;
    
    // Order Status
    order_status: OrderStatus;
    
    // ✅ Timestamps - Dùng $createdAt và $updatedAt có sẵn của Appwrite
    // $createdAt: string;
    // $updatedAt: string;
}

export interface CardPaymentData {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;  // ✅ Dùng format MM/YY (đơn giản hơn)
    cvv: string;
}

export interface QRCodeData {
    bank: 'momo' | 'agribank';
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    qrUrl: string;
}
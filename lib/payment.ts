// lib/payment.ts - UPDATED VERSION

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order, QRCodeData } from '@/type';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

/**
 * Tạo số order duy nhất
 */
function generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * Generate QR Code cho thanh toán Momo với STK của bạn
 */
export function generatePaymentQR(params: {
    amount: number;
    orderNumber: string;
}): QRCodeData {
    const { amount, orderNumber } = params;
    
    // ✅ Thông tin Momo của bạn
    const momoConfig = {
        accountNumber: '0896494752', // ✅ STK Momo của bạn
        accountName: 'HUYNH DUC KHOI', // ✅ Tên của bạn (viết hoa không dấu)
    };
    
    const description = `Payment ${orderNumber}`;
    
    // ✅ Generate QR URL với STK của bạn
    // VietQR hỗ trợ tạo dynamic QR với số tiền
    const qrUrl = `https://img.vietqr.io/image/MOMO-${momoConfig.accountNumber}-compact.jpg?amount=${amount}&addInfo=${encodeURIComponent(description)}`;
    
    return {
        bank: 'momo',
        accountNumber: momoConfig.accountNumber,
        accountName: momoConfig.accountName,
        amount,
        description,
        qrUrl,
    };
}

/**
 * Tạo đơn hàng mới
 */
export async function createOrder(userId: string, params: CreateOrderParams): Promise<Order> {
    try {
        const orderNumber = generateOrderNumber();
        
        let qrCodeUrl: string | undefined;
        
        // Nếu thanh toán Momo, tạo QR code
        if (params.payment_method === 'momo') {
            const qrData = generatePaymentQR({
                amount: params.total,
                orderNumber,
            });
            qrCodeUrl = qrData.qrUrl;
        }
        
        // ✅ BỎ created_at và updated_at - Dùng $createdAt và $updatedAt có sẵn
        const orderDoc = await databases.createDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            ID.unique(),
            {
                user: userId,
                order_number: orderNumber,
                items: JSON.stringify(params.items),
                
                subtotal: params.subtotal,
                delivery_fee: params.delivery_fee,
                discount: params.discount,
                total: params.total,
                
                delivery_address: params.delivery_address,
                delivery_phone: params.delivery_phone,
                delivery_notes: params.delivery_notes || '',
                
                payment_method: params.payment_method,
                payment_status: 'pending',
                qr_code_url: qrCodeUrl || '',
                
                order_status: 'pending',
            }
        );
        
        console.log('✅ Order created:', orderNumber);
        return orderDoc as Order;
    } catch (error: any) {
        console.error('❌ Create order error:', error);
        throw new Error(error.message || 'Failed to create order');
    }
}

/**
 * Lấy danh sách đơn hàng của user
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
    try {
        const orders = await databases.listDocuments(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            [
                Query.equal('user', userId),
                Query.orderDesc('$createdAt'), // ✅ Dùng $createdAt có sẵn
                Query.limit(100),
            ]
        );
        
        return orders.documents as Order[];
    } catch (error: any) {
        console.error('❌ Get orders error:', error);
        return [];
    }
}

/**
 * Lấy chi tiết đơn hàng
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
    try {
        const order = await databases.getDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId
        );
        
        return order as Order;
    } catch (error: any) {
        console.error('❌ Get order error:', error);
        return null;
    }
}

/**
 * Cập nhật trạng thái thanh toán
 */
export async function updatePaymentStatus(
    orderId: string,
    status: 'paid' | 'failed',
    transactionId?: string
): Promise<void> {
    try {
        // ✅ BỎ updated_at - Appwrite tự động update $updatedAt
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                payment_status: status,
                transaction_id: transactionId || '',
                paid_at: status === 'paid' ? new Date().toISOString() : '',
                order_status: status === 'paid' ? 'confirmed' : 'pending',
            }
        );
        
        console.log('✅ Payment status updated:', status);
    } catch (error: any) {
        console.error('❌ Update payment error:', error);
        throw new Error(error.message || 'Failed to update payment');
    }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
export async function updateOrderStatus(
    orderId: string,
    status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
): Promise<void> {
    try {
        // ✅ BỎ updated_at
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                order_status: status,
            }
        );
        
        console.log('✅ Order status updated:', status);
    } catch (error: any) {
        console.error('❌ Update order status error:', error);
        throw new Error(error.message || 'Failed to update order status');
    }
}

/**
 * Hủy đơn hàng
 */
export async function cancelOrder(orderId: string): Promise<void> {
    try {
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                order_status: 'cancelled',
                payment_status: 'cancelled',
            }
        );
        
        console.log('✅ Order cancelled');
    } catch (error: any) {
        console.error('❌ Cancel order error:', error);
        throw new Error(error.message || 'Failed to cancel order');
    }
}

/**
 * Lấy orders theo status
 */
export async function getOrdersByStatus(
    userId: string,
    status: string
): Promise<Order[]> {
    try {
        const orders = await databases.listDocuments(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            [
                Query.equal('user', userId),
                Query.equal('order_status', status),
                Query.orderDesc('$createdAt'), // ✅ Dùng $createdAt
            ]
        );
        
        return orders.documents as Order[];
    } catch (error: any) {
        console.error('❌ Get orders by status error:', error);
        return [];
    }
}
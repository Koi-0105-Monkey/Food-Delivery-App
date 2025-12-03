// lib/payment.ts - BIDV PAYMENT VIA SEPAY

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order } from '@/type';
import { generateSepayBIDVQR } from './sepay-bidv';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * ✅ TẠO QR PAYMENT - BIDV qua Sepay
 */
export async function createQRPayment(
    orderNumber: string, 
    amount: number
): Promise<{
    success: boolean;
    bidv?: any;
    message?: string;
    orderId?: string;
}> {
    try {
        if (amount < 1000) {
            return {
                success: false,
                message: 'Số tiền tối thiểu là 1,000đ',
            };
        }

        console.log('✅ Tạo QR Payment BIDV');
        console.log('💰 Số tiền:', amount.toLocaleString('vi-VN') + 'đ');
        console.log('📝 Đơn hàng:', orderNumber);

        // Generate BIDV QR code
        const paymentData = generateSepayBIDVQR(amount, orderNumber);

        console.log('🏦 BIDV QR:', paymentData.qrCodeUrl);

        return {
            success: true,
            bidv: paymentData,
            orderId: orderNumber,
        };

    } catch (error: any) {
        console.error('❌ Payment error:', error);
        return {
            success: false,
            message: error.message || 'Không thể tạo thanh toán',
        };
    }
}

/**
 * ✅ Polling payment status - Check mỗi 3s
 */
export async function pollPaymentStatus(
    orderId: string, 
    maxAttempts = 60,
    intervalMs = 3000
): Promise<boolean> {
    let attempts = 0;

    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            attempts++;

            try {
                const order = await getOrderById(orderId);
                
                if (order) {
                    if (order.payment_status === 'paid') {
                        console.log('✅ Thanh toán thành công qua webhook!');
                        clearInterval(interval);
                        resolve(true);
                    } else if (order.payment_status === 'failed') {
                        console.log('❌ Thanh toán thất bại');
                        clearInterval(interval);
                        resolve(false);
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.log('⏰ Hết thời gian chờ');
                    clearInterval(interval);
                    resolve(false);
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    resolve(false);
                }
            }
        }, intervalMs);
    });
}

/**
 * Tạo order
 */
export async function createOrder(userId: string, params: CreateOrderParams): Promise<Order> {
    try {
        const orderNumber = generateOrderNumber();
        
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
                qr_code_url: '',
                order_status: 'pending',
            }
        );
        
        console.log('✅ Đơn hàng đã tạo:', orderNumber);
        return orderDoc as Order;
    } catch (error: any) {
        console.error('❌ Lỗi tạo đơn:', error);
        throw new Error(error.message || 'Không thể tạo đơn hàng');
    }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
    try {
        const orders = await databases.listDocuments(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            [
                Query.equal('user', userId),
                Query.orderDesc('$createdAt'),
                Query.limit(100),
            ]
        );
        
        return orders.documents as Order[];
    } catch (error: any) {
        console.error('❌ Get orders error:', error);
        return [];
    }
}

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

export async function updatePaymentStatus(
    orderId: string,
    status: 'paid' | 'failed',
    transactionId?: string,
    receivedAmount?: number
): Promise<void> {
    try {
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                payment_status: status,
                transaction_id: transactionId || '',
                paid_at: status === 'paid' ? new Date().toISOString() : '',
                order_status: status === 'paid' ? 'confirmed' : 'pending',
                received_amount: receivedAmount || 0,
            }
        );
        
        console.log(`✅ Cập nhật trạng thái: ${status}`);
    } catch (error: any) {
        console.error('❌ Update payment error:', error);
        throw new Error(error.message || 'Không thể cập nhật thanh toán');
    }
}
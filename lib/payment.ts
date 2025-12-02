// lib/payment.ts - STATIC QR CODE VERSION

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order } from '@/type';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

// ✅ MOMO STATIC QR CONFIG - PRODUCTION với Deep Link
const MOMO_STATIC_QR = {
    partnerCode: 'MOMOEWN820251130',
    storeName: 'AKESHOP',
    phoneNumber: '0896494752',
    qrCodeId: '2618615',
    storeCode: 'Y5jsCuVYUpbrzOsW',
};

/**
 * ✅ Generate Momo Deep Link với amount và comment tự động
 */
function generateMomoDeepLink(amount: number, orderNumber: string): string {
    const phone = MOMO_STATIC_QR.phoneNumber;
    const comment = encodeURIComponent(`Order ${orderNumber}`);
    
    // Momo App Deep Link format
    return `momo://app?action=transfer&phone=${phone}&amount=${amount}&comment=${comment}`;
}

/**
 * ✅ Generate QR Code URL (dùng API khác)
 */
function generateQRCodeUrl(deepLink: string): string {
    const encodedLink = encodeURIComponent(deepLink);
    // Dùng API QR code generator miễn phí
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedLink}`;
}

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * ✅ STATIC QR PAYMENT - Generate deep link với amount và comment
 */
export async function createStaticQRPayment(
    orderNumber: string, 
    amount: number
): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    deepLink?: string;
    message?: string;
    orderId?: string;
}> {
    try {
        if (amount < 1000) {
            return {
                success: false,
                message: 'Minimum amount is 1,000đ',
            };
        }

        console.log('✅ Using Static QR Payment');
        console.log('💰 Amount:', amount.toLocaleString('vi-VN') + 'đ');
        console.log('🏪 Store:', MOMO_STATIC_QR.storeName);
        console.log('📝 Order:', orderNumber);

        // ✅ Generate Momo Deep Link với amount + comment
        const deepLink = generateMomoDeepLink(amount, orderNumber);
        
        // ✅ Generate QR Code từ deep link
        const qrCodeUrl = generateQRCodeUrl(deepLink);

        console.log('🔗 Deep Link:', deepLink);
        console.log('📱 QR Code URL:', qrCodeUrl);

        return {
            success: true,
            qrCodeUrl,
            deepLink,
            orderId: orderNumber,
        };

    } catch (error: any) {
        console.error('❌ Payment error:', error);
        return {
            success: false,
            message: error.message || 'Unable to create payment',
        };
    }
}

/**
 * ✅ Polling payment status - Check every 3s
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
                        console.log('✅ Payment confirmed via webhook!');
                        clearInterval(interval);
                        resolve(true);
                    } else if (order.payment_status === 'failed') {
                        console.log('❌ Payment failed');
                        clearInterval(interval);
                        resolve(false);
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.log('⏰ Polling timeout');
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
 * Create order in Appwrite
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
                qr_code_url: '', // Will be generated dynamically
                order_status: 'pending',
            }
        );
        
        console.log('✅ Order created:', orderNumber);
        return orderDoc as Order;
    } catch (error: any) {
        console.error('❌ Create order error:', error);
        throw new Error(error.message || 'Unable to create order');
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
        
        console.log(`✅ Payment status updated: ${status}`);
    } catch (error: any) {
        console.error('❌ Update payment error:', error);
        throw new Error(error.message || 'Unable to update payment');
    }
}

export async function updateOrderStatus(
    orderId: string,
    status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
): Promise<void> {
    try {
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            { order_status: status }
        );
        
        console.log('✅ Order status updated:', status);
    } catch (error: any) {
        console.error('❌ Update order status error:', error);
        throw new Error(error.message || 'Unable to update status');
    }
}

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
        throw new Error(error.message || 'Unable to cancel order');
    }
}

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
                Query.orderDesc('$createdAt'),
            ]
        );
        
        return orders.documents as Order[];
    } catch (error: any) {
        console.error('❌ Get orders by status error:', error);
        return [];
    }
}
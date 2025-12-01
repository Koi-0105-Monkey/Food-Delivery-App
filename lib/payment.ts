// lib/payment.ts - COMPLETE FIXED VERSION

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order } from '@/type';
import CryptoJS from 'crypto-js';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

// ✅ MOMO CONFIG - PRODUCTION
const MOMO_CONFIG = {
    partnerCode: 'MOMOEWN820251130',
    accessKey: 'bxpIpXsB5FM0vn5R',
    secretKey: '6YIKQUjACi9LBHerKQvTZXcBkEY3NEpq',
    endpoint: 'https://payment.momo.vn/v2/gateway/api/create', // ⚠️ TEST environment
    redirectUrl: 'myapp://payment-result',
    ipnUrl: 'https://momo-backend-1.vercel.app/api/momo-webhook',
};

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * ✅ FIXED: Create Momo Payment với captureWallet (không bị bug dấu chấm)
 */
export async function createMomoPayment(
    orderNumber: string, 
    amount: number
): Promise<{
    success: boolean;
    payUrl?: string;
    deeplink?: string;
    qrCodeUrl?: string;
    message?: string;
}> {
    try {
        const amountInt = Math.round(amount);
        if (amountInt < 1000) {
            return {
                success: false,
                message: 'Minimum amount is 1,000đ',
            };
        }

        const requestId = `${orderNumber}_${Date.now()}`;
        const orderInfo = `Payment ${orderNumber}`;
        const extraData = '';
        const requestType = 'captureWallet'; // ✅ BACK TO captureWallet - Stable

        // ✅ Build raw signature string - EXACT alphabet order
        const rawSignature = 
            `accessKey=${MOMO_CONFIG.accessKey}` +
            `&amount=${amountInt}` +
            `&extraData=${extraData}` +
            `&ipnUrl=${MOMO_CONFIG.ipnUrl}` +
            `&orderId=${orderNumber}` +
            `&orderInfo=${orderInfo}` +
            `&partnerCode=${MOMO_CONFIG.partnerCode}` +
            `&redirectUrl=${MOMO_CONFIG.redirectUrl}` +
            `&requestId=${requestId}` +
            `&requestType=${requestType}`;

        const signature = CryptoJS.HmacSHA256(
            rawSignature, 
            MOMO_CONFIG.secretKey
        ).toString();

        const requestBody = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: 'Food Delivery',
            storeId: 'FoodStore01',
            requestId: requestId,
            amount: amountInt,
            orderId: orderNumber,
            orderInfo: orderInfo,
            redirectUrl: MOMO_CONFIG.redirectUrl,
            ipnUrl: MOMO_CONFIG.ipnUrl,
            lang: 'en',
            requestType: requestType,
            autoCapture: true,
            extraData: extraData,
            signature: signature,
        };

        console.log('📤 Momo Request:', { orderNumber, amount: amountInt });
        console.log('🔐 Signature:', signature);

        const response = await fetch(MOMO_CONFIG.endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log('📥 Momo Response:', responseText);

        if (!response.ok) {
            return {
                success: false,
                message: `HTTP Error ${response.status}`,
            };
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            return {
                success: false,
                message: 'Unable to parse response',
            };
        }

        if (result.resultCode === 0) {
            console.log('✅ Payment created successfully');
            return {
                success: true,
                payUrl: result.payUrl,
                deeplink: result.deeplink,
                qrCodeUrl: result.qrCodeUrl,
            };
        } else {
            const errorMessages: { [key: number]: string } = {
                10: 'System maintenance',
                11: 'Access denied',
                13: 'Merchant authentication failed',
                20: 'Invalid amount',
                40: 'Duplicate requestId',
                41: 'Duplicate orderId',
                1000: 'User declined payment',
                1001: 'Insufficient balance',
                9000: 'Transaction processing',
                11007: 'Invalid signature - Check your API keys',
            };

            const errorMessage = errorMessages[result.resultCode] || result.message || 'Payment failed';
            
            console.error('❌ Momo Error:', result.resultCode, errorMessage);

            return {
                success: false,
                message: errorMessage,
            };
        }
    } catch (error: any) {
        console.error('❌ Payment error:', error);
        return {
            success: false,
            message: error.message || 'Unable to connect to Momo',
        };
    }
}

/**
 * Polling payment status
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
                        clearInterval(interval);
                        resolve(true);
                    } else if (order.payment_status === 'failed') {
                        clearInterval(interval);
                        resolve(false);
                    }
                }
                
                if (attempts >= maxAttempts) {
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
    transactionId?: string
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
            }
        );
        
        console.log('✅ Payment status updated:', status);
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
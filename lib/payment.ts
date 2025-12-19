// lib/payment.ts - FIXED WITH RETRY LOGIC

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order } from '@/type';
import { generateSepayBIDVQR } from './sepay-bidv';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

/**
 * ✅ Retry helper function
 */
async function retryAsync<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            // Don't retry on client errors (4xx)
            if (error.code >= 400 && error.code < 500) {
                throw error;
            }
            
            // Wait before retry
            if (i < maxRetries - 1) {
                console.log(`⚠️ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
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
 * ✅ CREATE QR PAYMENT - BIDV via Sepay
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
                message: 'Minimum amount is 1,000 VND',
            };
        }

        console.log('✅ Creating BIDV QR Payment');
        console.log('💰 Amount:', amount.toLocaleString('vi-VN') + '₫');
        console.log('📝 Order:', orderNumber);

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
            message: error.message || 'Unable to create payment',
        };
    }
}

/**
 * ✅ Polling payment status - Check every 3s WITH RETRY
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
                // ✅ Use retry logic for getOrderById
                const order = await retryAsync(() => getOrderById(orderId), 2, 500);
                
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
                    console.log('⏰ Timeout while waiting');
                    clearInterval(interval);
                    resolve(false);
                }
            } catch (error) {
                console.error(`⚠️ Polling attempt ${attempts} failed:`, error);
                
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    resolve(false);
                }
            }
        }, intervalMs);
    });
}

/**
 * ✅ Create order WITH RETRY
 */
export async function createOrder(userId: string, params: CreateOrderParams): Promise<Order> {
    return retryAsync(async () => {
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
    }, 3, 1000);
}

/**
 * ✅ Get user orders WITH RETRY
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
    return retryAsync(async () => {
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
    }, 3, 1000);
}

/**
 * ✅ Get order by ID WITH RETRY
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
    try {
        return await retryAsync(async () => {
            const order = await databases.getDocument(
                appwriteConfig.databaseId,
                ORDERS_COLLECTION_ID,
                orderId
            );
            
            return order as Order;
        }, 2, 500); // Fewer retries for polling
    } catch (error: any) {
        console.error('❌ Get order error:', error.message);
        return null;
    }
}

/**
 * ✅ Update payment status WITH RETRY
 */
export async function updatePaymentStatus(
    orderId: string,
    status: 'paid' | 'failed',
    transactionId?: string,
    receivedAmount?: number
): Promise<void> {
    return retryAsync(async () => {
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
        
        console.log(`✅ Status updated: ${status}`);
    }, 3, 1000);
}

/**
 * ✅ Cancel order WITH RETRY
 */
export async function cancelOrder(orderId: string): Promise<void> {
    return retryAsync(async () => {
        await databases.updateDocument(
            appwriteConfig.databaseId,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                payment_status: 'cancelled',
                order_status: 'cancelled',
            }
        );
        
        console.log(`✅ Order cancelled: ${orderId}`);
    }, 3, 1000);
}
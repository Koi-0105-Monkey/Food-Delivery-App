// lib/payment.ts - FIXED VERSION

import { ID, Query } from 'react-native-appwrite';
import { appwriteConfig, databases } from './appwrite';
import { CreateOrderParams, Order, QRCodeData } from '@/type';
import CryptoJS from 'crypto-js';

const ORDERS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!;

// ✅ Momo Official API Config
const MOMO_CONFIG = {
    partnerCode: 'MOMOEWN820251130',
    accessKey: 'bxpIpXsB5FM0vn5R',
    secretKey: '6YIKQUjACi9LBHerKQvTZXcBkEY3NEpq',
    endpoint: 'https://payment.momo.vn/v2/gateway/api/create',
    redirectUrl: 'myapp://payment-result',
    ipnUrl: 'https://momo-backend-test2.vercel.app/api/momo-webhook',
};

/**
 * Tạo số order duy nhất
 */
function generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * ✅ Tạo Momo Payment Request - FIXED
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
        // ✅ Validate amount - PHẢI là số nguyên
        const amountInt = Math.round(amount);
        if (amountInt < 1000) {
            return {
                success: false,
                message: 'Số tiền tối thiểu là 1.000đ',
            };
        }

        const requestId = `${orderNumber}_${Date.now()}`;
        const orderInfo = `Thanh toan don hang ${orderNumber}`;
        const extraData = '';
        const requestType = 'captureWallet';

        // ✅ Tạo object params để sort theo alphabet
        const params: Record<string, string> = {
            accessKey: MOMO_CONFIG.accessKey,
            amount: String(amountInt),
            extraData: extraData,
            ipnUrl: MOMO_CONFIG.ipnUrl,
            orderId: orderNumber,
            orderInfo: orderInfo,
            partnerCode: MOMO_CONFIG.partnerCode,
            redirectUrl: MOMO_CONFIG.redirectUrl,
            requestId: requestId,
            requestType: requestType,
        };

        // ✅ Sort keys theo alphabet và tạo raw signature
        const sortedKeys = Object.keys(params).sort();
        const rawSignature = sortedKeys
            .map(key => `${key}=${params[key]}`)
            .join('&');

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
            lang: 'vi',
            requestType: requestType,
            autoCapture: true,
            extraData: extraData,
            signature: signature,
        };

        console.log('📤 Sending Momo request:', { 
            orderNumber, 
            amount: amountInt,
            requestId
        });

        // Debug signature
        console.log('🔐 Raw signature string:', rawSignature);
        console.log('🔐 Signature:', signature);

        const response = await fetch(MOMO_CONFIG.endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        console.log('📥 Momo raw response:', responseText);

        if (!response.ok) {
            console.error('❌ HTTP Error:', response.status, responseText);
            return {
                success: false,
                message: `HTTP Error ${response.status}: ${responseText}`,
            };
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Parse error:', e);
            return {
                success: false,
                message: 'Không thể parse response từ Momo',
            };
        }

        console.log('📥 Momo parsed response:', result);

        if (result.resultCode === 0) {
            console.log('✅ Momo payment created successfully');
            return {
                success: true,
                payUrl: result.payUrl,
                deeplink: result.deeplink,
                qrCodeUrl: result.qrCodeUrl,
            };
        } else {
            // Xử lý lỗi cụ thể
            const errorMessages: { [key: number]: string } = {
                10: 'Hệ thống bảo trì',
                11: 'Truy cập bị từ chối',
                12: 'Phiên bản API không được hỗ trợ',
                13: 'Xác thực chủ merchant thất bại',
                20: 'Số tiền không hợp lệ',
                21: 'Số tiền giao dịch vượt hạn mức',
                40: 'RequestId bị trùng',
                41: 'OrderId bị trùng',
                42: 'OrderId không hợp lệ hoặc không được tìm thấy',
                43: 'Request bị trùng (accessKey/requestId)',
                1000: 'Giao dịch bị từ chối bởi người dùng',
                1001: 'Tài khoản không đủ tiền',
                1002: 'Giao dịch bị từ chối do nhà phát hành',
                1003: 'Đã hủy giao dịch',
                1004: 'Số tiền thanh toán vượt quá hạn mức',
                1005: 'URL hoặc QR code đã hết hạn',
                1006: 'Người dùng từ chối xác nhận',
                9000: 'Giao dịch đang được xử lý',
            };

            const errorMessage = errorMessages[result.resultCode] || result.message || 'Thanh toán thất bại';
            
            console.error('❌ Momo error:', {
                code: result.resultCode,
                message: errorMessage
            });

            return {
                success: false,
                message: errorMessage,
            };
        }
    } catch (error: any) {
        console.error('❌ Momo payment error:', error);
        return {
            success: false,
            message: error.message || 'Không thể kết nối với Momo',
        };
    }
}

/**
 * ✅ Polling check payment status
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
                        console.log('✅ Payment confirmed!');
                        clearInterval(interval);
                        resolve(true);
                    } else if (order.payment_status === 'failed') {
                        console.log('❌ Payment failed');
                        clearInterval(interval);
                        resolve(false);
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.log('⏱️ Polling timeout');
                    clearInterval(interval);
                    resolve(false);
                }
            } catch (error) {
                console.error('Polling error:', error);
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    resolve(false);
                }
            }
        }, intervalMs);
    });
}

/**
 * Tạo đơn hàng mới
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
        
        console.log('✅ Order created:', orderNumber);
        return orderDoc as Order;
    } catch (error: any) {
        console.error('❌ Create order error:', error);
        throw new Error(error.message || 'Không thể tạo đơn hàng');
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
        throw new Error(error.message || 'Không thể cập nhật thanh toán');
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
        throw new Error(error.message || 'Không thể cập nhật trạng thái');
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
        throw new Error(error.message || 'Không thể hủy đơn hàng');
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
                Query.orderDesc('$createdAt'),
            ]
        );
        
        return orders.documents as Order[];
    } catch (error: any) {
        console.error('❌ Get orders by status error:', error);
        return [];
    }
}

/**
 * @deprecated Legacy function
 */
export function generatePaymentQR(params: {
    amount: number;
    orderNumber: string;
}): QRCodeData {
    const { amount, orderNumber } = params;
    
    const momoConfig = {
        accountNumber: '0896494752',
        accountName: 'HUYNH DUC KHOI',
    };
    
    const description = `Payment ${orderNumber}`;
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
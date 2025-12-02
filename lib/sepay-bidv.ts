// lib/sepay-bidv.ts - SEPAY BIDV PAYMENT

/**
 * 🔥 SEPAY BIDV CONFIGURATION
 * Lấy từ my.sepay.vn
 */
const SEPAY_CONFIG = {
    apiKey: process.env.SEPAY_API_KEY || '',
    accountNumber: '96247C3FS8', // 👈 Số tài khoản BIDV từ ảnh
    accountName: 'HUYNH DUC KHOI',
    bankCode: 'BIDV',
};

/**
 * ✅ Tạo QR Code thanh toán qua Sepay
 * 
 * @param amount - Số tiền thanh toán (VND)
 * @param orderNumber - Mã đơn hàng (ví dụ: ORD1234567890)
 * @returns QR Code URL và thông tin hiển thị
 */
export function generateSepayBIDVQR(amount: number, orderNumber: string): {
    qrCodeUrl: string;
    displayInfo: {
        method: string;
        receiver: string;
        accountNo: string;
        amount: number;
        note: string;
    };
} {
    // Format nội dung chuyển khoản: DH ORD1234567890
    const note = `DH ${orderNumber}`;
    
    // ✅ VietQR API cho BIDV (không cần API key)
    // Format: https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-compact.png
    const qrCodeUrl = `https://img.vietqr.io/image/${SEPAY_CONFIG.bankCode}-${SEPAY_CONFIG.accountNumber}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(SEPAY_CONFIG.accountName)}`;
    
    return {
        qrCodeUrl,
        displayInfo: {
            method: 'BIDV Banking',
            receiver: SEPAY_CONFIG.accountName,
            accountNo: SEPAY_CONFIG.accountNumber,
            amount,
            note,
        },
    };
}

/**
 * ✅ Verify webhook signature từ Sepay
 * 
 * @param payload - Webhook payload từ Sepay
 * @param signature - Signature từ header
 * @returns true nếu hợp lệ
 */
export function verifySepayWebhook(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const secret = process.env.SEPAY_WEBHOOK_SECRET || '';
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return signature === expectedSignature;
}

/**
 * ✅ Parse webhook data từ Sepay
 */
export interface SepayWebhookData {
    id: number;
    gateway: string; // "BIDV"
    transactionDate: string;
    accountNumber: string;
    code: string; // Transaction code
    content: string; // Nội dung chuyển khoản
    transferType: string; // "in" (nhận tiền)
    transferAmount: number;
    accumulated: number;
    subAccount: string | null;
    description: string;
}

/**
 * ✅ Extract order number từ nội dung chuyển khoản
 */
export function extractOrderNumber(content: string): string | null {
    // Pattern: "DH ORD1234567890" hoặc "DHORD1234567890"
    const match = content.match(/DH\s*ORD\d+/i);
    if (match) {
        return match[0].replace(/^DH\s*/i, '').toUpperCase();
    }
    
    // Pattern: Chỉ có "ORD1234567890"
    const match2 = content.match(/ORD\d+/i);
    if (match2) {
        return match2[0].toUpperCase();
    }
    
    return null;
}
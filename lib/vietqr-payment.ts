// lib/vietqr-payment.ts - SIMPLE QR PAYMENT (Momo + Agribank)

/**
 * 🔥 CẤU HÌNH PAYMENT - THAY BẰNG THÔNG TIN THẬT CỦA BẠN
 */
const PAYMENT_CONFIG = {
    // ✅ MOMO - Ưu tiên
    momo: {
        phoneNumber: '0896494752', // 👈 SỐ ĐIỆN THOẠI MOMO CỦA BẠN
        name: 'AKESHOP',           // 👈 TÊN HIỂN THỊ
    },
    
    // ✅ AGRIBANK - Dự phòng
    agribank: {
        accountNo: '8888896494752',    // 👈 SỐ TÀI KHOẢN AGRIBANK CỦA BẠN
        accountName: 'HUYNH DUC KHOI',   // 👈 TÊN CHỦ TÀI KHOẢN (in hoa, không dấu)
        bankCode: 'ACB',               // 👈 Mã ngân hàng Agribank là 'ACB' trong VietQR
    },
};

/**
 * 🔥 MOMO QR - Dùng VietQR API
 * User quét QR → Mở app ngân hàng/ví → Chuyển tiền về Momo của bạn
 */
export function generateMomoQR(amount: number, orderNumber: string): {
    qrCodeUrl: string;
    displayInfo: {
        method: string;
        receiver: string;
        amount: number;
        note: string;
    };
} {
    const note = `DH${orderNumber}`; // Format: DH ORD123... (không có khoảng trắng)
    const phone = PAYMENT_CONFIG.momo.phoneNumber;
    
    // ✅ VietQR API cho Momo (không cần API key)
    // Format: https://img.vietqr.io/image/MOMO-{phone}-compact.png?amount={amount}&addInfo={note}
    const qrCodeUrl = `https://img.vietqr.io/image/MOMO-${phone}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(PAYMENT_CONFIG.momo.name)}`;
    
    return {
        qrCodeUrl,
        displayInfo: {
            method: 'Ví Momo',
            receiver: `${PAYMENT_CONFIG.momo.name} (${phone})`,
            amount,
            note,
        },
    };
}

/**
 * 🔥 AGRIBANK QR - Dùng VietQR API
 */
export function generateAgribankQR(amount: number, orderNumber: string): {
    qrCodeUrl: string;
    displayInfo: {
        method: string;
        receiver: string;
        accountNo: string;
        amount: number;
        note: string;
    };
} {
    const note = `DH${orderNumber}`;
    const { accountNo, accountName, bankCode } = PAYMENT_CONFIG.agribank;
    
    // ✅ VietQR API cho Agribank
    const qrCodeUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(accountName)}`;
    
    return {
        qrCodeUrl,
        displayInfo: {
            method: 'Agribank',
            receiver: accountName,
            accountNo,
            amount,
            note,
        },
    };
}

/**
 * 🔥 MAIN FUNCTION - Tạo cả 2 QR (Momo ưu tiên)
 */
export function generatePaymentQR(
    amount: number, 
    orderNumber: string
): {
    momo: ReturnType<typeof generateMomoQR>;
    agribank: ReturnType<typeof generateAgribankQR>;
} {
    return {
        momo: generateMomoQR(amount, orderNumber),
        agribank: generateAgribankQR(amount, orderNumber),
    };
}
// lib/cardToWallet.ts
// Map credit card numbers to Ganache wallet addresses

/**
 * ⚠️ ĐÂY LÀ FILE DEMO - GIẢI THÍCH:
 * 
 * Vì Ganache KHÔNG TẠO ĐƯỢC THẺ CREDIT CARD, nên ta phải:
 * 1. Giả lập thẻ credit card (fake cards)
 * 2. Map mỗi thẻ → 1 Ganache wallet address
 * 3. Khi user nhập thẻ → Tự động lấy wallet tương ứng
 * 
 * FLOW:
 * User nhập: 4532 1111 1111 1234
 *   ↓
 * Hash card number
 *   ↓
 * Map to: Ganache Wallet #1 (0x627306...)
 *   ↓
 * Dùng wallet này để thanh toán trên blockchain
 */

// ✅ FIX: Use crypto-js for hashing (more reliable in React Native)
import CryptoJS from 'crypto-js';

/**
 * 🎴 FAKE CREDIT CARDS → GANACHE WALLETS
 * 
 * Trong thực tế: User nhập thẻ → Backend verify với bank
 * Trong demo: Card number → Hash → Map to Ganache wallet
 */

export interface CardInfo {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;
    cvv: string;
}

export interface WalletMapping {
    walletAddress: string;
    privateKey: string;
    balance: number; // ETH balance
    cardLast4: string;
}

// ============================================
// GANACHE WALLETS (Copy từ Ganache UI)
// ============================================
export const GANACHE_WALLETS: WalletMapping[] = [
    {
        walletAddress: '0xA4b2a71b57f1E8022F40A0f903e3B3E0f9752Dd7',
        privateKey: '0x145548605b5e7dddd8f6ce27d2f27c1cff21856edd51b5a6793697f1b8a49789',
        balance: 100, // 100 ETH
        cardLast4: '1234'
    },
    {
        walletAddress: '0xc59AABBF2b5d8f608DBD12247F43520D5411f5d7',
        privateKey: '0x1f5cf0f91cd80dd6cc0bcf0392f03dacfdeb800522f2f56c6a621b0b90b2aff2',
        balance: 100,
        cardLast4: '5678'
    },
    {
        walletAddress: '0x764D59C961DEef9691AAc51f63580f821770DccB',
        privateKey: '0xb738a6ec563112a497ca1779e5002d85af1722f0916748b96fd46d6298b38ad7',
        balance: 100,
        cardLast4: '9012'
    },
    {
        walletAddress: '0x4CAE569305290a479651d6072785d757dc9aB5CF',
        privateKey: '0xa0e508a92a1921c3118b9bdf4bd62da021ec8613904c23aad6aad670b8383569',
        balance: 100,
        cardLast4: '3456'
    },
    {
        walletAddress: '0xb743dA6d056e0Bb2c3dC0c03B7Bb6456F936aC12',
        privateKey: '0x4af9d158e2c29c159cddc702180d32f3785370afa3e1f2eeb9578ec9701fb594',
        balance: 100,
        cardLast4: '7890'
    }
];

// ============================================
// TEST CREDIT CARDS (For demo)
// ============================================
export const TEST_CARDS = [
    {
        cardNumber: '4532 1111 1111 1234',
        cardHolder: 'NGUYEN VAN A',
        expiryDate: '12/25',
        cvv: '123',
        mappedWallet: GANACHE_WALLETS[0].walletAddress
    },
    {
        cardNumber: '5425 2222 2222 5678',
        cardHolder: 'TRAN THI B',
        expiryDate: '06/26',
        cvv: '456',
        mappedWallet: GANACHE_WALLETS[1].walletAddress
    },
    {
        cardNumber: '3782 3333 3333 9012',
        cardHolder: 'LE VAN C',
        expiryDate: '09/27',
        cvv: '789',
        mappedWallet: GANACHE_WALLETS[2].walletAddress
    },
    {
        cardNumber: '6011 4444 4444 3456',
        cardHolder: 'PHAM THI D',
        expiryDate: '03/26',
        cvv: '321',
        mappedWallet: GANACHE_WALLETS[3].walletAddress
    },
    {
        cardNumber: '3530 5555 5555 7890',
        cardHolder: 'HOANG VAN E',
        expiryDate: '11/25',
        cvv: '654',
        mappedWallet: GANACHE_WALLETS[4].walletAddress
    }
];

/**
 * Hash credit card number to deterministic index
 */
function hashCardToIndex(cardNumber: string): number {
    const cleaned = cardNumber.replace(/\s/g, '');
    // Use crypto-js SHA256 for reliable hashing
    const hash = CryptoJS.SHA256(cleaned).toString();
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return numericHash % GANACHE_WALLETS.length;
}

/**
 * ✅ Map credit card to Ganache wallet
 * 
 * @param cardInfo Credit card information
 * @returns Wallet mapping or null if invalid
 */
export async function mapCardToWallet(cardInfo: CardInfo): Promise<WalletMapping | null> {
    try {
        // Basic validation
        const cleaned = cardInfo.cardNumber.replace(/\s/g, '');
        
        if (cleaned.length < 13 || cleaned.length > 19) {
            throw new Error('Invalid card number length');
        }
        
        if (!cardInfo.cardHolder.trim()) {
            throw new Error('Card holder name required');
        }
        
        if (!cardInfo.expiryDate.match(/^\d{2}\/\d{2}$/)) {
            throw new Error('Invalid expiry date format (MM/YY)');
        }
        
        if (cardInfo.cvv.length < 3) {
            throw new Error('Invalid CVV');
        }
        
        // Map to wallet using hash
        const walletIndex = hashCardToIndex(cardInfo.cardNumber);
        const wallet = GANACHE_WALLETS[walletIndex];
        
        console.log('✅ Card mapped to wallet:');
        console.log('   Card:', '**** **** ****', cleaned.slice(-4));
        console.log('   Wallet:', wallet.walletAddress);
        console.log('   Balance:', wallet.balance, 'ETH');
        
        return wallet;
        
    } catch (error: any) {
        console.error('❌ Card mapping failed:', error.message);
        return null;
    }
}

/**
 * Validate card using Luhn algorithm (optional)
 */
export function validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cleaned)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

/**
 * Get card type from number
 */
export function getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    if (cleaned.startsWith('6')) return 'Discover';
    
    return 'Unknown';
}

/**
 * Format card number for display
 */
export function formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    return `**** **** **** ${cleaned.slice(-4)}`;
}

/**
 * Get wallet info by card last 4 digits
 */
export function getWalletByCardLast4(last4: string): WalletMapping | undefined {
    return GANACHE_WALLETS.find(w => w.cardLast4 === last4);
}

/**
 * ⚠️ SECURITY NOTE:
 * 
 * Trong production:
 * - Private keys KHÔNG BAO GIỜ lưu ở client
 * - Dùng backend API để sign transactions
 * - Hoặc dùng MetaMask/WalletConnect để user tự sign
 * 
 * Đây chỉ là demo nên hardcode private keys
 */
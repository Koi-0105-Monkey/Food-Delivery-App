// lib/blockchain.ts
// UPDATED: Configure admin wallet to receive payments

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import Web3 from 'web3';
import { CardInfo, mapCardToWallet } from './cardToWallet';

// ============================================
// CONFIG - Admin Wallet Configuration
// ============================================
const GANACHE_URL = 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '0x...';
const EXCHANGE_RATE = 25000; // 1 ETH = 25,000 VND

// 🔥 ADMIN WALLET - Receives all payments
// Dynamically detected from Ganache
let adminWalletAddress = '0x323790e8F0C680c9f4f98653F9a91c9662cd067C'; // Default fallback


// Contract ABI (from deployment)
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldRate",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newRate",
                "type": "uint256"
            }
        ],
        "name": "ExchangeRateUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "customer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountVND",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "PaymentProcessed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "customer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            }
        ],
        "name": "RefundIssued",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "amountVND",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "cardLast4",
                "type": "string"
            }
        ],
        "name": "processPayment",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            }
        ],
        "name": "verifyPayment",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            }
        ],
        "name": "getTransaction",
        "outputs": [
            {
                "internalType": "address",
                "name": "customer",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amountVND",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amountETH",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "completed",
                "type": "bool"
            },
            {
                "internalType": "string",
                "name": "cardLast4",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "orderNumber",
                "type": "string"
            }
        ],
        "name": "issueRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// ============================================
// TYPES
// ============================================
export interface PaymentResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    error?: string;
    adminWalletBalance?: string; // ETH balance of admin after payment
}

export interface TransactionInfo {
    customer: string;
    amountVND: number;
    amountETH: number;
    timestamp: number;
    completed: boolean;
    cardLast4: string;
}

export interface RefundResult {
    success: boolean;
    transactionHash?: string;
    refundedAmount?: number;
    error?: string;
}

// ============================================
// SINGLETON WEB3 INSTANCE
// ============================================
class BlockchainService {
    private web3: Web3 | null = null;
    private contract: any = null;
    private isInitialized = false;

    /**
     * Initialize Web3 connection
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔌 Connecting to Ganache...');

            this.web3 = new Web3(GANACHE_URL);

            const isListening = await this.web3.eth.net.isListening();
            if (!isListening) {
                throw new Error('Cannot connect to Ganache');
            }

            console.log('✅ Connected to Ganache');

            // Get accounts
            const accounts = await this.web3.eth.getAccounts();
            console.log('📋 Available Accounts:', accounts);

            const PREFERRED_ADMIN = '0x323790e8F0C680c9f4f98653F9a91c9662cd067C';

            if (accounts.includes(PREFERRED_ADMIN)) {
                adminWalletAddress = PREFERRED_ADMIN;
                console.log('✅ Used preferred Admin Wallet:', adminWalletAddress);
            } else if (accounts.length > 0) {
                adminWalletAddress = accounts[0];
                console.log('⚠️ Preferred admin not found. Using first account:', adminWalletAddress);
            } else {
                console.warn('⚠️ No accounts found in Ganache');
            }

            this.contract = new this.web3.eth.Contract(CONTRACT_ABI as any, CONTRACT_ADDRESS);
            this.isInitialized = true;

            // Diagnostics
            try {
                const owner = await this.contract.methods.owner().call();
                console.log('👑 Contract Owner (Source of Truth):', owner);

                // ✅ CRITICAL FIX: Always use the REAL contract owner as Admin Wallet
                // This prevents "Sender not owner" errors
                if (owner) {
                    adminWalletAddress = owner;
                    console.log('✅ Admin Wallet synced to Contract Owner:', adminWalletAddress);
                }
            } catch (e) {
                console.error('⚠️ Could not fetch contract owner:', e);
            }

            console.log('✅ Contract initialized:', CONTRACT_ADDRESS);

        } catch (error: any) {
            console.error('❌ Blockchain init failed:', error.message);
            throw error;
        }
    }

    /**
     * Convert VND to ETH
     */
    private vndToEth(amountVND: number): string {
        if (!this.web3) throw new Error('Web3 not initialized');
        const ethAmount = amountVND / EXCHANGE_RATE;
        return this.web3.utils.toWei(ethAmount.toString(), 'ether');
    }

    /**
     * ✅ Process blockchain payment
     * ETH goes to smart contract, then admin can withdraw
     */
    async processPayment(
        orderNumber: string,
        amountVND: number,
        cardInfo: CardInfo
    ): Promise<PaymentResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.web3 || !this.contract) {
                throw new Error('Web3 or Contract not initialized');
            }

            console.log('💳 Processing blockchain payment...');
            console.log('   Order:', orderNumber);
            console.log('   Amount:', amountVND.toLocaleString(), 'VND');

            // Map card to customer wallet
            const wallet = await mapCardToWallet(cardInfo);
            if (!wallet) {
                return {
                    success: false,
                    error: 'Invalid card information'
                };
            }

            const cardLast4 = cardInfo.cardNumber.replace(/\s/g, '').slice(-4);
            const amountETH = this.vndToEth(amountVND);

            console.log('   ETH amount:', this.web3.utils.fromWei(amountETH, 'ether'));
            console.log('   Customer wallet:', wallet.walletAddress);

            // Check customer wallet balance
            const balance = await this.web3.eth.getBalance(wallet.walletAddress);
            if (BigInt(balance) < BigInt(amountETH)) {
                return {
                    success: false,
                    error: 'Insufficient balance in wallet'
                };
            }

            console.log('📡 Broadcasting transaction...');

            // 🔥 Payment goes to smart contract
            // Admin wallet will receive ETH when contract owner calls withdraw()
            const tx = await this.contract.methods
                .processPayment(orderNumber, amountVND, cardLast4)
                .send({
                    from: wallet.walletAddress,
                    value: amountETH,
                    gas: 300000,
                    gasPrice: '20000000000'
                });

            // Get admin wallet balance
            const adminBalance = await this.web3.eth.getBalance(adminWalletAddress);
            const adminBalanceETH = this.web3.utils.fromWei(adminBalance, 'ether');

            console.log('✅ Payment successful!');
            console.log('   TX Hash:', tx.transactionHash);
            console.log('   Block:', tx.blockNumber);
            console.log('   💰 Admin wallet balance:', adminBalanceETH, 'ETH');

            return {
                success: true,
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed,
                adminWalletBalance: adminBalanceETH
            };

        } catch (error: any) {
            console.error('❌ Payment failed:', error.message);

            return {
                success: false,
                error: error.message || 'Transaction failed'
            };
        }
    }

    /**
     * ✅ NEW: Issue refund for an order (ADMIN ONLY)
     * Refunds ETH from contract back to customer
     */
    async issueRefund(orderNumber: string): Promise<RefundResult> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.web3 || !this.contract) {
                throw new Error('Web3 or Contract not initialized');
            }

            console.log('💸 Processing refund...');
            console.log('   Order:', orderNumber);

            // Get transaction details first
            const txInfo = await this.getTransaction(orderNumber);
            if (!txInfo || !txInfo.completed) {
                return {
                    success: false,
                    error: 'Transaction not found or already refunded'
                };
            }

            console.log('   Customer:', txInfo.customer);
            console.log('   Amount:', this.web3.utils.fromWei(txInfo.amountETH.toString(), 'ether'), 'ETH');

            // 🔥 Arch Change: Contract Balance is always 0. 
            // We check ADMIN WALLET balance instead.
            const adminBalance = await this.web3.eth.getBalance(adminWalletAddress);
            console.log('   💰 Admin Balance:', this.web3.utils.fromWei(adminBalance, 'ether'), 'ETH');

            if (BigInt(adminBalance) < BigInt(txInfo.amountETH)) {
                throw new Error(`Insufficient Admin Wallet funds. Have: ${this.web3.utils.fromWei(adminBalance, 'ether')} ETH, Need: ${this.web3.utils.fromWei(txInfo.amountETH.toString(), 'ether')} ETH`);
            }

            // Call issueRefund on smart contract
            // 🔥 IMPORTANT: This must be called by contract owner (admin wallet)
            console.log('   📤 Sending refund from:', adminWalletAddress);
            console.log('   💰 Refund Amount (from Admin):', txInfo.amountETH);

            const tx = await this.contract.methods
                .issueRefund(orderNumber)
                .send({
                    from: adminWalletAddress, // Must be owner
                    value: txInfo.amountETH, // 🔥 Admin pays this amount
                    gas: 500000
                });

            console.log('✅ Refund successful!');
            console.log('   TX Hash:', tx.transactionHash);

            return {
                success: true,
                transactionHash: tx.transactionHash,
                refundedAmount: parseFloat(this.web3.utils.fromWei(txInfo.amountETH.toString(), 'ether'))
            };

        } catch (error: any) {
            console.error('❌ Refund failed:', error.message);

            return {
                success: false,
                error: error.message || 'Refund failed'
            };
        }
    }

    /**
     * Verify payment on blockchain
     */
    async verifyPayment(orderNumber: string): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            const isPaid = await this.contract.methods.verifyPayment(orderNumber).call();
            return isPaid;

        } catch (error: any) {
            console.error('❌ Verification failed:', error.message);
            return false;
        }
    }

    /**
     * Get transaction details from blockchain
     */
    async getTransaction(orderNumber: string): Promise<TransactionInfo | null> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            const tx = await this.contract.methods.getTransaction(orderNumber).call();

            return {
                customer: tx.customer,
                amountVND: Number(tx.amountVND),
                amountETH: Number(tx.amountETH),
                timestamp: Number(tx.timestamp),
                completed: tx.completed,
                cardLast4: tx.cardLast4
            };

        } catch (error: any) {
            console.error('❌ Get transaction failed:', error.message);
            return null;
        }
    }

    /**
     * Get admin wallet balance
     */
    async getAdminBalance(): Promise<number> {
        try {
            if (!this.web3) {
                await this.initialize();
            }

            if (!this.web3) {
                throw new Error('Web3 not initialized');
            }

            const balance = await this.web3.eth.getBalance(adminWalletAddress);
            return parseFloat(this.web3.utils.fromWei(balance, 'ether'));

        } catch (error: any) {
            console.error('❌ Get admin balance failed:', error.message);
            return 0;
        }
    }

    /**
     * Get contract balance (total ETH held by contract)
     */
    async getContractBalance(): Promise<number> {
        try {
            if (!this.web3) {
                await this.initialize();
            }

            if (!this.web3) {
                throw new Error('Web3 not initialized');
            }

            const balance = await this.web3.eth.getBalance(CONTRACT_ADDRESS);
            return parseFloat(this.web3.utils.fromWei(balance, 'ether'));

        } catch (error: any) {
            console.error('❌ Get contract balance failed:', error.message);
            return 0;
        }
    }

    /**
     * Get transaction receipt
     */
    async getReceipt(txHash: string) {
        try {
            if (!this.web3) {
                await this.initialize();
            }

            if (!this.web3) {
                throw new Error('Web3 not initialized');
            }

            return await this.web3.eth.getTransactionReceipt(txHash);

        } catch (error: any) {
            console.error('❌ Get receipt failed:', error.message);
            return null;
        }
    }
}

// ============================================
// EXPORT SINGLETON
// ============================================
export const blockchainService = new BlockchainService();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string): string {
    if (!hash) return '';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

/**
 * Get Ganache block explorer URL
 */
export function getExplorerUrl(txHash: string): string {
    return `${GANACHE_URL}/tx/${txHash}`;
}

/**
 * Calculate VND from ETH
 */
export function ethToVnd(ethAmount: number): number {
    return ethAmount * EXCHANGE_RATE;
}

/**
 * Get admin wallet address (for display purposes)
 */
export function getAdminWalletAddress(): string {
    return adminWalletAddress;
}
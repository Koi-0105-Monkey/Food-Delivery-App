// lib/blockchain.ts
// Main blockchain integration for payment processing

// ⚠️ CRITICAL: Import crypto polyfills FIRST before Web3
// This ensures crypto.getRandomValues is available when Web3 initializes
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Verify crypto polyfill is loaded
if (typeof global.crypto === 'undefined' || typeof global.crypto.getRandomValues !== 'function') {
    console.error('❌ crypto.getRandomValues polyfill not loaded!');
    throw new Error('crypto.getRandomValues polyfill must be imported before Web3');
}

import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { CardInfo, mapCardToWallet, WalletMapping } from './cardToWallet';

// ============================================
// CONFIG - Load from contract-config.json sau khi deploy
// ============================================
const GANACHE_URL = 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '0x...'; // Thay sau khi deploy
const EXCHANGE_RATE = 25000; // 1 ETH = 25,000 VND

// Contract ABI (copy từ contract-config.json sau khi deploy)
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
}

export interface TransactionInfo {
    customer: string;
    amountVND: number;
    amountETH: number;
    timestamp: number;
    completed: boolean;
    cardLast4: string;
}

// ============================================
// SINGLETON WEB3 INSTANCE
// ============================================
class BlockchainService {
    private web3: Web3 | null = null;
    private contract: any = null; // Fix: Changed from Contract to any
    private isInitialized = false;

    /**
     * Initialize Web3 connection
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🔌 Connecting to Ganache...');
            
            this.web3 = new Web3(GANACHE_URL);
            
            // Test connection
            const isListening = await this.web3.eth.net.isListening();
            if (!isListening) {
                throw new Error('Cannot connect to Ganache');
            }
            
            console.log('✅ Connected to Ganache');
            
            // Initialize contract
            this.contract = new this.web3.eth.Contract(CONTRACT_ABI as any, CONTRACT_ADDRESS);
            
            this.isInitialized = true;
            
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
     * 
     * @param orderNumber Order ID from Appwrite
     * @param amountVND Total amount in VND
     * @param cardInfo Credit card information
     * @returns Payment result with transaction hash
     */
    async processPayment(
        orderNumber: string,
        amountVND: number,
        cardInfo: CardInfo
    ): Promise<PaymentResult> {
        try {
            // Ensure initialized
            if (!this.isInitialized) {
                await this.initialize();
            }

            if (!this.web3 || !this.contract) {
                throw new Error('Web3 or Contract not initialized');
            }

            console.log('💳 Processing payment...');
            console.log('   Order:', orderNumber);
            console.log('   Amount:', amountVND.toLocaleString(), 'VND');

            // Map card to wallet
            const wallet = mapCardToWallet(cardInfo);
            if (!wallet) {
                return {
                    success: false,
                    error: 'Invalid card information'
                };
            }

            // Get card last 4 digits
            const cardLast4 = cardInfo.cardNumber.replace(/\s/g, '').slice(-4);

            // Convert VND to ETH
            const amountETH = this.vndToEth(amountVND);
            console.log('   ETH amount:', this.web3.utils.fromWei(amountETH, 'ether'));

            // Check wallet balance
            const balance = await this.web3.eth.getBalance(wallet.walletAddress);
            if (BigInt(balance) < BigInt(amountETH)) {
                return {
                    success: false,
                    error: 'Insufficient balance in wallet'
                };
            }

            // Create transaction
            console.log('📡 Broadcasting transaction...');
            
            const tx = await this.contract.methods
                .processPayment(orderNumber, amountVND, cardLast4)
                .send({
                    from: wallet.walletAddress,
                    value: amountETH,
                    gas: 300000,
                    gasPrice: '20000000000' // 20 Gwei
                });

            console.log('✅ Payment successful!');
            console.log('   TX Hash:', tx.transactionHash);
            console.log('   Block:', tx.blockNumber);

            return {
                success: true,
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                gasUsed: tx.gasUsed
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
     * Get wallet balance
     */
    async getBalance(walletAddress: string): Promise<number> {
        try {
            if (!this.web3) {
                await this.initialize();
            }

            if (!this.web3) {
                throw new Error('Web3 not initialized');
            }

            const balance = await this.web3.eth.getBalance(walletAddress);
            return parseFloat(this.web3.utils.fromWei(balance, 'ether'));

        } catch (error: any) {
            console.error('❌ Get balance failed:', error.message);
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
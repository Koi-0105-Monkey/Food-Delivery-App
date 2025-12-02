// server.js - COMPLETE FIXED VERSION

const express = require('express');
const crypto = require('crypto');
const { Client, Databases, Query } = require('node-appwrite');
const app = express();

// ✅ CRITICAL: Parse JSON body
app.use(express.json());

// ✅ CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// ✅ Momo Production - Static QR không cần credentials
// Webhook sẽ nhận data từ Momo khi user chuyển tiền
const MOMO_CONFIG = {
    partnerCode: 'MOMOEWN820251130', // Production
    storeName: 'AKESHOP',
    phoneNumber: '0896494752',
};

// ✅ Appwrite Config
const APPWRITE_CONFIG = {
    endpoint: 'https://nyc.cloud.appwrite.io/v1',
    projectId: '69230ad2001fb8f2aee4',
    databaseId: '68629ae60038a7c61fe4',
    ordersCollectionId: 'orders',
    apiKey: process.env.APPWRITE_API_KEY || 'standard_c9f94d4e2c13a8df7325ae8914bdb6c4f17d92af7461d2bae9e4cc0bdac9395bbabfd5b87f9ab9eb596c1ea9cac286442d954c5fec5eb795f47879bce69539ed12224544b1d5f50d597536a8a06c50df0bddbd91f6c8b0aca3739eb2b2131fd89bf1b7bc86585cdd52c161e22cb602278e5d45d7b87ebbdfdee3be3b8d1df7a1',
};

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Momo Webhook Server Running',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

/**
 * ✅ WEBHOOK ENDPOINT - Momo calls when user transfers money
 */
app.post('/api/momo-webhook', async (req, res) => {
    try {
        console.log('📥 ========== WEBHOOK RECEIVED ==========');
        console.log('Full Body:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', JSON.stringify(req.headers, null, 2));

        const {
            partnerCode,
            amount,
            comment, // ← Nội dung chuyển khoản
            desc, // ← Alternative field
            transId,
            momoTransId,
            phone,
        } = req.body;

        // Extract comment from either field
        const transferNote = comment || desc || '';

        console.log('💰 Amount:', amount);
        console.log('📝 Transfer note:', transferNote);

        // ❌ Check missing fields
        if (!amount || !transId) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                message: 'Missing required fields',
                resultCode: 1
            });
        }

        // ✅ Extract order number (try multiple patterns)
        let orderNumber = null;
        
        // Pattern 1: ORD123456789
        const match1 = transferNote.match(/ORD\d+/i);
        if (match1) orderNumber = match1[0].toUpperCase();
        
        // Pattern 2: Order ORD123456789
        if (!orderNumber) {
            const match2 = transferNote.match(/Order\s+(ORD\d+)/i);
            if (match2) orderNumber = match2[1].toUpperCase();
        }
        
        // Pattern 3: Just numbers after "Order"
        if (!orderNumber) {
            const match3 = transferNote.match(/Order\s+(\d+)/i);
            if (match3) orderNumber = `ORD${match3[1]}`;
        }

        console.log('🔍 Extracted order number:', orderNumber);

        if (!orderNumber) {
            console.error('❌ Order number not found in comment:', transferNote);
            return res.status(400).json({
                message: 'Order number not found in transfer note',
                resultCode: 1
            });
        }

        // ✅ Find order in Appwrite
        const order = await findOrderByNumber(orderNumber);

        if (!order) {
            console.error('❌ Order not found:', orderNumber);
            return res.status(404).json({
                message: 'Order not found',
                resultCode: 1
            });
        }

        console.log('📦 Order found:', order.$id);
        console.log('💵 Expected amount:', order.total);
        console.log('💵 Received amount:', amount);

        // ✅ Compare amounts
        if (amount >= order.total) {
            // SUCCESS - Amount matches or exceeds
            await updateOrderPaymentStatus(
                order.$id, 
                transId, 
                'paid',
                amount
            );

            console.log('✅ Payment confirmed!');

            return res.status(200).json({
                message: 'OK',
                resultCode: 0,
            });
        } else {
            // FAILED - Insufficient amount
            console.error('❌ Insufficient amount');
            
            await updateOrderPaymentStatus(
                order.$id, 
                transId, 
                'failed',
                amount
            );

            return res.status(200).json({
                message: 'Insufficient amount',
                resultCode: 1
            });
        }

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            resultCode: 1
        });
    }
});

/**
 * Find order by order_number
 */
async function findOrderByNumber(orderNumber) {
    try {
        if (!APPWRITE_CONFIG.apiKey) {
            console.error('❌ APPWRITE_API_KEY not set!');
            return null;
        }

        const client = new Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId)
            .setKey(APPWRITE_CONFIG.apiKey);

        const databases = new Databases(client);

        const orders = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.ordersCollectionId,
            [Query.equal('order_number', orderNumber)]
        );

        if (orders.documents.length === 0) {
            return null;
        }

        return orders.documents[0];

    } catch (error) {
        console.error('❌ Find order error:', error.message);
        return null;
    }
}

/**
 * Update order payment status in Appwrite
 */
async function updateOrderPaymentStatus(orderId, transId, status, receivedAmount = 0) {
    try {
        if (!APPWRITE_CONFIG.apiKey) {
            console.error('❌ APPWRITE_API_KEY not set!');
            return false;
        }

        const client = new Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId)
            .setKey(APPWRITE_CONFIG.apiKey);

        const databases = new Databases(client);

        await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.ordersCollectionId,
            orderId,
            {
                payment_status: status,
                transaction_id: transId,
                received_amount: receivedAmount,
                paid_at: status === 'paid' ? new Date().toISOString() : '',
                order_status: status === 'paid' ? 'confirmed' : 'pending',
            }
        );

        console.log(`✅ Order ${orderId} updated to ${status}`);
        return true;

    } catch (error) {
        console.error('❌ Update order error:', error.message);
        return false;
    }
}

// ✅ Start server (for local testing)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Webhook: http://localhost:${PORT}/api/momo-webhook`);
    });
}

// ✅ Export for Vercel serverless
module.exports = app;
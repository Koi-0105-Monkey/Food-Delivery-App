// backend/server.js - SEPAY WEBHOOK (Momo + Agribank)

const express = require('express');
const { Client, Databases, Query } = require('node-appwrite');
const app = express();

// ✅ Parse JSON body
app.use(express.json());

// ✅ CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// ✅ Appwrite Config
const APPWRITE_CONFIG = {
    endpoint: 'https://nyc.cloud.appwrite.io/v1',
    projectId: '69230ad2001fb8f2aee4',
    databaseId: '68629ae60038a7c61fe4',
    ordersCollectionId: 'orders',
    apiKey: process.env.APPWRITE_API_KEY || 'standard_c9f94d4e2c13a8df7325ae8914bdb6c4f17d92af7461d2bae9e4cc0bdac9395bbabfd5b87f9ab9eb596c1ea9cac286442d954c5fec5eb795f47879bce69539ed12224544b1d5f50d597536a8a06c50df0bddbd91f6c8b0aca3739eb2b2131fd89bf1b7bc86585cdd52c161e22cb602278e5d45d7b87ebbdfdee3be3b8d1df7a1',
};

/**
 * Health check
 */
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Webhook Server - Sepay (Momo + Agribank)',
        timestamp: new Date().toISOString(),
    });
});

/**
 * ✅ SEPAY WEBHOOK
 * 
 * Sepay.vn gửi webhook khi có giao dịch mới
 * Đăng ký tại: https://my.sepay.vn
 * 
 * Webhook format:
 * {
 *   "id": 1234567,
 *   "gateway": "MOMO", // hoặc "ACB" (Agribank)
 *   "transactionDate": "2025-01-01 12:00:00",
 *   "accountNumber": "0896494752",
 *   "code": "ABC123",
 *   "content": "DHORD1234567890",
 *   "transferType": "in",
 *   "transferAmount": 50000,
 *   "accumulated": 1000000,
 *   "subAccount": null,
 *   "description": "Nhận tiền từ ..."
 * }
 */
app.post('/api/sepay-webhook', async (req, res) => {
    try {
        console.log('📥 ========== SEPAY WEBHOOK ==========');
        console.log('Full Body:', JSON.stringify(req.body, null, 2));

        const {
            gateway,          // MOMO hoặc ACB (Agribank)
            content,          // Nội dung chuyển khoản
            transferAmount,   // Số tiền
            code,            // Transaction code
            transactionDate, // Thời gian
        } = req.body;

        console.log('🏦 Gateway:', gateway);
        console.log('💰 Amount:', transferAmount);
        console.log('📝 Content:', content);

        // ❌ Validate
        if (!transferAmount || !content || !code) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // ✅ Extract order number
        // Format: "DHORD1234567890" hoặc "DH ORD1234567890"
        let orderNumber = null;
        
        // Pattern 1: DHORD123...
        const match1 = content.match(/DHORD\d+/i);
        if (match1) orderNumber = match1[0].replace(/^DH/i, '').toUpperCase();
        
        // Pattern 2: DH ORD123...
        if (!orderNumber) {
            const match2 = content.match(/DH\s*ORD\d+/i);
            if (match2) orderNumber = match2[0].replace(/^DH\s*/i, '').toUpperCase();
        }
        
        // Pattern 3: Chỉ có ORD123...
        if (!orderNumber) {
            const match3 = content.match(/ORD\d+/i);
            if (match3) orderNumber = match3[0].toUpperCase();
        }

        console.log('🔍 Extracted order number:', orderNumber);

        if (!orderNumber) {
            console.error('❌ Order number not found in content:', content);
            return res.status(400).json({
                success: false,
                message: 'Order number not found'
            });
        }

        // ✅ Find order
        const order = await findOrderByNumber(orderNumber);

        if (!order) {
            console.error('❌ Order not found:', orderNumber);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('📦 Order found:', order.$id);
        console.log('💵 Expected amount:', order.total);
        console.log('💵 Received amount:', transferAmount);

        // ✅ Check amount
        if (transferAmount >= order.total) {
            // SUCCESS
            await updateOrderPaymentStatus(
                order.$id, 
                code, 
                'paid',
                transferAmount
            );

            console.log('✅ Payment confirmed!');

            return res.status(200).json({
                success: true,
                message: 'Payment confirmed',
            });
        } else {
            // FAILED - Insufficient
            console.error('❌ Insufficient amount');
            
            await updateOrderPaymentStatus(
                order.$id, 
                code, 
                'failed',
                transferAmount
            );

            return res.status(200).json({
                success: false,
                message: 'Insufficient amount'
            });
        }

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Find order by order_number
 */
async function findOrderByNumber(orderNumber) {
    try {
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
 * Update order payment status
 */
async function updateOrderPaymentStatus(orderId, transId, status, receivedAmount = 0) {
    try {
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Sepay Webhook: http://localhost:${PORT}/api/sepay-webhook`);
    console.log(`\n⚙️  Setup guide:`);
    console.log(`   1. Go to https://my.sepay.vn`);
    console.log(`   2. Register & connect Momo + Agribank`);
    console.log(`   3. Add webhook URL: http://localhost:${PORT}/api/sepay-webhook`);
    console.log(`   4. Use ngrok for public URL (local testing)`);
});

// ✅ Export for Vercel
module.exports = app;
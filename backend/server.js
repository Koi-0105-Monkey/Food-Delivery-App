// backend/server.js - FIXED VERSION (CHỈ CẬP NHẬT, KHÔNG TẠO MỚI)

const express = require('express');
const { Client, Databases, Query } = require('node-appwrite');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

const APPWRITE_CONFIG = {
    endpoint: 'https://nyc.cloud.appwrite.io/v1',
    projectId: '69230ad2001fb8f2aee4',
    databaseId: '68629ae60038a7c61fe4',
    ordersCollectionId: 'orders',
    apiKey: process.env.APPWRITE_API_KEY || 'YOUR_API_KEY_HERE',
};

/**
 * Health check
 */
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Webhook Server - Sepay BIDV',
        timestamp: new Date().toISOString(),
    });
});

/**
 * ✅ SEPAY WEBHOOK - BIDV (CHỈ CẬP NHẬT ORDER)
 */
app.post('/api/sepay-webhook', async (req, res) => {
    try {
        console.log('📥 ========== SEPAY WEBHOOK (BIDV) ==========');
        console.log('Full Body:', JSON.stringify(req.body, null, 2));

        const {
            gateway,
            content,
            description,
            transferAmount,
            code,
            transactionDate,
            accountNumber,
        } = req.body;

        console.log('🏦 Gateway:', gateway);
        console.log('💰 Amount:', transferAmount);
        console.log('📝 Content:', content);
        console.log('📝 Description:', description);
        console.log('🔢 Sender Account:', accountNumber);

        // Validate
        if (!transferAmount || !content) {
            console.error('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Extract receiver account
        let receiverAccount = null;
        const contentMatch = content.match(/BIDV;([A-Z0-9]+);/i);
        if (contentMatch) {
            receiverAccount = contentMatch[1];
        }

        if (!receiverAccount && description) {
            const descMatch = description.match(/BIDV;([A-Z0-9]+);/i);
            if (descMatch) {
                receiverAccount = descMatch[1];
            }
        }

        console.log('🔍 Extracted receiver account:', receiverAccount);

        // Verify receiver account
        if (receiverAccount !== '96247C3FS8') {
            console.error('❌ Wrong receiver account:', receiverAccount);
            return res.status(400).json({
                success: false,
                message: 'Invalid receiver account'
            });
        }

        // Extract order number
        let orderNumber = null;

        const contentOrderMatch = content.match(/DH\s*ORD\d+/i);
        if (contentOrderMatch) {
            orderNumber = contentOrderMatch[0].replace(/^DH\s*/i, '').toUpperCase();
        }

        if (!orderNumber && description) {
            const descOrderMatch = description.match(/DH\s*ORD\d+/i);
            if (descOrderMatch) {
                orderNumber = descOrderMatch[0].replace(/^DH\s*/i, '').toUpperCase();
            }
        }

        if (!orderNumber) {
            const directMatch = (content + ' ' + (description || '')).match(/ORD\d+/i);
            if (directMatch) {
                orderNumber = directMatch[0].toUpperCase();
            }
        }

        console.log('🔍 Extracted order number:', orderNumber);

        if (!orderNumber) {
            console.error('❌ Order number not found in content:', content);
            return res.status(400).json({
                success: false,
                message: 'Order number not found'
            });
        }

        // ✅ Find order BY ORDER_NUMBER (NOT $id)
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

        // ✅ FIX: Kiểm tra trạng thái order trước khi cập nhật
        if (order.payment_status === 'paid') {
            console.log('⚠️ Order đã được thanh toán trước đó, bỏ qua webhook');
            return res.status(200).json({
                success: true,
                message: 'Order already paid, skipping update'
            });
        }

        // Check amount
        if (transferAmount >= order.total) {
            // ✅ SUCCESS - CẬP NHẬT ORDER (KHÔNG TẠO MỚI)
            await updateOrderPaymentStatus(
                order.$id,
                code,
                'paid',
                transferAmount
            );

            console.log('✅ Payment confirmed! Order updated.');

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

        console.log('🔍 Searching for order:', orderNumber);

        const orders = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.ordersCollectionId,
            [Query.equal('order_number', orderNumber)]
        );

        console.log('📊 Query result:', orders.total, 'orders found');

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
 * ✅ CẬP NHẬT order payment status (KHÔNG TẠO MỚI)
 */
async function updateOrderPaymentStatus(orderId, transId, status, receivedAmount = 0) {
    try {
        const client = new Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId)
            .setKey(APPWRITE_CONFIG.apiKey);

        const databases = new Databases(client);

        // ✅ CHỈ CẬP NHẬT ORDER HIỆN TẠI, KHÔNG TẠO MỚI
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Sepay Webhook: http://localhost:${PORT}/api/sepay-webhook`);
    console.log(`\n⚙️  Setup guide:`);
    console.log(`   1. Go to https://my.sepay.vn`);
    console.log(`   2. Settings → Webhook`);
    console.log(`   3. Add webhook URL: http://YOUR_PUBLIC_URL/api/sepay-webhook`);
    console.log(`   4. Use ngrok: npx ngrok http 3000`);
});

module.exports = app;
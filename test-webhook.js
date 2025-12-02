// test-webhook.js - Test webhook locally

const fetch = require('node-fetch');

// ✅ Test data giống như Momo sẽ gửi
const testData = {
    partnerCode: 'MOMOEWN820251130',
    amount: 11000,
    comment: 'Order ORD1764578170399491', // ← Momo format
    transId: '12345678',
    momoTransId: '87654321',
    phone: '0896494752',
};

async function testWebhook() {
    try {
        console.log('🧪 Testing webhook with data:');
        console.log(JSON.stringify(testData, null, 2));

        const response = await fetch('http://localhost:3000/api/momo-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });

        const result = await response.json();

        console.log('\n✅ Webhook Response:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\nStatus:', response.status);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run test
testWebhook();
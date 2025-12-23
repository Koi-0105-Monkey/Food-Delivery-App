// scripts/check-owner-balance.js
// 💰 Check restaurant owner wallet balance (where all payments go)

const { Web3 } = require('web3');
const contractConfig = require('../lib/contract-config.json');

// ============================================
// CONFIG
// ============================================
const GANACHE_URL = 'http://localhost:7545';
const CONTRACT_ADDRESS = contractConfig.contractAddress;
const CONTRACT_ABI = contractConfig.abi;

// ============================================
// MAIN
// ============================================
async function checkOwnerWallet() {
    try {
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║  💰 Restaurant Owner Wallet Dashboard                ║');
        console.log('╚═══════════════════════════════════════════════════════╝\n');

        // Connect to blockchain
        const web3 = new Web3(GANACHE_URL);
        const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

        // Get owner address
        const ownerAddress = await contract.methods.owner().call();
        console.log('👤 Owner Address:', ownerAddress);
        console.log('📍 Contract Address:', CONTRACT_ADDRESS);
        console.log('');

        // Get owner balance
        const balance = await web3.eth.getBalance(ownerAddress);
        const balanceETH = web3.utils.fromWei(balance, 'ether');
        const balanceVND = parseFloat(balanceETH) * 25000; // 1 ETH = 25,000 VND

        console.log('💵 Owner Wallet Balance:');
        console.log('   ' + balanceETH + ' ETH');
        console.log('   ≈ ' + balanceVND.toLocaleString('vi-VN') + ' VND');
        console.log('');

        // Get contract balance (should be near 0 since payments auto-transfer)
        const contractBalance = await web3.eth.getBalance(CONTRACT_ADDRESS);
        const contractBalanceETH = web3.utils.fromWei(contractBalance, 'ether');

        console.log('📦 Contract Balance (temporary holding):');
        console.log('   ' + contractBalanceETH + ' ETH');
        console.log('   (Should be near 0 - payments auto-transfer to owner)');
        console.log('');

        // Get transaction stats
        const totalOrders = await contract.methods.getTotalOrders().call();
        console.log('📊 Transaction Statistics:');
        console.log('   Total Orders: ' + totalOrders);
        console.log('');

        // Get recent transactions
        if (parseInt(totalOrders) > 0) {
            console.log('📋 Recent Transactions:');
            
            const recentCount = Math.min(parseInt(totalOrders), 5);
            
            for (let i = parseInt(totalOrders) - recentCount; i < parseInt(totalOrders); i++) {
                const orderNumber = await contract.methods.orderHistory(i).call();
                const tx = await contract.methods.getTransaction(orderNumber).call();
                
                const amountETH = web3.utils.fromWei(tx.amountETH, 'ether');
                const date = new Date(parseInt(tx.timestamp) * 1000);
                
                console.log(`   ${i + 1}. ${orderNumber}`);
                console.log(`      Customer: ${tx.customer}`);
                console.log(`      Amount: ${amountETH} ETH (${parseInt(tx.amountVND).toLocaleString('vi-VN')} VND)`);
                console.log(`      Card: **** **** **** ${tx.cardLast4}`);
                console.log(`      Date: ${date.toLocaleString('vi-VN')}`);
                console.log('');
            }
        }

        // Calculate total revenue
        let totalRevenue = 0;
        for (let i = 0; i < parseInt(totalOrders); i++) {
            const orderNumber = await contract.methods.orderHistory(i).call();
            const tx = await contract.methods.getTransaction(orderNumber).call();
            if (tx.completed) {
                totalRevenue += parseInt(tx.amountVND);
            }
        }

        console.log('💰 Total Revenue:');
        console.log('   ' + totalRevenue.toLocaleString('vi-VN') + ' VND');
        console.log('   ≈ ' + (totalRevenue / 25000).toFixed(4) + ' ETH');
        console.log('');

        // Compare with owner balance
        const expectedBalanceETH = 100 + (totalRevenue / 25000); // Initial 100 ETH + revenue
        const actualBalanceETH = parseFloat(balanceETH);

        console.log('🧮 Balance Verification:');
        console.log('   Expected: ' + expectedBalanceETH.toFixed(4) + ' ETH');
        console.log('   Actual: ' + actualBalanceETH.toFixed(4) + ' ETH');
        
        const diff = Math.abs(expectedBalanceETH - actualBalanceETH);
        if (diff < 0.01) {
            console.log('   ✅ Balance matches expected value (accounting for gas fees)');
        } else {
            console.log('   ⚠️  Balance difference: ' + diff.toFixed(4) + ' ETH');
        }
        console.log('');

        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run
checkOwnerWallet();
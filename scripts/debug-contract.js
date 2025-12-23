const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

const GANACHE_URL = 'http://127.0.0.1:7545';
// Read config from deployment if possible, else use hardcoded
const CONFIG_PATH = path.resolve(__dirname, '../lib/contract-config.json');

let CONTRACT_ADDRESS;
let CONTRACT_ABI;

if (fs.existsSync(CONFIG_PATH)) {
    const config = require(CONFIG_PATH);
    CONTRACT_ADDRESS = config.contractAddress;
    CONTRACT_ABI = config.abi;
    console.log('📄 Loaded config from:', CONFIG_PATH);
} else {
    console.error('❌ Config file not found. Please deploy first.');
    process.exit(1);
}

const ORDER_ID = 'ORD1766496178100599'; // From user logs

async function debugContract() {
    const web3 = new Web3(GANACHE_URL);
    console.log('🔌 Connected to:', GANACHE_URL);
    console.log('📍 Contract:', CONTRACT_ADDRESS);

    // 1. Check Balance
    const balance = await web3.eth.getBalance(CONTRACT_ADDRESS);
    console.log('\n💰 Contract Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');

    const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

    // 2. Check Order
    try {
        const tx = await contract.methods.getTransaction(ORDER_ID).call();
        console.log('\n📦 Order Details:', ORDER_ID);
        console.log('   Customer:', tx.customer);
        console.log('   Amount VND:', tx.amountVND);
        console.log('   Amount ETH:', web3.utils.fromWei(tx.amountETH, 'ether'));
        console.log('   Completed:', tx.completed);
    } catch (e) {
        console.log('❌ Order not found or error:', e.message);
    }

    // 3. Check Owner & Rate
    const owner = await contract.methods.owner().call();
    const rate = await contract.methods.exchangeRate().call();
    console.log('\n👑 Owner:', owner);
    console.log('💱 Exchange Rate:', rate);

    // 4. Trace the issue
    if (balance == 0) {
        console.log('\n⚠️ WARNING: Contract balance is 0!');
    } else {
        console.log('\n✅ Contract has funds.');
    }
}

debugContract();

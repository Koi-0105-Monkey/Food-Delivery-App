// scripts/deploy-contract.js
// Chạy: node scripts/deploy-contract.js

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// ============================================
// CONFIG - Thay đổi theo Ganache của bạn
// ============================================
const GANACHE_URL = 'http://localhost:7545'; // Default Ganache RPC
const DEPLOYER_ADDRESS = '0xA4b2a71b57f1E8022F40A0f903e3B3E0f9752Dd7'; // Lấy từ Ganache account [0]
const DEPLOYER_PRIVATE_KEY = '0x145548605b5e7dddd8f6ce27d2f27c1cff21856edd51b5a6793697f1b8a49789'; // Lấy từ Ganache

// ============================================
// COMPILE CONTRACT
// ============================================
function compileContract() {
    console.log('📝 Compiling FoodPayment.sol...');

    const contractPath = path.resolve(__dirname, '../contracts/FoodPayment.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'FoodPayment.sol': {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        output.errors.forEach(error => {
            console.error(error.formattedMessage);
        });

        const hasError = output.errors.some(e => e.severity === 'error');
        if (hasError) {
            throw new Error('Compilation failed');
        }
    }

    const contract = output.contracts['FoodPayment.sol'].FoodPayment;

    console.log('✅ Compilation successful!\n');

    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

// ============================================
// DEPLOY CONTRACT
// ============================================
async function deployContract() {
    try {
        // Compile
        const { abi, bytecode } = compileContract();

        // Connect to Ganache
        console.log('🔌 Connecting to Ganache...');
        const web3 = new Web3(GANACHE_URL);

        // Check connection
        const isConnected = await web3.eth.net.isListening();
        if (!isConnected) {
            throw new Error('Cannot connect to Ganache. Make sure it\'s running!');
        }

        console.log('✅ Connected to Ganache\n');

        // Get deployer account
        const accounts = await web3.eth.getAccounts();

        // 🔥 Target specific admin wallet
        const TARGET_ADMIN = '0x323790e8F0C680c9f4f98653F9a91c9662cd067C';
        let deployer = accounts[0];

        // Find case-insensitive match
        const foundAccount = accounts.find(acc => acc.toLowerCase() === TARGET_ADMIN.toLowerCase());
        if (foundAccount) {
            deployer = foundAccount;
            console.log('✅ Found target admin wallet:', deployer);
        } else {
            console.warn('⚠️ Target admin not found, using first account:', deployer);
        }

        console.log('👤 Deployer address:', deployer);

        const balance = await web3.eth.getBalance(deployer);
        console.log('💰 Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH\n');

        // Create contract instance
        const contract = new web3.eth.Contract(abi);

        console.log('🚀 Deploying contract...');

        // Deploy
        const deployTx = contract.deploy({
            data: '0x' + bytecode,
            arguments: []
        });

        const gas = await deployTx.estimateGas({ from: deployer });
        console.log('⛽ Estimated gas:', gas);

        const deployedContract = await deployTx.send({
            from: deployer,
            gas: gas + 100000n, // Add buffer
            gasPrice: '20000000000' // 20 Gwei
        });

        const contractAddress = deployedContract.options.address;

        console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY! 🎉\n');
        console.log('📍 Contract Address:', contractAddress);
        console.log('🔗 Network:', GANACHE_URL);
        console.log('👤 Owner:', deployer);

        // Save deployment info
        const deploymentInfo = {
            contractAddress: contractAddress,
            deployer: deployer,
            network: GANACHE_URL,
            abi: abi,
            deployedAt: new Date().toISOString(),
            exchangeRate: 25000 // 1 ETH = 25,000 VND
        };

        const outputPath = path.resolve(__dirname, '../lib/contract-config.json');
        fs.writeFileSync(
            outputPath,
            JSON.stringify(deploymentInfo, null, 2),
            'utf8'
        );

        console.log('\n📄 Config saved to:', outputPath);

        // Test contract
        console.log('\n🧪 Testing contract...');
        const testContract = new web3.eth.Contract(abi, contractAddress);

        const owner = await testContract.methods.owner().call();
        const rate = await testContract.methods.exchangeRate().call();

        console.log('   Owner:', owner);
        console.log('   Exchange Rate:', rate, 'VND per ETH');

        console.log('\n✅ ALL DONE! Copy contract address to your .env file\n');

        return deploymentInfo;

    } catch (error) {
        console.error('\n❌ DEPLOYMENT FAILED:');
        console.error(error.message);
        process.exit(1);
    }
}

// ============================================
// RUN
// ============================================
if (require.main === module) {
    deployContract()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { deployContract };
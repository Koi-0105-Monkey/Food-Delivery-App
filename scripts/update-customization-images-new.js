// scripts/update-customization-images-new.js
// Update image_id cho customizations trong môi trường mới

const sdk = require('node-appwrite');

// ========== NEW CONFIG ==========
const API_KEY = 'standard_27ffab18f83e031df3a791be6389d6eb7fcc0e2efb0015b321d541033211fa816ba98fb3f40d0c783f63fc3f15bcca595f35a55ff64e151107771d65cb1a361ad9ad3814c0b011750b7e0e716d1bb9d955853ad4cd1100000fe4be0707439f90157743edf722ef35e37d4bf2828a191c359091f4a1fd7d59ce35cb461257c185';
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '692547d700076f184875';
const DATABASE_ID = '69402cc30014e050afaf';
const CUSTOMIZATIONS_COLLECTION_ID = 'customizations';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);

// ========== FILE IDs (PASTE FROM UPLOAD SCRIPT OUTPUT) ==========
// TODO: Thay thế bằng FILE IDs thực tế sau khi upload
const FILE_ID_MAP = {
    'cheese.png': '69411f39001320c20c82',
    'onions.png': '69411f3a0026104640db',
    'mushrooms.png': '69411f3b0023f0046f73',
    'tomatoes.png': '69411f3c00223e0618a1',
    'bacon.png': '69411f3d001e528cbec9',
    'avocado.png': '69411f3e001ade27a987',
    'fries.png': '69411f3f00184e1e901f',
    'salad.png': '69411f400015ab1b9edb',
    'mozarella-sticks.png': '69411f4100130d677879',
    'cucumber.png': '69411f42000e44a8232e',
    'coleslaw.png': '69411f43000b397aac97',
};

// ========== MAPPING ==========
const CUSTOMIZATION_IMAGE_MAPPING = {
    // Toppings
    'Extra Cheese': 'cheese.png',
    'Jalapeños': 'onions.png',
    'Jalapeño': 'onions.png',
    'Onions': 'onions.png',
    'Olives': 'mushrooms.png',
    'Mushrooms': 'mushrooms.png',
    'Tomatoes': 'tomatoes.png',
    'Bacon': 'bacon.png',
    'Avocado': 'avocado.png',
    
    // Sides
    'Coke': 'fries.png',
    'Coca Cola': 'fries.png',
    'Fries': 'fries.png',
    'French Fries': 'fries.png',
    'Garlic Bread': 'fries.png',
    'Chicken Nuggets': 'fries.png',
    'Chicken Bites': 'fries.png',
    'Iced Tea': 'fries.png',
    'Lemon Iced Tea': 'fries.png',
    'Salad': 'salad.png',
    'Potato Wedges': 'fries.png',
    'Potato Chips': 'fries.png',
    'Mozzarella Sticks': 'mozarella-sticks.png',
    'Cheese Sticks': 'mozarella-sticks.png',
    'Sweet Corn': 'cucumber.png',
    'Choco Lava Cake': 'fries.png',
    'Chocolate Lava Cake': 'fries.png',
    'Coleslaw': 'coleslaw.png',
};

// ========== MAIN FUNCTION ==========
async function updateCustomizationImages() {
    try {
        console.log('🚀 Starting customization images update...\n');
        console.log('📍 Project:', PROJECT_ID);
        console.log('💾 Database:', DATABASE_ID);
        console.log('');

        // Get all customizations
        console.log('📦 Fetching customizations...');
        const customizations = await databases.listDocuments(
            DATABASE_ID,
            CUSTOMIZATIONS_COLLECTION_ID
        );
        console.log(`✅ Found ${customizations.documents.length} customizations\n`);

        // List all customization names
        console.log('📋 Customizations in database:');
        customizations.documents.forEach((doc, idx) => {
            console.log(`  ${idx + 1}. "${doc.name}" (${doc.type})`);
        });
        console.log('');

        // Update each customization
        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        for (const customization of customizations.documents) {
            const cusName = customization.name;
            const expectedFilename = CUSTOMIZATION_IMAGE_MAPPING[cusName];

            console.log(`🍕 Processing: "${cusName}"`);

            // Check if already has image
            if (customization.image_id && customization.image_id !== 'YOUR_FILE_ID_HERE') {
                console.log(`  ℹ️  Already has image_id: ${customization.image_id}`);
                skippedCount++;
                continue;
            }

            // Check if mapping exists
            if (!expectedFilename) {
                console.warn(`  ⚠️  No mapping found`);
                console.warn(`  💡 Add this line to CUSTOMIZATION_IMAGE_MAPPING:`);
                console.warn(`     '${cusName}': 'YOUR_FILE.png',`);
                notFoundCount++;
                continue;
            }

            // Get file ID
            const fileId = FILE_ID_MAP[expectedFilename];

            if (!fileId || fileId === 'YOUR_FILE_ID_HERE') {
                console.warn(`  ⚠️  File ID not set for: ${expectedFilename}`);
                console.warn(`  💡 Run upload script first!`);
                notFoundCount++;
                continue;
            }

            // Update customization
            try {
                await databases.updateDocument(
                    DATABASE_ID,
                    CUSTOMIZATIONS_COLLECTION_ID,
                    customization.$id,
                    {
                        image_id: fileId
                    }
                );
                console.log(`  ✅ Updated with image_id: ${fileId}\n`);
                updatedCount++;

                // Delay to avoid rate limit
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`  ❌ Update failed:`, error.message);
            }
        }

        // Summary
        console.log('='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`ℹ️  Skipped (already has image): ${skippedCount}`);
        console.log(`⚠️  Not found: ${notFoundCount}`);
        console.log('='.repeat(60));

        if (updatedCount > 0) {
            console.log('\n🎉 Success! Customization images updated.');
            console.log('\n📝 Next steps:');
            console.log('   1. Restart app: npx expo start -c');
            console.log('   2. Open product detail page');
            console.log('   3. Images should now appear! 🖼️');
        } else if (notFoundCount > 0) {
            console.log('\n⚠️  No updates made.');
            console.log('   Please run upload script first:');
            console.log('   node scripts/upload-customization-images-new.js');
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

// ========== RUN ==========
updateCustomizationImages();
// scripts/update-customization-images.js
// FINAL VERSION - Simple & Working

const sdk = require('node-appwrite');

// ========== CONFIG ==========
const API_KEY = 'standard_27ffab18f83e031df3a791be6389d6eb7fcc0e2efb0015b321d541033211fa816ba98fb3f40d0c783f63fc3f15bcca595f35a55ff64e151107771d65cb1a361ad9ad3814c0b011750b7e0e716d1bb9d955853ad4cd1100000fe4be0707439f90157743edf722ef35e37d4bf2828a191c359091f4a1fd7d59ce35cb461257c185';
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '692547d700076f184875';
const DATABASE_ID = '69402cc30014e050afaf';
const BUCKET_ID = '6940c7850027b0af7447';
const CUSTOMIZATIONS_COLLECTION_ID = 'customizations';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

// ========== HARDCODED FILE IDs (từ ảnh Storage của bạn) ==========
const FILE_ID_MAP = {
    'cheese.png': '693590860032a0a41786',
    'onions.png': '69359088000200943793',
    'mushrooms.png': '693590890004b421a7b0',
    'tomatoes.png': '6935908a0006be2d1c9c',
    'bacon.png': '6935908b000cf0874e8d',
    'avocado.png': '6935908c0010ffaee093',
    'fries.png': '6935908d00123323dd44',
    'salad.png': '6935908e001423e247b7',
    'mozarella-sticks.png': '6935908f00167a671a58',
    'cucumber.png': '69359090001c0ad511ce',
    'coleslaw.png': '69359091001d8514b500',
};

// ========== MAPPING ==========
const CUSTOMIZATION_IMAGE_MAPPING = {
    // Toppings
    'Extra Cheese': 'cheese.png',
    'Jalapeños': 'onions.png',
    'Onions': 'onions.png',
    'Olives': 'mushrooms.png',
    'Mushrooms': 'mushrooms.png',
    'Tomatoes': 'tomatoes.png',
    'Bacon': 'bacon.png',
    'Avocado': 'avocado.png',
    
    // Sides
    'Coke': 'fries.png',
    'Fries': 'fries.png',
    'Garlic Bread': 'fries.png',
    'Chicken Nuggets': 'fries.png',
    'Iced Tea': 'fries.png',
    'Salad': 'salad.png',
    'Potato Wedges': 'fries.png',
    'Mozzarella Sticks': 'mozarella-sticks.png',
    'Sweet Corn': 'cucumber.png',
    'Choco Lava Cake': 'fries.png',
};

// ========== MAIN FUNCTION ==========
async function updateCustomizationImages() {
    try {
        console.log('🚀 Starting customization images update...\n');

        // Get all customizations
        console.log('📦 Fetching customizations from Database...');
        const customizations = await databases.listDocuments(
            DATABASE_ID,
            CUSTOMIZATIONS_COLLECTION_ID
        );
        console.log(`✅ Found ${customizations.documents.length} customizations\n`);

        // Update each customization
        let updatedCount = 0;
        let skippedCount = 0;
        let notFoundCount = 0;

        for (const customization of customizations.documents) {
            const cusName = customization.name;
            const expectedFilename = CUSTOMIZATION_IMAGE_MAPPING[cusName];

            console.log(`🍕 Processing: "${cusName}"`);

            // Check if already has image
            if (customization.image_id) {
                console.log(`  ℹ️  Already has image_id: ${customization.image_id}`);
                skippedCount++;
                continue;
            }

            // Check if mapping exists
            if (!expectedFilename) {
                console.warn(`  ⚠️  No mapping found`);
                notFoundCount++;
                continue;
            }

            // Get file ID from hardcoded map
            const fileId = FILE_ID_MAP[expectedFilename];

            if (!fileId) {
                console.warn(`  ⚠️  File ID not found for: ${expectedFilename}`);
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

                // Sleep to avoid rate limit
                await new Promise(resolve => setTimeout(resolve, 200));
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
            console.log('\n🎉 Success! Images linked to customizations.');
            console.log('\n📝 Next steps:');
            console.log('   1. Restart app: npx expo start -c');
            console.log('   2. Check product detail page for images!');
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

// ========== RUN ==========
updateCustomizationImages();
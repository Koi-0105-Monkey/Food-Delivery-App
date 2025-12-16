// scripts/upload-customization-images.js
// Upload ảnh customizations lên Appwrite Storage
// Chạy: node scripts/upload-customization-images.js

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== CONFIG ==========
const API_KEY = 'standard_27ffab18f83e031df3a791be6389d6eb7fcc0e2efb0015b321d541033211fa816ba98fb3f40d0c783f63fc3f15bcca595f35a55ff64e151107771d65cb1a361ad9ad3814c0b011750b7e0e716d1bb9d955853ad4cd1100000fe4be0707439f90157743edf722ef35e37d4bf2828a191c359091f4a1fd7d59ce35cb461257c185';
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '692547d700076f184875';
const BUCKET_ID = '6940c7850027b0af7447';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const storage = new sdk.Storage(client);

// ========== FILES TO UPLOAD ==========
// Map: filename → path trong assets
const FILES_TO_UPLOAD = {
    // Toppings
    'cheese.png': 'assets/images/cheese.png',
    'onions.png': 'assets/images/onions.png',
    'mushrooms.png': 'assets/images/mushrooms.png',
    'tomatoes.png': 'assets/images/tomatoes.png',
    'bacon.png': 'assets/images/bacon.png',
    'avocado.png': 'assets/images/avocado.png',
    
    // Sides
    'fries.png': 'assets/images/fries.png',
    'salad.png': 'assets/images/salad.png',
    'mozarella-sticks.png': 'assets/images/mozarella-sticks.png',
    'cucumber.png': 'assets/images/cucumber.png',
    'coleslaw.png': 'assets/images/coleslaw.png',
};

// ========== UPLOAD FUNCTION ==========
async function uploadFile(filename, filepath) {
    try {
        // Check if file exists
        if (!fs.existsSync(filepath)) {
            console.log(`  ⚠️  File not found: ${filepath}`);
            return null;
        }

        console.log(`  📤 Uploading ${filename}...`);

        // Create FormData
        const formData = new FormData();
        formData.append('fileId', sdk.ID.unique());
        formData.append('file', fs.createReadStream(filepath), filename);

        // Upload using fetch
        const response = await fetch(
            `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files`,
            {
                method: 'POST',
                headers: {
                    'X-Appwrite-Project': PROJECT_ID,
                    'X-Appwrite-Key': API_KEY,
                    ...formData.getHeaders()
                },
                body: formData
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.log(`  ❌ Upload failed: ${error}`);
            return null;
        }

        const fileData = await response.json();
        console.log(`  ✅ Uploaded successfully! ID: ${fileData.$id}`);
        
        return fileData.$id;
    } catch (error) {
        console.error(`  ❌ Error uploading ${filename}:`, error.message);
        return null;
    }
}

// ========== MAIN ==========
async function main() {
    console.log('🚀 Starting customization images upload...\n');

    let successCount = 0;
    let failCount = 0;

    // Check which files already exist in Storage
    console.log('📦 Checking existing files in Storage...');
    const existingFiles = await storage.listFiles(BUCKET_ID);
    const existingFileNames = new Set(existingFiles.files.map(f => f.name));
    console.log(`✅ Found ${existingFiles.files.length} existing files\n`);

    // Upload each file
    for (const [filename, filepath] of Object.entries(FILES_TO_UPLOAD)) {
        console.log(`\n📸 Processing: ${filename}`);

        // Check if already exists
        if (existingFileNames.has(filename)) {
            console.log(`  ℹ️  Already exists in Storage, skipping...`);
            successCount++;
            continue;
        }

        const fileId = await uploadFile(filename, filepath);
        
        if (fileId) {
            successCount++;
        } else {
            failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPLOAD SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
        console.log('\n🎉 Upload completed!');
        console.log('\n📝 Next steps:');
        console.log('   1. Run: node scripts/update-customization-images.js');
        console.log('   2. Restart app: npx expo start -c');
    }
}

// ========== RUN ==========
main().catch(console.error);
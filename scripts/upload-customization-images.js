// scripts/upload-customization-images.js
// Upload ảnh customizations lên Appwrite Storage
// Chạy: node scripts/upload-customization-images.js

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== CONFIG ==========
const API_KEY = 'standard_13b9401fd29684bb5adb80d060c6ef703af46eeca76b456181289fdd9ece957a20503d8ef46bfa42bd82aa48433f58181fe12aa42cb8b41066441ea00478cc811cdd4864ceb7c8d7003bdf39a017f5f1842f5963637733fb93b8be984fb4da391f118291ffba6599291c25215468597da58b678716fd41b35e6a240095c95dd1';
const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = '69230ad2001fb8f2aee4';
const BUCKET_ID = '692334a700377dae1061';

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
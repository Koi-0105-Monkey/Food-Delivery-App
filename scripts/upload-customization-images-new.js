// scripts/upload-customization-images-new.js
// Upload ảnh vào môi trường mới

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// ========== NEW CONFIG ==========
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
        if (!fs.existsSync(filepath)) {
            console.log(`  ⚠️  File not found: ${filepath}`);
            return null;
        }

        console.log(`  📤 Uploading ${filename}...`);

        const formData = new FormData();
        formData.append('fileId', sdk.ID.unique());
        formData.append('file', fs.createReadStream(filepath), filename);

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
        console.log(`  ✅ Uploaded! ID: ${fileData.$id}`);
        
        return { filename, fileId: fileData.$id };
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return null;
    }
}

// ========== MAIN ==========
async function main() {
    console.log('🚀 Uploading customization images to NEW environment...\n');
    console.log('📍 Project:', PROJECT_ID);
    console.log('📦 Bucket:', BUCKET_ID);
    console.log('');

    const uploadedFiles = {};
    let successCount = 0;
    let failCount = 0;

    for (const [filename, filepath] of Object.entries(FILES_TO_UPLOAD)) {
        console.log(`\n📸 Processing: ${filename}`);

        const result = await uploadFile(filename, filepath);
        
        if (result) {
            uploadedFiles[result.filename] = result.fileId;
            successCount++;
        } else {
            failCount++;
        }

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
        console.log('\n📋 COPY THESE FILE IDs:\n');
        console.log('const FILE_ID_MAP = {');
        for (const [filename, fileId] of Object.entries(uploadedFiles)) {
            console.log(`    '${filename}': '${fileId}',`);
        }
        console.log('};');
        
        console.log('\n📝 Next steps:');
        console.log('   1. Copy the FILE_ID_MAP above');
        console.log('   2. Update the update script with these IDs');
        console.log('   3. Run: node scripts/update-customization-images-new.js');
    }
}

main().catch(console.error);
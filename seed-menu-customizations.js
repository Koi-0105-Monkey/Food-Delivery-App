// seed-menu-customizations.js - Đặt file này ở root project
const sdk = require('node-appwrite');

// ========== CẤU HÌNH APPWRITE ==========
const API_KEY = 'standard_13b9401fd29684bb5adb80d060c6ef703af46eeca76b456181289fdd9ece957a20503d8ef46bfa42bd82aa48433f58181fe12aa42cb8b41066441ea00478cc811cdd4864ceb7c8d7003bdf39a017f5f1842f5963637733fb93b8be984fb4da391f118291ffba6599291c25215468597da58b678716fd41b35e6a240095c95dd1';
const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const PROJECT_ID = '69230ad2001fb8f2aee4';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);

const DATABASE_ID = '68629ae60038a7c61fe4';
const MENU_COLLECTION_ID = 'menu';
const CUSTOMIZATIONS_COLLECTION_ID = 'customizations';
const MENU_CUSTOMIZATIONS_COLLECTION_ID = 'menu_customizations';

// ========== MAIN FUNCTION ==========
async function seedMenuCustomizations() {
    try {
        console.log('🚀 Bắt đầu seed menu_customizations...\n');

        // 1. Get all menu items
        console.log('📋 Lấy danh sách menu items...');
        const menuItems = await databases.listDocuments(
            DATABASE_ID,
            MENU_COLLECTION_ID
        );
        console.log(`   ✅ Tìm thấy ${menuItems.documents.length} menu items\n`);

        // 2. Get all customizations
        console.log('📋 Lấy danh sách customizations...');
        const customizations = await databases.listDocuments(
            DATABASE_ID,
            CUSTOMIZATIONS_COLLECTION_ID
        );
        console.log(`   ✅ Tìm thấy ${customizations.documents.length} customizations\n`);

        // Create maps for easy lookup
        const toppings = customizations.documents.filter(c => c.type === 'topping');
        const sides = customizations.documents.filter(c => c.type === 'side');

        console.log(`   🍕 Toppings: ${toppings.length}`);
        console.log(`   🍟 Sides: ${sides.length}\n`);

        // 3. Clear existing menu_customizations (optional)
        console.log('🗑️  Xóa menu_customizations cũ...');
        const existingLinks = await databases.listDocuments(
            DATABASE_ID,
            MENU_CUSTOMIZATIONS_COLLECTION_ID
        );
        
        for (const doc of existingLinks.documents) {
            await databases.deleteDocument(
                DATABASE_ID,
                MENU_CUSTOMIZATIONS_COLLECTION_ID,
                doc.$id
            );
        }
        console.log(`   ✅ Đã xóa ${existingLinks.documents.length} links cũ\n`);

        // 4. Create menu_customizations links
        console.log('🔗 Tạo links cho mỗi menu item...\n');
        
        let totalCreated = 0;

        for (const menuItem of menuItems.documents) {
            console.log(`📦 ${menuItem.name}:`);
            
            // Randomly select 3-5 toppings
            const numToppings = Math.floor(Math.random() * 3) + 3; // 3-5
            const selectedToppings = toppings
                .sort(() => Math.random() - 0.5)
                .slice(0, numToppings);

            // Randomly select 3-5 sides
            const numSides = Math.floor(Math.random() * 3) + 3; // 3-5
            const selectedSides = sides
                .sort(() => Math.random() - 0.5)
                .slice(0, numSides);

            const selectedCustomizations = [...selectedToppings, ...selectedSides];

            console.log(`   ├─ Toppings: ${selectedToppings.map(t => t.name).join(', ')}`);
            console.log(`   ├─ Sides: ${selectedSides.map(s => s.name).join(', ')}`);
            console.log(`   └─ Tổng: ${selectedCustomizations.length} customizations`);

            // Create links
            for (const custom of selectedCustomizations) {
                await databases.createDocument(
                    DATABASE_ID,
                    MENU_CUSTOMIZATIONS_COLLECTION_ID,
                    sdk.ID.unique(),
                    {
                        menu: menuItem.$id,
                        customizations: custom.$id, // ⚠️ QUAN TRỌNG: Đây là string ID
                    }
                );
                totalCreated++;
            }

            console.log('');
        }

        console.log('✅ Hoàn tất! 🎉');
        console.log(`📊 Tổng kết:`);
        console.log(`   - ${menuItems.documents.length} menu items`);
        console.log(`   - ${totalCreated} menu_customizations links đã tạo`);

    } catch (error) {
        console.error('\n❌ Lỗi:', error);
        console.error('Chi tiết:', {
            message: error.message,
            code: error.code,
            type: error.type
        });
        throw error;
    }
}

// Chạy script
seedMenuCustomizations();
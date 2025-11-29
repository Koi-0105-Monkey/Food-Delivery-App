// seed.js - Đặt file này ở root project
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// ========== CẤU HÌNH APPWRITE ==========
// Hardcode API Key trực tiếp
const API_KEY = 'standard_13b9401fd29684bb5adb80d060c6ef703af46eeca76b456181289fdd9ece957a20503d8ef46bfa42bd82aa48433f58181fe12aa42cb8b41066441ea00478cc811cdd4864ceb7c8d7003bdf39a017f5f1842f5963637733fb93b8be984fb4da391f118291ffba6599291c25215468597da58b678716fd41b35e6a240095c95dd1';

// ⚠️ THAY ĐỔI endpoint theo region của bạn
// Kiểm tra trong Appwrite Console > Settings > Endpoint
const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1'; // hoặc region khác của bạn
const PROJECT_ID = '69230ad2001fb8f2aee4';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

// Sử dụng đúng config từ appwrite.ts
const DATABASE_ID = '68629ae60038a7c61fe4';
const CATEGORIES_COLLECTION_ID = '692315a6001ae62780a0';
const CUSTOMIZATIONS_COLLECTION_ID = 'customizations';
const MENU_COLLECTION_ID = 'menu';
const MENU_CUSTOMIZATIONS_COLLECTION_ID = 'menu_customizations';
const BUCKET_ID = '692334a700377dae1061';


// ========== DỮ LIỆU ==========
const dummyData = {
    categories: [
        { name: "Burgers", description: "Juicy grilled burgers" },
        { name: "Pizzas", description: "Oven-baked cheesy pizzas" },
        { name: "Burritos", description: "Rolled Mexican delights" },
        { name: "Sandwiches", description: "Stacked and stuffed sandwiches" },
        { name: "Wraps", description: "Rolled up wraps packed with flavor" },
        { name: "Bowls", description: "Balanced rice and protein bowls" },
    ],

    customizations: [
        { name: "Extra Cheese", price: 25, type: "topping" },
        { name: "Jalapeños", price: 20, type: "topping" },
        { name: "Onions", price: 10, type: "topping" },
        { name: "Olives", price: 15, type: "topping" },
        { name: "Mushrooms", price: 18, type: "topping" },
        { name: "Tomatoes", price: 10, type: "topping" },
        { name: "Bacon", price: 30, type: "topping" },
        { name: "Avocado", price: 35, type: "topping" },
        { name: "Coke", price: 30, type: "side" },
        { name: "Fries", price: 35, type: "side" },
        { name: "Garlic Bread", price: 40, type: "side" },
        { name: "Chicken Nuggets", price: 50, type: "side" },
        { name: "Iced Tea", price: 28, type: "side" },
        { name: "Salad", price: 33, type: "side" },
        { name: "Potato Wedges", price: 38, type: "side" },
        { name: "Mozzarella Sticks", price: 45, type: "side" },
        { name: "Sweet Corn", price: 25, type: "side" },
        { name: "Choco Lava Cake", price: 42, type: "side" },
    ],

    menu: [
        {
            name: "Classic Cheese Burger",
            description: "Beef patty, cheese, lettuce, tomatoes",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/044/844/600/large_2x/homemade-fresh-tasty-burger-with-meat-and-cheese-classic-cheese-burger-and-vegetable-ai-generated-free-png.png",
            price: 45000,
            rating: 4.5,
            calories: 550,
            protein: 25,
            category_name: "Burgers",
            customizations: ["Extra Cheese", "Coca Cola", "French Fries", "Onions", "Bacon"],
        },
        {
            name: "Pepperoni Pizza",
            description: "Cheesy pizza topped with pepperoni",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/023/742/417/large_2x/pepperoni-pizza-isolated-illustration-ai-generative-free-png.png",
            price: 89000,
            rating: 4.7,
            calories: 700,
            protein: 30,
            category_name: "Pizzas",
            customizations: ["Extra Cheese", "Jalapeño", "Garlic Bread", "Coca Cola", "Olives"],
        },
        {
            name: "Bean Burrito",
            description: "Burrito stuffed with beans, rice, and salsa",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/055/133/581/large_2x/deliciously-grilled-burritos-filled-with-beans-corn-and-fresh-vegetables-served-with-lime-wedge-and-cilantro-isolated-on-transparent-background-free-png.png",
            price: 39000,
            rating: 4.2,
            calories: 480,
            protein: 18,
            category_name: "Burritos",
            customizations: ["Jalapeño", "Lemon Iced Tea", "French Fries", "Salad"],
        },
        {
            name: "BBQ Bacon Burger",
            description: "Smoky BBQ sauce, crispy bacon, cheddar cheese",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/060/236/245/large_2x/a-large-hamburger-with-cheese-onions-and-lettuce-free-png.png",
            price: 55000,
            rating: 4.8,
            calories: 650,
            protein: 29,
            category_name: "Burgers",
            customizations: ["Onions", "French Fries", "Coca Cola", "Bacon", "Avocado"],
        },
        {
            name: "Caesar Chicken Wrap",
            description: "Grilled chicken, lettuce, Caesar dressing",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/048/930/603/large_2x/caesar-wrap-grilled-chicken-isolated-on-transparent-background-free-png.png",
            price: 42000,
            rating: 4.4,
            calories: 490,
            protein: 28,
            category_name: "Wraps",
            customizations: ["Extra Cheese", "Coca Cola", "Potato Chips", "Tomatoes"],
        },
        {
            name: "Grilled Veggie Sandwich",
            description: "Grilled vegetables, pesto, cheese",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/047/832/012/large_2x/grilled-sesame-seed-bread-veggie-sandwich-with-tomato-and-onion-free-png.png",
            price: 38000,
            rating: 4.1,
            calories: 420,
            protein: 19,
            category_name: "Sandwiches",
            customizations: ["Mushrooms", "Olives", "Cheese Sticks", "Lemon Iced Tea"],
        },
        {
            name: "Double Beef Burger",
            description: "Two juicy beef patties and cheese",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/060/359/627/large_2x/double-cheeseburger-with-lettuce-tomatoes-cheese-and-sesame-bun-free-png.png",
            price: 69000,
            rating: 4.9,
            calories: 720,
            protein: 35,
            category_name: "Burgers",
            customizations: ["Extra Cheese", "Onions", "French Fries", "Coca Cola", "Chicken Bites"],
        },
        {
            name: "Paneer Tikka Wrap",
            description: "Spicy paneer, mint sauce, mixed vegetables",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/057/913/530/large_2x/delicious-wraps-a-tantalizing-array-of-wraps-filled-with-vibrant-vegetables-succulent-fillings-and-fresh-ingredients-artfully-arranged-for-a-mouthwatering-culinary-experience-free-png.png",
            price: 48000,
            rating: 4.6,
            calories: 470,
            protein: 20,
            category_name: "Wraps",
            customizations: ["Jalapeño", "Tomatoes", "Salad", "French Fries", "Lemon Iced Tea"],
        },
        {
            name: "Mexican Burrito Bowl",
            description: "Rice, beans, corn, avocado, salsa",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/057/466/374/large_2x/healthy-quinoa-bowl-with-avocado-tomato-and-black-beans-ingredients-free-png.png",
            price: 52000,
            rating: 4.7,
            calories: 610,
            protein: 24,
            category_name: "Bowls",
            customizations: ["Avocado", "Sweet Corn", "Salad", "Lemon Iced Tea"],
        },
        {
            name: "Spicy Chicken Sandwich",
            description: "Crispy chicken, spicy sauce, pickles",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/051/814/008/large_2x/a-grilled-chicken-sandwich-with-lettuce-and-tomatoes-free-png.png",
            price: 49000,
            rating: 4.3,
            calories: 540,
            protein: 26,
            category_name: "Sandwiches",
            customizations: ["Jalapeño", "Onions", "French Fries", "Coca Cola", "Chocolate Lava Cake"],
        },
        {
            name: "Classic Margherita Pizza",
            description: "Tomatoes, mozzarella cheese, fresh basil",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/058/700/845/large_2x/free-isolated-on-transparent-background-delicious-pizza-topped-with-fresh-tomatoes-basil-and-melted-cheese-perfect-for-food-free-png.png",
            price: 75000,
            rating: 4.1,
            calories: 590,
            protein: 21,
            category_name: "Pizzas",
            customizations: ["Extra Cheese", "Olives", "Coca Cola", "Garlic Bread"],
        },
        {
            name: "Protein Bowl",
            description: "Grilled chicken, quinoa, mixed vegetables",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/056/106/379/large_2x/top-view-salad-with-chicken-avocado-tomatoes-and-lettuce-free-png.png",
            price: 62000,
            rating: 4.8,
            calories: 580,
            protein: 38,
            category_name: "Bowls",
            customizations: ["Avocado", "Salad", "Sweet Corn", "Lemon Iced Tea"],
        },
        {
            name: "Paneer Burrito",
            description: "Paneer, masala spices, rice, beans",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/056/565/254/large_2x/burrito-with-cauliflower-and-vegetables-free-png.png",
            price: 49000,
            rating: 4.2,
            calories: 510,
            protein: 22,
            category_name: "Burritos",
            customizations: ["Jalapeño", "French Fries", "Garlic Bread", "Coca Cola"],
        },
        {
            name: "Chicken Club Sandwich",
            description: "Grilled chicken, lettuce, cheese, tomatoes",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/060/364/135/large_2x/a-flavorful-club-sandwich-with-turkey-bacon-and-fresh-vegetables-sliced-and-isolated-on-a-transparent-background-free-png.png",
            price: 54000,
            rating: 4.5,
            calories: 610,
            protein: 31,
            category_name: "Sandwiches",
            customizations: ["Bacon", "Tomatoes", "Cheese Sticks", "Lemon Iced Tea"],
        },
    ],
};

// ========== HELPER FUNCTIONS ==========
async function clearCollection(collectionId) {
    try {
        const list = await databases.listDocuments(DATABASE_ID, collectionId);
        console.log(`  🗑️  Xóa ${list.documents.length} documents từ ${collectionId}`);
        
        for (const doc of list.documents) {
            await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
        }
    } catch (error) {
        console.log(`  ⚠️  Collection ${collectionId} chưa tồn tại hoặc trống`);
    }
}

async function clearStorage() {
    try {
        const list = await storage.listFiles(BUCKET_ID);
        console.log(`  🗑️  Xóa ${list.files.length} files từ storage`);
        
        for (const file of list.files) {
            await storage.deleteFile(BUCKET_ID, file.$id);
        }
    } catch (error) {
        console.log(`  ⚠️  Bucket chưa tồn tại hoặc trống`);
    }
}

// ========== HELPER FUNCTIONS ==========
async function downloadImage(imageUrl, filename) {
    try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        return filePath;
    } catch (error) {
        console.error(`    ❌ Lỗi tải ảnh ${imageUrl}:`, error.message);
        return null;
    }
}

async function uploadImageToStorage(imageUrl, menuName) {
    try {
        // Tạo tên file đơn giản
        const filename = `${menuName.replace(/\s+/g, '-').toLowerCase()}.png`;
        
        console.log(`    📥 Đang tải ảnh...`);
        const localPath = await downloadImage(imageUrl, filename);
        
        if (!localPath) {
            return imageUrl; // Fallback
        }
        
        console.log(`    📤 Đang upload lên Storage...`);
        
        // Tạo FormData
        const formData = new FormData();
        formData.append('fileId', sdk.ID.unique());
        formData.append('file', fs.createReadStream(localPath), filename);
        
        // Upload bằng fetch thay vì SDK
        const uploadResponse = await fetch(
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
        
        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }
        
        const fileData = await uploadResponse.json();
        
        // Lấy URL
        const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileData.$id}/view?project=${PROJECT_ID}`;
        
        console.log(`    ✅ Upload thành công!`);
        return fileUrl;
    } catch (error) {
        console.error(`    ❌ Upload failed:`, error.message);
        return imageUrl; // Fallback
    }
}

// ========== MAIN SEED FUNCTION ==========
async function seed() {
    try {
        console.log('🚀 Bắt đầu seed database...\n');

        // 1. Clear data cũ
        console.log('📦 Xóa dữ liệu cũ...');
        await clearCollection(MENU_CUSTOMIZATIONS_COLLECTION_ID);
        await clearCollection(MENU_COLLECTION_ID);
        await clearCollection(CUSTOMIZATIONS_COLLECTION_ID);
        await clearCollection(CATEGORIES_COLLECTION_ID);
        await clearStorage();
        console.log('  ✅ Xóa xong!\n');

        // 2. Seed Categories
        console.log('📁 Tạo Categories...');
        const categoryMap = {};
        for (const cat of dummyData.categories) {
            const doc = await databases.createDocument(
                DATABASE_ID,
                CATEGORIES_COLLECTION_ID,
                sdk.ID.unique(),
                cat
            );
            categoryMap[cat.name] = doc.$id;
            console.log(`  ✓ ${cat.name}`);
        }

        // 3. Seed Customizations
        console.log('\n🍕 Tạo Customizations...');
        const customizationMap = {};
        for (const cus of dummyData.customizations) {
            const doc = await databases.createDocument(
                DATABASE_ID,
                CUSTOMIZATIONS_COLLECTION_ID,
                sdk.ID.unique(),
                {
                    name: cus.name,
                    price: cus.price,
                    type: cus.type,
                }
            );
            customizationMap[cus.name] = doc.$id;
            console.log(`  ✓ ${cus.name} ($${cus.price})`);
        }

        // 4. Seed Menu Items
        console.log('\n🍔 Tạo Menu Items...');
        for (const item of dummyData.menu) {
            console.log(`\n  📸 ${item.name}...`);
            const uploadedImageUrl = await uploadImageToStorage(item.image_url, item.name);

            const doc = await databases.createDocument(
                DATABASE_ID,
                MENU_COLLECTION_ID,
                sdk.ID.unique(),
                {
                    name: item.name,
                    description: item.description,
                    image_url: uploadedImageUrl,
                    price: item.price,
                    rating: item.rating,
                    calories: item.calories,
                    protein: item.protein,
                    categories: categoryMap[item.category_name],
                }
            );

            console.log(`  ✓ ${item.name} ($${item.price})`);

            // 5. Tạo menu_customizations relationships
            for (const cusName of item.customizations) {
                if (customizationMap[cusName]) {
                    await databases.createDocument(
                        DATABASE_ID,
                        MENU_CUSTOMIZATIONS_COLLECTION_ID,
                        sdk.ID.unique(),
                        {
                            menu: doc.$id,
                            customizations: customizationMap[cusName],
                        }
                    );
                }
            }
        }

        console.log('\n✅ Seed hoàn tất! 🎉');
        console.log(`📊 Tổng kết:`);
        console.log(`   - ${dummyData.categories.length} categories`);
        console.log(`   - ${dummyData.customizations.length} customizations`);
        console.log(`   - ${dummyData.menu.length} menu items`);

    } catch (error) {
        console.error('\n❌ Lỗi seed:', error);
        throw error;
    }
}

// Chạy seed
seed();
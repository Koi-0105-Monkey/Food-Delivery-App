// seed.js - Đặt file này ở root project
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Readable } = require('stream');

// ========== CẤU HÌNH APPWRITE ==========
// Hardcode API Key trực tiếp
const API_KEY = 'standard_27ffab18f83e031df3a791be6389d6eb7fcc0e2efb0015b321d541033211fa816ba98fb3f40d0c783f63fc3f15bcca595f35a55ff64e151107771d65cb1a361ad9ad3814c0b011750b7e0e716d1bb9d955853ad4cd1100000fe4be0707439f90157743edf722ef35e37d4bf2828a191c359091f4a1fd7d59ce35cb461257c185';

// ⚠️ THAY ĐỔI endpoint theo region của bạn
// Kiểm tra trong Appwrite Console > Settings > Endpoint
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1'; // hoặc region khác của bạn
const PROJECT_ID = '692547d700076f184875';

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);
const storage = new sdk.Storage(client);

// Sử dụng đúng config từ appwrite.ts
const DATABASE_ID = '69402cc30014e050afaf';
const CATEGORIES_COLLECTION_ID = 'categories';
const CUSTOMIZATIONS_COLLECTION_ID = 'customizations';
const MENU_COLLECTION_ID = 'menu';
const MENU_CUSTOMIZATIONS_COLLECTION_ID = 'menu_customizations';
const BUCKET_ID = '6940c7850027b0af7447';


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
            tabs: "1,2", // SUMMER COMBO (1) and BURGER BASH (2)
            customizations: ["Extra Cheese", "Coke", "Fries", "Onions", "Bacon"],
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
            tabs: "3", // PIZZA PARTY (3)
            customizations: ["Extra Cheese", "Jalapeños", "Garlic Bread", "Coke", "Olives"],
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
            tabs: "4", // BURRITO DELIGHT (4)
            customizations: ["Jalapeños", "Iced Tea", "Fries", "Salad"],
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
            tabs: "1,2", // SUMMER COMBO (1) and BURGER BASH (2)
            customizations: ["Onions", "Fries", "Coke", "Bacon", "Avocado"],
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
            tabs: "", // Not in any combo
            customizations: ["Extra Cheese", "Coke", "Potato Wedges", "Tomatoes"],
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
            tabs: "", // Not in any combo
            customizations: ["Mushrooms", "Olives", "Mozzarella Sticks", "Iced Tea"],
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
            tabs: "2", // BURGER BASH (2)
            customizations: ["Extra Cheese", "Onions", "Fries", "Coke", "Chicken Nuggets"],
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
            tabs: "", // Not in any combo
            customizations: ["Jalapeños", "Tomatoes", "Salad", "Fries", "Iced Tea"],
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
            tabs: "", // Not in any combo
            customizations: ["Avocado", "Sweet Corn", "Salad", "Iced Tea"],
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
            tabs: "", // Not in any combo
            customizations: ["Jalapeños", "Onions", "Fries", "Coke", "Choco Lava Cake"],
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
            tabs: "3", // PIZZA PARTY (3)
            customizations: ["Extra Cheese", "Olives", "Coke", "Garlic Bread"],
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
            tabs: "", // Not in any combo
            customizations: ["Avocado", "Salad", "Sweet Corn", "Iced Tea"],
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
            tabs: "4", // BURRITO DELIGHT (4)
            customizations: ["Jalapeños", "Fries", "Garlic Bread", "Coke"],
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
            tabs: "", // Not in any combo
            customizations: ["Bacon", "Tomatoes", "Mozzarella Sticks", "Iced Tea"],
        },
        {
            name: "Summer Special Burger",
            description: "Fresh beef patty with summer vegetables and special sauce",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/044/844/600/large_2x/homemade-fresh-tasty-burger-with-meat-and-cheese-classic-cheese-burger-and-vegetable-ai-generated-free-png.png",
            price: 52000,
            rating: 4.6,
            calories: 580,
            protein: 27,
            category_name: "Burgers",
            tabs: "1", // SUMMER COMBO (1)
            customizations: ["Extra Cheese", "Tomatoes", "Fries", "Coke", "Avocado"],
        },
        {
            name: "Crispy Chicken Burger",
            description: "Crispy fried chicken with coleslaw and mayo",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/060/236/245/large_2x/a-large-hamburger-with-cheese-onions-and-lettuce-free-png.png",
            price: 48000,
            rating: 4.7,
            calories: 620,
            protein: 28,
            category_name: "Burgers",
            tabs: "2", // BURGER BASH (2)
            customizations: ["Extra Cheese", "Onions", "Fries", "Coke"],
        },
        {
            name: "Veggie Delight Burger",
            description: "Grilled vegetables patty with special sauce",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/044/844/600/large_2x/homemade-fresh-tasty-burger-with-meat-and-cheese-classic-cheese-burger-and-vegetable-ai-generated-free-png.png",
            price: 44000,
            rating: 4.4,
            calories: 450,
            protein: 18,
            category_name: "Burgers",
            tabs: "1", // SUMMER COMBO (1)
            customizations: ["Mushrooms", "Tomatoes", "Salad", "Iced Tea"],
        },
        {
            name: "BBQ Chicken Pizza",
            description: "BBQ sauce, grilled chicken, red onions, mozzarella",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/023/742/417/large_2x/pepperoni-pizza-isolated-illustration-ai-generative-free-png.png",
            price: 95000,
            rating: 4.8,
            calories: 750,
            protein: 32,
            category_name: "Pizzas",
            tabs: "3", // PIZZA PARTY (3)
            customizations: ["Extra Cheese", "Jalapeños", "Garlic Bread", "Coke"],
        },
        {
            name: "Hawaiian Pizza",
            description: "Ham, pineapple, mozzarella cheese",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/023/742/417/large_2x/pepperoni-pizza-isolated-illustration-ai-generative-free-png.png",
            price: 88000,
            rating: 4.5,
            calories: 680,
            protein: 28,
            category_name: "Pizzas",
            tabs: "3", // PIZZA PARTY (3)
            customizations: ["Extra Cheese", "Olives", "Garlic Bread", "Coke"],
        },
        {
            name: "Supreme Pizza",
            description: "Pepperoni, sausage, peppers, onions, mushrooms",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/023/742/417/large_2x/pepperoni-pizza-isolated-illustration-ai-generative-free-png.png",
            price: 102000,
            rating: 4.9,
            calories: 820,
            protein: 35,
            category_name: "Pizzas",
            tabs: "3", // PIZZA PARTY (3)
            customizations: ["Extra Cheese", "Jalapeños", "Garlic Bread", "Coke"],
        },
        {
            name: "Chicken Burrito",
            description: "Grilled chicken, rice, beans, cheese, salsa",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/055/133/581/large_2x/deliciously-grilled-burritos-filled-with-beans-corn-and-fresh-vegetables-served-with-lime-wedge-and-cilantro-isolated-on-transparent-background-free-png.png",
            price: 55000,
            rating: 4.6,
            calories: 620,
            protein: 30,
            category_name: "Burritos",
            tabs: "4", // BURRITO DELIGHT (4)
            customizations: ["Extra Cheese", "Jalapeños", "Fries", "Coke", "Avocado"],
        },
        {
            name: "Beef Burrito",
            description: "Seasoned beef, rice, beans, cheese, sour cream",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/055/133/581/large_2x/deliciously-grilled-burritos-filled-with-beans-corn-and-fresh-vegetables-served-with-lime-wedge-and-cilantro-isolated-on-transparent-background-free-png.png",
            price: 62000,
            rating: 4.7,
            calories: 680,
            protein: 32,
            category_name: "Burritos",
            tabs: "4", // BURRITO DELIGHT (4)
            customizations: ["Extra Cheese", "Jalapeños", "Fries", "Coke"],
        },
        {
            name: "Veggie Burrito",
            description: "Mixed vegetables, rice, beans, cheese",
            image_url:
                "https://static.vecteezy.com/system/resources/previews/055/133/581/large_2x/deliciously-grilled-burritos-filled-with-beans-corn-and-fresh-vegetables-served-with-lime-wedge-and-cilantro-isolated-on-transparent-background-free-png.png",
            price: 46000,
            rating: 4.3,
            calories: 520,
            protein: 20,
            category_name: "Burritos",
            tabs: "4", // BURRITO DELIGHT (4)
            customizations: ["Extra Cheese", "Avocado", "Salad", "Iced Tea"],
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

async function uploadImageToStorage(imageUrl, menuName) {
    try {
        const filename = `${menuName.replace(/\s+/g, '-').toLowerCase()}.png`;
        
        console.log(`    📥 Đang tải ảnh từ URL...`);
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`    📤 Đang upload lên Storage...`);
        
        // Tạo stream từ buffer
        const stream = Readable.from(buffer);
        
        // Tạo FormData
        const formData = new FormData();
        const fileId = sdk.ID.unique();
        formData.append('fileId', fileId);
        formData.append('file', stream, {
            filename: filename,
            contentType: 'image/png',
            knownLength: buffer.length
        });
        
        // Upload bằng fetch
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
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
        }
        
        const fileData = await uploadResponse.json();
        
        // Lấy URL
        const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileData.$id}/view?project=${PROJECT_ID}`;
        
        console.log(`    ✅ Upload thành công!`);
        return fileUrl;
    } catch (error) {
        console.error(`    ❌ Upload failed:`, error.message);
        return imageUrl; // Fallback về URL gốc nếu upload thất bại
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
            console.log(`  ✓ ${cus.name} (${cus.price}đ)`);
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
                    tabs: item.tabs || "",
                }
            );

            console.log(`  ✓ ${item.name} (${item.price}đ)`);

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
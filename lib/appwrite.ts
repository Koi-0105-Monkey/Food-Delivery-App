import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';
import { CreateUserParams, GetMenuParams, SignInParams, User } from '@/type';

// ========== APPWRITE CONFIGURATION FROM ENV ==========
export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!,
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
    categoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID!,
    menuCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MENU_COLLECTION_ID!,
    customizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CUSTOMIZATIONS_COLLECTION_ID!,
    menuCustomizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MENU_CUSTOMIZATIONS_COLLECTION_ID!,
    userAddressesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_ADDRESSES_COLLECTION_ID!,
    cartItemsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CART_ITEMS_COLLECTION_ID!,
    ordersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!,
};

// Validate required environment variables
const requiredEnvVars = [
    'EXPO_PUBLIC_APPWRITE_ENDPOINT',
    'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
    'EXPO_PUBLIC_APPWRITE_PLATFORM',
    'EXPO_PUBLIC_APPWRITE_DATABASE_ID',
    'EXPO_PUBLIC_APPWRITE_BUCKET_ID',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`❌ Missing required environment variable: ${envVar}`);
    }
}

// ========== CLIENT INITIALIZATION ==========
export const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
const avatars = new Avatars(client);

// Helper function to wait for session to be ready
const waitForSession = (ms: number = 1000) => 
    new Promise(resolve => setTimeout(resolve, ms));

// ========== AUTH FUNCTIONS - COMPLETE FIXED VERSION ==========

export const createUser = async ({ email, password, name }: CreateUserParams) => {
    try {
        console.log('🔐 Starting sign up...');

        // 1. Delete existing sessions
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            console.log('No existing sessions');
        }

        // 2. Create account
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            name
        );

        if (!newAccount) {
            throw new Error('Failed to create account');
        }

        console.log('✅ Account created:', newAccount.$id);

        // 3. Sign in immediately
        const session = await account.createEmailPasswordSession(email, password);
        console.log('✅ Session created:', session.$id);

        // 4. Wait for session to be active (Android needs more time)
        await waitForSession(1000);

        // 5. Verify session
        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        // 6. Create avatar
        const avatarUrl = avatars.getInitialsURL(name);

        // 7. ✅ FIX: Create user document with explicit permissions
        const userDocument = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            {
                email,
                name,
                accountId: newAccount.$id,
                avatar: avatarUrl.toString(),
                phone: '',
            },
            [
                // ✅ CRITICAL: Set permissions explicitly for this user
                `read("user:${newAccount.$id}")`,
                `update("user:${newAccount.$id}")`,
                `delete("user:${newAccount.$id}")`,
            ]
        );

        console.log('✅ User document created:', userDocument.$id);

        return userDocument;
    } catch (error: any) {
        console.error('❌ Create user error:', error);

        if (error.code === 409) {
            throw new Error('An account with this email already exists');
        }
        if (error.code === 401 || error.message?.includes('authorized')) {
            throw new Error('Permission error. Please check Appwrite collection permissions.');
        }
        if (error.message?.includes('Invalid email')) {
            throw new Error('Invalid email format');
        }
        if (error.message?.includes('password')) {
            throw new Error('Password must be at least 8 characters');
        }

        throw new Error(error.message || 'Failed to create user');
    }
};

export const signIn = async ({ email, password }: SignInParams) => {
    try {
        console.log('🔐 Starting sign in...');

        // Delete any existing session first
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            console.log('No existing sessions');
        }

        // Create new session
        const session = await account.createEmailPasswordSession(email, password);

        if (!session) {
            throw new Error('Failed to create session');
        }

        console.log('✅ Session created:', session.$id);

        // Wait for session to be fully established
        await waitForSession(1000);

        // Verify session is active
        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        return session;
    } catch (error: any) {
        console.error('❌ Sign in error:', error);

        if (error.code === 401) {
            throw new Error('Invalid email or password');
        }
        if (error.message?.includes('user_not_found')) {
            throw new Error('No account found with this email');
        }
        if (error.message?.includes('user_blocked')) {
            throw new Error('Account has been blocked');
        }

        throw new Error(error.message || 'Failed to sign in');
    }
};

export const getCurrentUser = async () => {
    try {
        // 1. First verify we have an active session
        const currentAccount = await account.get();

        if (!currentAccount) {
            console.log('❌ No account found');
            return null;
        }

        console.log('✅ Account found:', currentAccount.email);

        // 2. ✅ FIX: Query user document by accountId (not $id)
        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser || currentUser.documents.length === 0) {
            console.error('❌ User document not found for accountId:', currentAccount.$id);
            
            // ✅ FIX: Auto-create missing user document
            console.log('🔧 Creating missing user document...');
            
            const avatarUrl = avatars.getInitialsURL(currentAccount.name);
            
            try {
                const userDocument = await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.userCollectionId,
                    ID.unique(),
                    {
                        email: currentAccount.email,
                        name: currentAccount.name,
                        accountId: currentAccount.$id,
                        avatar: avatarUrl.toString(),
                        phone: '',
                    },
                    [
                        `read("user:${currentAccount.$id}")`,
                        `update("user:${currentAccount.$id}")`,
                        `delete("user:${currentAccount.$id}")`,
                    ]
                );
                
                console.log('✅ User document auto-created:', userDocument.$id);
                return userDocument;
            } catch (createError: any) {
                console.error('❌ Failed to auto-create user document:', createError);
                return null;
            }
        }

        console.log('✅ User document found:', currentUser.documents[0].email);
        return currentUser.documents[0];
    } catch (error: any) {
        console.error('❌ Get current user error:', error.message);
        
        // If session expired or invalid, return null (not an error)
        if (error.code === 401 || error.message?.includes('session') || error.message?.includes('guests')) {
            return null;
        }

        // Permission error - collection not readable
        if (error.message?.includes('authorized')) {
            console.error('❌ Permission denied: Collection users must have Read permission for role Users');
            return null;
        }

        return null;
    }
};

// ========== MENU FUNCTIONS ==========
export const getMenu = async ({ category, query }: GetMenuParams) => {
    try {
        const queries: string[] = [];

        if (category) queries.push(Query.equal('categories', category));
        if (query) queries.push(Query.search('name', query));

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries
        );

        return menus.documents;
    } catch (error: any) {
        console.error('Get menu error:', error);
        throw new Error(error.message || 'Failed to fetch menu');
    }
};

export const getCategories = async () => {
    try {
        const categories = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId
        );

        return categories.documents;
    } catch (error: any) {
        console.error('Get categories error:', error);
        throw new Error(error.message || 'Failed to fetch categories');
    }
};

// ========== USER PROFILE FUNCTIONS ==========
export const updateUserProfile = async ({ 
    userId,
    name, 
    phone, 
    avatarUri 
}: {
    userId: string;
    name: string;
    phone: string;
    avatarUri: string;
}): Promise<User> => {
    try {
        const userDocId = userId;
        let finalAvatarUrl = avatarUri;

        // If avatar is local file (from image picker), upload to storage
        if (avatarUri.startsWith('file://')) {
            console.log('📤 Uploading new avatar...');
            
            const response = await fetch(avatarUri);
            const blob = await response.blob();
            
            const fileId = ID.unique();
            
            const file = await storage.createFile(
                appwriteConfig.bucketId,
                fileId,
                {
                    name: `avatar-${userId}-${Date.now()}.jpg`,
                    type: 'image/jpeg',
                    size: blob.size,
                    uri: avatarUri,
                }
            );

            finalAvatarUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucketId}/files/${file.$id}/view?project=${appwriteConfig.projectId}`;

            console.log('✅ Avatar uploaded successfully');
        }

        // Update user document
        const updatedDoc = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userDocId,
            {
                name,
                phone,
                avatar: finalAvatarUrl,
            }
        );

        console.log('✅ Profile updated successfully');
        return updatedDoc as User;
    } catch (error: any) {
        console.error('❌ Update profile error:', error);
        throw new Error(error.message || 'Failed to update profile');
    }
};

// ========== ADDRESS FUNCTIONS - MULTI ADDRESS SUPPORT ==========

export const getUserAddresses = async (userId: string) => {
    try {
        const addresses = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            [Query.equal('user_id', userId)]
        );

        return addresses.documents;
    } catch (error: any) {
        console.error('❌ Get addresses error:', error);
        return [];
    }
};

export const saveUserAddress = async (userId: string, address: {
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    isDefault?: boolean;
}) => {
    try {
        // If setting as default, unset all existing defaults
        if (address.isDefault) {
            const existingAddresses = await getUserAddresses(userId);
            
            for (const addr of existingAddresses) {
                if (addr.is_default) {
                    await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.userAddressesCollectionId,
                        addr.$id,
                        { is_default: false }
                    );
                }
            }
        }

        // Create new address
        const doc = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            ID.unique(),
            {
                user_id: userId,
                street: address.street,
                city: address.city,
                country: address.country,
                full_address: address.fullAddress,
                is_default: address.isDefault ?? false,
            }
        );
        
        return doc;
    } catch (error: any) {
        console.error('❌ Save address error:', error);
        throw new Error(error.message || 'Failed to save address');
    }
};

export const updateUserAddress = async (addressId: string, address: {
    street?: string;
    city?: string;
    country?: string;
    fullAddress?: string;
}) => {
    try {
        const updateData: any = {};
        
        if (address.street !== undefined) updateData.street = address.street;
        if (address.city !== undefined) updateData.city = address.city;
        if (address.country !== undefined) updateData.country = address.country;
        if (address.fullAddress !== undefined) updateData.full_address = address.fullAddress;

        const doc = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId,
            updateData
        );
        
        return doc;
    } catch (error: any) {
        console.error('❌ Update address error:', error);
        throw new Error(error.message || 'Failed to update address');
    }
};

export const deleteUserAddress = async (addressId: string) => {
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId
        );
        
        console.log('✅ Address deleted');
    } catch (error: any) {
        console.error('❌ Delete address error:', error);
        throw new Error(error.message || 'Failed to delete address');
    }
};

export const setDefaultAddress = async (userId: string, addressId: string) => {
    try {
        // Unset all existing defaults
        const existingAddresses = await getUserAddresses(userId);
        
        for (const addr of existingAddresses) {
            if (addr.is_default && addr.$id !== addressId) {
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.userAddressesCollectionId,
                    addr.$id,
                    { is_default: false }
                );
            }
        }

        // Set new default
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId,
            { is_default: true }
        );
        
        console.log('✅ Default address set');
    } catch (error: any) {
        console.error('❌ Set default address error:', error);
        throw new Error(error.message || 'Failed to set default address');
    }
};

// ========== CART FUNCTIONS ==========

function getCartItemKey(menuId: string, customizations: any[] = []) {
    const customIds = customizations
        .map(c => c.id)
        .sort()
        .join(',');
    return `${menuId}|${customIds}`;
}

export const syncCartToServer = async (userId: string, cartItems: any[]) => {
    try {
        // Get existing cart from server
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        // Create map of existing items
        const existingMap = new Map();
        for (const doc of existing.documents) {
            const key = getCartItemKey(doc.menu_id, JSON.parse(doc.customizations || '[]'));
            existingMap.set(key, doc);
        }

        // Create map of new items
        const newMap = new Map();
        for (const item of cartItems) {
            const key = getCartItemKey(item.id, item.customizations);
            newMap.set(key, item);
        }

        // DELETE items not in cart anymore
        for (const [key, doc] of existingMap) {
            if (!newMap.has(key)) {
                await databases.deleteDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.cartItemsCollectionId,
                    doc.$id
                );
            }
        }

        // UPDATE or CREATE items
        for (const [key, item] of newMap) {
            const existingDoc = existingMap.get(key);

            if (existingDoc) {
                // UPDATE quantity if changed
                if (existingDoc.quantity !== item.quantity) {
                    await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.cartItemsCollectionId,
                        existingDoc.$id,
                        {
                            quantity: item.quantity,
                            price: item.price,
                        }
                    );
                }
            } else {
                // CREATE new item
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.cartItemsCollectionId,
                    ID.unique(),
                    {
                        user_id: userId,
                        menu_id: item.id,
                        name: item.name,
                        price: item.price,
                        image_url: item.image_url,
                        quantity: item.quantity,
                        customizations: JSON.stringify(item.customizations || []),
                    }
                );
            }
        }

        console.log('✅ Cart synced to server');
    } catch (error: any) {
        console.error('❌ Sync cart error:', error);
        throw new Error(error.message || 'Failed to sync cart');
    }
};

export const getCartFromServer = async (userId: string) => {
    try {
        const cartItems = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        return cartItems.documents.map((doc: any) => ({
            id: doc.menu_id,
            name: doc.name,
            price: doc.price,
            image_url: doc.image_url,
            quantity: doc.quantity,
            customizations: JSON.parse(doc.customizations || '[]'),
        }));
    } catch (error: any) {
        console.error('❌ Get cart error:', error);
        return [];
    }
};

export const clearCartFromServer = async (userId: string) => {
    try {
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        for (const item of existing.documents) {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.cartItemsCollectionId,
                item.$id
            );
        }

        console.log('✅ Cart cleared from server');
    } catch (error: any) {
        console.error('❌ Clear cart error:', error);
    }
};
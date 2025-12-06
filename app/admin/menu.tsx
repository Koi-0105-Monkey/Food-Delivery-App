// app/admin/menu.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { images } from '@/constants';

const AdminMenu = () => {
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        try {
            setLoading(true);
            
            const [menuResult, catResult] = await Promise.all([
                databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId
                ),
                databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.categoriesCollectionId
                ),
            ]);

            setMenuItems(menuResult.documents);
            setCategories(catResult.documents);
        } catch (error) {
            console.error('Failed to load menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                itemId,
                { available: !currentStatus }
            );
            
            Alert.alert('Success', 'Item availability updated');
            loadMenu();
        } catch (error) {
            Alert.alert('Error', 'Failed to update item');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                    MENU MANAGEMENT
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                    All Items
                </Text>
                
                {/* Stats */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {menuItems.length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Total Items</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {categories.length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Categories</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1, marginTop: 20 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadMenu} />
                }
            >
                {menuItems.map((item) => (
                    <View
                        key={item.$id}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            padding: 12,
                            marginBottom: 12,
                            flexDirection: 'row',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        {/* Image */}
                        <Image
                            source={{ uri: item.image_url }}
                            style={{ width: 80, height: 80, borderRadius: 12, marginRight: 12 }}
                        />

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#181C2E', marginBottom: 4 }}>
                                {item.name}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#878787', marginBottom: 4 }}>
                                ⭐ {item.rating} • {item.calories} cal
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FE8C00' }}>
                                    {item.price.toLocaleString('vi-VN')}đ
                                </Text>
                                
                                {/* Toggle */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: item.available ? '#2F9B65' : '#F14141',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                    }}
                                    onPress={() => toggleAvailability(item.$id, item.available)}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                        {item.available ? 'Available' : 'Unavailable'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Add New Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#FE8C00',
                        borderRadius: 16,
                        padding: 20,
                        alignItems: 'center',
                        marginTop: 8,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                        + Add New Item
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminMenu;
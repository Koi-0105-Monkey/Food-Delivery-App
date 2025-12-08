// app/admin/menu.tsx - FULL CRUD: Add, Edit, Delete, Toggle Available

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig, storage } from '@/lib/appwrite';
import { images } from '@/constants';
import { ID } from 'react-native-appwrite';
import * as ImagePicker from 'expo-image-picker';

interface MenuItem {
    $id: string;
    name: string;
    description: string;
    image_url: string;
    price: number;
    rating: number;
    calories: number;
    protein: number;
    available: boolean;
    categories?: string;
}

const AdminMenu = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        rating: '',
        calories: '',
        protein: '',
        image_url: '',
    });

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

            setMenuItems(menuResult.documents as unknown as MenuItem[]);
            setCategories(catResult.documents);
        } catch (error) {
            console.error('Failed to load menu:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ TOGGLE AVAILABLE/UNAVAILABLE
    const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                itemId,
                { available: !currentStatus }
            );
            
            Alert.alert('Success', `Item is now ${!currentStatus ? 'available' : 'unavailable'}`);
            loadMenu();
        } catch (error) {
            Alert.alert('Error', 'Failed to update item');
        }
    };

    // ✅ DELETE ITEM
    const handleDelete = (item: MenuItem) => {
        Alert.alert(
            'Delete Item',
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await databases.deleteDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.menuCollectionId,
                                item.$id
                            );
                            Alert.alert('Success', 'Item deleted');
                            loadMenu();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    },
                },
            ]
        );
    };

    // ✅ OPEN ADD/EDIT MODAL
    const openAddModal = () => {
        setEditingItem(null);
        setForm({
            name: '',
            description: '',
            price: '',
            rating: '',
            calories: '',
            protein: '',
            image_url: '',
        });
        setShowAddEditModal(true);
    };

    const openEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            rating: item.rating.toString(),
            calories: item.calories.toString(),
            protein: item.protein.toString(),
            image_url: item.image_url,
        });
        setShowAddEditModal(true);
    };

    // ✅ PICK IMAGE
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setForm(prev => ({ ...prev, image_url: result.assets[0].uri }));
        }
    };

    // ✅ SAVE (ADD OR UPDATE)
    const handleSave = async () => {
        // Validation
        if (!form.name.trim()) {
            return Alert.alert('Error', 'Please enter item name');
        }
        if (!form.price || isNaN(Number(form.price))) {
            return Alert.alert('Error', 'Please enter valid price');
        }

        try {
            setLoading(true);

            let imageUrl = form.image_url;

            // Upload image if it's a local file
            if (imageUrl.startsWith('file://')) {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                
                const fileId = ID.unique();
                const file = await storage.createFile(
                    appwriteConfig.bucketId,
                    fileId,
                    {
                        name: `menu-${Date.now()}.jpg`,
                        type: 'image/jpeg',
                        size: blob.size,
                        uri: imageUrl,
                    }
                );

                imageUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucketId}/files/${file.$id}/view?project=${appwriteConfig.projectId}`;
            }

            const data = {
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                rating: Number(form.rating) || 4.0,
                calories: Number(form.calories) || 500,
                protein: Number(form.protein) || 20,
                image_url: imageUrl,
                available: true,
            };

            if (editingItem) {
                // UPDATE
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    editingItem.$id,
                    data
                );
                Alert.alert('Success', 'Item updated successfully');
            } else {
                // CREATE
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    ID.unique(),
                    data
                );
                Alert.alert('Success', 'Item added successfully');
            }

            setShowAddEditModal(false);
            loadMenu();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save item');
        } finally {
            setLoading(false);
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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

                            {/* Actions */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => openEditModal(item)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#FE8C00',
                                        borderRadius: 8,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                        ✏️ Edit
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleDelete(item)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#F14141',
                                        borderRadius: 8,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                        🗑️ Delete
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
                    onPress={openAddModal}
                >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                        + Add New Item
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ADD/EDIT MODAL */}
            <Modal visible={showAddEditModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ 
                        backgroundColor: 'white', 
                        borderTopLeftRadius: 30, 
                        borderTopRightRadius: 30, 
                        padding: 20,
                        maxHeight: '90%',
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E', marginBottom: 20 }}>
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </Text>

                            {/* Image Picker */}
                            <TouchableOpacity
                                onPress={pickImage}
                                style={{
                                    backgroundColor: '#F5F5F5',
                                    borderRadius: 12,
                                    padding: 20,
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                {form.image_url ? (
                                    <Image
                                        source={{ uri: form.image_url }}
                                        style={{ width: 100, height: 100, borderRadius: 12 }}
                                    />
                                ) : (
                                    <Text style={{ color: '#878787' }}>📷 Tap to select image</Text>
                                )}
                            </TouchableOpacity>

                            {/* Form Fields */}
                            <TextInput
                                style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 }}
                                placeholder="Item Name *"
                                value={form.name}
                                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                            />

                            <TextInput
                                style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16 }}
                                placeholder="Description"
                                value={form.description}
                                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                                multiline
                                numberOfLines={3}
                            />

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <TextInput
                                    style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                    placeholder="Price (đ) *"
                                    value={form.price}
                                    onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                    placeholder="Rating"
                                    value={form.rating}
                                    onChangeText={(text) => setForm(prev => ({ ...prev, rating: text }))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                <TextInput
                                    style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                    placeholder="Calories"
                                    value={form.calories}
                                    onChangeText={(text) => setForm(prev => ({ ...prev, calories: text }))}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                    placeholder="Protein (g)"
                                    value={form.protein}
                                    onChangeText={(text) => setForm(prev => ({ ...prev, protein: text }))}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Buttons */}
                            <TouchableOpacity
                                onPress={handleSave}
                                style={{
                                    backgroundColor: '#FE8C00',
                                    borderRadius: 12,
                                    padding: 16,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    {editingItem ? 'Update Item' : 'Add Item'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowAddEditModal(false)}
                                style={{
                                    backgroundColor: '#F5F5F5',
                                    borderRadius: 12,
                                    padding: 16,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#878787' }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default AdminMenu;
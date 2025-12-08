// app/admin/menu.tsx - WITH STOCK MANAGEMENT & SOLD OUT

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
    stock: number; // NEW: Stock quantity
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
        stock: '',
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

    // ✅ TOGGLE TẠM NGƯNG BÁN / MỞ BÁN
    const toggleAvailability = async (itemId: string, currentStatus: boolean, itemName: string) => {
        const action = currentStatus ? 'Tạm ngưng bán' : 'Mở bán';
        
        Alert.alert(
            action,
            `Bạn có chắc muốn ${action.toLowerCase()} "${itemName}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: action,
                    onPress: async () => {
                        try {
                            await databases.updateDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.menuCollectionId,
                                itemId,
                                { available: !currentStatus }
                            );
                            
                            Alert.alert('Thành công', `Đã ${action.toLowerCase()} "${itemName}"`);
                            loadMenu();
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
                        }
                    },
                },
            ]
        );
    };

    // ✅ DELETE ITEM
    const handleDelete = (item: MenuItem) => {
        Alert.alert(
            'Xóa món',
            `Bạn có chắc muốn xóa "${item.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await databases.deleteDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.menuCollectionId,
                                item.$id
                            );
                            Alert.alert('Thành công', 'Đã xóa món');
                            loadMenu();
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể xóa món');
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
            rating: '4.5',
            calories: '500',
            protein: '20',
            stock: '10',
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
            stock: (item.stock || 0).toString(),
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
            return Alert.alert('Lỗi', 'Vui lòng nhập tên món');
        }
        if (!form.price || isNaN(Number(form.price))) {
            return Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ');
        }
        if (!form.stock || isNaN(Number(form.stock))) {
            return Alert.alert('Lỗi', 'Vui lòng nhập số lượng hợp lệ');
        }

        try {
            setLoading(true);

            let imageUrl = form.image_url;

            // Upload image if local file
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
                rating: Number(form.rating) || 4.5,
                calories: Number(form.calories) || 500,
                protein: Number(form.protein) || 20,
                stock: Number(form.stock) || 0,
                image_url: imageUrl,
                available: true,
            };

            if (editingItem) {
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    editingItem.$id,
                    data
                );
                Alert.alert('Thành công', 'Đã cập nhật món');
            } else {
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    ID.unique(),
                    data
                );
                Alert.alert('Thành công', 'Đã thêm món mới');
            }

            setShowAddEditModal(false);
            loadMenu();
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể lưu món');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                    QUẢN LÝ THỰC ĐƠN
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                    Tất cả món ăn
                </Text>
                
                {/* Stats */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {menuItems.length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Tổng món</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {menuItems.filter(i => i.stock === 0).length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Hết hàng</Text>
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
                {menuItems.map((item) => {
                    const isSoldOut = item.stock === 0;
                    
                    return (
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
                                opacity: isSoldOut ? 0.6 : 1,
                            }}
                        >
                            {/* Image */}
                            <View style={{ position: 'relative' }}>
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={{ 
                                        width: 80, 
                                        height: 80, 
                                        borderRadius: 12, 
                                        marginRight: 12,
                                        opacity: isSoldOut ? 0.5 : 1,
                                    }}
                                />
                                {isSoldOut && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 12,
                                        bottom: 0,
                                        backgroundColor: 'rgba(241, 65, 65, 0.9)',
                                        borderRadius: 12,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                            SOLD OUT
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Info */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#181C2E', marginBottom: 4 }}>
                                    {item.name}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#878787', marginBottom: 4 }}>
                                    ⭐ {item.rating} • {item.calories} cal • Kho: {item.stock}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FE8C00' }}>
                                        {item.price.toLocaleString('vi-VN')}đ
                                    </Text>
                                    
                                    {/* Toggle Button */}
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: item.available ? '#2F9B65' : '#F14141',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                        }}
                                        onPress={() => toggleAvailability(item.$id, item.available, item.name)}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                            {item.available ? '🔒 Tạm ngưng' : '✅ Mở bán'}
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
                                            ✏️ Sửa
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
                                            🗑️ Xóa
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })}

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
                        + Thêm món mới
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ADD/EDIT MODAL WITH LABELS */}
            <Modal visible={showAddEditModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ 
                        backgroundColor: 'white', 
                        borderTopLeftRadius: 30, 
                        borderTopRightRadius: 30, 
                        paddingTop: 20,
                        paddingHorizontal: 20,
                        paddingBottom: 40,
                        maxHeight: '90%',
                    }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E', marginBottom: 20 }}>
                                {editingItem ? '✏️ Sửa món' : '➕ Thêm món mới'}
                            </Text>

                            {/* Image Picker */}
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                Hình ảnh món ăn *
                            </Text>
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
                                        style={{ width: 120, height: 120, borderRadius: 12 }}
                                    />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                                        <Text style={{ color: '#878787' }}>Chạm để chọn ảnh</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Form Fields with Labels */}
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                Tên món ăn *
                            </Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 }}
                                placeholder="Ví dụ: Burger phô mai"
                                value={form.name}
                                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                            />

                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                Mô tả
                            </Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16, minHeight: 80 }}
                                placeholder="Mô tả chi tiết về món ăn..."
                                value={form.description}
                                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                                multiline
                                numberOfLines={3}
                            />

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                        Giá (đ) *
                                    </Text>
                                    <TextInput
                                        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                        placeholder="45000"
                                        value={form.price}
                                        onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                        Số lượng *
                                    </Text>
                                    <TextInput
                                        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                        placeholder="10"
                                        value={form.stock}
                                        onChangeText={(text) => setForm(prev => ({ ...prev, stock: text }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                        Đánh giá
                                    </Text>
                                    <TextInput
                                        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                        placeholder="4.5"
                                        value={form.rating}
                                        onChangeText={(text) => setForm(prev => ({ ...prev, rating: text }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                        Calories
                                    </Text>
                                    <TextInput
                                        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16 }}
                                        placeholder="500"
                                        value={form.calories}
                                        onChangeText={(text) => setForm(prev => ({ ...prev, calories: text }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                                Protein (g)
                            </Text>
                            <TextInput
                                style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 16 }}
                                placeholder="20"
                                value={form.protein}
                                onChangeText={(text) => setForm(prev => ({ ...prev, protein: text }))}
                                keyboardType="numeric"
                            />

                            {/* Buttons */}
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={loading}
                                style={{
                                    backgroundColor: loading ? '#CCC' : '#FE8C00',
                                    borderRadius: 12,
                                    padding: 16,
                                    alignItems: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    {editingItem ? '💾 Cập nhật' : '➕ Thêm món'}
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
                                    Hủy
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
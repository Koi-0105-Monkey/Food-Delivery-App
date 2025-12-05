// app/combo/[id].tsx - Combo Detail Screen

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { offers } from '@/constants';
import { getMenu } from '@/lib/appwrite';
import { MenuItem } from '@/type';
import CustomHeader from '@/components/CustomHeader';
import CartButton from '@/components/CartButton';
import Toast from '@/components/Toast';
import { useCartStore } from '@/store/cart.store';
import cn from 'clsx';

const ComboScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const comboId = parseInt(id || '1');
    const offer = offers.find(o => o.id === comboId) || offers[0];
    
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const { addItem } = useCartStore();
    
    const discountPercent = 15; // 15% discount for combo items

    useEffect(() => {
        loadMenuItems();
    }, [comboId]);

    const loadMenuItems = async () => {
        try {
            setLoading(true);
            // Filter by tabs field instead of category
            const items = await getMenu({ category: '', query: '', tabs: comboId.toString() });
            setMenuItems(items as MenuItem[]);
        } catch (error) {
            console.error('Failed to load menu items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (item: MenuItem) => {
        // Calculate discounted price
        const discountedPrice = item.price * (1 - discountPercent / 100);
        
        addItem({
            id: item.$id,
            name: item.name,
            price: discountedPrice, // Use discounted price
            image_url: item.image_url,
            customizations: [],
        });

        // Show toast notification
        setToastMessage(`✅ ${item.name} added to cart with ${discountPercent}% off!`);
        setShowToast(true);
    };

    const calculateOriginalTotal = () => {
        return menuItems.reduce((sum, item) => sum + item.price, 0);
    };

    const calculateDiscountedTotal = () => {
        return menuItems.reduce((sum, item) => sum + (item.price * (1 - discountPercent / 100)), 0);
    };

    const savings = calculateOriginalTotal() - calculateDiscountedTotal();

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-5 pt-2 pb-4" style={{ backgroundColor: offer.color }}>
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => router.back()}>
                        <View className="w-10 h-10 rounded-full bg-white/20 flex-center">
                            <Text className="text-white text-xl">←</Text>
                        </View>
                    </TouchableOpacity>
                    <CartButton />
                </View>

                {/* Combo Title */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                        <Text className="h1-bold text-white mb-2" style={{ fontSize: 28 }}>
                            {offer.title}
                        </Text>
                        <View 
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 20,
                                alignSelf: 'flex-start',
                            }}
                        >
                            <Text className="base-bold text-white">
                                🎉 {discountPercent}% OFF
                            </Text>
                        </View>
                    </View>
                    <View className="w-24 h-24">
                        <Image
                            source={offer.image}
                            className="size-full"
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </View>

            {/* Menu Items List */}
            <ScrollView 
                className="flex-1 bg-white"
                contentContainerClassName="px-5 py-5 pb-32"
            >
                {loading ? (
                    <View className="flex-center py-20">
                        <ActivityIndicator size="large" color={offer.color} />
                        <Text className="body-regular text-gray-200 mt-4">
                            Loading combo items...
                        </Text>
                    </View>
                ) : menuItems.length === 0 ? (
                    <View className="flex-center py-20 px-5">
                        <Text className="h3-bold text-dark-100 mb-2 text-center">
                            No items available
                        </Text>
                        <Text className="body-regular text-gray-200 text-center">
                            This combo doesn't have any items yet.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View className="mb-5">
                            <Text className="h3-bold text-dark-100 mb-2">
                                Combo Items ({menuItems.length})
                            </Text>
                            <Text className="body-regular text-gray-200">
                                All items come with {discountPercent}% discount
                            </Text>
                        </View>

                        <View className="flex-row flex-wrap gap-4">
                            {menuItems.map((item, index) => {
                                const discountedPrice = item.price * (1 - discountPercent / 100);

                                return (
                                    <View key={item.$id} className="w-[48%]">
                                        <View 
                                            className="menu-card"
                                            style={{
                                                borderWidth: 2,
                                                borderColor: offer.color + '30',
                                            }}
                                        >
                                            <Image
                                                source={{ uri: item.image_url }}
                                                className="size-32 absolute -top-10"
                                                resizeMode="contain"
                                            />

                                            {/* Discount Badge */}
                                            <View 
                                                style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    backgroundColor: offer.color,
                                                    borderRadius: 20,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    zIndex: 10,
                                                }}
                                            >
                                                <Text className="small-bold text-white">
                                                    -{discountPercent}%
                                                </Text>
                                            </View>

                                            {/* Rating */}
                                            <View className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-1">
                                                <Text className="small-bold text-dark-100">⭐ {item.rating}</Text>
                                            </View>

                                            <Text className="text-center base-bold text-dark-100 mb-2 mt-20" numberOfLines={2}>
                                                {item.name}
                                            </Text>
                                            
                                            <View className="flex-row items-center justify-center gap-2 mb-3">
                                                <Text className="body-regular text-gray-200 line-through">
                                                    {item.price.toLocaleString('vi-VN')}đ
                                                </Text>
                                                <Text className="paragraph-bold text-primary">
                                                    {discountedPrice.toLocaleString('vi-VN')}đ
                                                </Text>
                                            </View>

                                            {/* Actions */}
                                            <View className="flex-row items-center gap-2 w-full">
                                                <TouchableOpacity
                                                    onPress={() => router.push(`/product/${item.$id}`)}
                                                    className="flex-1 py-2 rounded-lg"
                                                    style={{ backgroundColor: offer.color + '15' }}
                                                >
                                                    <Text 
                                                        className="paragraph-bold text-center"
                                                        style={{ color: offer.color }}
                                                    >
                                                        Details
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => handleAddToCart(item)}
                                                    className="size-10 rounded-lg flex-center"
                                                    style={{ backgroundColor: offer.color }}
                                                >
                                                    <Text className="base-bold text-white text-lg">+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Toast Notification */}
            <Toast
                visible={showToast}
                message={toastMessage}
                type="success"
                onHide={() => setShowToast(false)}
            />
        </SafeAreaView>
    );
};

export default ComboScreen;


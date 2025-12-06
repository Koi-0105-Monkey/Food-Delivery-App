// components/MenuCard.tsx - IMPROVED VERSION WITH TOAST

import { Text, TouchableOpacity, Image, Platform, View } from 'react-native';
import { MenuItem } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { router } from 'expo-router';
import { images } from '@/constants';
import { useState } from 'react';

// ✅ Toast Component (inline)
const MiniToast = ({ visible, message }: { visible: boolean; message: string }) => {
    if (!visible) return null;
    
    return (
        <View
            style={{
                position: 'absolute',
                top: -60,
                left: 0,
                right: 0,
                backgroundColor: '#2F9B65',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5,
                zIndex: 999,
            }}
        >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {message}
            </Text>
        </View>
    );
};

const MenuCard = ({ item: { $id, image_url, name, price, rating, tabs } }: { item: MenuItem }) => {
    const { addItem } = useCartStore();
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // ✅ COMBO DISCOUNT LOGIC
    const getDiscountedPrice = () => {
        if (!tabs || tabs.trim() === '') {
            return price; // No discount
        }

        // Check how many combos this item belongs to
        const comboIds = tabs.split(',').map(id => id.trim()).filter(Boolean);
        
        if (comboIds.length >= 2) {
            // Item is in 2+ combos → 20% discount
            return price * 0.8;
        } else if (comboIds.length === 1) {
            // Item is in 1 combo → 15% discount
            return price * 0.85;
        }

        return price; // No discount
    };

    const discountedPrice = getDiscountedPrice();
    const hasDiscount = discountedPrice < price;
    const discountPercent = hasDiscount ? Math.round(((price - discountedPrice) / price) * 100) : 0;

    const showToastNotification = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const handleViewDetail = () => {
        router.push(`/product/${$id}` as any);
    };

    const handleQuickAdd = (e: any) => {
        e.stopPropagation();
        
        addItem({ 
            id: $id, 
            name, 
            price: discountedPrice, // ✅ Use discounted price
            image_url, 
            customizations: [] 
        });

        showToastNotification(`✅ ${name} added to cart!`);
    };

    return (
        <TouchableOpacity
            className="relative"
            style={{
                paddingVertical: 32,
                paddingHorizontal: 14,
                paddingTop: 96, // Space for image
                backgroundColor: 'white',
                borderRadius: 24,
                shadowColor: '#878787',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                ...(Platform.OS === 'android' && { elevation: 5 }),
                minHeight: 260, // ✅ Fixed height for consistency
            }}
            onPress={handleViewDetail}
            activeOpacity={0.7}
        >
            {/* Toast Notification */}
            <MiniToast visible={showToast} message={toastMessage} />

            {/* Product Image */}
            <View
                style={{
                    position: 'absolute',
                    top: -40,
                    left: 0,
                    right: 0,
                    height: 128,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Image
                    source={{ uri: image_url }}
                    style={{ 
                        width: 120, 
                        height: 120,
                    }}
                    resizeMode="contain"
                />
            </View>

            {/* Discount Badge */}
            {hasDiscount && (
                <View
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: '#F14141',
                        borderRadius: 20,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        zIndex: 10,
                    }}
                >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>
                        -{discountPercent}%
                    </Text>
                </View>
            )}

            {/* Rating Badge */}
            <View
                style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                }}
            >
                <Image
                    source={images.star}
                    style={{ width: 12, height: 12 }}
                    resizeMode="contain"
                    tintColor="#FE8C00"
                />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#181C2E' }}>
                    {rating}
                </Text>
            </View>

            {/* Product Name - ✅ Truncated with ellipsis */}
            <Text
                className="text-center base-bold text-dark-100 mb-2"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{ 
                    minHeight: 44, // ✅ Reserve space for 2 lines
                    lineHeight: 22,
                }}
            >
                {name}
            </Text>

            {/* Price Section */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {hasDiscount ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#878787', textDecorationLine: 'line-through' }}>
                            {price.toLocaleString('vi-VN')}đ
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FE8C00', marginTop: 2 }}>
                            {discountedPrice.toLocaleString('vi-VN')}đ
                        </Text>
                    </View>
                ) : (
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FE8C00' }}>
                        {price.toLocaleString('vi-VN')}đ
                    </Text>
                )}
            </View>

            {/* Actions */}
            <View className="flex-row items-center gap-2 w-full">
                <TouchableOpacity
                    onPress={handleViewDetail}
                    className="flex-1 bg-primary/10 py-2 rounded-lg"
                >
                    <Text className="paragraph-bold text-primary text-center">
                        View Details
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleQuickAdd}
                    className="size-10 bg-primary rounded-lg flex-center"
                >
                    <Image
                        source={images.plus}
                        className="size-5"
                        resizeMode="contain"
                        tintColor="#ffffff"
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default MenuCard;
// components/MenuCard.tsx - WITH STATUS OVERLAY (Tạm ngưng bán / Sold Out)

import { Text, TouchableOpacity, Image, Platform, View } from 'react-native';
import { MenuItem } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { router } from 'expo-router';
import { images } from '@/constants';
import { useState } from 'react';

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

const MenuCard = ({ item }: { item: MenuItem }) => {
    const { addItem } = useCartStore();
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // ✅ Check status
    const isSoldOut = (item.stock !== undefined && item.stock === 0);
    const isUnavailable = !item.available;
    const isDisabled = isSoldOut || isUnavailable;

    // Get discounted price
    const getDiscountedPrice = () => {
        if (!item.tabs || item.tabs.trim() === '') {
            return item.price;
        }

        const comboIds = item.tabs.split(',').map(id => id.trim()).filter(Boolean);
        
        if (comboIds.length >= 2) {
            return item.price * 0.8;
        } else if (comboIds.length === 1) {
            return item.price * 0.85;
        }

        return item.price;
    };

    const discountedPrice = getDiscountedPrice();
    const hasDiscount = discountedPrice < item.price;
    const discountPercent = hasDiscount ? Math.round(((item.price - discountedPrice) / item.price) * 100) : 0;

    const showToastNotification = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const handleViewDetail = () => {
        router.push(`/product/${item.$id}` as any);
    };

    const handleQuickAdd = (e: any) => {
        e.stopPropagation();
        
        if (isDisabled) {
            if (isSoldOut) {
                showToastNotification('❌ Món này đã hết hàng');
            } else {
                showToastNotification('❌ Món này tạm ngưng bán');
            }
            return;
        }
        
        addItem({ 
            id: item.$id, 
            name: item.name, 
            price: discountedPrice,
            image_url: item.image_url, 
            customizations: [] 
        });

        showToastNotification(`✅ ${item.name} đã thêm vào giỏ!`);
    };

    const truncateName = (text: string, maxLength: number = 25) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    return (
        <TouchableOpacity
            className="relative"
            style={{
                paddingVertical: 32,
                paddingHorizontal: 14,
                paddingTop: 96,
                backgroundColor: 'white',
                borderRadius: 24,
                shadowColor: '#878787',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                ...(Platform.OS === 'android' && { elevation: 5 }),
                minHeight: 260,
                opacity: isDisabled ? 0.7 : 1,
            }}
            onPress={handleViewDetail}
            activeOpacity={0.7}
        >
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
                    source={{ uri: item.image_url }}
                    style={{ 
                        width: 120, 
                        height: 120,
                        opacity: isDisabled ? 0.5 : 1,
                    }}
                    resizeMode="contain"
                />
                
                {/* ✅ OVERLAY: Tạm ngưng bán hoặc Sold Out */}
                {isDisabled && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: isSoldOut ? '#F14141' : '#FE8C00',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                transform: [{ rotate: '-15deg' }],
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                {isSoldOut ? '🚫 SOLD OUT' : '⏸️ TẠM NGƯNG'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Discount Badge */}
            {hasDiscount && !isDisabled && (
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
                    {item.rating}
                </Text>
            </View>

            {/* Product Name */}
            <Text
                className="text-center base-bold text-dark-100 mb-2"
                style={{ 
                    minHeight: 44,
                    lineHeight: 22,
                }}
            >
                {truncateName(item.name, 25)}
            </Text>

            {/* Price Section */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
                {hasDiscount && !isDisabled ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#878787', textDecorationLine: 'line-through' }}>
                            {item.price.toLocaleString('vi-VN')}đ
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FE8C00', marginTop: 2 }}>
                            {discountedPrice.toLocaleString('vi-VN')}đ
                        </Text>
                    </View>
                ) : (
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FE8C00' }}>
                        {item.price.toLocaleString('vi-VN')}đ
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
                        Chi tiết
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleQuickAdd}
                    disabled={isDisabled}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: isDisabled ? '#CCC' : '#FE8C00',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
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
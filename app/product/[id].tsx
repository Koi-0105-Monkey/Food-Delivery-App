// app/product/[id].tsx - FIXED IMAGE LOADING

import { View, Text, Image, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { MenuItem, CartCustomization } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { databases, appwriteConfig, storage } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import CustomButton from '@/components/CustomButton';
import Toast from '@/components/Toast';
import cn from 'clsx';

// Import images
import * as Constants from '@/constants';
const images = Constants.images;

const ProductDetail = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [product, setProduct] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedCustomizations, setSelectedCustomizations] = useState<CartCustomization[]>([]);
    const [availableCustomizations, setAvailableCustomizations] = useState<any[]>([]);
    const { addItem } = useCartStore();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        fetchProductDetail();
    }, [id]);

    useEffect(() => {
        if (!loading && product) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
            ]).start();
        }
    }, [loading, product]);

    // ✅ FIXED: Better image URL generation
    const getImageUrl = (imageId: string | null | undefined): string | null => {
        if (!imageId) return null;
        
        try {
            // Format: https://[ENDPOINT]/storage/buckets/[BUCKET_ID]/files/[FILE_ID]/view?project=[PROJECT_ID]
            return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucketId}/files/${imageId}/view?project=${appwriteConfig.projectId}`;
        } catch (error) {
            console.error('❌ Error generating image URL:', error);
            return null;
        }
    };

    const fetchProductDetail = async () => {
        try {
            setLoading(true);

            const productDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                id
            );

            setProduct(productDoc as MenuItem);

            // Get menu_customizations
            const menuCustomizations = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.menuCustomizationsCollectionId,
                [Query.equal('menu', id)]
            );

            // Extract customization IDs
            const customizationIds: string[] = [];
            
            for (const doc of menuCustomizations.documents) {
                const cusField = (doc as any).customizations;
                
                if (typeof cusField === 'string') {
                    customizationIds.push(cusField);
                } else if (cusField?.$id) {
                    customizationIds.push(cusField.$id);
                }
            }

            if (customizationIds.length > 0) {
                // Validate IDs
                const validIds = customizationIds.filter(id => {
                    return id && 
                          typeof id === 'string' && 
                          id.length <= 36 && 
                          /^[a-zA-Z0-9_]+$/.test(id) &&
                          !id.startsWith('_');
                });

                if (validIds.length > 0) {
                    // Fetch customizations
                    const customizationPromises = validIds.map((cusId: string) =>
                        databases.getDocument(
                            appwriteConfig.databaseId,
                            appwriteConfig.customizationsCollectionId,
                            cusId
                        ).catch(err => {
                            console.error(`❌ Failed to fetch customization ${cusId}:`, err.message);
                            return null;
                        })
                    );

                    const customizationDocs = await Promise.all(customizationPromises);
                    const validCustomizations = customizationDocs.filter(doc => doc !== null);
                    
                    // ✅ FIXED: Generate proper image URLs
                    const customizationsWithImages = validCustomizations.map((doc: any) => {
                        let imageUrl = null;
                        
                        if (doc.image_id) {
                            imageUrl = getImageUrl(doc.image_id);
                            
                            // Debug log
                            console.log(`🖼️  ${doc.name}: ${imageUrl ? '✅ Has image' : '❌ No image'}`);
                        }
                        
                        return {
                            ...doc,
                            imageUrl
                        };
                    });
                    
                    setAvailableCustomizations(customizationsWithImages);
                    
                    console.log(`✅ Loaded ${customizationsWithImages.length} customizations`);
                }
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch product:', error);
            Alert.alert('Error', 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    const getDiscountedPrice = () => {
        if (!product || !product.tabs || product.tabs.trim() === '') {
            return product?.price || 0;
        }

        const comboIds = product.tabs.split(',').map(id => id.trim()).filter(Boolean);
        
        if (comboIds.length >= 2) {
            return product.price * 0.8;
        } else if (comboIds.length === 1) {
            return product.price * 0.85;
        }

        return product.price;
    };

    const handleQuantityChange = (type: 'increase' | 'decrease') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (type === 'increase') {
            setQuantity(prev => prev + 1);
        } else if (type === 'decrease' && quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const handleCustomizationToggle = (customization: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const exists = selectedCustomizations.find(c => c.id === customization.$id);

        if (exists) {
            setSelectedCustomizations(prev => prev.filter(c => c.id !== customization.$id));
        } else {
            setSelectedCustomizations(prev => [
                ...prev,
                {
                    id: customization.$id,
                    name: customization.name,
                    price: customization.price,
                    type: customization.type,
                },
            ]);
        }
    };

    const calculateTotalPrice = () => {
        if (!product) return 0;

        const basePrice = getDiscountedPrice();
        const customizationPrice = selectedCustomizations.reduce(
            (sum, c) => sum + c.price,
            0
        );

        return (basePrice + customizationPrice) * quantity;
    };

    const getItemPrice = () => {
        if (!product) return 0;
        
        const basePrice = getDiscountedPrice();
        const customizationPrice = selectedCustomizations.reduce(
            (sum, c) => sum + c.price,
            0
        );
        
        return basePrice + customizationPrice;
    };

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleAddToCart = () => {
        if (!product) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const finalPrice = getItemPrice();

        for (let i = 0; i < quantity; i++) {
            addItem({
                id: product.$id,
                name: product.name,
                price: finalPrice,
                image_url: product.image_url,
                customizations: selectedCustomizations,
            });
        }

        setToastMessage(`✅ ${quantity}x ${product.name} added to cart!`);
        setShowToast(true);

        setQuantity(1);
        setSelectedCustomizations([]);
    };

    if (loading) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text className="paragraph-medium text-gray-200 mt-4">Loading...</Text>
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <Text className="paragraph-medium text-gray-200">Product not found</Text>
            </SafeAreaView>
        );
    }

    const basePrice = product.price;
    const discountedPrice = getDiscountedPrice();
    const hasDiscount = discountedPrice < basePrice;
    const discountPercent = hasDiscount ? Math.round(((basePrice - discountedPrice) / basePrice) * 100) : 0;

    const toppings = availableCustomizations.filter(c => c.type === 'topping');
    const sides = availableCustomizations.filter(c => c.type === 'side');

    return (
        <SafeAreaView className="bg-white h-full">
            <Animated.View
                style={{
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                <ScrollView contentContainerClassName="pb-32">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4">
                        <TouchableOpacity onPress={() => router.back()}>
                            <Image
                                source={images.arrowBack}
                                className="size-6"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <Text className="base-bold text-dark-100">Product Details</Text>
                        <View className="size-6" />
                    </View>

                    {/* Product Image */}
                    <View className="flex-center mb-6">
                        <Image
                            source={{ uri: product.image_url }}
                            className="size-64"
                            resizeMode="contain"
                        />
                    </View>

                    {/* Product Info */}
                    <View className="px-5">
                        <Text className="h1-bold text-dark-100 mb-2">{product.name}</Text>
                        <Text className="paragraph-medium text-gray-200 mb-4">
                            {product.description}
                        </Text>

                        {/* Price Tag */}
                        <View className="bg-primary/10 rounded-2xl p-4 mb-6">
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="body-medium text-gray-200 mb-1">Price</Text>
                                    {hasDiscount ? (
                                        <View>
                                            <Text style={{ fontSize: 14, color: '#878787', textDecorationLine: 'line-through' }}>
                                                {basePrice.toLocaleString('vi-VN')}đ
                                            </Text>
                                            <View className="flex-row items-center gap-2">
                                                <Text className="h1-bold text-primary">
                                                    {discountedPrice.toLocaleString('vi-VN')}đ
                                                </Text>
                                                <View
                                                    style={{
                                                        backgroundColor: '#F14141',
                                                        borderRadius: 12,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                                        -{discountPercent}% OFF
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text className="h1-bold text-primary">
                                            {basePrice.toLocaleString('vi-VN')}đ
                                        </Text>
                                    )}
                                </View>
                                <View className="flex-row items-center gap-4">
                                    <View className="items-center">
                                        <Image
                                            source={images.star}
                                            className="size-5 mb-1"
                                            resizeMode="contain"
                                            tintColor="#FE8C00"
                                        />
                                        <Text className="paragraph-semibold text-dark-100">
                                            {product.rating}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="body-medium text-gray-200 mb-1">Cal</Text>
                                        <Text className="paragraph-semibold text-dark-100">
                                            {product.calories}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="body-medium text-gray-200 mb-1">Protein</Text>
                                        <Text className="paragraph-semibold text-dark-100">
                                            {product.protein}g
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* ✅ Toppings WITH REAL IMAGES */}
                        {toppings.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">
                                    🍕 Add Toppings
                                </Text>
                                <View className="flex-row flex-wrap gap-3">
                                    {toppings.map((topping: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === topping.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={topping.$id}
                                                onPress={() => handleCustomizationToggle(topping)}
                                                style={{
                                                    width: '30%',
                                                    backgroundColor: isSelected ? '#FFF5E6' : 'white',
                                                    borderRadius: 16,
                                                    padding: 12,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? '#FE8C00' : '#F3F4F6',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {/* ✅ FIXED: Hiển thị ảnh thật với cache busting */}
                                                {topping.imageUrl ? (
                                                    <Image
                                                        source={{ 
                                                            uri: `${topping.imageUrl}&t=${Date.now()}`,
                                                            cache: 'reload'
                                                        }}
                                                        style={{ 
                                                            width: 48, 
                                                            height: 48, 
                                                            marginBottom: 8,
                                                            borderRadius: 8,
                                                        }}
                                                        resizeMode="cover"
                                                        onError={(e) => {
                                                            console.error(`❌ Image load failed for ${topping.name}:`, e.nativeEvent.error);
                                                        }}
                                                    />
                                                ) : (
                                                    <View
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            marginBottom: 8,
                                                            borderRadius: 8,
                                                            backgroundColor: '#FFF5E6',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 24 }}>🍕</Text>
                                                    </View>
                                                )}
                                                
                                                <Text 
                                                    className="body-medium text-dark-100 text-center"
                                                    numberOfLines={2}
                                                    style={{ minHeight: 36 }}
                                                >
                                                    {topping.name}
                                                </Text>
                                                
                                                <Text 
                                                    className="small-bold text-primary mt-1"
                                                >
                                                    +{topping.price.toLocaleString('vi-VN')}đ
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ✅ Sides WITH REAL IMAGES */}
                        {sides.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">
                                    🍟 Add Sides
                                </Text>
                                <View className="flex-row flex-wrap gap-3">
                                    {sides.map((side: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === side.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={side.$id}
                                                onPress={() => handleCustomizationToggle(side)}
                                                style={{
                                                    width: '30%',
                                                    backgroundColor: isSelected ? '#E8F5E9' : 'white',
                                                    borderRadius: 16,
                                                    padding: 12,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? '#2F9B65' : '#F3F4F6',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {/* ✅ FIXED: Hiển thị ảnh thật với cache busting */}
                                                {side.imageUrl ? (
                                                    <Image
                                                        source={{ 
                                                            uri: `${side.imageUrl}&t=${Date.now()}`,
                                                            cache: 'reload'
                                                        }}
                                                        style={{ 
                                                            width: 48, 
                                                            height: 48, 
                                                            marginBottom: 8,
                                                            borderRadius: 8,
                                                        }}
                                                        resizeMode="cover"
                                                        onError={(e) => {
                                                            console.error(`❌ Image load failed for ${side.name}:`, e.nativeEvent.error);
                                                        }}
                                                    />
                                                ) : (
                                                    <View
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            marginBottom: 8,
                                                            borderRadius: 8,
                                                            backgroundColor: '#E8F5E9',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 24 }}>🍟</Text>
                                                    </View>
                                                )}
                                                
                                                <Text 
                                                    className="body-medium text-dark-100 text-center"
                                                    numberOfLines={2}
                                                    style={{ minHeight: 36 }}
                                                >
                                                    {side.name}
                                                </Text>
                                                
                                                <Text 
                                                    className="small-bold text-success mt-1"
                                                >
                                                    +{side.price.toLocaleString('vi-VN')}đ
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Selected Customizations Summary */}
                        {selectedCustomizations.length > 0 && (
                            <View className="mb-6 bg-success/10 rounded-2xl p-4">
                                <Text className="base-semibold text-dark-100 mb-2">
                                    Your Selections:
                                </Text>
                                {selectedCustomizations.map((custom) => (
                                    <View key={custom.id} className="flex-row justify-between mb-1">
                                        <Text className="body-medium text-gray-200">
                                            • {custom.name}
                                        </Text>
                                        <Text className="body-medium text-success">
                                            +{custom.price.toLocaleString('vi-VN')}đ
                                        </Text>
                                    </View>
                                ))}
                                <View className="border-t border-gray-300 mt-2 pt-2">
                                    <View className="flex-row justify-between">
                                        <Text className="paragraph-bold text-dark-100">
                                            Customizations Total:
                                        </Text>
                                        <Text className="paragraph-bold text-success">
                                            +{selectedCustomizations.reduce((sum, c) => sum + c.price, 0).toLocaleString('vi-VN')}đ
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </Animated.View>

            {/* Bottom Section - Fixed */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4 shadow-lg">
                {/* Quantity Selector */}
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="base-semibold text-dark-100">Quantity</Text>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity
                            onPress={() => handleQuantityChange('decrease')}
                            className="size-10 rounded-full bg-gray-100 flex-center"
                            disabled={quantity <= 1}
                        >
                            <Image
                                source={images.minus}
                                className="size-4"
                                resizeMode="contain"
                                tintColor={quantity <= 1 ? '#D1D5DB' : '#FE8C00'}
                            />
                        </TouchableOpacity>

                        <Text className="base-bold text-dark-100 min-w-[30px] text-center">
                            {quantity}
                        </Text>

                        <TouchableOpacity
                            onPress={() => handleQuantityChange('increase')}
                            className="size-10 rounded-full bg-primary/10 flex-center"
                        >
                            <Image
                                source={images.plus}
                                className="size-4"
                                resizeMode="contain"
                                tintColor="#FE8C00"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Add to Cart Button */}
                <CustomButton
                    title={`Add to Cart - ${calculateTotalPrice().toLocaleString('vi-VN')}đ`}
                    onPress={handleAddToCart}
                />
            </View>

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

export default ProductDetail;
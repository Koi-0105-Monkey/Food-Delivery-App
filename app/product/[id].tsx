// app/product/[id].tsx - WITH IMAGE GRID TOPPINGS & SIDES

import { View, Text, Image, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { images } from '@/constants';
import { MenuItem, CartCustomization } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import CustomButton from '@/components/CustomButton';
import Toast from '@/components/Toast';
import cn from 'clsx';

// Helper function to get emoji for toppings
const getEmojiForTopping = (name: string): string => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('tomato')) return '🍅';
    if (lowerName.includes('onion')) return '🧅';
    if (lowerName.includes('cheese')) return '🧀';
    if (lowerName.includes('bacon')) return '🥓';
    if (lowerName.includes('mushroom')) return '🍄';
    if (lowerName.includes('pickle')) return '🥒';
    if (lowerName.includes('jalapeño') || lowerName.includes('jalapeno')) return '🌶️';
    if (lowerName.includes('avocado')) return '🥑';
    if (lowerName.includes('olive')) return '🫒';
    
    return '🍔'; // Default
};

// Helper function to get emoji for sides
const getEmojiForSide = (name: string): string => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('fries') || lowerName.includes('french')) return '🍟';
    if (lowerName.includes('coleslaw')) return '🥗';
    if (lowerName.includes('salad')) return '🥗';
    if (lowerName.includes('pringles') || lowerName.includes('chips')) return '🥔';
    if (lowerName.includes('mozz') || lowerName.includes('cheese stick')) return '🧀';
    if (lowerName.includes('nugget') || lowerName.includes('chicken')) return '🍗';
    if (lowerName.includes('corn')) return '🌽';
    if (lowerName.includes('mushroom')) return '🍄';
    
    return '🍽️'; // Default
};

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

    // Fetch product details
    useEffect(() => {
        fetchProductDetail();
    }, [id]);

    // Animate in
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

    const fetchProductDetail = async () => {
        try {
            setLoading(true);

            // Get product
            const productDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                id
            );

            setProduct(productDoc as MenuItem);

            // Get customizations for this product
            const menuCustomizations = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.menuCustomizationsCollectionId,
                [Query.equal('menu', id)]
            );

            // Get full customization details
            const customizationIds = menuCustomizations.documents.map(
                (doc: any) => doc.customizations
            );

            if (customizationIds.length > 0) {
                const customizationDocs = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.customizationsCollectionId,
                    [Query.equal('$id', customizationIds)]
                );

                setAvailableCustomizations(customizationDocs.documents);
            }
        } catch (error: any) {
            console.error('Failed to fetch product:', error);
            Alert.alert('Error', 'Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    // COMBO DISCOUNT LOGIC
    const getDiscountedPrice = () => {
        if (!product || !product.tabs || product.tabs.trim() === '') {
            return product?.price || 0;
        }

        const comboIds = product.tabs.split(',').map(id => id.trim()).filter(Boolean);
        
        if (comboIds.length >= 2) {
            return product.price * 0.8; // 20% discount
        } else if (comboIds.length === 1) {
            return product.price * 0.85; // 15% discount
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

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleAddToCart = () => {
        if (!product) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const basePrice = getDiscountedPrice();

        // Add item to cart multiple times based on quantity
        for (let i = 0; i < quantity; i++) {
            addItem({
                id: product.$id,
                name: product.name,
                price: basePrice,
                image_url: product.image_url,
                customizations: selectedCustomizations,
            });
        }

        // Show toast notification
        setToastMessage(`✅ ${quantity}x ${product.name} added to cart!`);
        setShowToast(true);

        // Reset selections
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

    // Calculate discount info
    const basePrice = product.price;
    const discountedPrice = getDiscountedPrice();
    const hasDiscount = discountedPrice < basePrice;
    const discountPercent = hasDiscount ? Math.round(((basePrice - discountedPrice) / basePrice) * 100) : 0;

    // Group customizations by type
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

                        {/* Toppings - Image Grid Style */}
                        {toppings.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">
                                    Toppings
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
                                                    width: 70,
                                                    height: 90,
                                                    position: 'relative',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 70,
                                                        height: 70,
                                                        borderRadius: 16,
                                                        backgroundColor: isSelected ? '#FFF5E6' : '#F9FAFB',
                                                        borderWidth: 2,
                                                        borderColor: isSelected ? '#FE8C00' : '#E5E7EB',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 32 }}>
                                                        {getEmojiForTopping(topping.name)}
                                                    </Text>
                                                    {isSelected && (
                                                        <View
                                                            style={{
                                                                position: 'absolute',
                                                                top: -8,
                                                                right: -8,
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 12,
                                                                backgroundColor: '#FE8C00',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                                                ✓
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text 
                                                    className="small-bold text-dark-100 text-center"
                                                    numberOfLines={1}
                                                    style={{ fontSize: 11 }}
                                                >
                                                    {topping.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Side Options - Image Grid Style */}
                        {sides.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">Side options</Text>
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
                                                    width: 70,
                                                    height: 90,
                                                    position: 'relative',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 70,
                                                        height: 70,
                                                        borderRadius: 16,
                                                        backgroundColor: isSelected ? '#FFF5E6' : '#F9FAFB',
                                                        borderWidth: 2,
                                                        borderColor: isSelected ? '#FE8C00' : '#E5E7EB',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 32 }}>
                                                        {getEmojiForSide(side.name)}
                                                    </Text>
                                                    {isSelected && (
                                                        <View
                                                            style={{
                                                                position: 'absolute',
                                                                top: -8,
                                                                right: -8,
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 12,
                                                                backgroundColor: '#FE8C00',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                                                ✓
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text 
                                                    className="small-bold text-dark-100 text-center"
                                                    numberOfLines={1}
                                                    style={{ fontSize: 11 }}
                                                >
                                                    {side.name}
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
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { images, toppingImageMap, sideImageMap } from '@/constants';
import { MenuItem, CartCustomization } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import CustomButton from '@/components/CustomButton';
import cn from 'clsx';

const ProductDetail = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [product, setProduct] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedCustomizations, setSelectedCustomizations] = useState<CartCustomization[]>([]);
    const [availableCustomizations, setAvailableCustomizations] = useState<any[]>([]);
    const { addItem } = useCartStore();

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

    const fetchProductDetail = async () => {
        try {
            setLoading(true);
            console.log('🔍 Fetching product:', id);

            // Get product
            const productDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId,
                id
            );

            console.log('✅ Product loaded:', productDoc.name);
            setProduct(productDoc as MenuItem);

            // Get customizations for this product
            console.log('🔍 Fetching menu_customizations...');
            const menuCustomizations = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.menuCustomizationsCollectionId,
                [Query.equal('menu', id)]
            );

            console.log('📦 Menu customizations found:', menuCustomizations.documents.length);

            // Extract customization IDs
            let customizationIds: string[] = [];
            
            menuCustomizations.documents.forEach((doc: any) => {
                console.log('📄 Doc customizations field:', doc.customizations);
                
                if (!doc.customizations) return;

                // Handle array
                if (Array.isArray(doc.customizations)) {
                    customizationIds.push(...doc.customizations);
                }
                // Handle single string
                else if (typeof doc.customizations === 'string') {
                    customizationIds.push(doc.customizations);
                }
            });

            // Clean and deduplicate
            customizationIds = [...new Set(
                customizationIds
                    .filter(x => typeof x === 'string' && x.trim() !== '')
                    .map(x => x.trim())
            )];

            console.log('🆔 Customization IDs to fetch:', customizationIds);

            if (customizationIds.length === 0) {
                console.log('⚠️ No customization IDs found');
                setAvailableCustomizations([]);
                return;
            }

            // Fetch customization details
            console.log('🔍 Fetching customization details...');
            const customizationDocs = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.customizationsCollectionId,
                [Query.equal('$id', customizationIds)]
            );

            console.log('✅ Customizations loaded:', customizationDocs.documents.length);
            console.log('📋 Customizations:', customizationDocs.documents.map((d: any) => ({
                name: d.name,
                type: d.type,
                price: d.price
            })));

            setAvailableCustomizations(customizationDocs.documents);

        } catch (error: any) {
            console.error('❌ Fetch error:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                type: error.type
            });
            Alert.alert('Error', 'Failed to load product details: ' + error.message);
        } finally {
            setLoading(false);
        }
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

        const basePrice = product.price;
        const customizationPrice = selectedCustomizations.reduce(
            (sum, c) => sum + c.price,
            0
        );

        return (basePrice + customizationPrice) * quantity;
    };

    const handleAddToCart = () => {
        if (!product) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        for (let i = 0; i < quantity; i++) {
            addItem({
                id: product.$id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                customizations: selectedCustomizations,
            });
        }

        Alert.alert(
            'Added to Cart! 🛒',
            `${quantity}x ${product.name} added to your cart`,
            [
                { text: 'Continue Shopping', style: 'cancel' },
                { text: 'View Cart', onPress: () => router.push('/cart') },
            ]
        );

        setQuantity(1);
        setSelectedCustomizations([]);
    };

    const getToppingImage = (name: string, type: string) => {
        if (type === 'topping') {
            return toppingImageMap[name] || images.cheese;
        } else {
            return sideImageMap[name] || images.fries;
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text className="paragraph-medium text-gray-200 mt-4">Loading product...</Text>
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <Text className="paragraph-medium text-gray-200">Product not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="paragraph-bold text-primary">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const toppings = availableCustomizations.filter(c => c.type === 'topping');
    const sides = availableCustomizations.filter(c => c.type === 'side');

    console.log('🍕 Toppings to display:', toppings.length);
    console.log('🍟 Sides to display:', sides.length);

    return (
        <SafeAreaView className="bg-white h-full">
            <Animated.View
                style={{
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                <ScrollView 
                    contentContainerClassName="pb-40"
                    showsVerticalScrollIndicator={false}
                >
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
                                    <Text className="h1-bold text-primary">
                                        {product.price.toLocaleString('vi-VN')}đ
                                    </Text>
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

                        {/* 🔥 TOPPINGS SECTION - IMPROVED */}
                        {toppings.length > 0 ? (
                            <View className="mb-6">
                                <View className="mb-4">
                                    <Text className="base-bold text-dark-100">
                                        🍕 Customize Your Order
                                    </Text>
                                    <Text className="body-regular text-gray-200 mt-1">
                                        Choose your favorite toppings ({toppings.length} available)
                                    </Text>
                                </View>

                                <View className="flex-row flex-wrap gap-3">
                                    {toppings.map((topping: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === topping.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={topping.$id}
                                                onPress={() => handleCustomizationToggle(topping)}
                                                activeOpacity={0.7}
                                                style={{
                                                    width: '30%',
                                                    shadowColor: isSelected ? '#FE8C00' : '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isSelected ? 0.3 : 0.1,
                                                    shadowRadius: 4,
                                                    elevation: isSelected ? 5 : 2,
                                                }}
                                                className={cn(
                                                    'items-center p-3 rounded-2xl border-2',
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'bg-white border-gray-200'
                                                )}
                                            >
                                                {/* Checkmark Badge */}
                                                {isSelected && (
                                                    <View className="absolute -top-2 -right-2 z-10 bg-white rounded-full p-1 border-2 border-primary">
                                                        <Image
                                                            source={images.check}
                                                            className="size-3"
                                                            resizeMode="contain"
                                                            tintColor="#FE8C00"
                                                        />
                                                    </View>
                                                )}

                                                {/* Topping Image */}
                                                <View className={cn(
                                                    'size-16 rounded-xl mb-2 flex-center',
                                                    isSelected ? 'bg-white/20' : 'bg-primary/5'
                                                )}>
                                                    <Image
                                                        source={getToppingImage(topping.name, topping.type)}
                                                        className="size-12"
                                                        resizeMode="contain"
                                                    />
                                                </View>

                                                {/* Topping Name */}
                                                <Text
                                                    className={cn(
                                                        'text-xs font-quicksand-semibold text-center',
                                                        isSelected ? 'text-white' : 'text-dark-100'
                                                    )}
                                                    numberOfLines={2}
                                                >
                                                    {topping.name}
                                                </Text>

                                                {/* Topping Price */}
                                                <Text
                                                    className={cn(
                                                        'text-xs font-quicksand text-center mt-1',
                                                        isSelected ? 'text-white/90' : 'text-gray-200'
                                                    )}
                                                >
                                                    +{topping.price.toLocaleString('vi-VN')}đ
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <View className="mb-6 bg-gray-100 rounded-2xl p-4">
                                <Text className="body-regular text-gray-200 text-center">
                                    No toppings available for this item
                                </Text>
                            </View>
                        )}

                        {/* 🔥 SIDES SECTION - IMPROVED */}
                        {sides.length > 0 ? (
                            <View className="mb-6">
                                <View className="mb-4">
                                    <Text className="base-bold text-dark-100">
                                        🍟 Add Extra Sides
                                    </Text>
                                    <Text className="body-regular text-gray-200 mt-1">
                                        Complete your meal ({sides.length} available)
                                    </Text>
                                </View>

                                <View className="flex-row flex-wrap gap-3">
                                    {sides.map((side: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === side.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={side.$id}
                                                onPress={() => handleCustomizationToggle(side)}
                                                activeOpacity={0.7}
                                                style={{
                                                    width: '30%',
                                                    shadowColor: isSelected ? '#2F9B65' : '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isSelected ? 0.3 : 0.1,
                                                    shadowRadius: 4,
                                                    elevation: isSelected ? 5 : 2,
                                                }}
                                                className={cn(
                                                    'items-center p-3 rounded-2xl border-2',
                                                    isSelected
                                                        ? 'bg-success border-success'
                                                        : 'bg-white border-gray-200'
                                                )}
                                            >
                                                {isSelected && (
                                                    <View className="absolute -top-2 -right-2 z-10 bg-white rounded-full p-1 border-2 border-success">
                                                        <Image
                                                            source={images.check}
                                                            className="size-3"
                                                            resizeMode="contain"
                                                            tintColor="#2F9B65"
                                                        />
                                                    </View>
                                                )}

                                                <View className={cn(
                                                    'size-16 rounded-xl mb-2 flex-center',
                                                    isSelected ? 'bg-white/20' : 'bg-success/5'
                                                )}>
                                                    <Image
                                                        source={getToppingImage(side.name, side.type)}
                                                        className="size-12"
                                                        resizeMode="contain"
                                                    />
                                                </View>

                                                <Text
                                                    className={cn(
                                                        'text-xs font-quicksand-semibold text-center',
                                                        isSelected ? 'text-white' : 'text-dark-100'
                                                    )}
                                                    numberOfLines={2}
                                                >
                                                    {side.name}
                                                </Text>

                                                <Text
                                                    className={cn(
                                                        'text-xs font-quicksand text-center mt-1',
                                                        isSelected ? 'text-white/90' : 'text-gray-200'
                                                    )}
                                                >
                                                    +{side.price.toLocaleString('vi-VN')}đ
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <View className="mb-6 bg-gray-100 rounded-2xl p-4">
                                <Text className="body-regular text-gray-200 text-center">
                                    No sides available for this item
                                </Text>
                            </View>
                        )}

                        {/* Selected Summary */}
                        {selectedCustomizations.length > 0 && (
                            <View className="mb-6 bg-success/10 rounded-2xl p-4">
                                <Text className="base-semibold text-dark-100 mb-3">
                                    ✅ Your Selections ({selectedCustomizations.length}):
                                </Text>

                                {selectedCustomizations.map((custom) => (
                                    <View key={custom.id} className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center flex-1">
                                            <View className="size-8 rounded-lg bg-white mr-2 flex-center">
                                                <Image
                                                    source={getToppingImage(custom.name, custom.type)}
                                                    className="size-6"
                                                    resizeMode="contain"
                                                />
                                            </View>

                                            <Text className="body-medium text-gray-200 flex-1" numberOfLines={1}>
                                                {custom.name}
                                            </Text>
                                        </View>
                                        <Text className="body-medium text-success ml-2">
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
                            activeOpacity={0.7}
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
                            activeOpacity={0.7}
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
        </SafeAreaView>
    );
};

export default ProductDetail;
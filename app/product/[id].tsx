
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
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
import cn from 'clsx';

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

        // Add item to cart multiple times based on quantity
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

        // Reset selections
        setQuantity(1);
        setSelectedCustomizations([]);
    };

    if (loading) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <Text className="paragraph-medium text-gray-200">Loading...</Text>
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
                                    <Text className="h1-bold text-primary">${product.price}</Text>
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

                        {/* Toppings */}
                        {toppings.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">
                                    Add Toppings
                                </Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {toppings.map((topping: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === topping.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={topping.$id}
                                                onPress={() => handleCustomizationToggle(topping)}
                                                className={cn(
                                                    'px-4 py-2.5 rounded-full border',
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'bg-white border-gray-200'
                                                )}
                                            >
                                                <Text
                                                    className={cn(
                                                        'body-medium',
                                                        isSelected ? 'text-white' : 'text-dark-100'
                                                    )}
                                                >
                                                    {topping.name} +${topping.price}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Sides */}
                        {sides.length > 0 && (
                            <View className="mb-6">
                                <Text className="base-bold text-dark-100 mb-3">Add Sides</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {sides.map((side: any) => {
                                        const isSelected = selectedCustomizations.some(
                                            c => c.id === side.$id
                                        );

                                        return (
                                            <TouchableOpacity
                                                key={side.$id}
                                                onPress={() => handleCustomizationToggle(side)}
                                                className={cn(
                                                    'px-4 py-2.5 rounded-full border',
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'bg-white border-gray-200'
                                                )}
                                            >
                                                <Text
                                                    className={cn(
                                                        'body-medium',
                                                        isSelected ? 'text-white' : 'text-dark-100'
                                                    )}
                                                >
                                                    {side.name} +${side.price}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ✅ FIX: Selected Customizations Summary - Đã thêm closing tag */}
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
                                            +${custom.price}
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
                    title={`Add to Cart - $${calculateTotalPrice().toFixed(2)}`}
                    onPress={handleAddToCart}
                />
            </View>
        </SafeAreaView>
    );
};

export default ProductDetail;
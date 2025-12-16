// app/(tabs)/index.tsx - ENHANCED VERSION

import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Image, Text, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';

import CartButton from '@/components/CartButton';
import SuccessModal from '@/components/SuccessModal';
import AddressListModal from '@/components/AddressListModal';
import AddEditAddressModal from '@/components/AddEditAddressModal';
import { images, offers } from '@/constants';
import useAuthStore from '@/store/auth.store';
import { useAddressStore, Address } from '@/store/address.store';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import { MenuItem } from '@/type';
import cn from 'clsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 40;

export default function Index() {
    const { user } = useAuthStore();
    const { getDisplayAddress, fetchAddresses } = useAddressStore();
    const params = useLocalSearchParams<{ showWelcome?: string }>();
    
    // Modals
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showAddressListModal, setShowAddressListModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [modalType, setModalType] = useState<'signup' | 'signin'>('signin');

    // Slider State
    const [currentSlide, setCurrentSlide] = useState(0);
    const slidePosition = useSharedValue(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Best Sellers State
    const [bestSellers, setBestSellers] = useState<MenuItem[]>([]);
    const [loadingBestSellers, setLoadingBestSellers] = useState(true);

    // ========== WELCOME MODAL ==========
    useEffect(() => {
        if (params.showWelcome === 'signin' || params.showWelcome === 'signup') {
            setModalType(params.showWelcome);
            setTimeout(() => {
                setShowSuccessModal(true);
            }, 300);
            router.setParams({ showWelcome: undefined });
        }
    }, [params.showWelcome]);

    // ========== FETCH ADDRESSES ==========
    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    // ========== AUTO SLIDER ==========
    useEffect(() => {
        startAutoSlide();
        return () => stopAutoSlide();
    }, [currentSlide]);

    const startAutoSlide = () => {
        stopAutoSlide();
        intervalRef.current = setInterval(() => {
            const nextSlide = (currentSlide + 1) % offers.length;
            goToSlide(nextSlide);
        }, 3000);
    };

    const stopAutoSlide = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
        
        // Animate with smooth timing
        slidePosition.value = withTiming(-index * SLIDER_WIDTH, {
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        // Scroll to position (for manual scroll support)
        scrollViewRef.current?.scrollTo({
            x: index * SLIDER_WIDTH,
            animated: true,
        });
    };

    // Handle manual scroll
    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / SLIDER_WIDTH);
        
        if (index !== currentSlide) {
            setCurrentSlide(index);
            stopAutoSlide();
            startAutoSlide();
        }
    };

    // ========== LOAD BEST SELLERS (BY ORDER COUNT) ==========
    useEffect(() => {
        loadBestSellers();
    }, []);

    const loadBestSellers = async () => {
        try {
            setLoadingBestSellers(true);

            // 1. Get all orders
            const orders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId,
                [Query.limit(1000)]
            );

            // 2. Count quantity for each menu item
            const itemCountMap: { [menuId: string]: number } = {};

            for (const order of orders.documents) {
                try {
                    const items = JSON.parse(order.items || '[]');
                    
                    for (const item of items) {
                        const menuId = item.menu_id;
                        itemCountMap[menuId] = (itemCountMap[menuId] || 0) + item.quantity;
                    }
                } catch (error) {
                    console.error('Failed to parse order items:', error);
                }
            }

            // 3. Sort by order count
            const sortedMenuIds = Object.entries(itemCountMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([menuId]) => menuId);

            console.log('📊 Top 4 menu items by order count:', itemCountMap);

            // 4. Fetch menu details
            if (sortedMenuIds.length > 0) {
                const menuItems = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    [Query.equal('$id', sortedMenuIds)]
                );

                // Sort by original order
                const sorted = sortedMenuIds
                    .map(id => menuItems.documents.find((doc: any) => doc.$id === id))
                    .filter(Boolean) as MenuItem[];

                setBestSellers(sorted);
                console.log(`✅ Loaded ${sorted.length} best sellers`);
            } else {
                // Fallback: If no orders, show highest rated
                console.log('⚠️ No orders found, showing highest rated items');
                const allMenu = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    [Query.limit(4), Query.orderDesc('rating')]
                );

                setBestSellers(allMenu.documents as MenuItem[]);
            }

        } catch (error) {
            console.error('Failed to load best sellers:', error);
        } finally {
            setLoadingBestSellers(false);
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slidePosition.value }],
    }));

    const handleAddNewAddress = () => {
        setShowAddressListModal(false);
        setEditingAddress(null);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleEditAddress = (address: Address) => {
        setShowAddressListModal(false);
        setEditingAddress(address);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleCloseAddEditModal = () => {
        setShowAddEditModal(false);
        setEditingAddress(null);
        setTimeout(() => {
            fetchAddresses();
            setShowAddressListModal(true);
        }, 300);
    };

    const truncateName = (text: string, maxLength: number = 16) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="flex-between flex-row w-full px-5 my-5">
                    <View className="flex-start">
                        <Text className="small-bold text-primary">DELIVER TO</Text>
                        <TouchableOpacity
                            className="flex-center flex-row gap-x-1 mt-0.5"
                            onPress={() => setShowAddressListModal(true)}
                        >
                            <Text className="paragraph-bold text-dark-100">
                                {getDisplayAddress()}
                            </Text>
                            <Image
                                source={images.arrowDown}
                                className="size-3"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <CartButton />
                </View>

               {/* === AUTO SLIDER REAL ONE-IMAGE === */}
{/* === AUTO SLIDER REAL ONE-IMAGE (UPDATED WITH SWIPE SUPPORT) === */}
<View
    style={{
        width: SLIDER_WIDTH,
        height: 180,
        marginHorizontal: 20,
        marginBottom: 20,
        overflow: 'hidden',
        borderRadius: 20,
    }}
>
    <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={stopAutoSlide}   // Dừng khi user chạm
        onTouchEnd={startAutoSlide}    // Chạy lại khi user thả
    >
        {offers.map((item, index) => {
            const isEven = index % 2 === 0;

            return (
                <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.9}
                    onPress={() => {
                        stopAutoSlide();
                        router.push(`/combo/${item.id}`);
                    }}
                    style={{
                        width: SLIDER_WIDTH,
                        height: '100%',
                        flexDirection: isEven ? 'row-reverse' : 'row',
                        backgroundColor: item.color,
                        padding: 16,
                        borderRadius: 20,
                    }}
                >
                    {/* Image */}
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Image
                            source={item.image}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white' }}>
                            {item.title}
                        </Text>
                        <Image
                            source={images.arrowRight}
                            style={{ width: 40, height: 40, marginTop: 10 }}
                            resizeMode="contain"
                            tintColor="#ffffff"
                        />
                    </View>
                </TouchableOpacity>
            );
        })}
    </ScrollView>

    {/* Dots Indicator */}
    <View
        style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
            gap: 8,
        }}
    >
        {offers.map((_, index) => (
            <View
                key={index}
                style={{
                    width: currentSlide === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentSlide === index ? '#FE8C00' : '#D1D5DB',
                }}
            />
        ))}
    </View>
</View>


                {/* ✅ BEST SELLERS (BY ORDER COUNT) */}
                <View style={{ paddingHorizontal: 20 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <View>
                            <Text className="small-bold text-primary">🔥 POPULAR</Text>
                            <Text className="h3-bold text-dark-100 mt-1">Best Sellers</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/search')}>
                            <Text className="paragraph-semibold text-primary">View All →</Text>
                        </TouchableOpacity>
                    </View>

                    {loadingBestSellers ? (
                        <View className="flex-center py-10">
                            <ActivityIndicator size="large" color="#FE8C00" />
                        </View>
                    ) : (
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 16,
                            }}
                        >
                            {bestSellers.map((item, index) => (
                                <TouchableOpacity
                                    key={item.$id}
                                    style={{
                                        width: (SCREEN_WIDTH - 56) / 2,
                                        backgroundColor: 'white',
                                        borderRadius: 24,
                                        padding: 14,
                                        paddingTop: 80,
                                        shadowColor: '#878787',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 8,
                                        elevation: 5,
                                        position: 'relative',
                                        minHeight: 240,
                                    }}
                                    onPress={() => router.push(`/product/${item.$id}` as any)}
                                    activeOpacity={0.7}
                                >
                                    {/* Product Image */}
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: -30,
                                            left: 0,
                                            right: 0,
                                            height: 110,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Image
                                            source={{ uri: item.image_url }}
                                            style={{ width: 100, height: 100 }}
                                            resizeMode="contain"
                                        />
                                    </View>

                                    {/* Best Seller Badge */}
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: '#FE8C00',
                                            borderRadius: 20,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
                                            🔥 #{index + 1}
                                        </Text>
                                    </View>

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
                                        numberOfLines={2}
                                        style={{
                                            minHeight: 44,
                                            lineHeight: 22,
                                        }}
                                    >
                                        {truncateName(item.name, 20)}
                                    </Text>

                                    {/* Price */}
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 'bold',
                                            color: '#FE8C00',
                                            textAlign: 'center',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {item.price.toLocaleString('vi-VN')}đ
                                    </Text>

                                    {/* View Details Button */}
                                    <TouchableOpacity
                                        onPress={() => router.push(`/product/${item.$id}` as any)}
                                        style={{
                                            backgroundColor: '#FFF5E6',
                                            borderRadius: 12,
                                            paddingVertical: 8,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text className="paragraph-bold text-primary">
                                            View Details
                                        </Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Success Modal */}
            <SuccessModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title={modalType === 'signup' ? 'Welcome Aboard! 🎉' : 'Welcome Back! 🍕'}
                message={
                    modalType === 'signup'
                        ? 'Your account has been created successfully. Get ready to explore delicious food options!'
                        : "You're now signed in. Let's order some delicious food!"
                }
                type={modalType}
            />

            {/* Address List Modal */}
            <AddressListModal
                visible={showAddressListModal}
                onClose={() => {
                    setShowAddressListModal(false);
                    fetchAddresses();
                }}
                onAddNew={handleAddNewAddress}
                onEdit={handleEditAddress}
            />

            {/* Add/Edit Address Modal */}
            <AddEditAddressModal
                visible={showAddEditModal}
                onClose={handleCloseAddEditModal}
                editAddress={editingAddress}
            />
        </SafeAreaView>
    );
}
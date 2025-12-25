// app/(tabs)/index.tsx - OPTIMIZED VERSION

import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Image, Text, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import CartButton from '@/components/CartButton';
import SuccessModal from '@/components/SuccessModal';
import AddressListModal from '@/components/AddressListModal';
import AddEditAddressModal from '@/components/AddEditAddressModal';
import { images, offers } from '@/constants';
import useAuthStore from '@/store/auth.store';
import { useAddressStore } from '@/store/address.store';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import { MenuItem } from '@/type';
import cn from 'clsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 40;

// ✅ FIX 5: Cache best sellers
let bestSellersCache: MenuItem[] = [];
let bestSellersCacheTime = 0;
const BEST_SELLERS_CACHE_DURATION = 10000; // 10 seconds for testing

export default function Index() {
    const { user } = useAuthStore();
    const { getDisplayAddress, fetchAddresses } = useAddressStore();
    const params = useLocalSearchParams<{ showWelcome?: string }>();

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showAddressListModal, setShowAddressListModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<any>(null);
    const [modalType, setModalType] = useState<'signup' | 'signin'>('signin');

    const [currentSlide, setCurrentSlide] = useState(0);
    const slidePosition = useSharedValue(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const [bestSellers, setBestSellers] = useState<MenuItem[]>([]);
    const [loadingBestSellers, setLoadingBestSellers] = useState(true);

    useEffect(() => {
        if (params.showWelcome === 'signin' || params.showWelcome === 'signup') {
            setModalType(params.showWelcome);
            setTimeout(() => {
                setShowSuccessModal(true);
            }, 300);
            router.setParams({ showWelcome: undefined });
        }
    }, [params.showWelcome]);

    // ✅ FIX 6: Only fetch addresses once on mount
    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user?.id]); // ✅ Only when user ID changes

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
        slidePosition.value = withTiming(-index * SLIDER_WIDTH, {
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        scrollViewRef.current?.scrollTo({
            x: index * SLIDER_WIDTH,
            animated: true,
        });
    };

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / SLIDER_WIDTH);
        if (index !== currentSlide) {
            setCurrentSlide(index);
            stopAutoSlide();
            startAutoSlide();
        }
    };

    // ✅ FIX 7: Load best sellers from ACTUAL ORDERS
    useEffect(() => {
        loadBestSellers();
    }, []);

    const loadBestSellers = async () => {
        // Check cache first
        const now = Date.now();
        if (bestSellersCache.length > 0 && now - bestSellersCacheTime < BEST_SELLERS_CACHE_DURATION) {
            console.log('✅ Using cached best sellers');
            setBestSellers(bestSellersCache);
            setLoadingBestSellers(false);
            return;
        }

        try {
            setLoadingBestSellers(true);

            // 1. Fetch recent orders to determine popularity (Last 100 orders)
            // This is "heavy" but necessary without a dedicated "sold_count" field in DB.
            const recentOrders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId,
                [
                    Query.limit(100),
                    Query.orderDesc('$createdAt'),
                    Query.select(['items']) // Optimization: Only fetch items field
                ]
            );

            // 2. Count item sales
            const itemSales: { [key: string]: number } = {};
            recentOrders.documents.forEach((order: any) => {
                try {
                    const items = JSON.parse(order.items || '[]');
                    items.forEach((item: any) => {
                        const id = item.menu_id || item.id;
                        itemSales[id] = (itemSales[id] || 0) + (item.quantity || 1);
                    });
                } catch (e) {
                    // Ignore parse errors
                }
            });

            // 3. Get Top 4 IDs
            const topIds = Object.entries(itemSales)
                .sort(([, a], [, b]) => b - a) // Sort desc by count
                .slice(0, 4)
                .map(([id]) => id);

            if (topIds.length === 0) {
                // Fallback to rating if no orders
                const ratedMenu = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    [Query.limit(4), Query.orderDesc('rating')]
                );
                setBestSellers(ratedMenu.documents as MenuItem[]);
                return;
            }

            // 4. Fetch details for these 4 items
            // We use Promise.all to fetch them in parallel or use a query with "equal" if IDs supported (array contains not supported for ID in appwrite easily)
            // Simpler: Fetch one by one or fetch all and filter (fetch all is bad).
            // Appwrite doesn't support "id in [a,b,c]" easily. We'll fetch individually.
            const itemPromises = topIds.map(id =>
                databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    id
                ).catch(() => null) // Handle deleted items
            );

            const fetchedItems = await Promise.all(itemPromises);
            const validItems = fetchedItems.filter(item => item !== null) as MenuItem[];

            // 5. If less than 4 (due to errors/deleted), fill with top rated
            if (validItems.length < 4) {
                const existingIds = validItems.map(i => i.$id);
                const filler = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    [Query.limit(4 - validItems.length), Query.orderDesc('rating')]
                );
                // Avoid duplicates
                filler.documents.forEach((doc: any) => {
                    if (!existingIds.includes(doc.$id)) validItems.push(doc as MenuItem);
                });
            }

            // Save to cache
            bestSellersCache = validItems.slice(0, 4);
            bestSellersCacheTime = Date.now();

            setBestSellers(bestSellersCache);
            console.log(`✅ Loaded ${bestSellersCache.length} best sellers from orders`);
        } catch (error) {
            console.error('Failed to load best sellers:', error);
            // Fallback
            try {
                const ratedMenu = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    [Query.limit(4), Query.orderDesc('rating')]
                );
                setBestSellers(ratedMenu.documents as MenuItem[]);
            } catch (e) { }
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

    const handleEditAddress = (address: any) => {
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

                {/* Auto Slider */}
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
                        onTouchStart={stopAutoSlide}
                        onTouchEnd={startAutoSlide}
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
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Image
                                            source={item.image}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="contain"
                                        />
                                    </View>
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

                {/* Best Sellers */}
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

            <AddressListModal
                visible={showAddressListModal}
                onClose={() => {
                    setShowAddressListModal(false);
                    fetchAddresses();
                }}
                onAddNew={handleAddNewAddress}
                onEdit={handleEditAddress}
            />

            <AddEditAddressModal
                visible={showAddEditModal}
                onClose={handleCloseAddEditModal}
                editAddress={editingAddress}
            />
        </SafeAreaView>
    );
}
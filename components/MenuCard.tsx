// components/MenuCard.tsx - Fixed version
import { Text, TouchableOpacity, Image, Platform, View } from 'react-native';
import { MenuItem } from '@/type';
import { useCartStore } from '@/store/cart.store';
import { router } from 'expo-router';
import { images } from '@/constants';

const MenuCard = ({ item: { $id, image_url, name, price, rating } }: { item: MenuItem }) => {
    const { addItem } = useCartStore();

    const handleViewDetail = () => {
        // ✅ FIX: Use proper type casting for dynamic route
        router.push(`/product/${$id}` as any);
    };

    const handleQuickAdd = (e: any) => {
        // Prevent navigation when clicking "Add to Cart"
        e.stopPropagation();
        
        addItem({ 
            id: $id, 
            name, 
            price, 
            image_url, 
            customizations: [] 
        });
    };

    return (
        <TouchableOpacity
            className="menu-card"
            style={Platform.OS === 'android' ? { elevation: 10, shadowColor: '#878787' } : {}}
            onPress={handleViewDetail}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: image_url }}
                className="size-32 absolute -top-10"
                resizeMode="contain"
            />

            {/* Rating Badge */}
            <View className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 flex-row items-center gap-1">
                <Image
                    source={images.star}
                    className="size-3"
                    resizeMode="contain"
                    tintColor="#FE8C00"
                />
                <Text className="body-medium text-dark-100">{rating}</Text>
            </View>

            <Text className="text-center base-bold text-dark-100 mb-2" numberOfLines={1}>
                {name}
            </Text>
            
            <Text className="body-regular text-gray-200 mb-4">From ${price}</Text>

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
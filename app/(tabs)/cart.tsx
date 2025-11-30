// app/(tabs)/cart.tsx - UPDATED VERSION

import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/store/cart.store';
import { useAddressStore } from '@/store/address.store';
import CustomHeader from '@/components/CustomHeader';
import cn from 'clsx';
import CustomButton from '@/components/CustomButton';
import CartItem from '@/components/CartItem';
import { PaymentInfoStripeProps, CardPaymentData } from '@/type';
import { useState } from 'react';
import PaymentMethodModal from '@/components/PaymentMethodModal';
import MomoPaymentModal from '@/components/MomoPaymentModal'; // ✅ Momo chính thức
import CardPaymentModal from '@/components/CardPaymentModal';
import { createOrder, updatePaymentStatus } from '@/lib/payment';
import useAuthStore from '@/store/auth.store';
import { router } from 'expo-router';

const PaymentInfoStripe = ({ 
    label, 
    value, 
    labelStyle, 
    valueStyle 
}: PaymentInfoStripeProps) => (
    <View className="flex-between flex-row my-1">
        <Text className={cn('paragraph-medium text-gray-200', labelStyle)}>
            {label}
        </Text>
        <Text className={cn('paragraph-bold text-dark-100', valueStyle)}>
            {value}
        </Text>
    </View>
);

const Cart = () => {
    const { items, getTotalItems, getTotalPrice, clearCart } = useCartStore();
    const { defaultAddress } = useAddressStore();
    const { user } = useAuthStore();
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMomoModal, setShowMomoModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cod' | 'momo' | 'card'>('cod');
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const totalItems = getTotalItems();
    const subtotal = getTotalPrice();
    const deliveryFee = 15000;
    const discount = 5000;
    const total = subtotal + deliveryFee - discount;

    const handleOrderNow = () => {
        if (totalItems === 0) {
            return Alert.alert('Giỏ hàng trống', 'Vui lòng thêm món vào giỏ hàng');
        }

        if (!defaultAddress) {
            return Alert.alert('Chưa có địa chỉ', 'Vui lòng thiết lập địa chỉ giao hàng');
        }

        if (!user?.phone) {
            return Alert.alert('Chưa có số điện thoại', 'Vui lòng cập nhật số điện thoại trong hồ sơ');
        }

        setShowPaymentModal(true);
    };

    const handleSelectPaymentMethod = async (method: 'cod' | 'momo' | 'card') => {
        setSelectedPaymentMethod(method);
        setShowPaymentModal(false);

        if (!user) return;

        try {
            setIsProcessing(true);

            const orderItems = items.map(item => ({
                menu_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image_url: item.image_url,
                customizations: item.customizations || [],
            }));

            // ✅ Tạo order
            const order = await createOrder(user.$id, {
                items: orderItems,
                subtotal,
                delivery_fee: deliveryFee,
                discount,
                total,
                delivery_address: defaultAddress?.fullAddress || '',
                delivery_phone: user.phone || '',
                payment_method: method,
            });

            setCurrentOrder(order);

            if (method === 'cod') {
                // COD - Success
                Alert.alert(
                    'Đặt hàng thành công! 🎉',
                    `Đơn hàng #${order.order_number} đã được đặt. Bạn sẽ thanh toán ${total.toLocaleString('vi-VN')}đ khi nhận hàng.`,
                    [
                        {
                            text: 'Xem đơn hàng',
                            onPress: () => {
                                clearCart();
                                router.push('/profile');
                            },
                        },
                    ]
                );
            } else if (method === 'momo') {
                // ✅ Momo - Mở modal Momo chính thức
                setShowMomoModal(true);
            } else if (method === 'card') {
                // Card
                setShowCardModal(true);
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể tạo đơn hàng');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMomoPaymentSuccess = async () => {
        if (!currentOrder) return;

        try {
            await clearCart();

            Alert.alert(
                'Thanh toán thành công! 🎉',
                `Đơn hàng #${currentOrder.order_number} đã được xác nhận!`,
                [
                    {
                        text: 'Xem đơn hàng',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowMomoModal(false);
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể hoàn tất thanh toán');
        }
    };

    const handleConfirmCardPayment = async (cardData: CardPaymentData) => {
        if (!currentOrder) return;

        try {
            setIsProcessing(true);

            const transactionId = `CARD${Date.now()}`;
            await updatePaymentStatus(currentOrder.$id, 'paid', transactionId);
            await clearCart();

            Alert.alert(
                'Thanh toán thành công! 🎉',
                `Đã thanh toán ${total.toLocaleString('vi-VN')}đ bằng thẻ số ${cardData.cardNumber.slice(-4)}. Đơn hàng #${currentOrder.order_number} đã được xác nhận!`,
                [
                    {
                        text: 'Xem đơn hàng',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowCardModal(false);
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể xử lý thanh toán');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text className="paragraph-medium text-gray-200 mt-4">
                    Đang xử lý đơn hàng...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="bg-white h-full">
            <FlatList
                data={items}
                renderItem={({ item }) => <CartItem item={item} />}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerClassName="pb-28 px-5 pt-5"
                ListHeaderComponent={() => <CustomHeader title="Giỏ hàng" />}
                ListEmptyComponent={() => (
                    <View className="flex-center py-20">
                        <Text className="h3-bold text-dark-100 mb-2">Giỏ hàng trống</Text>
                        <Text className="body-regular text-gray-200">
                            Thêm món ăn ngon để bắt đầu!
                        </Text>
                    </View>
                )}
                ListFooterComponent={() =>
                    totalItems > 0 && (
                        <View className="gap-5">
                            <View className="mt-6 border border-gray-200 p-5 rounded-2xl">
                                <Text className="h3-bold text-dark-100 mb-5">
                                    Tổng thanh toán
                                </Text>

                                <PaymentInfoStripe
                                    label={`Tổng món (${totalItems})`}
                                    value={`${subtotal.toLocaleString('vi-VN')}đ`}
                                />
                                <PaymentInfoStripe
                                    label="Phí giao hàng"
                                    value={`${deliveryFee.toLocaleString('vi-VN')}đ`}
                                />
                                <PaymentInfoStripe
                                    label="Giảm giá"
                                    value={`- ${discount.toLocaleString('vi-VN')}đ`}
                                    valueStyle="!text-success"
                                />
                                <View className="border-t border-gray-300 my-2" />
                                <PaymentInfoStripe
                                    label="Tổng cộng"
                                    value={`${total.toLocaleString('vi-VN')}đ`}
                                    labelStyle="base-bold !text-dark-100"
                                    valueStyle="base-bold !text-dark-100 !text-right"
                                />
                            </View>

                            <CustomButton 
                                title="Đặt hàng" 
                                onPress={handleOrderNow}
                            />
                        </View>
                    )
                }
            />

            {/* Payment Method Modal */}
            <PaymentMethodModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSelectMethod={handleSelectPaymentMethod}
                totalAmount={total}
            />

            {/* ✅ Momo Payment Modal (OFFICIAL API) */}
            {currentOrder && (
                <MomoPaymentModal
                    visible={showMomoModal}
                    onClose={() => setShowMomoModal(false)}
                    onPaymentSuccess={handleMomoPaymentSuccess}
                    totalAmount={total}
                    orderNumber={currentOrder.order_number}
                    orderId={currentOrder.$id}
                />
            )}

            {/* Card Payment Modal */}
            {currentOrder && (
                <CardPaymentModal
                    visible={showCardModal}
                    onClose={() => setShowCardModal(false)}
                    onConfirmPayment={handleConfirmCardPayment}
                    totalAmount={total}
                    orderNumber={currentOrder.order_number}
                />
            )}
        </SafeAreaView>
    );
};

export default Cart;
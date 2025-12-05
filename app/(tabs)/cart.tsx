// app/(tabs)/cart.tsx - FIXED VERSION

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
import QRCodePaymentModal from '@/components/QRCodePaymentModal';
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
    const [showQRModal, setShowQRModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cod' | 'qr' | 'card'>('cod');
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const totalItems = getTotalItems();
    const subtotal = getTotalPrice();
    const deliveryFee = 15000;
    const discount = 5000;
    const total = subtotal + deliveryFee - discount;

    const handleOrderNow = () => {
        if (totalItems === 0) {
            return Alert.alert('Empty Cart', 'Please add items to your cart');
        }

        if (!defaultAddress) {
            return Alert.alert('No Address', 'Please set up a delivery address');
        }

        if (!user?.phone) {
            return Alert.alert('No Phone Number', 'Please update your phone number in profile');
        }

        setShowPaymentModal(true);
    };

    const handleSelectPaymentMethod = async (method: 'cod' | 'qr' | 'card') => {
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

            // ✅ FIX: Lưu payment_method chính xác
            let paymentMethodToSave: string;
            
            if (method === 'cod') {
                paymentMethodToSave = 'cod';
            } else if (method === 'qr') {
                paymentMethodToSave = 'bidv'; // ✅ Lưu tên ngân hàng, không phải "momo"
            } else {
                paymentMethodToSave = 'card';
            }

            // Create order với payment_method đúng
            const order = await createOrder(user.$id, {
                items: orderItems,
                subtotal,
                delivery_fee: deliveryFee,
                discount,
                total,
                delivery_address: defaultAddress?.fullAddress || '',
                delivery_phone: user.phone || '',
                payment_method: paymentMethodToSave, // ✅ Lưu ngân hàng thực tế
            });

            setCurrentOrder(order);

            if (method === 'cod') {
                // COD - Success
                Alert.alert(
                    'Order Placed Successfully! 🎉',
                    `Order #${order.order_number} has been placed. You will pay ${total.toLocaleString('vi-VN')}đ on delivery.`,
                    [
                        {
                            text: 'View Order',
                            onPress: () => {
                                clearCart();
                                router.push('/profile');
                            },
                        },
                    ]
                );
            } else if (method === 'qr') {
                // QR Payment - Show modal
                setShowQRModal(true);
            } else if (method === 'card') {
                // Card Payment
                setShowCardModal(true);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to create order');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQRPaymentSuccess = async () => {
        if (!currentOrder) return;

        try {
            await clearCart();

            Alert.alert(
                'Payment Successful! 🎉',
                `Order #${currentOrder.order_number} has been confirmed!`,
                [
                    {
                        text: 'View Order',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowQRModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to complete payment');
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
                'Payment Successful! 🎉',
                `Paid ${total.toLocaleString('vi-VN')}đ with card ending ${cardData.cardNumber.slice(-4)}. Order #${currentOrder.order_number} confirmed!`,
                [
                    {
                        text: 'View Order',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowCardModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to process payment');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text className="paragraph-medium text-gray-200 mt-4">
                    Processing order...
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
                ListHeaderComponent={() => <CustomHeader title="Shopping Cart" />}
                ListEmptyComponent={() => (
                    <View className="flex-center py-20">
                        <Text className="h3-bold text-dark-100 mb-2">Cart is Empty</Text>
                        <Text className="body-regular text-gray-200">
                            Add delicious food to get started!
                        </Text>
                    </View>
                )}
                ListFooterComponent={() =>
                    totalItems > 0 && (
                        <View className="gap-5">
                            <View className="mt-6 border border-gray-200 p-5 rounded-2xl">
                                <Text className="h3-bold text-dark-100 mb-5">
                                    Order Summary
                                </Text>

                                <PaymentInfoStripe
                                    label={`Subtotal (${totalItems} items)`}
                                    value={`${subtotal.toLocaleString('vi-VN')}đ`}
                                />
                                <PaymentInfoStripe
                                    label="Delivery Fee"
                                    value={`${deliveryFee.toLocaleString('vi-VN')}đ`}
                                />
                                <PaymentInfoStripe
                                    label="Discount"
                                    value={`- ${discount.toLocaleString('vi-VN')}đ`}
                                    valueStyle="!text-success"
                                />
                                <View className="border-t border-gray-300 my-2" />
                                <PaymentInfoStripe
                                    label="Total"
                                    value={`${total.toLocaleString('vi-VN')}đ`}
                                    labelStyle="base-bold !text-dark-100"
                                    valueStyle="base-bold !text-dark-100 !text-right"
                                />
                            </View>

                            <CustomButton 
                                title="Place Order" 
                                onPress={handleOrderNow}
                            />
                        </View>
                    )
                }
            />

            {/* Payment Method Modal */}
            {showPaymentModal && (
                <PaymentMethodModal
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    onSelectMethod={handleSelectPaymentMethod}
                    totalAmount={total}
                />
            )}

            {/* QR Code Payment Modal */}
            {currentOrder && showQRModal && (
                <QRCodePaymentModal
                    visible={showQRModal}
                    onClose={() => setShowQRModal(false)}
                    onPaymentSuccess={handleQRPaymentSuccess}
                    totalAmount={total}
                    orderNumber={currentOrder.order_number}
                    orderId={currentOrder.$id}
                />
            )}

            {/* Card Payment Modal */}
            {currentOrder && showCardModal && (
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
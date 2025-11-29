// app/(tabs)/cart.tsx - UPDATED với Card Payment

import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/store/cart.store';
import { useAddressStore } from '@/store/address.store';
import CustomHeader from '@/components/CustomHeader';
import cn from 'clsx';
import CustomButton from '@/components/CustomButton';
import CartItem from '@/components/CartItem';
import { PaymentInfoStripeProps, PaymentMethod, CardPaymentData } from '@/type';
import { useState } from 'react';
import PaymentMethodModal from '@/components/PaymentMethodModal';
import QRPaymentModal from '@/components/QRPaymentModal';
import CardPaymentModal from '@/components/CardPaymentModal';
import { createOrder, generatePaymentQR, updatePaymentStatus } from '@/lib/payment';
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
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cod');
    const [qrData, setQrData] = useState<any>(null);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const totalItems = getTotalItems();
    const subtotal = getTotalPrice();
    const deliveryFee = 5.0;
    const discount = 0.5;
    const total = subtotal + deliveryFee - discount;

    const handleOrderNow = () => {
        if (totalItems === 0) {
            return Alert.alert('Empty Cart', 'Please add items to cart first');
        }

        if (!defaultAddress) {
            return Alert.alert('No Address', 'Please set your delivery address first');
        }

        if (!user?.phone) {
            return Alert.alert('No Phone', 'Please update your phone number in profile');
        }

        setShowPaymentModal(true);
    };

    const handleSelectPaymentMethod = async (method: PaymentMethod) => {
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
                // COD - Show success
                Alert.alert(
                    'Order Placed! 🎉',
                    `Your order #${order.order_number} has been placed. You will pay ${total.toFixed(2)} when receiving your order.`,
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
            } else if (method === 'momo') {
                // Momo - Show QR
                const qr = generatePaymentQR({
                    amount: total,
                    orderNumber: order.order_number,
                });
                
                setQrData(qr);
                setShowQRModal(true);
            } else if (method === 'card') {
                // Card - Show card form
                setShowCardModal(true);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create order');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmQRPayment = async () => {
        if (!currentOrder) return;

        try {
            setIsProcessing(true);
            await updatePaymentStatus(currentOrder.$id, 'paid', `MOMO${Date.now()}`);
            await clearCart();

            Alert.alert(
                'Payment Successful! 🎉',
                `Your order #${currentOrder.order_number} has been confirmed!`,
                [
                    {
                        text: 'View Order',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowQRModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to confirm payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmCardPayment = async (cardData: CardPaymentData) => {
        if (!currentOrder) return;

        try {
            setIsProcessing(true);

            // Simulate card processing
            const transactionId = `CARD${Date.now()}`;
            await updatePaymentStatus(currentOrder.$id, 'paid', transactionId);
            await clearCart();

            Alert.alert(
                'Payment Successful! 🎉',
                `Charged ${total.toFixed(2)} to card ending in ${cardData.cardNumber.slice(-4)}. Order #${currentOrder.order_number} confirmed!`,
                [
                    {
                        text: 'View Order',
                        onPress: () => router.push('/profile'),
                    },
                ]
            );

            setShowCardModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to process payment');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <SafeAreaView className="bg-white h-full flex-center">
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text className="paragraph-medium text-gray-200 mt-4">
                    Processing your order...
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
                ListHeaderComponent={() => <CustomHeader title="Your Cart" />}
                ListEmptyComponent={() => (
                    <View className="flex-center py-20">
                        <Text className="h3-bold text-dark-100 mb-2">Cart is Empty</Text>
                        <Text className="body-regular text-gray-200">
                            Add some delicious food to get started!
                        </Text>
                    </View>
                )}
                ListFooterComponent={() =>
                    totalItems > 0 && (
                        <View className="gap-5">
                            <View className="mt-6 border border-gray-200 p-5 rounded-2xl">
                                <Text className="h3-bold text-dark-100 mb-5">
                                    Payment Summary
                                </Text>

                                <PaymentInfoStripe
                                    label={`Total Items (${totalItems})`}
                                    value={`${subtotal.toFixed(2)}`}
                                />
                                <PaymentInfoStripe
                                    label="Delivery Fee"
                                    value={`${deliveryFee.toFixed(2)}`}
                                />
                                <PaymentInfoStripe
                                    label="Discount"
                                    value={`- ${discount.toFixed(2)}`}
                                    valueStyle="!text-success"
                                />
                                <View className="border-t border-gray-300 my-2" />
                                <PaymentInfoStripe
                                    label="Total"
                                    value={`${total.toFixed(2)}`}
                                    labelStyle="base-bold !text-dark-100"
                                    valueStyle="base-bold !text-dark-100 !text-right"
                                />
                            </View>

                            <CustomButton 
                                title="Order Now" 
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

            {/* QR Payment Modal */}
            {qrData && (
                <QRPaymentModal
                    visible={showQRModal}
                    onClose={() => setShowQRModal(false)}
                    onConfirmPayment={handleConfirmQRPayment}
                    qrData={qrData}
                    orderNumber={currentOrder?.order_number || ''}
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
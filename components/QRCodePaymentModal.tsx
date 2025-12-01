// components/QRCodePaymentModal.tsx - NEW COMPONENT

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';
import { createMomoPayment, pollPaymentStatus } from '@/lib/payment';

interface QRCodePaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    totalAmount: number;
    orderNumber: string;
    orderId: string;
}

const QRCodePaymentModal = ({ 
    visible, 
    onClose, 
    onPaymentSuccess,
    totalAmount,
    orderNumber,
    orderId,
}: QRCodePaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    const [isLoading, setIsLoading] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setQrCodeUrl(null);
            
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Generate QR Code
            initQRPayment();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const initQRPayment = async () => {
        try {
            setIsLoading(true);

            const result = await createMomoPayment(orderNumber, totalAmount);

            if (result.success && result.qrCodeUrl) {
                setQrCodeUrl(result.qrCodeUrl);
                // Start polling
                startPolling();
            } else {
                throw new Error(result.message || 'Unable to generate QR code');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to create payment');
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const startPolling = async () => {
        try {
            const success = await pollPaymentStatus(orderId, 60);

            if (success) {
                Alert.alert(
                    'Payment Successful! 🎉',
                    'Your order has been confirmed!'
                );
                onPaymentSuccess();
                handleClose();
            } else {
                Alert.alert(
                    'Timeout',
                    'Payment confirmation not received. Please check again.'
                );
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose}>
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </TouchableOpacity>

            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Dimensions.get('window').height * 0.85,
                    backgroundColor: 'white',
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 20,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text className="h3-bold text-dark-100">QR Code Payment</Text>
                        <Text className="body-regular text-gray-200 mt-1">
                            Order: {orderNumber}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleClose}>
                        <Image
                            source={images.arrowBack}
                            style={{ width: 24, height: 24, transform: [{ rotate: '90deg' }] }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View className="flex-1 flex-center">
                        <ActivityIndicator size="large" color="#FE8C00" />
                        <Text className="paragraph-medium text-gray-200 mt-4">
                            Generating QR code...
                        </Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 30 }}>
                        {/* Amount Display */}
                        <View
                            style={{
                                backgroundColor: '#FFF5E6',
                                borderRadius: 20,
                                padding: 20,
                                marginBottom: 30,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="body-medium text-gray-200 mb-2">Amount to Pay</Text>
                            <Text className="h1-bold text-primary" style={{ fontSize: 36 }}>
                                {totalAmount.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>

                        {/* QR Code */}
                        {qrCodeUrl ? (
                            <View
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 20,
                                    padding: 20,
                                    alignItems: 'center',
                                    borderWidth: 2,
                                    borderColor: '#E0E0E0',
                                    marginBottom: 20,
                                }}
                            >
                                <Image
                                    source={{ uri: qrCodeUrl }}
                                    style={{ width: 280, height: 280 }}
                                    resizeMode="contain"
                                />
                                <Text className="paragraph-semibold text-dark-100 mt-4 text-center">
                                    Scan this QR code with your banking app
                                </Text>
                            </View>
                        ) : null}

                        {/* Instructions */}
                        <View
                            style={{
                                backgroundColor: '#E8F5E9',
                                borderRadius: 15,
                                padding: 20,
                            }}
                        >
                            <Text className="paragraph-bold text-dark-100 mb-3">
                                ✅ How to pay:
                            </Text>
                            <Text className="body-regular text-gray-200">
                                1. Open your banking app{'\n'}
                                2. Scan the QR code above{'\n'}
                                3. Confirm the payment{'\n'}
                                4. Wait for confirmation (automatic){'\n'}
                                5. Do not close this screen
                            </Text>
                        </View>

                        {/* Loading Animation */}
                        <View className="flex-center mt-10">
                            <ActivityIndicator size="large" color="#2F9B65" />
                            <Text className="paragraph-medium text-gray-200 mt-4">
                                Waiting for payment confirmation...
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </Animated.View>
        </Modal>
    );
};

export default QRCodePaymentModal;
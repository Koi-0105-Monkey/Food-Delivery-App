// components/QRCodePaymentModal.tsx - STATIC QR VERSION

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
    Linking,
} from 'react-native';
import { images } from '@/constants';
import { createStaticQRPayment, pollPaymentStatus } from '@/lib/payment';

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
    const [deepLink, setDeepLink] = useState<string | null>(null);

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

            initQRPayment();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const initQRPayment = async () => {
        try {
            setIsLoading(true);

            const result = await createStaticQRPayment(orderNumber, totalAmount);

            if (result.success && result.qrCodeUrl) {
                setQrCodeUrl(result.qrCodeUrl);
                setDeepLink(result.deepLink || null);
                
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

    const handleOpenMomo = async () => {
        if (!deepLink) return;

        try {
            const canOpen = await Linking.canOpenURL(deepLink);
            
            if (canOpen) {
                await Linking.openURL(deepLink);
            } else {
                Alert.alert(
                    'Momo App Required',
                    'Please install Momo app to use this feature.'
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Cannot open Momo app');
        }
    };

    const startPolling = async () => {
        try {
            // Poll for 3 minutes (60 attempts x 3s)
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
                    'Payment confirmation not received. Please check your order in profile.'
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
            <View style={{ flex: 1 }}>
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </View>

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
                        <Text className="h3-bold text-dark-100">Scan QR to Pay</Text>
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
                            Loading QR code...
                        </Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 30 }}>
                        {/* Amount Display - FIX layout */}
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
                            <Text 
                                className="text-primary" 
                                style={{ 
                                    fontSize: 32,
                                    fontWeight: 'bold',
                                    lineHeight: 40,
                                }}
                            >
                                {totalAmount.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>

                        {/* Open Momo Button */}
                        <TouchableOpacity
                            onPress={handleOpenMomo}
                            style={{
                                backgroundColor: '#D82D8B',
                                borderRadius: 20,
                                paddingVertical: 16,
                                paddingHorizontal: 24,
                                marginBottom: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                            }}
                        >
                            <Text style={{ fontSize: 28 }}>📱</Text>
                            <Text className="base-bold text-white">
                                Open Momo App
                            </Text>
                        </TouchableOpacity>

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
                                    style={{ width: 300, height: 300 }}
                                    resizeMode="contain"
                                />
                                <Text className="paragraph-semibold text-dark-100 mt-4 text-center">
                                    Or scan with Momo app
                                </Text>
                            </View>
                        ) : null}

                        {/* Instructions */}
                        <View
                            style={{
                                backgroundColor: '#E8F5E9',
                                borderRadius: 15,
                                padding: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Text className="paragraph-bold text-dark-100 mb-3">
                                ✅ Payment completed automatically:
                            </Text>
                            <Text className="body-regular text-gray-200">
                                1. Click "Open Momo App" above{'\n'}
                                2. Amount & note are pre-filled{'\n'}
                                3. Confirm payment in Momo{'\n'}
                                4. Wait for confirmation (auto){'\n'}
                                {'\n'}
                                <Text className="base-bold">Or scan QR code below</Text>
                            </Text>
                        </View>

                        {/* Warning */}
                        <View
                            style={{
                                backgroundColor: '#FFF5E6',
                                borderRadius: 15,
                                padding: 15,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: 10,
                                marginBottom: 20,
                            }}
                        >
                            <Text style={{ fontSize: 24 }}>ℹ️</Text>
                            <View style={{ flex: 1 }}>
                                <Text className="body-medium text-dark-100">
                                    <Text className="base-bold">Note:</Text> Order number{' '}
                                    <Text className="base-bold text-primary">{orderNumber}</Text>
                                    {' '}will be auto-filled when using "Open Momo App" button
                                </Text>
                            </View>
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
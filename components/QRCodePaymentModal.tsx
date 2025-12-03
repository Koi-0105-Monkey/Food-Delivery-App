// components/QRCodePaymentModal.tsx - BIDV ONLY VERSION (ENGLISH)

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
import { createQRPayment, pollPaymentStatus } from '@/lib/payment';

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
    const [paymentData, setPaymentData] = useState<any>(null);

    useEffect(() => {
        if (visible) {
            setPaymentData(null);
            
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

            const result = await createQRPayment(orderNumber, totalAmount);

            if (result.success && result.bidv) {
                setPaymentData(result.bidv);
                
                // Start polling
                startPolling();
            } else {
                throw new Error(result.message || 'Failed to generate QR code');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to initiate payment');
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
                    'Payment successful! 🎉',
                    'Your order has been confirmed!'
                );
                onPaymentSuccess();
                handleClose();
            } else {
                Alert.alert(
                    'Timeout expired',
                    'Please check your order in the Profile section.'
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
                    height: Dimensions.get('window').height * 0.9,
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
                        <Text className="h3-bold text-dark-100">Scan QR Code for Payment</Text>
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
                ) : paymentData ? (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        {/* Amount Display */}
                        <View
                            style={{
                                backgroundColor: '#FFF5E6',
                                borderRadius: 20,
                                padding: 20,
                                marginBottom: 20,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="body-medium text-gray-200 mb-2">Payment Amount</Text>
                            <Text 
                                className="text-primary" 
                                style={{ 
                                    fontSize: 36,
                                    fontWeight: 'bold',
                                }}
                            >
                                {totalAmount.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>

                        {/* Payment Info - BIDV */}
                        <View
                            style={{
                                backgroundColor: '#F9FAFB',
                                borderRadius: 15,
                                padding: 15,
                                marginBottom: 20,
                            }}
                        >
                            <Text className="paragraph-bold text-dark-100 mb-3">
                                📋 Transfer Information:
                            </Text>
                            <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Bank:</Text>
                                    <Text className="body-medium text-dark-100">
                                        BIDV
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Receiver:</Text>
                                    <Text className="body-medium text-dark-100">
                                        {paymentData.displayInfo.receiver}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Account No.:</Text>
                                    <Text className="body-medium text-dark-100">
                                        {paymentData.displayInfo.accountNo}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Amount:</Text>
                                    <Text className="body-medium text-primary">
                                        {paymentData.displayInfo.amount.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Transfer Note:</Text>
                                    <Text className="body-medium text-dark-100">
                                        {paymentData.displayInfo.note}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* QR Code - BIDV */}
                        <View
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 20,
                                padding: 20,
                                alignItems: 'center',
                                borderWidth: 2,
                                borderColor: '#005BAA',
                                marginBottom: 20,
                            }}
                        >
                            <Text className="base-bold text-dark-100 mb-4">
                                🏦 Scan using BIDV Smart Banking
                            </Text>
                            <Image
                                source={{ uri: paymentData.qrCodeUrl }}
                                style={{ width: 320, height: 320 }}
                                resizeMode="contain"
                            />
                            <Text className="body-regular text-gray-200 mt-4 text-center">
                                Amount and transfer note are pre-filled
                            </Text>
                        </View>

                        {/* Instructions - BIDV */}
                        <View
                            style={{
                                backgroundColor: '#E8F5E9',
                                borderRadius: 15,
                                padding: 20,
                                marginBottom: 20,
                            }}
                        >
                            <Text className="paragraph-bold text-dark-100 mb-3">
                                ✅ Payment Instructions:
                            </Text>
                            <Text className="body-regular text-gray-200">
                                1️⃣ Open BIDV Smart Banking{'\n'}
                                2️⃣ Select "Scan QR"{'\n'}
                                3️⃣ Scan the QR above{'\n'}
                                4️⃣ Verify the details → Confirm{'\n'}
                                5️⃣ Wait for automatic confirmation
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
                            <Text style={{ fontSize: 24 }}>⚠️</Text>
                            <View style={{ flex: 1 }}>
                                <Text className="body-medium text-dark-100">
                                    <Text className="base-bold">Important:</Text> Please{' '}
                                    <Text className="base-bold text-error">DO NOT MODIFY</Text>
                                    {' '}the amount or transfer note to ensure automatic verification!
                                </Text>
                            </View>
                        </View>

                        {/* Loading Animation */}
                        <View className="flex-center mt-10 mb-20">
                            <ActivityIndicator size="large" color="#005BAA" />
                            <Text className="paragraph-medium text-gray-200 mt-4 text-center">
                                Waiting for payment confirmation...{'\n'}
                                <Text className="body-regular">
                                    (Will automatically update once your transfer is detected)
                                </Text>
                            </Text>
                        </View>
                    </ScrollView>
                ) : null}
            </Animated.View>
        </Modal>
    );
};

export default QRCodePaymentModal;

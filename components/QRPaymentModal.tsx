// components/QRPaymentModal.tsx

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
    ActivityIndicator,
    Alert,
} from 'react-native';
import { images } from '@/constants';
import { QRCodeData } from '@/type';

interface QRPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirmPayment: () => void;
    qrData: QRCodeData;
    orderNumber: string;
}

const QRPaymentModal = ({ 
    visible, 
    onClose, 
    onConfirmPayment,
    qrData,
    orderNumber 
}: QRPaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [isConfirming, setIsConfirming] = useState(false);
    const [countdown, setCountdown] = useState(600); // 10 minutes

    useEffect(() => {
        if (visible) {
            setCountdown(600);
            
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
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    // Countdown timer
    useEffect(() => {
        if (!visible || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    Alert.alert('Timeout', 'Payment time expired. Please try again.');
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [visible, countdown]);

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

    const handleConfirmPayment = () => {
        Alert.alert(
            'Confirm Payment',
            'Have you completed the payment via QR code?',
            [
                { text: 'Not Yet', style: 'cancel' },
                {
                    text: 'Yes, Paid',
                    onPress: async () => {
                        setIsConfirming(true);
                        
                        // Simulate payment verification
                        setTimeout(() => {
                            onConfirmPayment();
                            setIsConfirming(false);
                            handleClose();
                        }, 1500);
                    },
                },
            ]
        );
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                <ScrollView contentContainerStyle={{ padding: 30 }}>
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
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

                    {/* Countdown Timer */}
                    <View
                        style={{
                            backgroundColor: '#FFE5E5',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                            alignItems: 'center',
                        }}
                    >
                        <Text className="body-medium text-error">
                            ⏱️ Time remaining: {formatTime(countdown)}
                        </Text>
                    </View>

                    {/* QR Code */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 20,
                            padding: 20,
                            alignItems: 'center',
                            marginBottom: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                            elevation: 5,
                        }}
                    >
                        <Text className="paragraph-bold text-dark-100 mb-3">
                            {qrData.bank === 'momo' ? '📱 Momo QR Code' : '🏦 Agribank QR Code'}
                        </Text>
                        
                        {/* QR Image */}
                        <Image
                            source={{ uri: qrData.qrUrl }}
                            style={{ width: 280, height: 280, marginBottom: 15 }}
                            resizeMode="contain"
                        />

                        {/* Amount */}
                        <View
                            style={{
                                backgroundColor: '#FFF5E6',
                                borderRadius: 15,
                                paddingVertical: 12,
                                paddingHorizontal: 24,
                                marginTop: 10,
                            }}
                        >
                            <Text className="paragraph-bold text-primary">
                                Amount: ${qrData.amount.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Payment Info */}
                    <View
                        style={{
                            backgroundColor: '#F3F4F6',
                            borderRadius: 15,
                            padding: 20,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="paragraph-bold text-dark-100 mb-3">
                            Payment Information
                        </Text>
                        
                        <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-regular text-gray-200">Bank:</Text>
                                <Text className="body-medium text-dark-100">
                                    {qrData.bank === 'momo' ? 'Momo E-Wallet' : 'Agribank'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-regular text-gray-200">Account:</Text>
                                <Text className="body-medium text-dark-100">
                                    {qrData.accountNumber}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-regular text-gray-200">Name:</Text>
                                <Text className="body-medium text-dark-100">
                                    {qrData.accountName}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-regular text-gray-200">Message:</Text>
                                <Text className="body-medium text-dark-100">
                                    {qrData.description}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Instructions */}
                    <View
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 15,
                            padding: 20,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="paragraph-bold text-dark-100 mb-3">
                            How to Pay:
                        </Text>
                        <View style={{ gap: 10 }}>
                            <Text className="body-regular text-gray-200">
                                1️⃣ Open your {qrData.bank === 'momo' ? 'Momo' : 'Agribank'} app
                            </Text>
                            <Text className="body-regular text-gray-200">
                                2️⃣ Scan the QR code above
                            </Text>
                            <Text className="body-regular text-gray-200">
                                3️⃣ Check the payment amount
                            </Text>
                            <Text className="body-regular text-gray-200">
                                4️⃣ Complete the payment
                            </Text>
                            <Text className="body-regular text-gray-200">
                                5️⃣ Click "I've Paid" below
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity
                            onPress={handleConfirmPayment}
                            disabled={isConfirming}
                            style={{
                                backgroundColor: '#2F9B65',
                                borderRadius: 25,
                                paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            {isConfirming ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="base-bold text-white">
                                    ✅ I've Paid
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor: '#E0E0E0',
                                borderRadius: 25,
                                paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="base-bold text-gray-200">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default QRPaymentModal;
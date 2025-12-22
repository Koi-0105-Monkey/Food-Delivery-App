// components/CardPaymentModal.tsx - BLOCKCHAIN VERSION (NO ERRORS)

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';

// ✅ Import blockchain services
import { blockchainService } from '@/lib/blockchain';
import { CardInfo } from '@/lib/cardToWallet';

export interface CardPaymentData {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;
    cvv: string;
}

interface CardPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirmPayment: (cardData: CardPaymentData) => Promise<void>;
    totalAmount: number;
    orderNumber: string;
    orderId?: string;
    onCancelToPending?: () => void;
    onRefresh?: () => void;
}

const CardPaymentModal = ({ 
    visible, 
    onClose, 
    onConfirmPayment,
    totalAmount,
    orderNumber,
    orderId,
    onCancelToPending,
    onRefresh
}: CardPaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const [form, setForm] = useState<CardPaymentData>({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset form
            setForm({
                cardNumber: '',
                cardHolder: '',
                expiryDate: '',
                cvv: '',
            });

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

    const handleClose = () => {
        Alert.alert(
            'Cancel Payment?',
            'Your order will be saved as pending. Please clear your cart to continue shopping.',
            [
                {
                    text: 'Continue',
                    style: 'cancel',
                },
                {
                    text: 'Cancel',
                    style: 'destructive',
                    onPress: () => {
                        console.log('⚠️ ========== PAYMENT CANCELLED ==========');
                        console.log('📦 Order:', orderNumber);
                        console.log('💰 Amount:', totalAmount.toLocaleString('vi-VN') + 'đ');
                        console.log('🔄 Status: Moved to Pending Orders');
                        console.log('==========================================');

                        if (onCancelToPending) {
                            onCancelToPending();
                        }

                        if (onRefresh) {
                            onRefresh();
                        }

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
                    },
                },
            ]
        );
    };

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s/g, '');
        const groups = cleaned.match(/.{1,4}/g) || [];
        return groups.join(' ').substring(0, 19);
    };

    const formatExpiryDate = (text: string) => {
        const cleaned = text.replace(/\//g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
        }
        return cleaned;
    };

    // ✅ MAIN PAYMENT HANDLER - BLOCKCHAIN VERSION
    const handleConfirm = async () => {
        // ========== VALIDATION ==========
        const cardNumber = form.cardNumber.replace(/\s/g, '');
        
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            return Alert.alert('Error', 'Invalid card number');
        }

        if (!form.cardHolder.trim()) {
            return Alert.alert('Error', 'Please enter card holder name');
        }

        if (!form.expiryDate.match(/^\d{2}\/\d{2}$/)) {
            return Alert.alert('Error', 'Invalid expiry date (MM/YY)');
        }

        if (form.cvv.length < 3) {
            return Alert.alert('Error', 'Invalid CVV');
        }

        setIsProcessing(true);

        try {
            console.log('💳 ========== BLOCKCHAIN PAYMENT START ==========');
            console.log('📦 Order:', orderNumber);
            console.log('💰 Amount:', totalAmount.toLocaleString('vi-VN'), 'VND');
            console.log('🎴 Card:', '**** **** ****', cardNumber.slice(-4));
            
            // ========== PREPARE CARD INFO ==========
            const cardInfo: CardInfo = {
                cardNumber: form.cardNumber,
                cardHolder: form.cardHolder,
                expiryDate: form.expiryDate, // ✅ FIXED: No space in variable name
                cvv: form.cvv
            };

            // ========== PROCESS VIA BLOCKCHAIN ==========
            console.log('🔗 Calling blockchain service...');
            
            const result = await blockchainService.processPayment(
                orderNumber,
                totalAmount,
                cardInfo
            );

            if (!result.success) {
                throw new Error(result.error || 'Payment failed');
            }

            console.log('✅ Blockchain payment successful!');
            console.log('📝 TX Hash:', result.transactionHash);
            console.log('🧱 Block:', result.blockNumber);
            console.log('⛽ Gas Used:', result.gasUsed);

            // ========== UPDATE APPWRITE ==========
            // Note: updatePaymentStatus được import từ lib/payment.ts
            // Bạn cần import nó ở đầu file:
            // import { updatePaymentStatus } from '@/lib/payment';
            
            if (orderId) {
                console.log('💾 Updating Appwrite...');
                
                // ✅ FIX: Import function này từ lib/payment.ts
                const { updatePaymentStatus } = require('@/lib/payment');
                
                await updatePaymentStatus(
                    orderId,
                    'paid',
                    result.transactionHash // Lưu blockchain TX hash
                );
                
                console.log('✅ Appwrite updated with TX hash');
            }

            console.log('========== PAYMENT COMPLETE ==========\n');

            // ========== SUCCESS ==========
            Alert.alert(
                'Payment Successful! 🎉',
                `Blockchain Transaction:\n${result.transactionHash?.substring(0, 20)}...\n\nYour order has been confirmed and recorded on blockchain.`,
                [
                    {
                        text: 'View Order',
                        onPress: async () => {
                            await onConfirmPayment(form);
                        }
                    }
                ]
            );

        } catch (error: any) {
            console.error('❌ ========== PAYMENT FAILED ==========');
            console.error('Error:', error.message);
            console.error('=========================================\n');
            
            Alert.alert(
                'Payment Failed',
                error.message || 'Unable to process payment. Please check:\n\n• Ganache is running\n• Contract is deployed\n• Wallet has sufficient balance'
            );
        } finally {
            setIsProcessing(false);
        }
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
                <ScrollView 
                    contentContainerStyle={{ padding: 30 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <View>
                            <Text className="h3-bold text-dark-100">
                                💳 Blockchain Payment
                            </Text>
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

                    {/* Amount */}
                    <View
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 30,
                            alignItems: 'center',
                        }}
                    >
                        <Text className="body-medium text-gray-200 mb-2">Payment Amount</Text>
                        <Text className="h1-bold text-primary" style={{ fontSize: 36 }}>
                            {totalAmount.toLocaleString('vi-VN')}đ
                        </Text>
                        <Text className="small-bold text-gray-200 mt-2">
                            ≈ {(totalAmount / 25000).toFixed(4)} ETH
                        </Text>
                    </View>

                    {/* Blockchain Info Banner */}
                    <View
                        style={{
                            backgroundColor: '#E3F2FD',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Text style={{ fontSize: 24 }}>🔗</Text>
                        <View style={{ flex: 1 }}>
                            <Text className="body-medium text-dark-100">
                                <Text className="base-bold">Blockchain Payment</Text>
                                {'\n'}Your payment will be recorded on Ethereum blockchain
                            </Text>
                        </View>
                    </View>

                    {/* Card Form */}
                    <View style={{ gap: 20 }}>
                        {/* Card Number */}
                        <View>
                            <Text className="label">Card Number *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="1234 5678 9012 3456"
                                value={form.cardNumber}
                                onChangeText={(text) => 
                                    setForm(prev => ({ ...prev, cardNumber: formatCardNumber(text) }))
                                }
                                keyboardType="numeric"
                                maxLength={19}
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Card Holder */}
                        <View>
                            <Text className="label">Card Holder Name *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="JOHN DOE"
                                value={form.cardHolder}
                                onChangeText={(text) => 
                                    setForm(prev => ({ ...prev, cardHolder: text.toUpperCase() }))
                                }
                                autoCapitalize="characters"
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Expiry & CVV */}
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text className="label">Expiry Date *</Text>
                                <TextInput
                                    className="input border-gray-300"
                                    placeholder="MM/YY"
                                    value={form.expiryDate}
                                    onChangeText={(text) => 
                                        setForm(prev => ({ ...prev, expiryDate: formatExpiryDate(text) }))
                                    }
                                    keyboardType="numeric"
                                    maxLength={5}
                                    placeholderTextColor="#888"
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text className="label">CVV *</Text>
                                <TextInput
                                    className="input border-gray-300"
                                    placeholder="123"
                                    value={form.cvv}
                                    onChangeText={(text) => 
                                        setForm(prev => ({ ...prev, cvv: text }))
                                    }
                                    keyboardType="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                    placeholderTextColor="#888"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Test Cards Helper */}
                    <View
                        style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 15,
                            padding: 15,
                            marginTop: 20,
                        }}
                    >
                        <Text className="body-medium text-dark-100 mb-2">
                            🧪 <Text className="base-bold">Test Cards Available:</Text>
                        </Text>
                        <Text className="body-regular text-gray-200" style={{ lineHeight: 20 }}>
                            • 4532 1111 1111 1234{'\n'}
                            • 5425 2222 2222 5678{'\n'}
                            Holder: ANY NAME, Expiry: ANY, CVV: ANY
                        </Text>
                    </View>

                    {/* Security Notice */}
                    <View
                        style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 15,
                            padding: 15,
                            marginTop: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Image
                            source={images.check}
                            style={{ width: 20, height: 20 }}
                            resizeMode="contain"
                            tintColor="#2F9B65"
                        />
                        <Text className="body-regular text-gray-200" style={{ flex: 1 }}>
                            Your payment is secured by blockchain technology
                        </Text>
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={isProcessing}
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 30,
                        }}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="base-bold text-white">
                                🔗 Pay via Blockchain
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        onPress={handleClose}
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: '#E0E0E0',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 12,
                        }}
                    >
                        <Text className="base-bold text-gray-200">Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default CardPaymentModal;
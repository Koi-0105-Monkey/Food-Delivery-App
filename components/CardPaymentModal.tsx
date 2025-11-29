// components/CardPaymentModal.tsx

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
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';
import { CardPaymentData } from '@/type';

interface CardPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirmPayment: (cardData: CardPaymentData) => void;
    totalAmount: number;
    orderNumber: string;
}

const CardPaymentModal = ({ 
    visible, 
    onClose, 
    onConfirmPayment,
    totalAmount,
    orderNumber 
}: CardPaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [cardData, setCardData] = useState<CardPaymentData>({
        cardNumber: '',
        cardHolder: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
    });

    useEffect(() => {
        if (visible) {
            // Reset form
            setCardData({
                cardNumber: '',
                cardHolder: '',
                expiryMonth: '',
                expiryYear: '',
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

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted.substring(0, 19); // Max 16 digits + 3 spaces
    };

    const handleCardNumberChange = (text: string) => {
        const cleaned = text.replace(/\s/g, '');
        if (/^\d*$/.test(cleaned) && cleaned.length <= 16) {
            setCardData(prev => ({ ...prev, cardNumber: cleaned }));
        }
    };

    const handleExpiryMonthChange = (text: string) => {
        if (/^\d*$/.test(text) && text.length <= 2) {
            const num = parseInt(text);
            if (text === '' || (num >= 1 && num <= 12)) {
                setCardData(prev => ({ ...prev, expiryMonth: text }));
            }
        }
    };

    const handleExpiryYearChange = (text: string) => {
        if (/^\d*$/.test(text) && text.length <= 2) {
            setCardData(prev => ({ ...prev, expiryYear: text }));
        }
    };

    const handleCVVChange = (text: string) => {
        if (/^\d*$/.test(text) && text.length <= 3) {
            setCardData(prev => ({ ...prev, cvv: text }));
        }
    };

    const validateCard = (): boolean => {
        if (cardData.cardNumber.length !== 16) {
            Alert.alert('Invalid Card', 'Card number must be 16 digits');
            return false;
        }

        if (!cardData.cardHolder.trim()) {
            Alert.alert('Invalid Card', 'Please enter card holder name');
            return false;
        }

        const month = parseInt(cardData.expiryMonth);
        if (cardData.expiryMonth.length !== 2 || month < 1 || month > 12) {
            Alert.alert('Invalid Expiry', 'Please enter valid expiry month (01-12)');
            return false;
        }

        if (cardData.expiryYear.length !== 2) {
            Alert.alert('Invalid Expiry', 'Please enter valid expiry year (YY)');
            return false;
        }

        if (cardData.cvv.length !== 3) {
            Alert.alert('Invalid CVV', 'CVV must be 3 digits');
            return false;
        }

        return true;
    };

    const handlePayNow = () => {
        if (!validateCard()) return;

        Alert.alert(
            'Confirm Payment',
            `Charge $${totalAmount.toFixed(2)} to card ending in ${cardData.cardNumber.slice(-4)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Pay Now',
                    onPress: async () => {
                        setIsProcessing(true);

                        // Simulate payment processing
                        setTimeout(() => {
                            onConfirmPayment(cardData);
                            setIsProcessing(false);
                            handleClose();
                        }, 2000);
                    },
                },
            ]
        );
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
                        <View style={{ flex: 1 }}>
                            <Text className="h3-bold text-dark-100">Card Payment</Text>
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
                        <Text className="body-medium text-gray-200 mb-2">Total Amount</Text>
                        <Text className="h1-bold text-primary">${totalAmount.toFixed(2)}</Text>
                    </View>

                    {/* Card Number */}
                    <View style={{ marginBottom: 20 }}>
                        <Text className="label">Card Number</Text>
                        <TextInput
                            className="input border-gray-300"
                            placeholder="1234 5678 9012 3456"
                            value={formatCardNumber(cardData.cardNumber)}
                            onChangeText={handleCardNumberChange}
                            keyboardType="number-pad"
                            maxLength={19}
                            placeholderTextColor="#888"
                        />
                    </View>

                    {/* Card Holder */}
                    <View style={{ marginBottom: 20 }}>
                        <Text className="label">Card Holder Name</Text>
                        <TextInput
                            className="input border-gray-300"
                            placeholder="JOHN DOE"
                            value={cardData.cardHolder}
                            onChangeText={(text) =>
                                setCardData((prev) => ({ ...prev, cardHolder: text.toUpperCase() }))
                            }
                            autoCapitalize="characters"
                            placeholderTextColor="#888"
                        />
                    </View>

                    {/* Expiry & CVV */}
                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                        {/* Expiry Month */}
                        <View style={{ flex: 1 }}>
                            <Text className="label">Month</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="MM"
                                value={cardData.expiryMonth}
                                onChangeText={handleExpiryMonthChange}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Expiry Year */}
                        <View style={{ flex: 1 }}>
                            <Text className="label">Year</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="YY"
                                value={cardData.expiryYear}
                                onChangeText={handleExpiryYearChange}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* CVV */}
                        <View style={{ flex: 1 }}>
                            <Text className="label">CVV</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="123"
                                value={cardData.cvv}
                                onChangeText={handleCVVChange}
                                keyboardType="number-pad"
                                maxLength={3}
                                secureTextEntry
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Security Notice */}
                    <View
                        style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="body-medium text-success">
                            🔒 Your card information is encrypted and secure
                        </Text>
                    </View>

                    {/* Card Preview */}
                    <View
                        style={{
                            backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 30,
                            minHeight: 180,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 10,
                        }}
                        className="bg-primary"
                    >
                        <Text className="body-medium text-white mb-2">💳 BANK CARD</Text>
                        
                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                            <Text className="h3-bold text-white mt-8" style={{ letterSpacing: 2 }}>
                                {cardData.cardNumber
                                    ? formatCardNumber(cardData.cardNumber)
                                    : '•••• •••• •••• ••••'}
                            </Text>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginTop: 20,
                                }}
                            >
                                <View>
                                    <Text className="small-bold text-white opacity-70">CARD HOLDER</Text>
                                    <Text className="paragraph-bold text-white">
                                        {cardData.cardHolder || 'YOUR NAME'}
                                    </Text>
                                </View>
                                <View>
                                    <Text className="small-bold text-white opacity-70">EXPIRES</Text>
                                    <Text className="paragraph-bold text-white">
                                        {cardData.expiryMonth && cardData.expiryYear
                                            ? `${cardData.expiryMonth}/${cardData.expiryYear}`
                                            : 'MM/YY'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity
                            onPress={handlePayNow}
                            disabled={isProcessing}
                            style={{
                                backgroundColor: '#2F9B65',
                                borderRadius: 25,
                                paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="base-bold text-white">
                                    💳 Pay ${totalAmount.toFixed(2)}
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
                            <Text className="base-bold text-gray-200">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default CardPaymentModal;
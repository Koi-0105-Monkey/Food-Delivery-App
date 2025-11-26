import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
} from 'react-native';
import { images } from '@/constants';

interface SuccessModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'signup' | 'signin';
}

const SuccessModal = ({ 
    visible, 
    onClose, 
    title, 
    message,
    type = 'signup' 
}: SuccessModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Animate in
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
            // Reset animation
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

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <TouchableOpacity 
                style={{ flex: 1 }} 
                activeOpacity={1} 
                onPress={handleClose}
            >
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
                    height: Dimensions.get('window').height * 0.6,
                    backgroundColor: 'white',
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    padding: 30,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 20,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                {/* Success Icon/Image */}
                <View className="flex-center mb-6">
                    <View 
                        style={{
                            width: 120,
                            height: 120,
                            borderRadius: 60,
                            backgroundColor: '#FFF5E6',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <Image
                            source={type === 'signup' ? images.burgerOne : images.pizzaOne}
                            style={{ width: 100, height: 100 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Checkmark */}
                    <View
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: '#2F9B65',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: -40,
                            marginLeft: 80,
                        }}
                    >
                        <Image
                            source={images.check}
                            style={{ width: 30, height: 30 }}
                            resizeMode="contain"
                            tintColor="#ffffff"
                        />
                    </View>
                </View>

                {/* Title */}
                <Text 
                    className="h1-bold text-dark-100 text-center mb-3"
                    style={{ fontSize: 28 }}
                >
                    {title}
                </Text>

                {/* Message */}
                <Text 
                    className="paragraph-medium text-gray-200 text-center mb-8"
                    style={{ lineHeight: 24 }}
                >
                    {message}
                </Text>

                {/* Decorative food icons */}
                <View 
                    style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-around',
                        marginBottom: 30,
                        opacity: 0.6,
                    }}
                >
                    <Image
                        source={images.fries}
                        style={{ width: 40, height: 40 }}
                        resizeMode="contain"
                    />
                    <Image
                        source={images.buritto}
                        style={{ width: 40, height: 40 }}
                        resizeMode="contain"
                    />
                    <Image
                        source={images.salad}
                        style={{ width: 40, height: 40 }}
                        resizeMode="contain"
                    />
                </View>

                {/* Close Button */}
                <TouchableOpacity
                    onPress={handleClose}
                    style={{
                        backgroundColor: '#FE8C00',
                        borderRadius: 25,
                        paddingVertical: 16,
                        alignItems: 'center',
                    }}
                >
                    <Text className="base-bold text-white">
                        Let's Get Started!
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </Modal>
    );
};

export default SuccessModal;
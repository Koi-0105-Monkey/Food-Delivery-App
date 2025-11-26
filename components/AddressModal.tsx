import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';
import { useAddressStore } from '@/store/address.store';

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
}

const AddressModal = ({ visible, onClose }: AddressModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const { setAddress, address } = useAddressStore();

    const [form, setForm] = useState({
        street: address?.street || '',
        city: address?.city || '',
        country: address?.country || '',
    });
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset form với địa chỉ hiện tại
            setForm({
                street: address?.street || '',
                city: address?.city || '',
                country: address?.country || '',
            });

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

    const handleSave = async () => {
        // Validation
        if (!form.city.trim() || !form.country.trim()) {
            return Alert.alert('Error', 'Please enter at least city and country.');
        }

        setIsValidating(true);

        try {
            // Tạo full address để search trên Google Maps
            const fullAddress = [
                form.street,
                form.city,
                form.country,
            ]
                .filter(Boolean)
                .join(', ');

            // Optional: Gọi Google Geocoding API để lấy tọa độ
            // (Cần Google API Key - tạm thời bỏ qua)
            const coordinates = undefined;

            // Lưu địa chỉ
            setAddress({
                street: form.street.trim(),
                city: form.city.trim(),
                country: form.country.trim(),
                fullAddress,
                coordinates,
            });

            Alert.alert('Success', 'Delivery address updated!');
            handleClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save address. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    if (!visible) return null;

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
                    height: Dimensions.get('window').height * 0.7,
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
                        <Text className="h3-bold text-dark-100">
                            Delivery Address
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Image
                                source={images.arrowBack}
                                style={{ width: 24, height: 24, transform: [{ rotate: '90deg' }] }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text className="paragraph-medium text-gray-200 mb-6">
                        Enter your delivery address to get food delivered right to your door! 🏠
                    </Text>

                    {/* Icon */}
                    <View className="flex-center mb-6">
                        <View
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                backgroundColor: '#FFF5E6',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Image
                                source={images.location}
                                style={{ width: 40, height: 40 }}
                                resizeMode="contain"
                                tintColor="#FE8C00"
                            />
                        </View>
                    </View>

                    {/* Form */}
                    <View style={{ gap: 20 }}>
                        {/* Street */}
                        <View>
                            <Text className="label">Street Address (Optional)</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="e.g., 123 Main Street"
                                value={form.street}
                                onChangeText={(text) =>
                                    setForm((prev) => ({ ...prev, street: text }))
                                }
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* City */}
                        <View>
                            <Text className="label">City *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="e.g., Zagreb"
                                value={form.city}
                                onChangeText={(text) =>
                                    setForm((prev) => ({ ...prev, city: text }))
                                }
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Country */}
                        <View>
                            <Text className="label">Country *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="e.g., Croatia"
                                value={form.country}
                                onChangeText={(text) =>
                                    setForm((prev) => ({ ...prev, country: text }))
                                }
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isValidating}
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 30,
                        }}
                    >
                        {isValidating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="base-bold text-white">
                                Save Address
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default AddressModal;
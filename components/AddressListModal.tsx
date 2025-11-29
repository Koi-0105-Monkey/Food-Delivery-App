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
} from 'react-native';
import { images } from '@/constants';
import { useAddressStore, Address } from '@/store/address.store';

interface AddressListModalProps {
    visible: boolean;
    onClose: () => void;
    onAddNew: () => void;
    onEdit: (address: Address) => void;
}

const AddressListModal = ({ visible, onClose, onAddNew, onEdit }: AddressListModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const { addresses, defaultAddress, setAsDefault, deleteAddress, isLoading } = useAddressStore();

    useEffect(() => {
        if (visible) {
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

    const handleSetDefault = async (addressId: string) => {
        try {
            await setAsDefault(addressId);
            Alert.alert('Success', 'Default address updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update default address');
        }
    };

    const handleDelete = (address: Address) => {
        if (address.isDefault && addresses.length > 1) {
            Alert.alert('Error', 'Cannot delete default address. Please set another address as default first.');
            return;
        }

        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAddress(address.$id!);
                            Alert.alert('Success', 'Address deleted!');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete address');
                        }
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
                    height: Dimensions.get('window').height * 0.75,
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
                <ScrollView contentContainerStyle={{ padding: 30, paddingBottom: 100 }}>
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
                            <Text className="h3-bold text-dark-100">My Addresses</Text>
                            <Text className="body-regular text-gray-200 mt-1">
                                {addresses.length} saved address(es)
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

                    {/* Add New Button */}
                    <TouchableOpacity
                        onPress={onAddNew}
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            borderWidth: 2,
                            borderStyle: 'dashed',
                            borderColor: '#FE8C00',
                        }}
                    >
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#FE8C00',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Image
                                source={images.plus}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                                tintColor="white"
                            />
                        </View>
                        <Text className="paragraph-bold text-primary">Add New Address</Text>
                    </TouchableOpacity>

                    {/* Address List */}
                    {addresses.length === 0 ? (
                        <View className="flex-center py-10">
                            <Text className="paragraph-medium text-gray-200">
                                No addresses yet. Add one to get started!
                            </Text>
                        </View>
                    ) : (
                        addresses.map((address) => (
                            <View
                                key={address.$id}
                                style={{
                                    backgroundColor: address.isDefault ? '#FFF5E6' : 'white',
                                    borderWidth: 2,
                                    borderColor: address.isDefault ? '#FE8C00' : '#E0E0E0',
                                    borderRadius: 20,
                                    padding: 16,
                                    marginBottom: 15,
                                }}
                            >
                                {/* Default Badge */}
                                {address.isDefault && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            backgroundColor: '#FE8C00',
                                            borderRadius: 12,
                                            paddingHorizontal: 12,
                                            paddingVertical: 4,
                                        }}
                                    >
                                        <Text className="small-bold text-white">DEFAULT</Text>
                                    </View>
                                )}

                                {/* Address Info */}
                                <View style={{ marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Image
                                            source={images.location}
                                            style={{ width: 20, height: 20 }}
                                            resizeMode="contain"
                                            tintColor="#FE8C00"
                                        />
                                        <Text className="paragraph-bold text-dark-100">
                                            {address.city}, {address.country}
                                        </Text>
                                    </View>
                                    {address.street && (
                                        <Text className="body-regular text-gray-200 mt-2 ml-7">
                                            {address.street}
                                        </Text>
                                    )}
                                </View>

                                {/* Actions */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        gap: 10,
                                        paddingTop: 12,
                                        borderTopWidth: 1,
                                        borderTopColor: '#E0E0E0',
                                    }}
                                >
                                    {/* Set Default */}
                                    {!address.isDefault && (
                                        <TouchableOpacity
                                            onPress={() => handleSetDefault(address.$id!)}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                backgroundColor: '#2F9B65',
                                                borderRadius: 12,
                                                paddingVertical: 10,
                                            }}
                                        >
                                            <Image
                                                source={images.check}
                                                style={{ width: 16, height: 16 }}
                                                resizeMode="contain"
                                                tintColor="white"
                                            />
                                            <Text className="body-medium text-white">Set Default</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Edit */}
                                    <TouchableOpacity
                                        onPress={() => onEdit(address)}
                                        style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            backgroundColor: '#FE8C00',
                                            borderRadius: 12,
                                            paddingVertical: 10,
                                        }}
                                    >
                                        <Image
                                            source={images.pencil}
                                            style={{ width: 16, height: 16 }}
                                            resizeMode="contain"
                                            tintColor="white"
                                        />
                                        <Text className="body-medium text-white">Edit</Text>
                                    </TouchableOpacity>

                                    {/* Delete */}
                                    <TouchableOpacity
                                        onPress={() => handleDelete(address)}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            backgroundColor: '#FFE5E5',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Image
                                            source={images.trash}
                                            style={{ width: 20, height: 20 }}
                                            resizeMode="contain"
                                            tintColor="#F14141"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default AddressListModal;
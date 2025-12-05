import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, Image, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Fragment, useEffect, useState } from 'react';
import cn from 'clsx';
import { useLocalSearchParams, router } from 'expo-router';

import CartButton from '@/components/CartButton';
import SuccessModal from '@/components/SuccessModal';
import AddressListModal from '@/components/AddressListModal';
import AddEditAddressModal from '@/components/AddEditAddressModal';
import { images, offers } from '@/constants';
import useAuthStore from '@/store/auth.store';
import { useAddressStore, Address } from '@/store/address.store';

export default function Index() {
    const { user } = useAuthStore();
    const { getDisplayAddress, fetchAddresses } = useAddressStore();
    const params = useLocalSearchParams<{ showWelcome?: string }>();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showAddressListModal, setShowAddressListModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [modalType, setModalType] = useState<'signup' | 'signin'>('signin');

    useEffect(() => {
        // Hiện modal cho cả signin và signup
        if (params.showWelcome === 'signin' || params.showWelcome === 'signup') {
            setModalType(params.showWelcome);
            setTimeout(() => {
                setShowSuccessModal(true);
            }, 300);
            router.setParams({ showWelcome: undefined });
        }
    }, [params.showWelcome]);

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const handleAddNewAddress = () => {
        setShowAddressListModal(false);
        setEditingAddress(null);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleEditAddress = (address: Address) => {
        setShowAddressListModal(false);
        setEditingAddress(address);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleCloseAddEditModal = () => {
        setShowAddEditModal(false);
        setEditingAddress(null);
        // Refresh addresses và quay lại list
        setTimeout(() => {
            fetchAddresses();
            setShowAddressListModal(true);
        }, 300);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <FlatList
                data={offers}
                renderItem={({ item, index }) => {
                    const isEven = index % 2 === 0;

                    return (
                        <View>
                            <Pressable
                                className={cn('offer-card', isEven ? 'flex-row-reverse' : 'flex-row')}
                                style={{ backgroundColor: item.color }}
                                android_ripple={{ color: '#fffff22' }}
                                onPress={() => router.push(`/combo/${item.id}`)}
                            >
                                {({ pressed }) => (
                                    <Fragment>
                                        <View className={'h-full w-1/2'}>
                                            <Image
                                                source={item.image}
                                                className={'size-full'}
                                                resizeMode={'contain'}
                                            />
                                        </View>

                                        <View className={cn('offer-card__info', isEven ? 'pl-10' : 'pr-10')}>
                                            <Text className="h1-bold text-white leading-tight">
                                                {item.title}
                                            </Text>
                                            <Image
                                                source={images.arrowRight}
                                                className="size-10"
                                                resizeMode="contain"
                                                tintColor="#ffffff"
                                            />
                                        </View>
                                    </Fragment>
                                )}
                            </Pressable>
                        </View>
                    );
                }}
                contentContainerClassName="pb-28 px-5"
                ListHeaderComponent={() => (
                    <View className="flex-between flex-row w-full my-5">
                        <View className="flex-start">
                            <Text className="small-bold text-primary">DELIVER TO</Text>
                            <TouchableOpacity
                                className="flex-center flex-row gap-x-1 mt-0.5"
                                onPress={() => setShowAddressListModal(true)}
                            >
                                <Text className="paragraph-bold text-dark-100">
                                    {getDisplayAddress()}
                                </Text>
                                <Image
                                    source={images.arrowDown}
                                    className="size-3"
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </View>

                        <CartButton />
                    </View>
                )}
            />

            {/* Success Modal - Cho cả Sign In và Sign Up */}
            <SuccessModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title={modalType === 'signup' ? 'Welcome Aboard! 🎉' : 'Welcome Back! 🍕'}
                message={
                    modalType === 'signup'
                        ? 'Your account has been created successfully. Get ready to explore delicious food options!'
                        : "You're now signed in. Let's order some delicious food!"
                }
                type={modalType}
            />

            {/* Address List Modal */}
            <AddressListModal
                visible={showAddressListModal}
                onClose={() => {
                    setShowAddressListModal(false);
                    fetchAddresses(); // Refresh sau khi đóng
                }}
                onAddNew={handleAddNewAddress}
                onEdit={handleEditAddress}
            />

            {/* Add/Edit Address Modal */}
            <AddEditAddressModal
                visible={showAddEditModal}
                onClose={handleCloseAddEditModal}
                editAddress={editingAddress}
            />
        </SafeAreaView>
    );
}
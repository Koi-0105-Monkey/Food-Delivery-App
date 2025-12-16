// app/admin/dashboard.tsx - REAL DATA + BEAUTIFUL DESIGN

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/constants';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
import { router, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

const Dashboard = () => {
    const [stats, setStats] = useState({
        todayRevenue: 0,
        yesterdayRevenue: 0,
        todayGrowth: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCustomers: 0,
    });
    const [loading, setLoading] = useState(true);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadDashboardStats();
        }, [])
    );

    useEffect(() => {
        loadDashboardStats();

        let unsubscribe: (() => void) | null = null;
        
        try {
            unsubscribe = client.subscribe(
                `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ordersCollectionId}.documents`,
                () => {
                    loadDashboardStats();
                }
            );
        } catch (error) {
            console.log('⚠️ Realtime subscription failed');
        }

        return () => {
            if (unsubscribe) {
                try {
                    unsubscribe();
                } catch (error) {
                    // Ignore
                }
            }
        };
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const loadDashboardStats = async () => {
        try {
            setLoading(true);

            const allOrders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId
            );

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // ✅ REAL DATA: Today's paid orders
            const todayPaidOrders = allOrders.documents.filter((order: any) => 
                order.payment_status === 'paid' && 
                new Date(order.$createdAt) >= today
            );

            // ✅ REAL DATA: Yesterday's paid orders
            const yesterdayPaidOrders = allOrders.documents.filter((order: any) => {
                const date = new Date(order.$createdAt);
                return order.payment_status === 'paid' && 
                       date >= yesterday && 
                       date < today;
            });

            const todayRevenue = todayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const yesterdayRevenue = yesterdayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);

            // ✅ REAL GROWTH: Calculate based on real data
            const todayGrowth = yesterdayRevenue > 0 
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
                : (todayRevenue > 0 ? 100 : 0);

            // Get customers
            const customers = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId
            );

            const pendingOrders = allOrders.documents.filter(
                (order: any) => order.order_status === 'pending'
            ).length;

            const completedOrders = allOrders.documents.filter(
                (order: any) => order.order_status === 'confirmed'
            ).length;

            setStats({
                todayRevenue,
                yesterdayRevenue,
                todayGrowth,
                totalOrders: allOrders.total,
                pendingOrders,
                completedOrders,
                totalCustomers: customers.total,
            });

        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ 
        title, 
        value, 
        icon, 
        color, 
        onPress 
    }: { 
        title: string; 
        value: string; 
        icon: any; 
        color: string; 
        onPress?: () => void;
    }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
                width: (width - 60) / 2,
                backgroundColor: 'white',
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: '#F0F0F0',
            }}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: color + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                }}
            >
                <Image source={icon} style={{ width: 22, height: 22 }} tintColor={color} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                {value}
            </Text>
            <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '500' }}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView 
                    contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadDashboardStats} />
                    }
                >
                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B8B8B', letterSpacing: 0.5 }}>
                            ADMIN DASHBOARD
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginTop: 6 }}>
                            Today's Overview
                        </Text>
                    </View>

                    {/* 🔥 BIG CARD: Today's Revenue */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 28,
                            padding: 28,
                            marginBottom: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.12,
                            shadowRadius: 16,
                            elevation: 8,
                            borderWidth: 2,
                            borderColor: '#FE8C00',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 16,
                                    backgroundColor: '#FFF5E6',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 16,
                                }}
                            >
                                <Text style={{ fontSize: 32 }}>💰</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, color: '#8B8B8B', fontWeight: '600', marginBottom: 4 }}>
                                    Today's Revenue
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#FE8C00' }}>
                                        {(stats.todayRevenue / 1000).toFixed(0)}
                                    </Text>
                                    <Text style={{ fontSize: 20, color: '#8B8B8B', marginLeft: 4 }}>
                                        K đ
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Growth Indicator */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: stats.todayGrowth >= 0 ? '#E8F5E9' : '#FFE5E5',
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                borderRadius: 16,
                            }}
                        >
                            <Text style={{ 
                                fontSize: 16, 
                                fontWeight: '700',
                                color: stats.todayGrowth >= 0 ? '#10B981' : '#EF4444',
                                marginRight: 8,
                            }}>
                                {stats.todayGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.todayGrowth).toFixed(1)}%
                            </Text>
                            <Text style={{ fontSize: 14, color: '#8B8B8B' }}>
                                vs yesterday ({stats.yesterdayRevenue.toLocaleString('vi-VN')}đ)
                            </Text>
                        </View>
                    </View>

                    {/* 4 Small Cards */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <StatCard
                            title="Pending Orders"
                            value={stats.pendingOrders.toString()}
                            icon={images.clock}
                            color="#F59E0B"
                            onPress={() => router.push('/admin/orders')}
                        />
                        <StatCard
                            title="Completed"
                            value={stats.completedOrders.toString()}
                            icon={images.check}
                            color="#10B981"
                            onPress={() => router.push('/admin/orders')}
                        />
                        <StatCard
                            title="Total Orders"
                            value={stats.totalOrders.toString()}
                            icon={images.bag}
                            color="#6366F1"
                            onPress={() => router.push('/admin/orders')}
                        />
                        <StatCard
                            title="Customers"
                            value={stats.totalCustomers.toString()}
                            icon={images.user}
                            color="#8B5CF6"
                            onPress={() => router.push('/admin/customers')}
                        />
                    </View>

                    {/* Quick Actions */}
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            Quick Actions
                        </Text>
                        
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => router.push('/admin/orders')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6366F1',
                                    borderRadius: 20,
                                    padding: 20,
                                    alignItems: 'center',
                                    minWidth: (width - 60) / 2 - 6,
                                    shadowColor: '#6366F1',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                    View Orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/menu')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#10B981',
                                    borderRadius: 20,
                                    padding: 20,
                                    alignItems: 'center',
                                    minWidth: (width - 60) / 2 - 6,
                                    shadowColor: '#10B981',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>🍔</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                    Manage Menu
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/analytics')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#F59E0B',
                                    borderRadius: 20,
                                    padding: 20,
                                    alignItems: 'center',
                                    minWidth: (width - 60) / 2 - 6,
                                    shadowColor: '#F59E0B',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                    Analytics
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/customers')}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#8B5CF6',
                                    borderRadius: 20,
                                    padding: 20,
                                    alignItems: 'center',
                                    minWidth: (width - 60) / 2 - 6,
                                    shadowColor: '#8B5CF6',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 32, marginBottom: 8 }}>👥</Text>
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                    Customers
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

export default Dashboard;
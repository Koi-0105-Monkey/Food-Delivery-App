// app/admin/dashboard.tsx - BEAUTIFUL DESIGN INSPIRED BY SLOTHUI

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/constants';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
import { router, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        todayOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCustomers: 0,
        totalMenuItems: 0,
        avgOrderValue: 0,
        revenueGrowth: 0,
        todayGrowth: 0,
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadDashboardStats();
        }, [])
    );

    useEffect(() => {
        loadDashboardStats();

        // Setup realtime with error handling
        let unsubscribe: (() => void) | null = null;
        
        try {
            unsubscribe = client.subscribe(
                `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ordersCollectionId}.documents`,
                (response) => {
                    console.log('📡 Real-time update:', response.events[0]);
                    loadDashboardStats();
                }
            );
        } catch (error) {
            console.log('⚠️ Realtime subscription failed, continuing without it');
        }

        return () => {
            if (unsubscribe) {
                try {
                    unsubscribe();
                } catch (error) {
                    // Ignore cleanup errors
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
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const lastMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            const todayOrders = allOrders.documents.filter((order: any) => 
                new Date(order.$createdAt) >= today
            );

            const yesterdayOrders = allOrders.documents.filter((order: any) => {
                const date = new Date(order.$createdAt);
                return date >= yesterday && date < today;
            });

            const paidOrders = allOrders.documents.filter((order: any) => 
                order.payment_status === 'paid'
            );

            const todayPaidOrders = paidOrders.filter((order: any) =>
                new Date(order.$createdAt) >= today
            );

            const yesterdayPaidOrders = paidOrders.filter((order: any) => {
                const date = new Date(order.$createdAt);
                return date >= yesterday && date < today;
            });

            const weekPaidOrders = paidOrders.filter((order: any) =>
                new Date(order.$createdAt) >= weekAgo
            );

            const monthPaidOrders = paidOrders.filter((order: any) =>
                new Date(order.$createdAt) >= monthAgo
            );

            const lastMonthPaidOrders = paidOrders.filter((order: any) =>
                new Date(order.$createdAt) >= lastMonth && new Date(order.$createdAt) < monthAgo
            );

            const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const todayRevenue = todayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const yesterdayRevenue = yesterdayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const weekRevenue = weekPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const monthRevenue = monthPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const lastMonthRevenue = lastMonthPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);

            const revenueGrowth = lastMonthRevenue > 0 
                ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
                : 0;

            const todayGrowth = yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
                : 0;

            const customers = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId
            );

            const menuItems = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId
            );

            const pendingOrders = allOrders.documents.filter(
                (order: any) => order.order_status === 'pending'
            ).length;

            const completedOrders = allOrders.documents.filter(
                (order: any) => order.order_status === 'confirmed'
            ).length;

            const avgOrderValue = paidOrders.length > 0 
                ? totalRevenue / paidOrders.length 
                : 0;

            setStats({
                totalOrders: allOrders.total,
                todayOrders: todayOrders.length,
                totalRevenue,
                todayRevenue,
                weekRevenue,
                monthRevenue,
                pendingOrders,
                completedOrders,
                totalCustomers: customers.total,
                totalMenuItems: menuItems.total,
                avgOrderValue,
                revenueGrowth,
                todayGrowth,
            });

            setLastUpdate(new Date());
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
        trend,
        onPress 
    }: { 
        title: string; 
        value: string; 
        icon: any; 
        color: string; 
        trend?: number;
        onPress?: () => void;
    }) => {
        const [pressed, setPressed] = useState(false);

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={() => setPressed(true)}
                onPressOut={() => setPressed(false)}
                onPress={onPress}
                style={{
                    width: (width - 60) / 2,
                    backgroundColor: 'white',
                    borderRadius: 24,
                    padding: 20,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: pressed ? 8 : 12,
                    elevation: pressed ? 2 : 3,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
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
                {trend !== undefined && (
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                            fontSize: 12, 
                            fontWeight: '600',
                            color: trend >= 0 ? '#10B981' : '#EF4444' 
                        }}>
                            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                            Sales Overview
                        </Text>
                        <Text style={{ fontSize: 13, color: '#8B8B8B', marginTop: 6 }}>
                            Your brief overview of your sales worldwide.
                        </Text>
                    </View>

                    {/* Top Row Stats */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <View style={{ flex: 1 }}>
                            <View
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 24,
                                    padding: 20,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 12,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: '#F0F0F0',
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 14,
                                            backgroundColor: '#6366F115',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                        }}
                                    >
                                        <Text style={{ fontSize: 22 }}>👁️</Text>
                                    </View>
                                    <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                        Total View 24hr
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 }}>
                                    {stats.todayOrders}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                                        ↑ 168%
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        <View style={{ flex: 1 }}>
                            <View
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: 24,
                                    padding: 20,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 12,
                                    elevation: 3,
                                    borderWidth: 1,
                                    borderColor: '#F0F0F0',
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 14,
                                            backgroundColor: '#10B98115',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                        }}
                                    >
                                        <Text style={{ fontSize: 22 }}>📦</Text>
                                    </View>
                                    <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                        Total Orders
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 }}>
                                    {stats.totalOrders}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                                        ↑ 22.1%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Revenue Card */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 24,
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 14,
                                    backgroundColor: '#F59E0B15',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>💰</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Avg Revenue
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' }}>
                                        ${(stats.avgOrderValue / 1000).toFixed(0)}
                                    </Text>
                                    <Text style={{ fontSize: 18, color: '#8B8B8B', marginLeft: 4 }}>
                                        K đ
                                    </Text>
                                </View>
                            </View>
                            <View
                                style={{
                                    backgroundColor: '#FEE2E215',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>
                                    ↓ {Math.abs(stats.revenueGrowth).toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats Grid */}
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
                            trend={stats.todayGrowth}
                            onPress={() => router.push('/admin/orders')}
                        />
                        <StatCard
                            title="Total Customers"
                            value={stats.totalCustomers.toString()}
                            icon={images.user}
                            color="#6366F1"
                            onPress={() => router.push('/admin/customers')}
                        />
                        <StatCard
                            title="Menu Items"
                            value={stats.totalMenuItems.toString()}
                            icon={images.search}
                            color="#8B5CF6"
                            onPress={() => router.push('/admin/menu')}
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
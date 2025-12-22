// app/admin/dashboard.tsx - PROFESSIONAL REDESIGN

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/constants';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
import { router, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

const Dashboard = () => {
    const [stats, setStats] = useState({
        // Today's key metrics
        todayRevenue: 0,
        todayOrders: 0,
        todayGrowth: 0,
        
        // Quick stats
        pendingOrders: 0,
        completedOrders: 0,
        totalCustomers: 0,
        
        // Comparison data
        yesterdayRevenue: 0,
        lastWeekRevenue: 0,
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
            
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);

            // Today's paid orders
            const todayPaidOrders = allOrders.documents.filter((order: any) => 
                order.payment_status === 'paid' && 
                new Date(order.$createdAt) >= today
            );

            // Yesterday's paid orders
            const yesterdayPaidOrders = allOrders.documents.filter((order: any) => {
                const date = new Date(order.$createdAt);
                return order.payment_status === 'paid' && 
                       date >= yesterday && 
                       date < today;
            });

            // Last week's paid orders
            const lastWeekPaidOrders = allOrders.documents.filter((order: any) => 
                order.payment_status === 'paid' && 
                new Date(order.$createdAt) >= weekAgo
            );

            const todayRevenue = todayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const yesterdayRevenue = yesterdayPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            const lastWeekRevenue = lastWeekPaidOrders.reduce((sum: number, order: any) => sum + order.total, 0);

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
                todayOrders: todayPaidOrders.length,
                todayGrowth,
                pendingOrders,
                completedOrders,
                totalCustomers: customers.total,
                yesterdayRevenue,
                lastWeekRevenue,
            });

        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN') + 'đ';
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
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B8B8B', letterSpacing: 0.5, marginBottom: 8 }}>
                            ADMIN DASHBOARD
                        </Text>
                        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' }}>
                            Today's Overview
                        </Text>
                        <Text style={{ fontSize: 14, color: '#8B8B8B', marginTop: 4 }}>
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </Text>
                    </View>

                    {/* 💰 TODAY'S REVENUE - Hero Card */}
                    <View
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 28,
                            padding: 28,
                            marginBottom: 24,
                            shadowColor: '#FE8C00',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            elevation: 10,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 12 }}>
                                    Today's Revenue
                                </Text>
                                <Text style={{ fontSize: 42, fontWeight: 'bold', color: 'white', letterSpacing: -1 }}>
                                    {formatCurrency(stats.todayRevenue)}
                                </Text>
                            </View>
                            
                            <View
                                style={{
                                    backgroundColor: stats.todayGrowth >= 0 ? 'rgba(255,255,255,0.25)' : 'rgba(241,65,65,0.25)',
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 16,
                                }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>
                                    {stats.todayGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.todayGrowth).toFixed(1)}%
                                </Text>
                            </View>
                        </View>

                        {/* Today's Orders */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                paddingHorizontal: 20,
                                paddingVertical: 16,
                                borderRadius: 16,
                            }}
                        >
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 16,
                                }}
                            >
                                <Text style={{ fontSize: 24 }}>📦</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white' }}>
                                    {stats.todayOrders}
                                </Text>
                                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                                    Orders Today
                                </Text>
                            </View>
                        </View>

                        {/* Comparison */}
                        <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                                        Yesterday
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>
                                        {formatCurrency(stats.yesterdayRevenue)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                                        Last 7 Days
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: 'white' }}>
                                        {formatCurrency(stats.lastWeekRevenue)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* 📊 Quick Stats Grid */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            Quick Stats
                        </Text>
                        
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {/* Pending Orders */}
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'white',
                                    borderRadius: 20,
                                    padding: 20,
                                    borderWidth: 2,
                                    borderColor: stats.pendingOrders > 0 ? '#F59E0B' : '#F3F4F6',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: '#FFF5E6',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>⏳</Text>
                                </View>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                                    {stats.pendingOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Pending Orders
                                </Text>
                            </View>

                            {/* Completed Orders */}
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'white',
                                    borderRadius: 20,
                                    padding: 20,
                                    borderWidth: 2,
                                    borderColor: '#F3F4F6',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <View
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: '#E8F5E9',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>✅</Text>
                                </View>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                                    {stats.completedOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Completed
                                </Text>
                            </View>
                        </View>

                        {/* Total Customers */}
                        <View
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 20,
                                padding: 20,
                                marginTop: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 2,
                                borderColor: '#F3F4F6',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: '#F0E7FF',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 16,
                                }}
                            >
                                <Text style={{ fontSize: 28 }}>👥</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 }}>
                                    {stats.totalCustomers}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#8B8B8B', fontWeight: '600' }}>
                                    Total Customers
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* 🚀 Quick Actions */}
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            Quick Actions
                        </Text>
                        
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => router.push('/admin/orders')}
                                style={{
                                    flex: 1,
                                    minWidth: (width - 64) / 2,
                                    backgroundColor: '#6366F1',
                                    borderRadius: 20,
                                    padding: 24,
                                    shadowColor: '#6366F1',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 36, marginBottom: 12 }}>📦</Text>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    Manage Orders
                                </Text>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                                    View & process orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/menu')}
                                style={{
                                    flex: 1,
                                    minWidth: (width - 64) / 2,
                                    backgroundColor: '#10B981',
                                    borderRadius: 20,
                                    padding: 24,
                                    shadowColor: '#10B981',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 36, marginBottom: 12 }}>🍔</Text>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    Manage Menu
                                </Text>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                                    Edit menu items
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/analytics')}
                                style={{
                                    flex: 1,
                                    minWidth: (width - 64) / 2,
                                    backgroundColor: '#F59E0B',
                                    borderRadius: 20,
                                    padding: 24,
                                    shadowColor: '#F59E0B',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 36, marginBottom: 12 }}>📊</Text>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    Analytics
                                </Text>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                                    View detailed reports
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/admin/customers')}
                                style={{
                                    flex: 1,
                                    minWidth: (width - 64) / 2,
                                    backgroundColor: '#8B5CF6',
                                    borderRadius: 20,
                                    padding: 24,
                                    shadowColor: '#8B5CF6',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                                    Customers
                                </Text>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                                    View customer list
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
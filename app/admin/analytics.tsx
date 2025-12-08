// app/admin/analytics.tsx - ENHANCED WITH REAL-TIME REVENUE

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState({
        totalRevenue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        topPaymentMethod: 'COD',
        topSellingItems: [] as any[],
        pendingOrders: 0,
        confirmedOrders: 0,
        cancelledOrders: 0,
    });
    const [loading, setLoading] = useState(true);

    // ✅ Auto-refresh when tab focused
    useFocusEffect(
        React.useCallback(() => {
            loadAnalytics();
        }, [])
    );

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            const orders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId
            );

            // ✅ Only count PAID orders for revenue (confirmed orders)
            const paidOrders = orders.documents.filter(
                (order: any) => order.payment_status === 'paid' && order.order_status === 'confirmed'
            );

            // Calculate revenues
            const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= today)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= weekAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const monthRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= monthAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const avgOrderValue = totalRevenue / (paidOrders.length || 1);

            // Payment methods
            const paymentMethods: { [key: string]: number } = {};
            paidOrders.forEach((order: any) => {
                paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1;
            });
            const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) => 
                paymentMethods[a] > paymentMethods[b] ? a : b
            , 'COD');

            // ✅ Order status breakdown
            const pendingOrders = orders.documents.filter(
                (order: any) => order.order_status === 'pending'
            ).length;

            const confirmedOrders = orders.documents.filter(
                (order: any) => order.order_status === 'confirmed'
            ).length;

            const cancelledOrders = orders.documents.filter(
                (order: any) => order.order_status === 'cancelled'
            ).length;

            setAnalytics({
                totalRevenue,
                todayRevenue,
                weekRevenue,
                monthRevenue,
                totalOrders: paidOrders.length,
                avgOrderValue,
                topPaymentMethod,
                topSellingItems: [],
                pendingOrders,
                confirmedOrders,
                cancelledOrders,
            });
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const RevenueCard = ({ title, value, trend }: { title: string; value: string; trend?: string }) => (
        <View
            style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 14, color: '#878787', marginBottom: 8 }}>{title}</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginBottom: 4 }}>
                {value}
            </Text>
            {trend && (
                <Text style={{ fontSize: 12, color: '#2F9B65' }}>{trend}</Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <ScrollView 
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadAnalytics} />
                }
            >
                {/* Header */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                        ANALYTICS
                    </Text>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                        Revenue Report
                    </Text>
                    <Text style={{ fontSize: 12, color: '#878787', marginTop: 4 }}>
                        💡 Only confirmed orders count in revenue
                    </Text>
                </View>

                {/* Revenue Cards */}
                <RevenueCard
                    title="Today's Revenue"
                    value={`${(analytics.todayRevenue / 1000).toFixed(0)}K đ`}
                />
                <RevenueCard
                    title="This Week"
                    value={`${(analytics.weekRevenue / 1000).toFixed(0)}K đ`}
                />
                <RevenueCard
                    title="This Month"
                    value={`${(analytics.monthRevenue / 1000).toFixed(0)}K đ`}
                />
                <RevenueCard
                    title="Total Revenue"
                    value={analytics.totalRevenue.toLocaleString('vi-VN') + ' đ'}
                />

                {/* ✅ Order Status Breakdown */}
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginBottom: 16 }}>
                        📊 Order Status
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>⏳ Pending Orders:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FE8C00' }}>
                                {analytics.pendingOrders}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>✓ Confirmed Orders:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2F9B65' }}>
                                {analytics.confirmedOrders}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>✕ Cancelled Orders:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#F14141' }}>
                                {analytics.cancelledOrders}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Other Stats */}
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginBottom: 16 }}>
                        💰 Key Metrics
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Confirmed Orders:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                {analytics.totalOrders}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Avg Order Value:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2F9B65' }}>
                                {analytics.avgOrderValue.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Top Payment:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                {analytics.topPaymentMethod.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chart Placeholder */}
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 20,
                        marginTop: 12,
                        height: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#181C2E' }}>
                        Sales Chart
                    </Text>
                    <Text style={{ fontSize: 14, color: '#878787', marginTop: 4 }}>
                        Coming soon
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminAnalytics;
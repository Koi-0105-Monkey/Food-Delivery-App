// app/admin/analytics.tsx - BEAUTIFUL DESIGN

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
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
        pendingOrders: 0,
        confirmedOrders: 0,
        cancelledOrders: 0,
        last7DaysRevenue: [] as any[],
        last7DaysOrders: [] as any[],
        paymentMethodsData: [] as any[],
        hourlyOrders: [] as any[],
        todayGrowth: 0,
        weekGrowth: 0,
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadAnalytics();
        }, [])
    );

    useEffect(() => {
        loadAnalytics();

        const unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ordersCollectionId}.documents`,
            () => {
                loadAnalytics();
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            const orders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId
            );

            const paidOrders = orders.documents.filter(
                (order: any) => order.payment_status === 'paid' && order.order_status === 'confirmed'
            );

            const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= today)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayRevenue = paidOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= yesterday && date < today;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= weekAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const lastWeekRevenue = paidOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= twoWeeksAgo && date < weekAgo;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const monthRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= monthAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            const avgOrderValue = totalRevenue / (paidOrders.length || 1);

            const todayGrowth = yesterdayRevenue > 0 
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
                : 0;

            const weekGrowth = lastWeekRevenue > 0 
                ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
                : 0;

            // Payment methods
            const paymentMethods: { [key: string]: number } = {};
            paidOrders.forEach((order: any) => {
                paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1;
            });
            const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) => 
                paymentMethods[a] > paymentMethods[b] ? a : b
            , 'COD');

            const paymentMethodsData = Object.entries(paymentMethods).map(([name, value]) => ({
                name: name.toUpperCase(),
                value,
                percentage: ((value / paidOrders.length) * 100).toFixed(1),
            }));

            // Order status
            const pendingOrders = orders.documents.filter(
                (order: any) => order.order_status === 'pending'
            ).length;

            const confirmedOrders = orders.documents.filter(
                (order: any) => order.order_status === 'confirmed'
            ).length;

            const cancelledOrders = orders.documents.filter(
                (order: any) => order.order_status === 'cancelled'
            ).length;

            // Last 7 days revenue
            const last7DaysRevenue = [];
            const last7DaysOrders = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const dayOrders = paidOrders.filter((order: any) => {
                    const orderDate = new Date(order.$createdAt);
                    return orderDate >= date && orderDate < nextDate;
                });

                const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + order.total, 0);

                last7DaysRevenue.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    revenue: dayRevenue / 1000,
                });

                last7DaysOrders.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    orders: dayOrders.length,
                });
            }

            // Hourly orders
            const hourlyOrdersMap: { [hour: number]: number } = {};
            for (let h = 0; h < 24; h++) hourlyOrdersMap[h] = 0;

            orders.documents
                .filter((order: any) => new Date(order.$createdAt) >= today)
                .forEach((order: any) => {
                    const hour = new Date(order.$createdAt).getHours();
                    hourlyOrdersMap[hour]++;
                });

            const hourlyOrders = Object.entries(hourlyOrdersMap)
                .filter(([_, count]) => count > 0)
                .map(([hour, count]) => ({
                    hour: `${hour}:00`,
                    orders: count,
                }));

            setAnalytics({
                totalRevenue,
                todayRevenue,
                weekRevenue,
                monthRevenue,
                totalOrders: paidOrders.length,
                avgOrderValue,
                topPaymentMethod,
                pendingOrders,
                confirmedOrders,
                cancelledOrders,
                last7DaysRevenue,
                last7DaysOrders,
                paymentMethodsData,
                hourlyOrders,
                todayGrowth,
                weekGrowth,
            });

            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ 
        title, 
        value, 
        subtitle,
        trend, 
        colors,
        icon 
    }: { 
        title: string; 
        value: string; 
        subtitle?: string;
        trend?: number; 
        colors: string[];
        icon: string;
    }) => (
        <View
            style={{
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: colors[0] + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}
                >
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                </View>
                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                    {title}
                </Text>
            </View>
            
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                {value}
            </Text>
            
            {subtitle && (
                <Text style={{ fontSize: 13, color: '#8B8B8B', marginBottom: 8 }}>
                    {subtitle}
                </Text>
            )}
            
            {trend !== undefined && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ 
                        fontSize: 13, 
                        fontWeight: '600',
                        color: trend >= 0 ? '#10B981' : '#EF4444' 
                    }}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
                    </Text>
                    <Text style={{ fontSize: 13, color: '#8B8B8B', marginLeft: 6 }}>
                        vs yesterday
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView 
                    contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadAnalytics} />
                    }
                >
                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B8B8B', letterSpacing: 0.5 }}>
                            ANALYTICS DASHBOARD
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginTop: 6 }}>
                            Sales Overview
                        </Text>
                        <Text style={{ fontSize: 13, color: '#8B8B8B', marginTop: 6 }}>
                            Last updated: {lastUpdate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>

                    {/* Top Stats Row */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <View style={{ flex: 1 }}>
                            <StatCard
                                icon="👁️"
                                title="Total View 24hr"
                                value={analytics.totalOrders.toString()}
                                trend={analytics.todayGrowth}
                                colors={['#6366F1']}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <StatCard
                                icon="📦"
                                title="Total Orders"
                                value={analytics.confirmedOrders.toString()}
                                trend={22.1}
                                colors={['#10B981']}
                            />
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
                                        ${(analytics.avgOrderValue / 1000).toFixed(0)}
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
                                    ↓ -19%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Sales Report Chart */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
                                Sales Report
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {['1 day', '1 week', '1 month', '1 year', 'All'].map((label, idx) => (
                                    <View
                                        key={label}
                                        style={{
                                            paddingHorizontal: idx === 1 ? 12 : 0,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            backgroundColor: idx === 1 ? '#6366F1' : 'transparent',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: '600',
                                                color: idx === 1 ? 'white' : '#8B8B8B',
                                            }}
                                        >
                                            {label}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* 7-Day Chart */}
                        {analytics.last7DaysRevenue.length > 0 ? (
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 8 }}>
                                    {analytics.last7DaysRevenue.map((day, index) => {
                                        const maxRevenue = Math.max(...analytics.last7DaysRevenue.map(d => d.revenue));
                                        const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 150 : 0;
                                        
                                        return (
                                            <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                                                <View
                                                    style={{
                                                        width: '100%',
                                                        height: Math.max(height, 4),
                                                        backgroundColor: index === 6 ? '#6366F1' : '#E0E7FF',
                                                        borderRadius: 8,
                                                        marginBottom: 8,
                                                    }}
                                                />
                                                <Text style={{ fontSize: 11, color: '#8B8B8B', fontWeight: '500' }}>
                                                    {day.date}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <Text style={{ fontSize: 14, color: '#8B8B8B', textAlign: 'center', paddingVertical: 40 }}>
                                No data available
                            </Text>
                        )}
                    </View>

                    {/* Customer Overview Chart */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
                                Customer Overview
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#F3F4F6',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ fontSize: 11, color: '#6B7280', marginRight: 4 }}>📄</Text>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>
                                    View Report
                                </Text>
                            </View>
                        </View>

                        {/* Customer Chart */}
                        {analytics.last7DaysOrders.length > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 12 }}>
                                {analytics.last7DaysOrders.map((day, index) => {
                                    const maxOrders = Math.max(...analytics.last7DaysOrders.map(d => d.orders));
                                    const height = maxOrders > 0 ? (day.orders / maxOrders) * 150 : 0;
                                    
                                    return (
                                        <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                                            <View
                                                style={{
                                                    width: '100%',
                                                    height: Math.max(height, 4),
                                                    backgroundColor: '#6366F1',
                                                    borderRadius: 8,
                                                    marginBottom: 8,
                                                    opacity: 0.3 + (height / 150) * 0.7,
                                                }}
                                            />
                                            <Text style={{ fontSize: 11, color: '#8B8B8B', fontWeight: '500' }}>
                                                {day.date}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={{ fontSize: 14, color: '#8B8B8B', textAlign: 'center', paddingVertical: 40 }}>
                                No data available
                            </Text>
                        )}
                    </View>

                    {/* Payment Methods */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            💳 Payment Methods
                        </Text>
                        
                        {analytics.paymentMethodsData.map((method, index) => {
                            const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];
                            const color = colors[index % colors.length];
                            
                            return (
                                <View key={method.name} style={{ marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 14, color: '#1A1A1A', fontWeight: '600' }}>
                                            {method.name}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: '#8B8B8B' }}>
                                            {method.value} orders ({method.percentage}%)
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            height: 8,
                                            backgroundColor: '#F3F4F6',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${method.percentage}%`,
                                                height: '100%',
                                                backgroundColor: color,
                                            }}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

export default AdminAnalytics;
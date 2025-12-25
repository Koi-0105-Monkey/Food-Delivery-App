// app/admin/analytics.tsx - DETAILED ANALYTICS WITH TOP ITEMS & NEW UI

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl, Animated, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Query } from 'react-native-appwrite';

const { width } = Dimensions.get('window');

type TimeRange = '1day' | '1week' | '1month' | 'all';

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState({
        // Revenue breakdown
        totalRevenue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,

        // Comparison
        yesterdayRevenue: 0,
        lastWeekRevenue: 0,
        lastMonthRevenue: 0,

        // Growth rates
        todayGrowth: 0,
        weekGrowth: 0,
        monthGrowth: 0,

        // Order statistics
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        avgOrderValue: 0,

        // Payment methods
        topPaymentMethod: 'COD',
        paymentMethodsData: [] as any[],

        // Chart data
        todayHourlyRevenue: [] as any[],
        last7DaysRevenue: [] as any[],
        last30DaysRevenue: [] as any[],

        // Top Items
        topItems: [] as any[],
    });
    const [loading, setLoading] = useState(true);
    const [selectedRange, setSelectedRange] = useState<TimeRange>('1week');
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

            // ✅ FIX: Fetch ALL orders with pagination
            let allDocuments: any[] = [];
            let offset = 0;
            const limit = 100;
            let hasMore = true;

            while (hasMore) {
                const results = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.ordersCollectionId,
                    [
                        Query.limit(limit),
                        Query.offset(offset),
                        Query.orderDesc('$createdAt')
                    ]
                );

                allDocuments = [...allDocuments, ...results.documents];

                if (results.documents.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                }
            }

            console.log(`✅ Loaded total ${allDocuments.length} orders for analytics`);

            // ✅ Logic Updated: include confirmed COD orders
            const validOrders = allDocuments.filter(
                (order: any) => {
                    const isPaid = order.payment_status === 'paid' && order.order_status !== 'cancelled';

                    const isConfirmedProcessing =
                        (order.payment_method === 'cod' || order.payment_method === 'bidv' || !order.payment_status || order.payment_status === 'pending') &&
                        (order.order_status === 'confirmed' || order.order_status === 'preparing' || order.order_status === 'delivering' || order.order_status === 'completed');

                    return isPaid || isConfirmedProcessing;
                }
            );

            const totalRevenue = validOrders.reduce((sum: number, order: any) => sum + order.total, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Today
            const todayOrders = validOrders.filter((order: any) => new Date(order.$createdAt) >= today);
            const todayRevenue = todayOrders.reduce((sum: number, order: any) => sum + order.total, 0);

            // Yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayRevenue = validOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= yesterday && date < today;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // This Week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekRevenue = validOrders
                .filter((order: any) => new Date(order.$createdAt) >= weekAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Last Week
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const lastWeekRevenue = validOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= twoWeeksAgo && date < weekAgo;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // This Month
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const monthRevenue = validOrders
                .filter((order: any) => new Date(order.$createdAt) >= monthAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Last Month
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            const lastMonthRevenue = validOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= twoMonthsAgo && date < monthAgo;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Growth calculations
            const todayGrowth = yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
                : (todayRevenue > 0 ? 100 : 0);

            const weekGrowth = lastWeekRevenue > 0
                ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
                : (weekRevenue > 0 ? 100 : 0);

            const monthGrowth = lastMonthRevenue > 0
                ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
                : (monthRevenue > 0 ? 100 : 0);

            const avgOrderValue = Math.round(totalRevenue / (validOrders.length || 1));

            // Payment methods
            const paymentMethods: { [key: string]: number } = {};
            validOrders.forEach((order: any) => {
                paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1;
            });
            const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) =>
                paymentMethods[a] > paymentMethods[b] ? a : b
                , 'COD');

            const paymentMethodsData = Object.entries(paymentMethods).map(([name, value]) => ({
                name: name.toUpperCase(),
                value,
                percentage: ((value / validOrders.length) * 100).toFixed(1),
            }));

            // --- CHART DATA PREPARATION ---
            // 1. Today Hourly Revenue (24h)
            const todayHourlyRevenue = [];
            const timePoints = [0, 4, 8, 12, 16, 20];
            for (let hour of timePoints) {
                const hourStart = new Date(today);
                hourStart.setHours(hour, 0, 0, 0);
                const hourEnd = new Date(today);
                hourEnd.setHours(hour + 4, 0, 0, 0);
                const ordersInBlock = todayOrders.filter((order: any) => {
                    const d = new Date(order.$createdAt);
                    return d >= hourStart && d < hourEnd;
                });
                const revenue = ordersInBlock.reduce((sum: number, o: any) => sum + o.total, 0);
                todayHourlyRevenue.push({ time: `${hour}:00`, revenue: revenue / 1000 });
            }

            // 2. Last 7 days chart
            const last7DaysRevenue = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);
                const dayOrders = validOrders.filter((order: any) => {
                    const orderDate = new Date(order.$createdAt);
                    return orderDate >= date && orderDate < nextDate;
                });
                const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + order.total, 0);
                last7DaysRevenue.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    revenue: dayRevenue / 1000,
                });
            }

            // 3. Last 30 days chart
            const last30DaysRevenue = [];
            for (let i = 25; i >= 0; i -= 5) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() - i);
                endDate.setHours(23, 59, 59, 999);
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 4);
                startDate.setHours(0, 0, 0, 0);
                const blockOrders = validOrders.filter((order: any) => {
                    const orderDate = new Date(order.$createdAt);
                    return orderDate >= startDate && orderDate <= endDate;
                });
                const blockRevenue = blockOrders.reduce((sum: number, order: any) => sum + order.total, 0);
                last30DaysRevenue.push({
                    date: `${startDate.getDate()}/${startDate.getMonth() + 1}`,
                    revenue: blockRevenue / 1000,
                });
            }

            // --- CALCULATE TOP 4 ITEMS ---
            const itemCounts: { [key: string]: { count: number, name: string, price: number, image: string } } = {};
            validOrders.forEach((order: any) => {
                try {
                    const items = JSON.parse(order.items || '[]');
                    items.forEach((item: any) => {
                        const id = item.menu_id || item.id;
                        if (!itemCounts[id]) {
                            itemCounts[id] = {
                                count: 0,
                                name: item.name,
                                price: item.price,
                                image: item.image_url
                            };
                        }
                        itemCounts[id].count += (item.quantity || 1);
                    });
                } catch (e) {
                    console.log('Error parsing items for order', order.$id);
                }
            });

            const topItems = Object.values(itemCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 4);

            // Order status counts
            const completedOrders = allDocuments.filter(
                (order: any) => order.order_status === 'confirmed' || order.order_status === 'completed'
            ).length;

            const cancelledOrders = allDocuments.filter(
                (order: any) => order.order_status === 'cancelled'
            ).length;

            setAnalytics({
                totalRevenue,
                todayRevenue,
                weekRevenue,
                monthRevenue,
                yesterdayRevenue,
                lastWeekRevenue,
                lastMonthRevenue,
                todayGrowth,
                weekGrowth,
                monthGrowth,
                totalOrders: validOrders.length,
                completedOrders,
                cancelledOrders,
                avgOrderValue,
                topPaymentMethod,
                todayHourlyRevenue,
                last7DaysRevenue,
                last30DaysRevenue,
                paymentMethodsData,
                topItems,
            });

        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChartData = () => {
        switch (selectedRange) {
            case '1day': return analytics.todayHourlyRevenue;
            case '1week': return analytics.last7DaysRevenue;
            case '1month': return analytics.last30DaysRevenue;
            default: return analytics.last30DaysRevenue;
        }
    };

    const getCurrentRevenue = () => {
        switch (selectedRange) {
            case '1day': return analytics.todayRevenue;
            case '1week': return analytics.weekRevenue;
            case '1month': return analytics.monthRevenue;
            default: return analytics.totalRevenue;
        }
    };

    const getCurrentGrowth = () => {
        switch (selectedRange) {
            case '1day': return analytics.todayGrowth;
            case '1week': return analytics.weekGrowth;
            case '1month': return analytics.monthGrowth;
            default: return 0;
        }
    };

    const formatCurrency = (amount: number) => {
        if (!amount) return '0đ';
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const chartData = getChartData();

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
                            Revenue Insights
                        </Text>
                    </View>

                    {/* ✅ TOP CARD: Current Period Revenue (Highlighted) */}
                    <View
                        style={{
                            backgroundColor: '#6366F1', // Indigo color for emphasis
                            borderRadius: 24,
                            padding: 24,
                            marginBottom: 16,
                            shadowColor: '#6366F1',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 16,
                            elevation: 8,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 14,
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>💰</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                                    Current {selectedRange === '1day' ? 'Today' : selectedRange === '1week' ? 'Week' : 'Month'} Revenue
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                                        {formatCurrency(getCurrentRevenue())}
                                    </Text>
                                </View>
                            </View>
                            <View
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    color: 'white'
                                }}>
                                    {getCurrentGrowth() >= 0 ? '↑' : '↓'} {Math.abs(getCurrentGrowth()).toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ✅ SECOND ROW: Details (Stacked vertically as requested) */}
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 24,
                        padding: 20,
                        marginBottom: 16,
                    }}>
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600', marginBottom: 6 }}>
                                Total Revenue (All Time)
                            </Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' }}>
                                {formatCurrency(analytics.totalRevenue)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 }} />

                        <View>
                            <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600', marginBottom: 6 }}>
                                Average Order Value
                            </Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' }}>
                                {formatCurrency(analytics.avgOrderValue)}
                            </Text>
                        </View>
                    </View>

                    {/* Line Chart */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
                                📈 Sales Report
                            </Text>
                        </View>

                        {/* Time Range Selector */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {(['1day', '1week', '1month'] as TimeRange[]).map((range) => (
                                <TouchableOpacity
                                    key={range}
                                    onPress={() => setSelectedRange(range)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor: selectedRange === range ? '#6366F1' : '#F3F4F6',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: selectedRange === range ? 'white' : '#8B8B8B',
                                        }}
                                    >
                                        {range === '1day' ? 'Today' : range === '1week' ? 'Week' : 'Month'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {chartData.length > 0 ? (
                            <View style={{ alignItems: 'center' }}>
                                <LineChart
                                    data={{
                                        labels: chartData.map(d => selectedRange === '1day' ? d.time : d.date),
                                        datasets: [
                                            {
                                                data: chartData.map(d => d.revenue || 0),
                                                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                                strokeWidth: 3,
                                            },
                                        ],
                                    }}
                                    width={width - 80}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: '#ffffff',
                                        backgroundGradientFrom: '#ffffff',
                                        backgroundGradientTo: '#ffffff',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                        style: {
                                            borderRadius: 16,
                                        },
                                        propsForDots: {
                                            r: '4',
                                            strokeWidth: '2',
                                            stroke: '#6366F1',
                                        },
                                        propsForBackgroundLines: {
                                            strokeDasharray: '',
                                            stroke: '#F3F4F6',
                                        },
                                    }}
                                    bezier
                                    style={{
                                        marginVertical: 8,
                                        borderRadius: 16,
                                    }}
                                    yAxisLabel=""
                                    yAxisSuffix="k"
                                />
                            </View>
                        ) : (
                            <Text style={{ fontSize: 14, color: '#8B8B8B', textAlign: 'center', paddingVertical: 40 }}>
                                No filtered data available
                            </Text>
                        )}
                    </View>

                    {/* ✅ TOP SELLING ITEMS */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            🔥 Best Selling Items
                        </Text>

                        {analytics.topItems.map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: 12,
                                    paddingBottom: 12,
                                    borderBottomWidth: index < analytics.topItems.length - 1 ? 1 : 0,
                                    borderBottomColor: '#F3F4F6'
                                }}
                            >
                                <View style={{
                                    width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3F4F6',
                                    alignItems: 'center', justifyContent: 'center', marginRight: 12
                                }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6366F1' }}>#{index + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{item.name}</Text>
                                    <Text style={{ fontSize: 12, color: '#8B8B8B' }}>{formatCurrency(item.price)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' }}>{item.count}</Text>
                                    <Text style={{ fontSize: 11, color: '#8B8B8B' }}>Sold</Text>
                                </View>
                            </View>
                        ))}

                        {analytics.topItems.length === 0 && (
                            <Text style={{ textAlign: 'center', color: '#8B8B8B', paddingVertical: 10 }}>No sales data yet</Text>
                        )}
                    </View>

                    {/* Order Statistics */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            📦 Order Statistics
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                                    {analytics.totalOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Total
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#10B981', marginBottom: 4 }}>
                                    {analytics.completedOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Done
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#FFE5E5', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#EF4444', marginBottom: 4 }}>
                                    {analytics.cancelledOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Cancelled
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

export default AdminAnalytics;
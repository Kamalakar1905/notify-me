import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Path, Line } from 'react-native-svg';
import { Colors } from '../../../constants/colors';
import { fetchDashboard } from '../../../store/analyticsSlice';
import { AppDispatch, RootState } from '../../../store/store';
import { Priority } from '../../../types';

const { width: screenWidth } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { dashboard, loading, error } = useSelector((s: RootState) => s.analytics);
  
  const loadData = () => {
    dispatch(fetchDashboard({}));
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  if (loading && !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  const data = dashboard || {
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
    remindersSent: 0,
    remindersOpened: 0,
    reminderOpenRate: 0,
    totalSnoozed: 0,
    snoozeRate: 0,
    productivityStreak: 0,
    completionTrend: [],
    overdueTrend: [],
    heatmap: [],
    priorityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  // Completion Rate calculation details
  const completionPercentage = Math.round(data.completionRate * 100) || 0;
  const openRatePercentage = Math.round(data.reminderOpenRate * 100) || 0;
  const snoozeRatePercentage = Math.round(data.snoozeRate * 100) || 0;

  // Custom SVG Bar Chart calculation (Priority Distribution)
  const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const maxPriorityCount = Math.max(...priorities.map(p => data.priorityDistribution[p] || 0), 1);

  // SVG Radial Circle Progress properties
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Productivity Analytics</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn} accessibilityLabel="Refresh data">
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.primary} />}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Streak & Highlights */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Ionicons name="flame" size={32} color="#F59E0B" />
            <View>
              <Text style={styles.streakValue}>{data.productivityStreak} Days</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
            </View>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakRight}>
            <Text style={styles.streakHeader}>Keep it up!</Text>
            <Text style={styles.streakSub}>Complete a task daily to build your streak.</Text>
          </View>
        </View>

        {/* Top level stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{data.totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{data.completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.error }]}>{data.overdueTasks}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Radial completion rate card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Completion Rate</Text>
          <View style={styles.radialContainer}>
            <View style={styles.radialChartWrap}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle
                  cx={60}
                  cy={60}
                  r={radius}
                  stroke={Colors.divider}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx={60}
                  cy={60}
                  r={radius}
                  stroke={Colors.primary}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.radialCenterTextWrap}>
                <Text style={styles.radialPercentage}>{completionPercentage}%</Text>
              </View>
            </View>
            <View style={styles.radialInfo}>
              <Text style={styles.radialHeading}>Completion Rate</Text>
              <Text style={styles.radialSub}>
                You have completed {data.completedTasks} out of {data.totalTasks} tasks.
              </Text>
            </View>
          </View>
        </View>

        {/* Priority breakdown bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks by Priority</Text>
          <View style={styles.barChartContainer}>
            {priorities.map((p) => {
              const count = data.priorityDistribution[p] || 0;
              const fillPercentage = count / maxPriorityCount;
              const barColor = Colors.priority[p];
              return (
                <View key={p} style={styles.barRow}>
                  <View style={styles.barLabelContainer}>
                    <Text style={styles.barText}>{p.toLowerCase()}</Text>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${fillPercentage * 100}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reminder CTR & Snooze rates */}
        <View style={styles.ratesRow}>
          <View style={[styles.card, styles.rateCardHalf]}>
            <Ionicons name="notifications-outline" size={24} color={Colors.primary} style={styles.rateIcon} />
            <Text style={styles.rateValue}>{openRatePercentage}%</Text>
            <Text style={styles.rateLabel}>Reminder Open Rate</Text>
            <Text style={styles.rateDetail}>{data.remindersOpened} of {data.remindersSent} opened</Text>
          </View>

          <View style={[styles.card, styles.rateCardHalf]}>
            <Ionicons name="alarm-outline" size={24} color={Colors.warning} style={styles.rateIcon} />
            <Text style={styles.rateValue}>{snoozeRatePercentage}%</Text>
            <Text style={styles.rateLabel}>Snooze Rate</Text>
            <Text style={styles.rateDetail}>{data.totalSnoozed} snoozes total</Text>
          </View>
        </View>

        {/* Completion trend line chart using SVG */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completion Trend</Text>
          {data.completionTrend && data.completionTrend.length > 0 ? (
            <View style={styles.trendContainer}>
              <Svg width={screenWidth - 64} height={120}>
                {/* Horizontal grid lines */}
                <Line x1="0" y1="20" x2={screenWidth - 64} y2="20" stroke={Colors.border} strokeWidth="1" />
                <Line x1="0" y1="60" x2={screenWidth - 64} y2="60" stroke={Colors.border} strokeWidth="1" />
                <Line x1="0" y1="100" x2={screenWidth - 64} y2="100" stroke={Colors.border} strokeWidth="1" />
                
                {/* Draw trend path */}
                {(() => {
                  const maxVal = Math.max(...data.completionTrend.map(d => d.count), 4);
                  const stepX = (screenWidth - 64) / (data.completionTrend.length - 1 || 1);
                  
                  const points = data.completionTrend.map((item, idx) => {
                    const x = idx * stepX;
                    const y = 100 - (item.count / maxVal) * 80; // Scale 0-80px inside 120px height
                    return { x, y, count: item.count, date: item.date };
                  });

                  const pathD = points.reduce((acc, p, idx) => {
                    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  return (
                    <>
                      <Path d={pathD} fill="transparent" stroke={Colors.primary} strokeWidth="3" />
                      {points.map((p, idx) => (
                        <Circle key={idx} cx={p.x} cy={p.y} r="4" fill={Colors.primaryDark} />
                      ))}
                    </>
                  );
                })()}
              </Svg>
              <View style={styles.trendLabelsRow}>
                {data.completionTrend.map((item, idx) => {
                  const dLabel = new Date(item.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <Text key={idx} style={styles.trendLabel}>
                      {dLabel}
                    </Text>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyTrend}>
              <Ionicons name="stats-chart-outline" size={40} color={Colors.text.disabled} />
              <Text style={styles.emptyTrendText}>No trend data available yet.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: Colors.text.secondary, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  refreshBtn: { padding: 4 },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10,
  },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: '500' },
  streakCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '40%' },
  streakValue: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  streakLabel: { fontSize: 11, color: Colors.text.secondary, fontWeight: '500' },
  streakDivider: { width: 1, height: 40, backgroundColor: Colors.border, marginHorizontal: 8 },
  streakRight: { flex: 1, paddingLeft: 8 },
  streakHeader: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  streakSub: { fontSize: 11, color: Colors.text.secondary, marginTop: 2, lineHeight: 15 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: 11, color: Colors.text.secondary, fontWeight: '600', marginTop: 2 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginBottom: 16 },
  radialContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  radialChartWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  radialCenterTextWrap: { position: 'absolute' },
  radialPercentage: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  radialInfo: { flex: 1, gap: 4 },
  radialHeading: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  radialSub: { fontSize: 12, color: Colors.text.secondary, lineHeight: 18 },
  barChartContainer: { gap: 12 },
  barRow: { gap: 6 },
  barLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, textTransform: 'capitalize' },
  barCount: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  barTrack: { height: 8, backgroundColor: Colors.divider, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  ratesRow: { flexDirection: 'row', gap: 12 },
  rateCardHalf: { flex: 1, alignItems: 'center', gap: 4 },
  rateIcon: { marginBottom: 4 },
  rateValue: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  rateLabel: { fontSize: 11, color: Colors.text.secondary, fontWeight: '600', textAlign: 'center' },
  rateDetail: { fontSize: 10, color: Colors.text.disabled, marginTop: 2 },
  trendContainer: { alignItems: 'center' },
  trendLabelsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginTop: 8, paddingHorizontal: 4,
  },
  trendLabel: { fontSize: 10, color: Colors.text.secondary, fontWeight: '500' },
  emptyTrend: { height: 120, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTrendText: { fontSize: 12, color: Colors.text.disabled },
});

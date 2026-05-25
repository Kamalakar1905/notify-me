import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { taskService } from '../../services/taskService';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchTasks, completeTask } from '../../store/taskSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Task } from '../../types';
import { Colors } from '../../constants/colors';
import TaskCard from '../../components/tasks/TaskCard';
import StatWidget from '../../components/analytics/StatWidget';
import { Calendar } from 'react-native-calendars';
import { Portal, Dialog, Button } from 'react-native-paper';
import PriorityBadge from '../../components/tasks/PriorityBadge';

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, loading } = useSelector((s: RootState) => s.tasks);
  const { user } = useSelector((s: RootState) => s.auth);
  const [showTomorrowPopup, setShowTomorrowPopup] = useState(true);
  const [pendingShares, setPendingShares] = useState<any[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE'>('ALL');

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDateString, setSelectedDateString] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [selectedPopupTask, setSelectedPopupTask] = useState<Task | null>(null);

  const loadPendingShares = useCallback(async () => {
    try {
      setSharesLoading(true);
      const data = await taskService.getPendingShares();
      setPendingShares(data);
    } catch (err) {
      console.error('Failed to load pending shares:', err);
    } finally {
      setSharesLoading(false);
    }
  }, []);

  const load = useCallback(() => {
    dispatch(fetchTasks({}));
    loadPendingShares();
  }, [dispatch, loadPendingShares]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcceptShare = async (shareId: string, postponeConflicts = false) => {
    try {
      await taskService.acceptShare(shareId, postponeConflicts);
      Alert.alert('Success', 'Task accepted and added to your tasks!');
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('already a task is scheduled for that time')) {
        Alert.alert(
          'Schedule Conflict',
          'You already have another task scheduled at this time. Would you like to postpone your conflicting task by 1 hour and accept the shared task, or reject it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject Invite', style: 'destructive', onPress: () => handleRejectShare(shareId) },
            { text: 'Postpone & Accept', onPress: () => handleAcceptShare(shareId, true) }
          ]
        );
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleRejectShare = async (shareId: string) => {
    try {
      await taskService.rejectShare(shareId);
      Alert.alert('Success', 'Invitation rejected');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to reject invitation');
    }
  };

  const isSameDate = (dueDateString?: string, targetDateString?: string) => {
    if (!dueDateString || !targetDateString) return false;
    return dueDateString.split('T')[0] === targetDateString;
  };

  const isTomorrow = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getFullYear() === tomorrow.getFullYear() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getDate() === tomorrow.getDate();
  };

  const todaysTasks = tasks.filter(t => isSameDate(t.dueDate, selectedDateString));
  const tomorrowTasks = tasks.filter(t => 
    isTomorrow(t.dueDate) && 
    t.recurrenceRule?.showPreviousDayPopup === true &&
    t.status === 'PENDING'
  );

  const prevTomorrowLength = useRef(tomorrowTasks.length);
  useEffect(() => {
    if (tomorrowTasks.length !== prevTomorrowLength.current) {
      if (tomorrowTasks.length > 0) {
        setShowTomorrowPopup(true);
      }
      prevTomorrowLength.current = tomorrowTasks.length;
    }
  }, [tomorrowTasks.length]);

  const pending = todaysTasks.filter(t => t.status === 'PENDING').length;
  const completed = todaysTasks.filter(t => t.status === 'COMPLETED').length;
  const overdue = todaysTasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status === 'PENDING'
  ).length;

  const markedDates: Record<string, any> = {};
  tasks.forEach(t => {
    if (t.dueDate) {
      const datePart = t.dueDate.split('T')[0];
      markedDates[datePart] = {
        marked: true,
        dotColor: Colors.primary,
      };
    }
  });

  markedDates[selectedDateString] = {
    ...markedDates[selectedDateString],
    selected: true,
    selectedColor: Colors.primary,
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const filteredTasks = todaysTasks.filter(t => {
    if (activeFilter === 'PENDING') return t.status === 'PENDING';
    if (activeFilter === 'COMPLETED') return t.status === 'COMPLETED';
    if (activeFilter === 'OVERDUE') {
      return t.dueDate && new Date(t.dueDate) < new Date() && t.status === 'PENDING';
    }
    return true;
  });

  const handleComplete = (id: string) => dispatch(completeTask(id));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.fullName?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.dateDisplay}>{formatDisplayDate(selectedDateString)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, showCalendar && styles.headerActionBtnActive]}
            onPress={() => setShowCalendar(prev => !prev)}
            accessibilityLabel="Toggle calendar"
          >
            <Ionicons
              name={showCalendar ? "calendar" : "calendar-outline"}
              size={22}
              color={showCalendar ? Colors.primary : Colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => router.push('/(app)/notifications/history')}
            accessibilityLabel="View notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible Calendar */}
      {showCalendar && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDateString}
            onDayPress={day => {
              setSelectedDateString(day.dateString);
            }}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: Colors.primary,
              todayTextColor: Colors.primary,
              arrowColor: Colors.primary,
              dotColor: Colors.primary,
              selectedDotColor: '#ffffff',
              calendarBackground: Colors.surface,
              textSectionTitleColor: Colors.text.secondary,
              dayTextColor: Colors.text.primary,
              monthTextColor: Colors.text.primary,
              textDisabledColor: Colors.text.disabled,
            }}
          />
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatWidget
          label="Pending"
          value={pending}
          icon="time-outline"
          color={Colors.warning}
          onPress={() => setActiveFilter(prev => prev === 'PENDING' ? 'ALL' : 'PENDING')}
          active={activeFilter === 'PENDING'}
        />
        <StatWidget
          label="Done"
          value={completed}
          icon="checkmark-circle-outline"
          color={Colors.success}
          onPress={() => setActiveFilter(prev => prev === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          active={activeFilter === 'COMPLETED'}
        />
        <StatWidget
          label="Overdue"
          value={overdue}
          icon="alert-circle-outline"
          color={Colors.error}
          onPress={() => setActiveFilter(prev => prev === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          active={activeFilter === 'OVERDUE'}
        />
      </View>

      {/* Pending Shares Section */}
      {pendingShares.length > 0 && (
        <View style={styles.sharesContainer}>
          <Text style={styles.sharesSectionTitle}>Pending Invitations ({pendingShares.length})</Text>
          <FlatList
            data={pendingShares}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sharesList}
            renderItem={({ item }) => (
              <View style={styles.shareCard}>
                <View style={styles.shareCardHeader}>
                  <Ionicons name="people" size={18} color={Colors.primary} />
                  <Text style={styles.shareOwner} numberOfLines={1}>{item.ownerName} shared a task</Text>
                </View>
                <Text style={styles.shareTitle} numberOfLines={2}>{item.task.title}</Text>
                {item.task.dueDate && (
                  <Text style={styles.shareTime}>
                    Due: {new Date(item.task.dueDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                )}
                <View style={styles.shareActions}>
                  <TouchableOpacity style={[styles.shareBtn, styles.rejectBtn]} onPress={() => handleRejectShare(item.id)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.shareBtn, styles.acceptBtn]} onPress={() => handleAcceptShare(item.id, false)}>
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Task list */}
      <FlatList
        data={filteredTasks}
        keyExtractor={t => t.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onComplete={() => handleComplete(item.id)}
            onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: item.id } })}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={72} color={Colors.border} />
              <Text style={styles.emptyTitle}>No tasks on this date</Text>
              <Text style={styles.emptySubtitle}>Tap below to create one.</Text>
              <TouchableOpacity
                style={styles.addDateTaskBtn}
                onPress={() => router.push({
                  pathname: '/(app)/task/create',
                  params: { date: selectedDateString }
                })}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addDateTaskBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Tomorrow's Tasks Popup */}
      {showTomorrowPopup && tomorrowTasks.length > 0 && (
        <View style={styles.popupContainer}>
          <View style={styles.popupHeader}>
            <View style={styles.popupTitleRow}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.popupTitle}>Tomorrow's Tasks ({tomorrowTasks.length})</Text>
            </View>
          </View>
          <FlatList
            data={tomorrowTasks}
            keyExtractor={t => t.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.popupTaskRow}
                onPress={() => setSelectedPopupTask(item)}
              >
                <Ionicons name="ellipse" size={8} color={Colors.primary} style={{ marginTop: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupTaskTitle} numberOfLines={1}>{item.title}</Text>
                  {item.reminderAt && (
                    <Text style={styles.popupTaskTime}>
                      {new Date(item.reminderAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.text.disabled} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            )}
            style={styles.popupList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Tomorrow Task Details Dialog */}
      <Portal>
        <Dialog visible={selectedPopupTask !== null} onDismiss={() => setSelectedPopupTask(null)}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>{selectedPopupTask?.title}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            {selectedPopupTask?.description ? (
              <Text style={{ fontSize: 14, color: Colors.text.primary, marginBottom: 8 }}>
                {selectedPopupTask.description}
              </Text>
            ) : (
              <Text style={{ fontSize: 14, color: Colors.text.disabled, fontStyle: 'italic', marginBottom: 8 }}>
                No description provided.
              </Text>
            )}
            
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flag-outline" size={16} color={Colors.text.secondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.secondary }}>Priority: </Text>
                {selectedPopupTask && <PriorityBadge priority={selectedPopupTask.priority} />}
              </View>

              {selectedPopupTask?.reminderAt && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alarm-outline" size={16} color={Colors.text.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.secondary }}>Reminder: </Text>
                  <Text style={{ fontSize: 13, color: Colors.text.primary }}>
                    {new Date(selectedPopupTask.reminderAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}

              {selectedPopupTask?.dueDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.text.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.secondary }}>Due Date: </Text>
                  <Text style={{ fontSize: 13, color: Colors.text.primary }}>
                    {new Date(selectedPopupTask.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </Text>
                </View>
              )}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedPopupTask(null)} textColor={Colors.primary}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 12, color: Colors.text.secondary },
  userName: { fontSize: 20, fontWeight: '800', color: Colors.text.primary, marginBottom: 2 },
  dateDisplay: { fontSize: 11, fontWeight: '600', color: Colors.primary, marginTop: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerActionBtnActive: {
    backgroundColor: '#EEF2FF',
  },
  calendarContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  addDateTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
  },
  addDateTaskBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 10,
  },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.secondary },
  emptySubtitle: { fontSize: 14, color: Colors.text.disabled },
  sharesContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sharesSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sharesList: {
    gap: 12,
    paddingBottom: 4,
  },
  shareCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 12,
    width: 260,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shareOwner: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  shareTime: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  shareActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  rejectBtnText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 220,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  popupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  popupCloseBtn: {
    padding: 4,
  },
  popupList: {
    flexGrow: 0,
  },
  popupTaskRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  popupTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  popupTaskTime: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});

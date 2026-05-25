import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Button, Portal, Dialog } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../../constants/colors';
import { taskService } from '../../../services/taskService';
import { completeTask, deleteTask, updateTask } from '../../../store/taskSlice';
import { AppDispatch } from '../../../store/store';
import { Task, Priority } from '../../../types';
import PriorityBadge from '../../../components/tasks/PriorityBadge';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [duePickerMode, setDuePickerMode] = useState<'date' | 'time'>('date');
  const [reminderPickerMode, setReminderPickerMode] = useState<'date' | 'time'>('date');

  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [snoozePickerMode, setSnoozePickerMode] = useState<'date' | 'time'>('date');
  const [tempSnoozeDate, setTempSnoozeDate] = useState<Date | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmailOrMobile, setShareEmailOrMobile] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const openDuePicker = () => {
    if (Platform.OS === 'android') {
      setDuePickerMode('date');
    }
    setShowDuePicker(true);
  };

  const openReminderPicker = () => {
    if (Platform.OS === 'android') {
      setReminderPickerMode('date');
    }
    setShowReminderPicker(true);
  };

  const handleDueChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDuePicker(false);
      return;
    }
    if (Platform.OS === 'android') {
      if (duePickerMode === 'date') {
        const current = selectedDate || new Date();
        setDueDate(current);
        setDuePickerMode('time');
      } else {
        const time = selectedDate || new Date();
        setDueDate(prev => {
          const base = prev || new Date();
          return new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            time.getHours(),
            time.getMinutes()
          );
        });
        setShowDuePicker(false);
      }
    } else {
      if (selectedDate) setDueDate(selectedDate);
      setShowDuePicker(false);
    }
  };

  const handleReminderChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowReminderPicker(false);
      return;
    }
    if (Platform.OS === 'android') {
      if (reminderPickerMode === 'date') {
        const current = selectedDate || new Date();
        setReminderAt(current);
        setReminderPickerMode('time');
      } else {
        const time = selectedDate || new Date();
        setReminderAt(prev => {
          const base = prev || new Date();
          return new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            time.getHours(),
            time.getMinutes()
          );
        });
        setShowReminderPicker(false);
      }
    } else {
      if (selectedDate) setReminderAt(selectedDate);
      setShowReminderPicker(false);
    }
  };

  const fmt = (d: Date) => d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const openSnoozePicker = () => {
    if (Platform.OS === 'android') {
      setSnoozePickerMode('date');
      setTempSnoozeDate(null);
    }
    setShowSnoozePicker(true);
  };

  const handleSnoozeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowSnoozePicker(false);
      return;
    }

    if (Platform.OS === 'android') {
      if (snoozePickerMode === 'date') {
        const current = selectedDate || new Date();
        setTempSnoozeDate(current);
        setSnoozePickerMode('time');
      } else {
        const time = selectedDate || new Date();
        const base = tempSnoozeDate || new Date();
        const combined = new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          time.getHours(),
          time.getMinutes()
        );
        setShowSnoozePicker(false);
        handleSnooze(combined);
      }
    } else {
      setShowSnoozePicker(false);
      if (selectedDate) handleSnooze(selectedDate);
    }
  };

  const fetchTaskDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await taskService.getTask(id);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setPriority(data.priority);
      setDueDate(data.dueDate ? new Date(data.dueDate) : null);
      setReminderAt(data.reminderAt ? new Date(data.reminderAt) : null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch task details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleComplete = async () => {
    if (!task) return;
    try {
      setActionLoading(true);
      const updated = await dispatch(completeTask(task.id)).unwrap();
      setTask(updated);
      Alert.alert('Success', 'Task updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to update task status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!task) return;
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await dispatch(updateTask({
        id: task.id,
        payload: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: (dueDate?.toISOString() || null) as any,
          reminderAt: (reminderAt?.toISOString() || null) as any,
        }
      })).unwrap();
      setTask(updated);
      setIsEditing(false);
      Alert.alert('Success', 'Task updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to update task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await dispatch(deleteTask(task.id)).unwrap();
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err || 'Failed to delete task');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSnooze = async (snoozeDate: Date) => {
    if (!task) return;
    try {
      setActionLoading(true);
      const updated = await taskService.snoozeTask(task.id, snoozeDate.toISOString());
      setTask(updated);
      Alert.alert('Success', `Task snoozed until ${snoozeDate.toLocaleTimeString()}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to snooze task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!task) return;
    Alert.alert('Skip Occurrence', 'Do you want to skip the current occurrence of this recurring task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        onPress: async () => {
          try {
            setActionLoading(true);
            const updated = await taskService.skipTask(task.id);
            setTask(updated);
            Alert.alert('Success', 'Occurrence skipped');
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to skip occurrence');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleShareTask = async () => {
    if (!task) return;
    if (!shareEmailOrMobile.trim()) {
      Alert.alert('Error', 'Please enter email or mobile number');
      return;
    }
    try {
      setShareLoading(true);
      await taskService.shareTask(task.id, shareEmailOrMobile.trim());
      Alert.alert('Success', 'Task share invitation sent successfully');
      setShowShareDialog(false);
      setShareEmailOrMobile('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to share task');
    } finally {
      setShareLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!task) return null;

  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && task.status === 'PENDING');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <TouchableOpacity onPress={handleDelete} disabled={actionLoading} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              label="Task Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p} onPress={() => setPriority(p)}>
                  <PriorityBadge priority={p} selected={priority === p} large />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={openDuePicker}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateBtnText}>
                {dueDate ? fmt(dueDate) : 'Select due date'}
              </Text>
              {dueDate && (
                <TouchableOpacity onPress={() => setDueDate(null)}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Reminder</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={openReminderPicker}>
              <Ionicons name="alarm-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateBtnText}>
                {reminderAt ? fmt(reminderAt) : 'Set reminder time'}
              </Text>
              {reminderAt && (
                <TouchableOpacity onPress={() => setReminderAt(null)}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.editActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setIsEditing(false);
                  setTitle(task.title);
                  setDescription(task.description || '');
                  setPriority(task.priority);
                  setDueDate(task.dueDate ? new Date(task.dueDate) : null);
                  setReminderAt(task.reminderAt ? new Date(task.reminderAt) : null);
                }}
                style={styles.btnHalf}
                textColor={Colors.text.secondary}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdate}
                loading={actionLoading}
                disabled={actionLoading}
                style={styles.btnHalf}
                buttonColor={Colors.primary}
              >
                Save
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.detailsContainer}>
            {/* Status Header */}
            <View style={[styles.statusBanner, isCompleted ? styles.statusSuccess : isOverdue ? styles.statusError : styles.statusPending]}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
                size={20}
                color="#fff"
              />
              <Text style={styles.statusText}>
                {isCompleted ? 'Completed' : isOverdue ? 'Overdue!' : 'Pending'}
              </Text>
            </View>

            <Text style={styles.titleText}>{task.title}</Text>
            
            {task.description ? (
              <Text style={styles.descText}>{task.description}</Text>
            ) : (
              <Text style={styles.noDescText}>No description provided.</Text>
            )}

            <View style={styles.divider} />

            {/* Info Items */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="flag-outline" size={18} color={Colors.text.secondary} />
                <Text style={styles.infoLabel}>Priority:</Text>
                <PriorityBadge priority={task.priority} large />
              </View>

              {task.dueDate && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.text.secondary} />
                  <Text style={styles.infoLabel}>Due Date:</Text>
                  <Text style={[styles.infoValue, isOverdue && styles.textError]}>
                    {new Date(task.dueDate).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              )}

              {task.reminderAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="alarm-outline" size={18} color={Colors.text.secondary} />
                  <Text style={styles.infoLabel}>Reminder:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(task.reminderAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={18} color={Colors.text.secondary} />
                <Text style={styles.infoLabel}>Timezone:</Text>
                <Text style={styles.infoValue}>{task.timezone || 'UTC'}</Text>
              </View>

              {task.isRecurring && task.recurrenceRule && (
                <View style={styles.infoRow}>
                  <Ionicons name="repeat" size={18} color={Colors.text.secondary} />
                  <Text style={styles.infoLabel}>Repeats:</Text>
                  <Text style={styles.infoValue}>
                    {((task.recurrenceRule as any).type || '').toLowerCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsGrid}>
              <Button
                mode="contained"
                onPress={handleComplete}
                loading={actionLoading}
                disabled={actionLoading}
                style={styles.actionBtn}
                buttonColor={isCompleted ? Colors.warning : Colors.success}
                icon={isCompleted ? 'close-circle' : 'checkmark-circle'}
              >
                {isCompleted ? 'Mark Pending' : 'Mark Complete'}
              </Button>

              {!isCompleted && (
                <Button
                  mode="outlined"
                  onPress={openSnoozePicker}
                  disabled={actionLoading}
                  style={styles.actionBtn}
                  textColor={Colors.primary}
                  icon="alarm-plus"
                >
                  Snooze
                </Button>
              )}

              {task.isRecurring && !isCompleted && (
                <Button
                  mode="outlined"
                  onPress={handleSkip}
                  disabled={actionLoading}
                  style={styles.actionBtn}
                  textColor={Colors.warning}
                  icon="skip-next"
                >
                  Skip Occurrence
                </Button>
              )}

              <Button
                mode="outlined"
                onPress={() => setIsEditing(true)}
                disabled={actionLoading}
                style={styles.actionBtn}
                textColor={Colors.text.primary}
                icon="pencil"
              >
                Edit Details
              </Button>

              <Button
                mode="outlined"
                onPress={() => setShowShareDialog(true)}
                disabled={actionLoading}
                style={styles.actionBtn}
                textColor={Colors.primary}
                icon="share"
              >
                Share Task
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {showSnoozePicker && (
        <DateTimePicker
          value={tempSnoozeDate ?? new Date()}
          mode={Platform.OS === 'android' ? snoozePickerMode : 'datetime'}
          minimumDate={new Date()}
          onChange={handleSnoozeChange}
        />
      )}

      {showDuePicker && (
        <DateTimePicker
          value={dueDate ?? new Date()}
          mode={Platform.OS === 'android' ? duePickerMode : 'datetime'}
          minimumDate={new Date()}
          onChange={handleDueChange}
        />
      )}

      {showReminderPicker && (
        <DateTimePicker
          value={reminderAt ?? new Date()}
          mode={Platform.OS === 'android' ? reminderPickerMode : 'datetime'}
          minimumDate={new Date()}
          onChange={handleReminderChange}
        />
      )}

      <Portal>
        <Dialog visible={showShareDialog} onDismiss={() => { if (!shareLoading) setShowShareDialog(false); }}>
          <Dialog.Title>Share Task</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12, color: Colors.text.secondary }}>
              Enter the email or mobile number of the person you want to share this task with.
            </Text>
            <TextInput
              label="Email or Mobile Number"
              value={shareEmailOrMobile}
              onChangeText={setShareEmailOrMobile}
              mode="outlined"
              autoCapitalize="none"
              disabled={shareLoading}
              activeOutlineColor={Colors.primary}
              outlineColor={Colors.border}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={shareLoading} onPress={() => setShowShareDialog(false)} textColor={Colors.text.secondary}>
              Cancel
            </Button>
            <Button loading={shareLoading} disabled={shareLoading} onPress={handleShareTask} textColor={Colors.primary}>
              Share
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  deleteBtn: { padding: 4 },
  scroll: { padding: 16, paddingBottom: 60 },
  detailsContainer: { gap: 16 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
  },
  statusPending: { backgroundColor: Colors.warning },
  statusSuccess: { backgroundColor: Colors.success },
  statusError: { backgroundColor: Colors.error },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  titleText: { fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  descText: { fontSize: 15, color: Colors.text.secondary, lineHeight: 22 },
  noDescText: { fontSize: 15, color: Colors.text.disabled, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  infoSection: { gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, color: Colors.text.secondary, width: 80, fontWeight: '500' },
  infoValue: { fontSize: 14, color: Colors.text.primary, fontWeight: '600' },
  textError: { color: Colors.error },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  actionsGrid: { gap: 12 },
  actionBtn: { borderRadius: 10, paddingVertical: 4 },
  editForm: { gap: 16 },
  input: { backgroundColor: Colors.surface },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary, marginBottom: -8 },
  priorityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 8, marginTop: 8,
  },
  dateBtnText: { flex: 1, fontSize: 14, color: Colors.text.primary },
  editActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  btnHalf: { width: '48%', borderRadius: 10 },
});

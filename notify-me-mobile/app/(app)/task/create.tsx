import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createTask } from '../../../store/taskSlice';
import { AppDispatch } from '../../../store/store';
import { taskService } from '../../../services/taskService';
import { SuggestionCard, Priority } from '../../../types';
import { Colors } from '../../../constants/colors';
import ReminderSuggestionCard from '../../../components/tasks/ReminderSuggestionCard';
import PriorityBadge from '../../../components/tasks/PriorityBadge';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function CreateTaskScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { date } = useLocalSearchParams<{ date?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [duePickerMode, setDuePickerMode] = useState<'date' | 'time'>('date');
  const [reminderPickerMode, setReminderPickerMode] = useState<'date' | 'time'>('date');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('DAILY');
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [showPreviousDayPopup, setShowPreviousDayPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (date) {
      const preselectedDate = new Date(date);
      // Default to 9:00 AM on the preselected date
      preselectedDate.setHours(9, 0, 0, 0);
      setDueDate(preselectedDate);
    }
  }, [date]);

  const openTimeOnlyPicker = () => {
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDueDate(prev => {
        const base = prev || new Date();
        return new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate(),
          selectedDate.getHours(),
          selectedDate.getMinutes()
        );
      });
    }
  };

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

  useEffect(() => {
    if (dueDate) {
      const morning = new Date(dueDate);
      morning.setHours(8);
      morning.setMinutes(30);
      morning.setSeconds(0);
      morning.setMilliseconds(0);

      const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

      setSuggestions([
        {
          label: 'Mrng 8.30 AM on the due date',
          suggestedTime: morning.toISOString(),
          type: 'MORNING',
        },
        {
          label: 'One hour before the time of task',
          suggestedTime: oneHourBefore.toISOString(),
          type: 'BEFORE_DUE',
        },
      ]);
    } else {
      setSuggestions([]);
    }
  }, [dueDate]);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Task title is required'); return; }
    setLoading(true);
    const result = await dispatch(createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate?.toISOString(),
      reminderAt: reminderAt?.toISOString(),
      isRecurring,
      recurrenceRule: isRecurring 
        ? { type: recurrenceType, showPreviousDayPopup } 
        : { showPreviousDayPopup },
      suggestionEnabled: true,
    }));
    setLoading(false);
    if (createTask.fulfilled.match(result)) {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate(null);
      setReminderAt(null);
      setIsRecurring(false);
      setShowPreviousDayPopup(false);
      router.back();
    } else {
      const errorMsg = result.payload as string || 'Failed to create task. Please try again.';
      Alert.alert('Error', errorMsg);
    }
  };

  const fmt = (d: Date) => d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="close" size={26} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Task</Text>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading || !title.trim()}
          buttonColor={Colors.primary}
          style={styles.saveBtn}
          compact
        >
          Save
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <TextInput
          label="Task Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          left={<TextInput.Icon icon="format-title" />}
        />

        {/* Description */}
        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          left={<TextInput.Icon icon="text" />}
        />

        {/* Priority */}
        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              accessibilityLabel={`Set priority ${p}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: priority === p }}
            >
              <PriorityBadge priority={p} selected={priority === p} large />
            </TouchableOpacity>
          ))}
        </View>

        {/* Due Date */}
        <Text style={styles.sectionLabel}>Due Date</Text>
        {date ? (
          <View>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={openTimeOnlyPicker}
              accessibilityLabel="Select due time"
              accessibilityRole="button"
            >
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateBtnText}>
                {dueDate 
                  ? `Due Time: ${dueDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Select time'
                }
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode="time"
                onChange={handleTimeChange}
              />
            )}
          </View>
        ) : (
          <View>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={openDuePicker}
              accessibilityLabel="Select due date"
              accessibilityRole="button"
            >
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
            {showDuePicker && (
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode={Platform.OS === 'android' ? duePickerMode : 'datetime'}
                minimumDate={new Date()}
                onChange={handleDueChange}
              />
            )}
          </View>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Smart Reminder Suggestions</Text>
            <Text style={styles.sectionHint}>Based on your activity patterns.</Text>
            {suggestions.map((s, i) => (
              <ReminderSuggestionCard
                key={i}
                suggestion={s}
                onApply={() => setReminderAt(new Date(s.suggestedTime))}
                isApplied={reminderAt?.toISOString() === s.suggestedTime}
              />
            ))}
          </>
        )}

        {/* Reminder */}
        <Text style={styles.sectionLabel}>Reminder</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={openReminderPicker}
          accessibilityLabel="Select reminder time"
          accessibilityRole="button"
        >
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
        {showReminderPicker && (
          <DateTimePicker
            value={reminderAt ?? new Date()}
            mode={Platform.OS === 'android' ? reminderPickerMode : 'datetime'}
            minimumDate={new Date()}
            onChange={handleReminderChange}
          />
        )}

        {/* Previous Day Reminder */}
        <View style={styles.recurringRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionLabel}>Previous Day Reminder</Text>
            <Text style={styles.sectionHint}>Show popup on home screen the day before</Text>
          </View>
          <Switch
            value={showPreviousDayPopup}
            onValueChange={setShowPreviousDayPopup}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={showPreviousDayPopup ? Colors.primary : Colors.text.disabled}
            accessibilityLabel="Toggle previous day reminder"
          />
        </View>

        {/* Recurring */}
        <View style={styles.recurringRow}>
          <View>
            <Text style={styles.sectionLabel}>Recurring Task</Text>
            <Text style={styles.sectionHint}>Repeat this task automatically</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={isRecurring ? Colors.primary : Colors.text.disabled}
            accessibilityLabel="Toggle recurring task"
          />
        </View>

        {isRecurring && (
          <SegmentedButtons
            value={recurrenceType}
            onValueChange={setRecurrenceType}
            buttons={[
              { value: 'DAILY', label: 'Daily' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'MONTHLY', label: 'Monthly' },
            ]}
            style={styles.segmented}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  saveBtn: { borderRadius: 8 },
  scroll: { padding: 16, paddingBottom: 100 },
  input: { marginBottom: 16, backgroundColor: Colors.surface },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: 12, color: Colors.text.disabled, marginBottom: 8, marginTop: -4 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  dateBtnText: { flex: 1, fontSize: 14, color: Colors.text.primary },
  recurringRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  segmented: { marginBottom: 16 },
});

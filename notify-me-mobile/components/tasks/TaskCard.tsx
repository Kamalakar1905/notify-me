import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';
import { Colors } from '../../constants/colors';
import PriorityBadge from './PriorityBadge';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onPress: () => void;
}

export default function TaskCard({ task, onComplete, onPress }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED';
  const isOverdue = Boolean(
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status === 'PENDING'
  );

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        isOverdue && styles.cardOverdue,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Complete Button */}
      <TouchableOpacity
        style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
        onPress={onComplete}
        accessibilityLabel={isCompleted ? 'Mark pending' : 'Mark complete'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
      >
        {isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isCompleted && styles.titleCompleted]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.description ? (
          <Text
            style={[styles.desc, isCompleted && styles.descCompleted]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}

        {/* Footer Meta Row */}
        <View style={styles.metaRow}>
          <PriorityBadge priority={task.priority} />

          {task.isRecurring && (
            <View style={styles.recurringWrap}>
              <Ionicons name="repeat" size={14} color={Colors.text.secondary} />
              <Text style={styles.metaText}>
                {task.recurrenceRule?.type?.toLowerCase() || 'repeat'}
              </Text>
            </View>
          )}

          {formattedDueDate && (
            <View style={styles.dateWrap}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isOverdue ? Colors.error : Colors.text.secondary}
              />
              <Text style={[styles.metaText, isOverdue && styles.dateTextOverdue]}>
                {formattedDueDate}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardCompleted: {
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    opacity: 0.8,
  },
  cardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  titleCompleted: {
    color: Colors.text.disabled,
    textDecorationLine: 'line-through',
  },
  desc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  descCompleted: {
    color: Colors.text.disabled,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  recurringWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTextOverdue: {
    color: Colors.error,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Priority } from '../../types';
import { Colors } from '../../constants/colors';

interface PriorityBadgeProps {
  priority: Priority;
  selected?: boolean;
  large?: boolean;
}

export default function PriorityBadge({ priority, selected, large }: PriorityBadgeProps) {
  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (priority) {
      case 'LOW':
        return 'arrow-down';
      case 'MEDIUM':
        return 'remove';
      case 'HIGH':
        return 'arrow-up';
      case 'CRITICAL':
        return 'alert-circle';
    }
  };

  const getPriorityLabel = () => {
    switch (priority) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      case 'CRITICAL':
        return 'Critical';
    }
  };

  const bgColor = Colors.priorityBg[priority] || '#E5E7EB';
  const textColor = Colors.priority[priority] || '#374151';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        large && styles.largeBadge,
        selected && { borderWidth: 2, borderColor: textColor },
      ]}
    >
      <Ionicons
        name={getIconName()}
        size={large ? 16 : 12}
        color={textColor}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          { color: textColor },
          large && styles.largeText,
          selected && styles.selectedText,
        ]}
      >
        {getPriorityLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  largeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  largeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedText: {
    fontWeight: '800',
  },
});

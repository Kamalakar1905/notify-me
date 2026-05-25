import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuggestionCard } from '../../types';
import { Colors } from '../../constants/colors';

interface ReminderSuggestionCardProps {
  suggestion: SuggestionCard;
  onApply: () => void;
  isApplied: boolean;
}

export default function ReminderSuggestionCard({
  suggestion,
  onApply,
  isApplied,
}: ReminderSuggestionCardProps) {
  const formattedTime = new Date(suggestion.suggestedTime).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.card, isApplied && styles.cardApplied]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={isApplied ? Colors.success : Colors.primary}
          />
          <Text style={[styles.label, isApplied && styles.textSuccess]}>
            {suggestion.label}
          </Text>
        </View>
        <Text style={styles.time}>{formattedTime}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isApplied ? styles.buttonApplied : styles.buttonApply,
        ]}
        onPress={onApply}
        disabled={isApplied}
      >
        {isApplied ? (
          <View style={styles.btnRow}>
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={styles.buttonText}>Applied</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Apply</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardApplied: {
    borderColor: Colors.success,
    backgroundColor: '#ECFDF5',
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  textSuccess: {
    color: Colors.success,
  },
  time: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 22,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  buttonApply: {
    backgroundColor: Colors.primary,
  },
  buttonApplied: {
    backgroundColor: Colors.success,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

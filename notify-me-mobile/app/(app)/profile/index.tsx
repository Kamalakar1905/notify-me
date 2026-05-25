import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { AppDispatch, RootState } from '../../../store/store';
import { logoutUser } from '../../../store/authSlice';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(
    user?.smartSuggestionsEnabled ?? true
  );
  const [autoDetectTimezone, setAutoDetectTimezone] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await dispatch(logoutUser());
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{user?.fullName || 'User Name'}</Text>
            <Text style={styles.emailText}>{user?.email || user?.mobileNumber || 'No email provided'}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Smart Suggestions</Text>
                <Text style={styles.settingDesc}>Get AI-powered reminder times</Text>
              </View>
            </View>
            <Switch
              value={smartSuggestionsEnabled}
              onValueChange={setSmartSuggestionsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={smartSuggestionsEnabled ? Colors.primary : Colors.text.disabled}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Auto-detect Timezone</Text>
                <Text style={styles.settingDesc}>Currently: {user?.timezone || 'UTC'}</Text>
              </View>
            </View>
            <Switch
              value={autoDetectTimezone}
              onValueChange={setAutoDetectTimezone}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={autoDetectTimezone ? Colors.primary : Colors.text.disabled}
            />
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.settingGroup}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} />
              <Text style={styles.actionLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <View style={styles.settingInfo}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={[styles.actionLabel, { color: Colors.error }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  scroll: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: Colors.primaryDark },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  emailText: { fontSize: 13, color: Colors.text.secondary },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingGroup: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24, overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  settingDesc: { fontSize: 12, color: Colors.text.secondary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  actionLabel: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
});

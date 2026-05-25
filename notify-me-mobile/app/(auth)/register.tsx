import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../../store/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../constants/colors';
import * as Localization from 'expo-localization';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const timezone = Localization.getCalendars()[0]?.timeZone ?? 'UTC';

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill all fields'); return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match'); return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters'); return;
    }
    const result = await dispatch(registerUser({ fullName, email, password, timezone }));
    if (registerUser.fulfilled.match(result)) {
      router.replace('/(app)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Notify Me and stay on top of everything</Text>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-check" />}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <Text style={styles.timezoneNote}>
            <Ionicons name="globe-outline" size={13} /> Timezone: {timezone}
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.btn}
            contentStyle={styles.btnContent}
            buttonColor={Colors.primary}
          >
            Create Account
          </Button>

          <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { marginTop: 16, marginBottom: 8, width: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 32 },
  form: { gap: 4 },
  input: { marginBottom: 12, backgroundColor: Colors.surface },
  timezoneNote: { fontSize: 12, color: Colors.text.secondary, marginBottom: 8, marginLeft: 4 },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 8 },
  btn: { marginTop: 8, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: Colors.text.secondary },
  loginBold: { color: Colors.primary, fontWeight: '700' },
});

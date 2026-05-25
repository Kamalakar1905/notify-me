import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { loginWithEmail, sendOtpThunk } from '../../store/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);

  const [tab, setTab] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return; }
    const result = await dispatch(loginWithEmail({ email, password }));
    if (loginWithEmail.fulfilled.match(result)) {
      router.replace('/(app)');
    }
  };

  const handleSendOtp = async () => {
    if (!identifier) { Alert.alert('Error', 'Enter email or mobile number'); return; }
    const result = await dispatch(sendOtpThunk(identifier));
    if (sendOtpThunk.fulfilled.match(result)) {
      setOtpSent(true);
      router.push({ pathname: '/(auth)/otp-verify', params: { identifier } });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="notifications" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>Notify Me</Text>
          <Text style={styles.tagline}>Smart Reminders, Smarter You</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {(['email', 'otp'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'email' ? 'Email / Password' : 'OTP Login'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {tab === 'email' ? (
            <>
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
              {error && <Text style={styles.errorText}>{error}</Text>}
              <Button
                mode="contained"
                onPress={handleEmailLogin}
                loading={loading}
                disabled={loading}
                style={styles.btn}
                contentStyle={styles.btnContent}
                buttonColor={Colors.primary}
              >
                Sign In
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="Email or Mobile Number"
                value={identifier}
                onChangeText={setIdentifier}
                mode="outlined"
                autoCapitalize="none"
                left={<TextInput.Icon icon="account" />}
                style={styles.input}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <Button
                mode="contained"
                onPress={handleSendOtp}
                loading={loading}
                disabled={loading}
                style={styles.btn}
                contentStyle={styles.btnContent}
                buttonColor={Colors.primary}
              >
                Send OTP
              </Button>
            </>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={() => Alert.alert('Google Login', 'Configure Google OAuth credentials in app.json')}>
            <Ionicons name="logo-google" size={20} color={Colors.text.primary} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerBold}>Sign Up</Text>
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
  header: { alignItems: 'center', marginTop: 48, marginBottom: 32 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, elevation: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  appName: { fontSize: 32, fontWeight: '800', color: Colors.text.primary, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.divider, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  tabText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  form: { gap: 4 },
  input: { marginBottom: 12, backgroundColor: Colors.surface },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 8, marginLeft: 4 },
  btn: { marginTop: 8, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 12, color: Colors.text.secondary, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 14, gap: 10, backgroundColor: Colors.surface,
  },
  googleText: { fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  registerLink: { alignItems: 'center', marginTop: 20 },
  registerText: { fontSize: 14, color: Colors.text.secondary },
  registerBold: { color: Colors.primary, fontWeight: '700' },
});

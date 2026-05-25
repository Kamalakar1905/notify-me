import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput as RNTextInput,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { verifyOtp, sendOtpThunk } from '../../store/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../constants/colors';

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<RNTextInput[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/[^0-9]/g, '');
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Error', 'Enter the 6-digit OTP'); return; }
    const result = await dispatch(verifyOtp({ identifier: identifier!, otp: code }));
    if (verifyOtp.fulfilled.match(result)) {
      router.replace('/(app)');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await dispatch(sendOtpThunk(identifier!));
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <Ionicons name="mail-open-outline" size={64} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.identifier}>{identifier}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, idx) => (
          <RNTextInput
            key={idx}
            ref={r => { if (r) inputs.current[idx] = r; }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={v => handleChange(v, idx)}
            onKeyPress={e => handleKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            accessibilityLabel={`OTP digit ${idx + 1}`}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        mode="contained"
        onPress={handleVerify}
        loading={loading}
        disabled={loading}
        style={styles.btn}
        contentStyle={styles.btnContent}
        buttonColor={Colors.primary}
      >
        Verify & Continue
      </Button>

      <TouchableOpacity onPress={handleResend} disabled={countdown > 0} style={styles.resendBtn}>
        <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  backBtn: { marginTop: 16, marginBottom: 8, width: 40 },
  iconWrap: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  identifier: { color: Colors.primary, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: {
    width: 48, height: 56, borderWidth: 2, borderColor: Colors.border,
    borderRadius: 12, fontSize: 24, fontWeight: '700', color: Colors.text.primary,
    backgroundColor: Colors.surface,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: '#EEF2FF' },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: 12 },
  btn: { borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  resendBtn: { alignItems: 'center', marginTop: 20 },
  resendText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  resendDisabled: { color: Colors.text.disabled },
});

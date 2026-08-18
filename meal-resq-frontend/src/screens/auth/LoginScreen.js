import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { authService } from '../../services/authService';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export function LoginScreen({ navigation, route, selectedRole, onChangeRole, onLoginSuccess }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const successNotice = route?.params?.successNotice || '';


  // Forgot Password Modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [otpDemoNotice, setOtpDemoNotice] = useState('');

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, [selectedRole]);



  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    let result = await authService.login(email.trim(), password, selectedRole?.key || 'donor');
    setLoading(false);

    if (result && result.success) {
      onLoginSuccess(result.user);
    } else {
      setErrorMsg(result?.message || result?.error || '⚠️ Account not found! Please click "Create Account" below to sign up first.');
    }
  };



  const handleSendForgotOtp = async () => {
    setForgotMsg('');
    setOtpDemoNotice('');
    if (!forgotEmail.trim()) {
      setForgotMsg('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    const res = await authService.sendForgotPasswordOTP(forgotEmail.trim());
    setForgotLoading(false);

    if (res.success) {
      setOtpSent(true);
      setForgotOtp('');
      setForgotMsg(`🔑 Verification code sent directly to ${forgotEmail.trim()}. Please check your email inbox for your 6-digit OTP code.`);
    } else {
      setForgotMsg(res.message);
    }
  };



  const handleResetPassword = async () => {
    setForgotMsg('');
    if (!forgotOtp.trim()) {
      setForgotMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setForgotMsg('Password must be at least 6 characters with letters and numbers.');
      return;
    }
    setForgotLoading(true);
    const res = await authService.resetPassword(forgotEmail.trim(), forgotOtp.trim(), newPassword);
    setForgotLoading(false);

    if (res.success) {
      setForgotMsg(res.message);
      setTimeout(() => {
        setForgotModalVisible(false);
        setOtpSent(false);
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
        setForgotMsg('');
      }, 1800);
    } else {
      setForgotMsg(res.message);
    }
  };

  const roleColor = selectedRole?.color || colors.primary;

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back / Role Switcher Header */}
        <View style={styles.roleHeader}>
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.surfaceBorder }]} onPress={onChangeRole}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>Change Role</Text>
          </TouchableOpacity>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}20`, borderColor: roleColor }]}>
            <Text style={{ fontSize: 14 }}>{selectedRole?.icon}</Text>
            <Text style={[styles.rolePillText, { color: roleColor }]}>{selectedRole?.title}</Text>
          </View>
        </View>


        {/* Prominent Sign In Form Box */}
        <View style={[styles.formBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Sign In to Meal-ResQ</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your account credentials to proceed</Text>
          </View>

          {successNotice ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
              <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '700' }}>{successNotice}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}


          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
              placeholder="name@domain.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="off"
              textContentType="none"

              name="email"
              id="email"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('password')}</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                name="password"
                id="password"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>




          <TouchableOpacity style={styles.forgotRow} onPress={() => setForgotModalVisible(true)}>
            <Text style={[styles.forgotText, { color: roleColor }]}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: roleColor }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>{t('signIn')}</Text>
            )}
          </TouchableOpacity>

          {selectedRole?.key !== 'admin' && (
            <View style={styles.signupRow}>
              <Text style={{ color: colors.textSecondary }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.signupLink, { color: roleColor }]}>Sign Up as {selectedRole?.title}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>


      {/* Forgot Password OTP Modal */}
      <Modal visible={forgotModalVisible} transparent animationType="slide" onRequestClose={() => setForgotModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>🔑 Reset Password</Text>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {forgotMsg ? (
              <Text style={[styles.modalNotice, { color: colors.primary }]}>{forgotMsg}</Text>
            ) : null}


            {!otpSent ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Registered Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                  placeholder="name@domain.com"
                  placeholderTextColor={colors.textMuted}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: roleColor }]}
                  onPress={handleSendForgotOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Send Verification Code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>6-Digit Verification Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                  placeholder="• • • • • •"

                  placeholderTextColor={colors.textMuted}
                  value={forgotOtp}
                  onChangeText={setForgotOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>New Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
                  placeholder="Minimum 6 chars (letters + numbers)"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: roleColor }]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </MobileAppFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },

  formBox: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },

  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 46,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },

  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupLink: {
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalNotice: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  otpBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  otpBannerText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});

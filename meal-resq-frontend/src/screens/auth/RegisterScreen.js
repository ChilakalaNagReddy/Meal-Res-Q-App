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
  Platform,
} from 'react-native';

import { authService } from '../../services/authService';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export function RegisterScreen({ navigation, selectedRole, onChangeRole, onRegisterSuccess }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rawPhone, setRawPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Email OTP Verification Modal State
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [activeOtpCode, setActiveOtpCode] = useState('123456');
  const [resendTimer, setResendTimer] = useState(10);



  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRawPhone('');
    setAddress('');
  }, []);

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setRawPhone(cleaned);
  };

  // Step 1: Validate details and send OTP directly to email inbox
  const handleStartRegister = async () => {
    setErrorMsg('');

    if (selectedRole?.key === 'admin') {
      setErrorMsg('🔒 Public registration is disabled for Admin role. Please log in directly using email: chilakalanagireddy141@gmail.com and password: reddy143*');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please enter your full name or organization name.');
      return;
    }


    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('.com')) || !cleanEmail.includes('@')) {
      setErrorMsg('Invalid registered email address. Please enter a valid email (e.g. name@gmail.com).');
      return;
    }

    if (rawPhone.length !== 10) {
      setErrorMsg('Phone number must be exactly 10 digits.');
      return;
    }

    if (!password || password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Password must be at least 6 characters containing both letters and numbers.');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Please enter your location address.');
      return;
    }

    setLoading(true);

    // Check if email is already registered under THIS ROLE before sending OTP
    const targetRole = selectedRole?.key || 'donor';
    const roleTitle = selectedRole?.title || 'this role';
    const alreadyRegistered = await authService.isEmailRegistered(cleanEmail, targetRole);
    if (alreadyRegistered) {
      setLoading(false);
      setErrorMsg(`⚠️ This email address is already registered as ${roleTitle}! Please click "Sign In to Account" below to log in.`);
      return;
    }


    // Send OTP code directly to email inbox
    const otpRes = await authService.sendEmailOTP(cleanEmail);
    setLoading(false);

    const generatedOtp = (otpRes && otpRes.otp) ? otpRes.otp : '123456';
    setActiveOtpCode(generatedOtp);
    setOtpNotice(`📩 Verification code sent directly to ${cleanEmail}.\n🔑 Your OTP Code: ${generatedOtp} (or use code 123456)`);
    setEmailOtp('');
    setResendTimer(10);
    setOtpModalVisible(true);
  };



  useEffect(() => {
    let timer;
    if (otpModalVisible && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpModalVisible, resendTimer]);

  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setOtpNotice('⏳ Sending fresh OTP code to your email inbox...');
    const otpRes = await authService.sendEmailOTP(cleanEmail);
    const newOtp = (otpRes && otpRes.otp) ? otpRes.otp : '123456';
    setActiveOtpCode(newOtp);
    setEmailOtp('');
    setOtpNotice(`🔄 Fresh 6-digit OTP code sent directly to ${cleanEmail}. Please check your inbox.`);
    setResendTimer(10);
  };






  // Step 2: Verify OTP and finalize registration
  const handleVerifyOtpAndRegister = async () => {
    setOtpNotice('');
    if (!emailOtp.trim() || emailOtp.trim().length < 4) {
      setOtpNotice('Please enter the verification code sent to your email.');
      return;
    }

    setOtpLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const fullPhone = `+91 ${rawPhone}`;

    // Verify OTP
    const verifyRes = await authService.verifyEmailOTP(cleanEmail, emailOtp.trim());

    if (verifyRes.success) {
      const regResult = await authService.register({
        name: name.trim(),
        username: cleanEmail.split('@')[0],
        email: cleanEmail,
        password,
        role: selectedRole?.key || 'donor',
        phone: fullPhone,
        address: address.trim(),
      });

      setOtpLoading(false);
      setOtpModalVisible(false);

      if (regResult.success) {
        setName('');
        setEmail('');
        setPassword('');
        setRawPhone('');
        setAddress('');
        setEmailOtp('');

        navigation.navigate('Login', {
          successNotice: '🎉 Registration successful! Please sign in with your email and password below.',
        });
      } else {
        setOtpNotice(regResult.message || 'Registration failed.');
      }
    } else {
      setOtpLoading(false);
      setOtpNotice(verifyRes.message || 'Invalid OTP code. Please check your email inbox.');
    }
  };


  // Google Sign Up restricted to valid registered @gmail.com Google Accounts
  const handleGoogleRegister = async () => {
    setErrorMsg('');
    if (!email.trim() || !email.trim().toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('⚠️ Google Sign Up is restricted to registered Google Accounts (@gmail.com). Please enter your Google email above.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const res = await authService.googleLogin({
      idToken: 'google_token_demo',
      accessToken: 'google_access_demo',
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      role: selectedRole?.key || 'donor',
      isSignup: true,
    });
    setLoading(false);

    if (res.success) {
      onRegisterSuccess(res.user);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerNavRow}>
          {onChangeRole && (
            <TouchableOpacity style={[styles.roleSwitchBtn, { borderColor: colors.surfaceBorder }]} onPress={onChangeRole}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>🔄 Switch Role</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.appTitle, { color: colors.textPrimary }]}>Meal_ResQ 🌿</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Create Your Account to Start Rescuing Meals</Text>

          {selectedRole && (
            <View style={[styles.roleBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={{ fontSize: 16 }}>{selectedRole.icon}</Text>
              <Text style={[styles.roleText, { color: colors.textPrimary }]}>{selectedRole.title}</Text>
            </View>
          )}
        </View>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>👤 Full Name / Organization</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
              placeholder="e.g. Ananya Sharma or Green Hotel"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>📧 Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
              placeholder="name@gmail.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              name="email"
              id="email"
            />

          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>📱 Mobile Number (+91)</Text>
            <View style={[styles.phoneInputRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.countryCode, { color: colors.textPrimary }]}>+91</Text>
              <TextInput
                style={[styles.phoneInput, { color: colors.textPrimary }]}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
                value={rawPhone}
                onChangeText={handlePhoneChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>🔒 Password</Text>
            <View style={[styles.passwordWrapper, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Min 6 chars (letters & numbers)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                name="password"
                id="password"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
          </View>


          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>📍 Pickup / Service Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary, height: 74 }]}
              placeholder="Complete address with locality & city"
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleStartRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>✨ Sign Up & Send OTP</Text>}
          </TouchableOpacity>


          <View style={styles.toggleFooter}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already registered?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.toggleLink, { color: colors.primary }]}>Sign In to Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={() => setOtpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>✉️ Email OTP Verification</Text>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Verification code sent directly to <Text style={{ fontWeight: '800', color: colors.primary }}>{email}</Text>. Please check your email inbox.
            </Text>

            {otpNotice ? <Text style={styles.otpNoticeText}>{otpNotice}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>🔑 Enter 6-Digit OTP Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.surfaceBorder, textAlign: 'center', fontSize: 20, letterSpacing: 4 }]}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                value={emailOtp}
                onChangeText={setEmailOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                💡 Master verification code: <Text style={{ color: colors.primary, fontWeight: '800' }}>123456</Text>
              </Text>
            </View>


            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
              <TouchableOpacity
                style={{ opacity: resendTimer > 0 ? 0.6 : 1 }}
                onPress={handleResendOtp}
                disabled={resendTimer > 0}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                  {resendTimer > 0 ? `🔄 Resend OTP in ${resendTimer}s` : '🔄 Resend OTP Code Now'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={handleVerifyOtpAndRegister} disabled={otpLoading}>
              {otpLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Verify OTP & Complete Signup</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </MobileAppFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
  },
  headerNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  roleSwitchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  inputGroup: {
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  otpBannerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  otpBannerCode: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: 4,
  },
  otpNoticeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
});


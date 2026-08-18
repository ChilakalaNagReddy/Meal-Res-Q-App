import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from './utils/theme';
import { authService } from './services/authService';
import { apiService } from './services/apiService';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import { RoleSelectScreen } from './screens/auth/RoleSelectScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { DonorDashboardScreen } from './screens/donor/DonorDashboardScreen';
import { AddDonationScreen } from './screens/donor/AddDonationScreen';
import { NgoDashboardScreen } from './screens/ngo/NgoDashboardScreen';
import { VolunteerDashboardScreen } from './screens/volunteer/VolunteerDashboardScreen';
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
import { NeederDashboardScreen } from './screens/needer/NeederDashboardScreen';
import { ProfileScreen } from './screens/common/ProfileScreen';
import { SettingsScreen } from './screens/common/SettingsScreen';
import { NotificationsScreen } from './screens/common/NotificationsScreen';
import { ChatScreen } from './screens/common/ChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- ROLE TAB NAVIGATOR ---
function RoleTabNavigator({ currentUser, onLogout, onUpdateUser }) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const getRoleDashboard = (props) => {
    const role = (currentUser?.role || 'donor').toLowerCase();
    switch (role) {
      case 'ngo':
        return <NgoDashboardScreen {...props} user={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} />;
      case 'volunteer':
        return <VolunteerDashboardScreen {...props} user={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} />;
      case 'needer':
        return <NeederDashboardScreen {...props} user={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} />;
      case 'admin':
        return <AdminDashboardScreen {...props} user={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} />;
      default:
        return <DonorDashboardScreen {...props} user={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} />;
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      >
        {(props) => getRoleDashboard(props)}
      </Tab.Screen>

      <Tab.Screen
        name="Notifications"
        options={{
          tabBarLabel: t('alerts'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🔔</Text>,
        }}
      >
        {(props) => <NotificationsScreen {...props} user={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Chat"
        options={{
          tabBarLabel: t('chat'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>💬</Text>,
        }}
      >
        {(props) => <ChatScreen {...props} user={currentUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      >
        {(props) => <ProfileScreen {...props} user={currentUser} onUpdateUser={onUpdateUser} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
        }}
      >
        {(props) => <SettingsScreen {...props} user={currentUser} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// --- MAIN APP NAVIGATOR CONTENT ---
function MainAppContent() {
  const { colors, isDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      setInitializing(false);
    } catch (e) {
      setInitializing(false);
    }
  };




  const handleSelectRole = (roleItem) => {
    setSelectedRole(roleItem);
  };

  const handleChangeRole = () => {
    setSelectedRole(null);
  };

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setSelectedRole(null);
  };

  const handleUpdateUser = async (updatedUserObj) => {
    setCurrentUser(updatedUserObj);
    await authService.updateStoredUser(updatedUserObj);
    await apiService.updateProfile(updatedUserObj);
  };

  if (initializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '700' }}>Starting Meal_ResQ...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <>
            <Stack.Screen name="MainTabs">
              {(props) => (
                <RoleTabNavigator
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onUpdateUser={handleUpdateUser}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="AddDonation">
              {(props) => <AddDonationScreen {...props} user={currentUser} />}
            </Stack.Screen>
          </>
        ) : !selectedRole ? (
          <Stack.Screen name="RoleSelect">
            {(props) => <RoleSelectScreen {...props} onSelectRole={handleSelectRole} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  selectedRole={selectedRole}
                  onChangeRole={handleChangeRole}
                  onLoginSuccess={handleLoginSuccess}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Register">
              {(props) => (
                <RegisterScreen
                  {...props}
                  selectedRole={selectedRole}
                  onChangeRole={handleChangeRole}
                  onRegisterSuccess={handleLoginSuccess}
                />
              )}
            </Stack.Screen>
          </>
        )}


      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in App:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0b1329', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#10b981', marginBottom: 10 }}>🌿 Meal_ResQ</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
            {this.state.error?.toString() || 'Application Error'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const content = (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <MainAppContent />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );

  if (Platform.OS === 'web') {
    return <View style={{ flex: 1, minHeight: '100vh', width: '100%' }}>{content}</View>;
  }

  return <GestureHandlerRootView style={{ flex: 1 }}>{content}</GestureHandlerRootView>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
  },
});


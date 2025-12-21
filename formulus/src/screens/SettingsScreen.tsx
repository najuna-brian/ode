import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import * as Keychain from 'react-native-keychain';
import {login, getUserInfo, UserInfo} from '../api/synkronus/Auth';
import {serverConfigService} from '../services/ServerConfigService';
import QRScannerModal from '../components/QRScannerModal';
import {QRSettingsService} from '../services/QRSettingsService';
import {MainAppStackParamList} from '../types/NavigationTypes';
import {colors} from '../theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {ToastService} from '../services/ToastService';

type SettingsScreenNavigationProp = StackNavigationProp<
  MainAppStackParamList,
  'Settings'
>;

const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [_loggedInUser, setLoggedInUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const saveServerUrl = useCallback(async (url: string) => {
    if (url.trim()) {
      await serverConfigService.saveServerUrl(url);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (serverUrl) {
        saveServerUrl(serverUrl);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [serverUrl, saveServerUrl]);

  const loadSettings = async () => {
    try {
      const savedUrl = await serverConfigService.getServerUrl();
      if (savedUrl) {
        setServerUrl(savedUrl);
      }

      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        setUsername(credentials.username);
        setPassword(credentials.password);
      }

      const userInfo = await getUserInfo();
      setLoggedInUser(userInfo);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      return;
    }
    setIsLoggingIn(true);
    try {
      await serverConfigService.saveServerUrl(serverUrl);
      await Keychain.setGenericPassword(username, password);
      const userInfo = await login(username, password);
      setLoggedInUser(userInfo);
      ToastService.showShort('Successfully logged in!');
      navigation.navigate('MainApp');
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage =
        error?.message || 'Failed to login. Please check your credentials.';
      ToastService.showLong(`Login failed: ${errorMessage}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQRResult = async (result: any) => {
    setShowQRScanner(false);

    if (result.status === 'cancelled') {
      return;
    }

    if (result.status === 'success' && result.data?.value) {
      try {
        const settings = await QRSettingsService.processQRCode(
          result.data.value,
        );
        setServerUrl(settings.serverUrl);
        setUsername(settings.username);
        setPassword(settings.password);

        if (settings.username && settings.password) {
          await Keychain.setGenericPassword(
            settings.username,
            settings.password,
          );
          try {
            const userInfo = await login(settings.username, settings.password);
            setLoggedInUser(userInfo);
            ToastService.showShort('Successfully logged in!');
            navigation.navigate('MainApp');
          } catch (error: any) {
            console.error('Auto-login failed:', error);
            const errorMessage =
              error?.message ||
              'Failed to login. Please check your credentials.';
            ToastService.showLong(`Login failed: ${errorMessage}`);
          }
        } else {
          ToastService.showShort('Settings updated successfully');
        }
      } catch (error: any) {
        console.error('Failed to process QR code:', error);
        const errorMessage =
          error?.message || 'Invalid QR code format. Please try again.';
        ToastService.showLong(`QR code error: ${errorMessage}`);
      }
    } else {
      ToastService.showLong('Failed to scan QR code. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>ODE</Text>
        </View>
        <Text style={styles.version}>v1.0.0</Text>
      </View>

      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.cardContent}>
        <Text style={styles.title}>
          Please enter the server you want to connect to.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Server URL"
            placeholderTextColor={colors.neutral[400]}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => setShowQRScanner(true)}>
            <Icon
              name="qrcode-scan"
              size={24}
              color={colors.brand.primary[500]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.neutral[400]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.neutral[400]}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            (!serverUrl.trim() || !username.trim() || !password.trim()) &&
              styles.nextButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={
            !serverUrl.trim() ||
            !username.trim() ||
            !password.trim() ||
            isLoggingIn
          }>
          <Icon name="arrow-right" size={20} color={colors.neutral[500]} />
          <Text style={styles.nextButtonText}>
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onResult={handleQRResult}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand.primary[500],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neutral.white,
    letterSpacing: 1,
  },
  version: {
    fontSize: 12,
    color: colors.brand.primary[200],
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.primary[500],
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.neutral[900],
    backgroundColor: 'transparent',
  },
  qrButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  nextButtonIcon: {
    fontSize: 20,
    color: colors.neutral[500],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
});

export default SettingsScreen;

// AppShell.tsx — New glassmorphism design, same business logic as App.tsx
import React from 'react';
import {
  StatusBar,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  Bell,
  Shield,
  MessageSquare,
  Smartphone,
  Wallet,
  Crown,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Sora_400Regular, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

import {
  clearStudentSession,
  EmailVerificationRequiredError,
  getAuthCapabilities,
  getStudentAccount,
  loadStudentSession,
  checkStudentPasswordResetOtp,
  requestStudentPasswordReset,
  resendStudentEmailOtp,
  resetStudentPassword,
  verifyStudentEmailOtp,
  signInStudent,
  signInWithGoogle,
  signUpStudent,
  topUpStudentWallet,
  checkTopUpStatus,
  completeStudentOnboarding,
  registerPushToken,
  type AuthCapabilities,
  type StudentProfile,
  type StudentSession,
  updateStudentProfile,
  changeStudentPassword,
} from './features/auth/betterAuth';
import { OnboardingScreen as IntroSliderScreen } from './features/onboarding/OnboardingScreen';
import { OnboardingScreen } from './ui/screens/OnboardingScreen';
import type { ApplicationProfilePatch } from './features/stages/AiApplyModal';
import { FreePdfSelector } from './features/onboarding/FreePdfSelector';
import { DeleteAccountModal } from './features/account/DeleteAccountModal';
import { Toast, type ToastMessage, type ToastVariant } from './ui/Toast';
import { PdfStudentSection } from './features/pdf/PdfStudentSection';
import {
  buildSuggestedPacks,
  listPublishedPdfDocuments,
  listPublishedPdfPacks,
  purchasePdfPack,
  purchasePdfDocument,
  recordPdfAnalyticsEvent,
} from './features/pdf/pdfApi';
import type { CampusDocument, CampusPdfPack, Transaction } from './types';
import {
  stitchColors,
  stitchSpacing,
  stitchRadius,
  stitchTypography,
  glassPanel,
  glassCard,
  brandGradient,
  fontFamilies,
} from './theme/stitch';
import { publicEnv } from './config/env';

const SERIF = fontFamilies.serif;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;
const SANS = fontFamilies.display;

import { TopBar, BottomNav } from './ui/GlassComponents';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { LibraryScreen } from './ui/screens/LibraryScreen';
import { SimplePdfReaderModal } from './features/pdf/SimplePdfReaderModal';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { AuthScreen } from './ui/screens/AuthScreen';
import { DocumentsScreen } from './features/documents/DocumentsScreen';
import { StagesScreen } from './ui/screens/StagesScreen';
import { ApplicationsTimelineScreen } from './ui/screens/ApplicationsTimelineScreen';
import { ResourcesScreen } from './ui/screens/ResourcesScreen';
import { setFreeLaunch } from './config/launch';
import { OPERATOR_LABELS, operatorMismatchMessage, parseCameroonMobile } from './features/wallet/cameroonPhone';
import { ORANGE_MONEY_APPROVAL_USSD } from './features/wallet/PaymentModal';

const logo = require('../assets/icon.png');
const ONBOARDING_COMPLETED_KEY = 'campus360_onboarding_completed_permanent';
const onboardingStorageKey = 'campus-bordes.onboarding-seen';
const introSeenStorageKey = 'campus-bordes.intro-seen';

const getOnboardingCompletedPermanently = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return (
          localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1' ||
          localStorage.getItem(onboardingStorageKey) === '1'
        );
      }
      return false;
    }
    const [perm, legacy] = await Promise.all([
      SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY).catch(() => null),
      SecureStore.getItemAsync(onboardingStorageKey).catch(() => null),
    ]);
    return perm === '1' || legacy === '1';
  } catch {
    return false;
  }
};

const setOnboardingCompletedPermanent = async () => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
        localStorage.setItem(onboardingStorageKey, '1');
        localStorage.setItem(introSeenStorageKey, '1');
      }
    } else {
      await Promise.all([
        SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, '1').catch(() => {}),
        SecureStore.setItemAsync(onboardingStorageKey, '1').catch(() => {}),
        SecureStore.setItemAsync(introSeenStorageKey, '1').catch(() => {}),
      ]);
    }
  } catch {}
};

const formatCoins = (value: number) =>
  new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value);

const makeTransaction = (label: string, amount: number, type: Transaction['type']): Transaction => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  label,
  amount,
  type,
  status: 'success',
  date: new Date().toLocaleDateString('fr-CM', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }),
});

type ClientCatalogTab = 'packs' | 'catalog' | 'library';
// Matches the server-side OTP rate limit (3 codes / 60 s).
const OTP_RESEND_COOLDOWN_SECONDS = 60;

type AppSection = 'stages' | 'applications' | 'resources' | 'account' | 'home' | 'explore' | 'library' | 'documents' | 'premium';

const onboardingSlides = [
  { title: 'Trouve le bon PDF', text: 'Recherche par université, filière, matière ou niveau.' },
  { title: 'Preview puis achat', text: 'Regarde un aperçu, puis débloque le PDF avec ton wallet.' },
  { title: 'Lis et revise', text: 'Garde tes achats et utilise l assistant pour réviser plus vite.' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.modalBackdrop}>
      <View style={[styles.modalCard, glassCard.light]}>{children}</View>
    </View>
  );
}

function ModalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 }}>
      {children}
    </Text>
  );
}

function PrimaryButtonLocal({
  label,
  onPress,
  variant = 'primary',
  fluid,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  fluid?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        variant === 'secondary'
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: stitchColors.primary, borderRadius: stitchRadius.lg, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }
          : variant === 'danger'
            ? { backgroundColor: stitchColors.error, borderRadius: stitchRadius.lg, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }
            : { backgroundColor: stitchColors.primary, borderRadius: stitchRadius.lg, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', shadowColor: stitchColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
        fluid && { width: '100%' },
        (disabled || loading) && { opacity: 0.5 },
        pressed && !disabled && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={{ fontFamily: fontFamilies.interSemi, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, fontWeight: '600', color: variant === 'secondary' ? stitchColors.primary : stitchColors.paper }}>
        {loading ? 'Patiente...' : label}
      </Text>
    </Pressable>
  );
}

export function AppShell() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const { width } = useWindowDimensions();
  const compactScreen = width < 390;
  const narrowScreen = width < 460;

  // ── State (copied verbatim from App.tsx) ────────────────────────────────
  const [toast, setToast] = React.useState<ToastMessage | null>(null);
  const toastId = React.useRef(0);
  const showToast = React.useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string) => {
      toastId.current += 1;
      setToast({ id: toastId.current, message, variant, title });
    },
    [],
  );
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem(introSeenStorageKey) === '1' ||
        localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1'
      );
    }
    return false;
  });
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [notificationsSettingsVisible, setNotificationsSettingsVisible] = React.useState(false);
  const [editingDocumentId, setEditingDocumentId] = React.useState<string | null>(null);
  const [securitySettingsVisible, setSecuritySettingsVisible] = React.useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [updatingPassword, setUpdatingPassword] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  // Real permission state of the phone; there are no per-topic preferences on the server.
  const [notifPermission, setNotifPermission] = React.useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [fontTimeout, setFontTimeout] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const [supportModalVisible, setSupportModalVisible] = React.useState(false);
  const [balance, setBalance] = React.useState(0);
  const [iaCredits, setIaCredits] = React.useState(5);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [purchasedDocuments, setPurchasedDocuments] = React.useState<string[]>([]);
  const [purchasedPacks, setPurchasedPacks] = React.useState<string[]>([]);
  const [pdfDocuments, setPdfDocuments] = React.useState<CampusDocument[]>([]);
  const [pdfPacks, setPdfPacks] = React.useState<CampusPdfPack[]>([]);
  const [documentsLoading, setDocumentsLoading] = React.useState(true);
  const [documentsError, setDocumentsError] = React.useState('');
  const [purchasingDocumentId, setPurchasingDocumentId] = React.useState<string | null>(null);
  const [purchasingPackId, setPurchasingPackId] = React.useState<string | null>(null);
  const [rechargeVisible, setRechargeVisible] = React.useState(false);
  const [rechargeAmount, setRechargeAmount] = React.useState('1000');
  const [provider, setProvider] = React.useState<'MTN MoMo' | 'Orange Money'>('MTN MoMo');
  const [insufficientVisible, setInsufficientVisible] = React.useState(false);
  const [accountVisible, setAccountVisible] = React.useState(false);
  const [authVisible, setAuthVisible] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'sign-in' | 'sign-up' | 'reset' | 'reset-code' | 'new-password' | 'verify-email'>('sign-in');
  // Latest auth step, readable after an await: a slow request must not override a step the
  // student already left (e.g. "Retour à la connexion" tapped while the code is being sent).
  const authModeRef = React.useRef(authMode);
  authModeRef.current = authMode;
  const [authPasswordConfirm, setAuthPasswordConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');
  const [authName, setAuthName] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authNotice, setAuthNotice] = React.useState('');
  const [authCapabilities, setAuthCapabilities] = React.useState<AuthCapabilities>({ passwordReset: false, emailOtp: false, google: false });
  const [authOtp, setAuthOtp] = React.useState('');
  const [otpCooldown, setOtpCooldown] = React.useState(0);
  const [otpContext, setOtpContext] = React.useState<'sign-up' | 'sign-in'>('sign-up');

  // Resend countdown for email OTP codes.
  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);
  const [onboardingVisible, setOnboardingVisible] = React.useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1' ||
        localStorage.getItem(onboardingStorageKey) === '1'
      );
    }
    return false;
  });
  const [freePdfSelectorVisible, setFreePdfSelectorVisible] = React.useState(false);
  const [onboardingIndex, setOnboardingIndex] = React.useState(0);
  const [studentSession, setStudentSession] = React.useState<StudentSession | null>(null);
  const [studentProfile, setStudentProfile] = React.useState<StudentProfile | null>(null);
  const [syncingAccount, setSyncingAccount] = React.useState(false);
  const [clientTab, setClientTab] = React.useState<ClientCatalogTab>('packs');
  const [activeSection, setActiveSection] = React.useState<AppSection>('home');
  const [readingDocument, setReadingDocument] = React.useState<CampusDocument | null>(null);
  const [isSessionRestoring, setIsSessionRestoring] = React.useState(true);
  const [rechargePhone, setRechargePhone] = React.useState('');
  const [rechargeLoading, setRechargeLoading] = React.useState(false);
  const [pollingMessage, setPollingMessage] = React.useState('');
  const [rechargePaymentUrl, setRechargePaymentUrl] = React.useState<string | null>(null);
  const rechargePollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    title: string;
    body: string;
    receivedAt: string;
    data?: unknown;
  }>>([]);

  // ── Effects ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (studentSession) {
      (async () => {
        if (Platform.OS === 'web') return;
        try {
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7A',
            });
          }
          const { status } = await Notifications.getPermissionsAsync();
          let finalStatus = status;
          if (status !== 'granted') {
            const { status: reqStatus } = await Notifications.requestPermissionsAsync();
            finalStatus = reqStatus;
          }
          if (finalStatus !== 'granted') return;
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;
          if (!projectId) return;
          const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
          await registerPushToken(
            tokenResult.data,
            Platform.OS === 'android' ? 'Android Device' : Platform.OS === 'ios' ? 'iOS Device' : 'Web Device',
            Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web',
          );
        } catch {}
      })();
    }
  }, [studentSession]);

  React.useEffect(() => {
    if (rechargeVisible) {
      const profilePhone = studentProfile?.phone || studentProfile?.whatsappPhone || '';
      setRechargePhone(profilePhone);
      const parsed = parseCameroonMobile(profilePhone);
      if (parsed.ok) setProvider(OPERATOR_LABELS[parsed.operator] as 'MTN MoMo' | 'Orange Money');
    }
  }, [rechargeVisible, studentProfile]);

  // The number decides the operator: switch the toggle as soon as it is recognised.
  const handleRechargePhoneChange = (value: string) => {
    setRechargePhone(value);
    const parsed = parseCameroonMobile(value);
    if (parsed.ok) setProvider(OPERATOR_LABELS[parsed.operator] as 'MTN MoMo' | 'Orange Money');
  };
  const rechargePhoneCheck = parseCameroonMobile(rechargePhone);

  React.useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      setNotifications((prev) => [
        { id: notif.request.identifier, title: notif.request.content.title || 'Notification', body: notif.request.content.body || '', receivedAt: new Date().toISOString(), data: notif.request.content.data },
        ...prev,
      ]);
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const [isPermCompleted, isIntroSeen] = await Promise.all([
          getOnboardingCompletedPermanently(),
          Platform.OS === 'web'
            ? Promise.resolve(
                typeof localStorage !== 'undefined' &&
                  (localStorage.getItem(introSeenStorageKey) === '1' ||
                    localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1'),
              )
            : SecureStore.getItemAsync(introSeenStorageKey)
                .then((v) => v === '1')
                .catch(() => false),
        ]);

        if (mounted) {
          if (isPermCompleted) {
            setIsOnboardingCompleted(true);
            setOnboardingVisible(false);
            setHasSeenOnboarding(true);
          }
          if (isIntroSeen) {
            setHasSeenOnboarding(true);
          }
        }

        const storedSession = await loadStudentSession();
        if (storedSession) {
          if (mounted) {
            setStudentSession(storedSession);
            setStudentProfile({
              id: storedSession.user.id,
              name: storedSession.user.name || 'Étudiant',
              role: storedSession.user.role || 'STUDENT',
              email: storedSession.user.email,
              phone: storedSession.user.phone,
              whatsappPhone: storedSession.user.whatsappPhone,
              university: storedSession.user.university,
              faculty: storedSession.user.faculty,
              level: storedSession.user.level,
              skills: storedSession.user.skills,
            });
            if (storedSession.user.skills && storedSession.user.skills.length > 0) {
              setIsOnboardingCompleted(true);
              setOnboardingVisible(false);
            }
            setHasSeenOnboarding(true);
          }
          await syncStudentAccount(storedSession);
        }
      } catch {
        await clearStudentSession().catch(() => undefined);
      } finally {
        if (mounted) setIsSessionRestoring(false);
      }
    };

    restoreSession();
    refreshDocuments(mounted);
    getAuthCapabilities().then(setAuthCapabilities).catch(() => undefined);

    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    // Skip when running in Expo Go / dev where updates are managed by the packager.
    if (__DEV__ || !Updates.isEnabled) return;
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;
        // Seamless OTA: download and apply silently at launch so the user always
        // runs the latest code without reinstalling. The banner below is only a
        // fallback if the automatic apply fails.
        setUpdateAvailable(true);
        try {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        } catch {
          // Leave the banner up so the user can retry manually.
        }
      } catch {}
    };
    checkForUpdates();
  }, []);

  // Load the persisted "intro already seen" flag once at launch so the pre-auth
  // OnboardingScreen never reappears for a returning user (it used to reset to
  // false on every launch because the flag lived only in component state).
  React.useEffect(() => {
    let mounted = true;
    const loadIntroSeen = async () => {
      try {
        let seen = '0';
        if (Platform.OS === 'web') {
          seen = (typeof localStorage !== 'undefined' && localStorage.getItem(introSeenStorageKey)) || '0';
        } else {
          seen = (await SecureStore.getItemAsync(introSeenStorageKey)) || '0';
        }
        if (mounted && seen === '1') setHasSeenOnboarding(true);
      } catch {}
    };
    loadIntroSeen();
    return () => { mounted = false; };
  }, []);

  // Anyone who has a session has, by definition, already passed the intro — mark
  // it seen (and persist) so it can never come back after the first connection.
  React.useEffect(() => {
    if (!studentSession) return;
    setHasSeenOnboarding(true);
    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') localStorage.setItem(introSeenStorageKey, '1');
        } else {
          await SecureStore.setItemAsync(introSeenStorageKey, '1');
        }
      } catch {}
    })();
  }, [studentSession]);

  React.useEffect(() => {
    if (!studentSession) { setOnboardingVisible(false); return; }
    let active = true;
    const checkOnboarding = async () => {
      try {
        const completed = await getOnboardingCompletedPermanently();
        if (active) {
          setOnboardingVisible(!completed);
          if (completed) setIsOnboardingCompleted(true);
        }
      } catch {
        if (active) setOnboardingVisible(false);
      }
    };
    checkOnboarding();
    return () => { active = false; };
  }, [studentSession]);

  // ── Handlers (copied verbatim from App.tsx) ──────────────────────────────
  const refreshDocuments = async (mounted = true) => {
    setDocumentsLoading(true);
    setDocumentsError('');
    listPublishedPdfDocuments()
      .then(async (documents) => {
        const remotePacks = await listPublishedPdfPacks(documents);
        const packs = remotePacks.length ? remotePacks : buildSuggestedPacks(documents);
        if (mounted) setPdfDocuments(documents);
        if (mounted) setPdfPacks(packs);
        recordPdfAnalyticsEvent({ eventType: 'catalog_view', accessToken: studentSession ? 'better-auth' : undefined, metadata: { documentCount: documents.length, packCount: packs.length } });
      })
      .catch((error) => {
        if (mounted) { setPdfDocuments([]); setPdfPacks([]); setDocumentsError(error instanceof Error ? error.message : 'Chargement impossible.'); }
      })
      .finally(() => { if (mounted) setDocumentsLoading(false); });
  };

  const syncStudentAccount = async (_session?: StudentSession) => {
    setSyncingAccount(true);
    try {
      const account = await getStudentAccount();
      setStudentProfile(account.user);
      if (account.user?.skills && account.user.skills.length > 0) {
        setIsOnboardingCompleted(true);
        setOnboardingVisible(false);
        void setOnboardingCompletedPermanent();
      }
      setBalance(account.wallet.balanceCoins);
      setIaCredits(account.wallet.iaCredits);
      setFreeLaunch(account.wallet.freeLaunch === true, account.wallet.freeLaunchUntil ?? null);
      setPurchasedDocuments(account.purchasedDocumentIds);
      setPurchasedPacks(account.purchasedPackIds);
      setTransactions(
        account.transactions.map((row) => ({
          id: row.id,
          label: row.type === 'purchase'
            ? row.reference_title
              ? `${row.reference_kind === 'pack' ? 'Pack' : 'PDF'} - ${row.reference_title}`
              : `Achat PDF ${row.reference_id ?? ''}`.trim()
            : row.type === 'topup'
              ? 'Recharge wallet PDF'
              : row.type === 'withdrawal'
                ? 'Retrait wallet'
                : 'Commission PDF',
          amount: row.amount_coins,
          type: row.type,
          status: row.status,
          date: new Date(row.created_at).toLocaleDateString('fr-CM', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        })),
      );
    } catch (err) {
      console.warn('[AppShell] syncStudentAccount offline fallback:', err);
    } finally { setSyncingAccount(false); }
  };

  const submitAuth = async () => {
    const email = authEmail.trim();
    const password = authPassword.trim();
    const name = authName.trim();

    const otp = authOtp.replace(/\D/g, '');

    if (authMode === 'verify-email') {
      if (otp.length !== 6) { Alert.alert('Code de confirmation', 'Entre les 6 chiffres reçus par email.'); return; }
      setAuthLoading(true);
      try {
        const session = await verifyStudentEmailOtp(email, otp);
        if (!session) {
          // Verified, but no session was opened: let the student sign in normally.
          setAuthOtp('');
          setAuthMode('sign-in');
          setAuthNotice('Email confirmé. Connecte-toi pour continuer.');
          return;
        }
        await completeAuthenticatedSession(session, otpContext === 'sign-up');
      } catch (error) {
        Alert.alert('Code invalide', error instanceof Error ? error.message : 'Demande un nouveau code.');
      } finally { setAuthLoading(false); }
      return;
    }

    // Step 2 of reset: the code is checked alone, before any password is asked.
    if (authMode === 'reset-code') {
      if (otp.length !== 6) { Alert.alert('Code de vérification', 'Entre les 6 chiffres reçus par email.'); return; }
      setAuthLoading(true);
      try {
        await checkStudentPasswordResetOtp(email, otp);
        setAuthPassword('');
        setAuthPasswordConfirm('');
        setAuthMode('new-password');
        setAuthNotice('Code validé. Choisis ton nouveau mot de passe.');
      } catch (error) {
        Alert.alert('Code invalide', error instanceof Error ? error.message : 'Demande un nouveau code.');
      } finally { setAuthLoading(false); }
      return;
    }

    // Step 3 of reset: new password + confirmation, sent together with the code.
    if (authMode === 'new-password') {
      if (otp.length !== 6) { Alert.alert('Code de vérification', 'Le code a expiré ou est absent. Redemande un code.'); return; }
      if (password.length < 8) { Alert.alert('Nouveau mot de passe', 'Choisis au moins 8 caractères.'); return; }
      if (password !== authPasswordConfirm.trim()) { Alert.alert('Nouveau mot de passe', 'Les deux mots de passe ne sont pas identiques.'); return; }
      setAuthLoading(true);
      try {
        await resetStudentPassword(email, otp, password);
        setAuthOtp('');
        setAuthPassword('');
        setAuthPasswordConfirm('');
        setAuthMode('sign-in');
        setAuthNotice('Mot de passe modifié. Tu peux te connecter.');
      } catch (error) {
        Alert.alert('Code invalide', error instanceof Error ? error.message : 'Demande un nouveau code.');
      } finally { setAuthLoading(false); }
      return;
    }

    if (!email) { Alert.alert('Connexion', 'Entre ton email.'); return; }
    if ((authMode === 'sign-in' || authMode === 'sign-up') && !password) { Alert.alert('Connexion', 'Entre ton mot de passe.'); return; }
    if (authMode === 'sign-up' && name.length < 2) { Alert.alert('Création du compte', 'Entre ton nom.'); return; }
    if (authMode === 'sign-up' && password.length < 8) { Alert.alert('Création du compte', 'Choisis un mot de passe d’au moins 8 caractères.'); return; }
    if (authMode === 'sign-up' && password !== authPasswordConfirm.trim()) { Alert.alert('Création du compte', 'Les deux mots de passe ne sont pas identiques.'); return; }

    setAuthLoading(true);
    setAuthNotice('');
    try {
      if (authMode === 'reset') {
        await requestStudentPasswordReset(email);
        if (authModeRef.current !== 'reset') return; // The student navigated away meanwhile.
        setAuthOtp('');
        setAuthPassword('');
        setOtpCooldown(OTP_RESEND_COOLDOWN_SECONDS);
        setAuthMode('reset-code');
        setAuthNotice(`Si un compte existe pour ${email}, un code à 6 chiffres vient de partir par email.`);
        return;
      }
      const session =
        authMode === 'sign-in'
          ? await signInStudent(email, password)
          : await signUpStudent(
              email,
              password,
              name,
              undefined,
              { requireEmailVerification: Boolean(authCapabilities.emailOtp) },
            );
      if (!session) {
        openOtpStep(email, authMode === 'sign-up' ? 'sign-up' : 'sign-in');
        return;
      }
      await completeAuthenticatedSession(session, authMode === 'sign-up');
    } catch (error) {
      if (error instanceof EmailVerificationRequiredError) {
        // Legacy/unverified account: the server already emailed a code on this sign-in attempt.
        openOtpStep(error.email, 'sign-in');
        return;
      }
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setAuthLoading(false); }
  };

  const openOtpStep = (email: string, context: 'sign-up' | 'sign-in') => {
    setOtpContext(context);
    setAuthOtp('');
    setOtpCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setAuthMode('verify-email');
    setAuthNotice(`Nous avons transmis un code à 6 chiffres à ${email}. Il expire dans 10 minutes.`);
  };

  // Data saved by the pre-application sheet (WhatsApp, studies, skills): keep the shell profile in sync
  // so the sheet is not shown again on the next application.
  const applyApplicationProfilePatch = (patch: ApplicationProfilePatch) => {
    setStudentProfile((prev) => (prev ? {
      ...prev,
      whatsappPhone: patch.whatsappPhone || prev.whatsappPhone,
      phone: prev.phone || patch.whatsappPhone,
      faculty: patch.faculty || prev.faculty,
      level: patch.level || prev.level,
      skills: patch.skills.length > 0 ? patch.skills : prev.skills,
    } : prev));
  };

  // Shared ending for every successful authentication (password, OTP, sign-up).
  const completeAuthenticatedSession = async (session: StudentSession, isNewAccount: boolean) => {
    setStudentSession(session);
    // The name is stored at sign-up; studies are collected by the onboarding right after.
    await syncStudentAccount(session);
    setAuthOtp('');
    setAuthNotice('');
    setAuthVisible(false);
    setActiveSection('home');
    if (isNewAccount) { setFreePdfSelectorVisible(true); }
    else { Alert.alert('Connecté', 'Tes achats PDF et ton wallet sont synchronisés.'); }
  };

  const resendAuthOtp = async () => {
    const email = authEmail.trim();
    if (!email || otpCooldown > 0) return;
    setAuthLoading(true);
    try {
      if (authMode === 'reset-code' || authMode === 'new-password') await requestStudentPasswordReset(email);
      else await resendStudentEmailOtp(email);
      setOtpCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setAuthNotice(`Nouveau code transmis à ${email}.`);
    } catch (error) {
      Alert.alert('Code non transmis', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setAuthLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthNotice('');
    try {
      const session = await signInWithGoogle();
      if (!session) { setAuthNotice('Erreur lors de la connexion Google.'); return; }
      setStudentSession(session);
      await syncStudentAccount(session);
      setAuthVisible(false);
      setActiveSection('home');
      Alert.alert('Connecte', 'Connexion via Google réussie.');
    } catch (error) {
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally { setAuthLoading(false); }
  };

  const finishOnboarding = async () => {
    setIsOnboardingCompleted(true);
    setOnboardingVisible(false);
    await setOnboardingCompletedPermanent();
  };

  const signOutStudent = async () => {
    setStudentSession(null);
    await clearStudentSession().catch(() => undefined);
    setStudentProfile(null);
    setPurchasedDocuments([]); setPurchasedPacks([]);
    setBalance(0); setIaCredits(0);
    setTransactions([]);
    setAccountVisible(false);
    setActiveSection('home');
    setAuthMode('sign-in');
    setAuthNotice('');
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Changement de mot de passe', 'Veuillez remplir tous les champs.'); return; }
    if (newPassword.length < 8) { Alert.alert('Changement de mot de passe', 'Le nouveau mot de passe doit faire au moins 8 caractères.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Changement de mot de passe', 'Les nouveaux mots de passe ne correspondent pas.'); return; }
    setUpdatingPassword(true);
    try {
      await changeStudentPassword(currentPassword, newPassword);
      Alert.alert('Succès', 'Votre mot de passe a été mis à jour.');
      setSecuritySettingsVisible(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) { Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de changer le mot de passe.'); }
    finally { setUpdatingPassword(false); }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      if (studentSession) await syncStudentAccount(studentSession);
      await refreshDocuments();
    } catch {}
    finally { setRefreshing(false); }
  };

  const buyDocument = (document: CampusDocument) => {
    const isOwned = effectivePurchasedDocuments.includes(document.id) || document.price === 0;
    if (isOwned) {
      setReadingDocument(document);
      return;
    }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour débloquer ce PDF.'); setAuthVisible(true); return; }
    setPurchasingDocumentId(document.id);
    recordPdfAnalyticsEvent({ eventType: 'purchase_start', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, subject: document.subject, level: document.level } });
    purchasePdfDocument(document.id)
      .then(async () => {
        setPurchasedDocuments((current) => [document.id, ...current.filter((id) => id !== document.id)]);
        await syncStudentAccount(studentSession);
        recordPdfAnalyticsEvent({ eventType: 'purchase_success', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, subject: document.subject, level: document.level } });
        showToast(`${document.title} est débloqué !`, 'success', 'PDF Débloqué 🎉');
        setReadingDocument(document);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        recordPdfAnalyticsEvent({ eventType: 'purchase_failed', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, reason: message || 'unknown' } });
        if (message.toLowerCase().includes('insufficient')) { setInsufficientVisible(true); return; }
        showToast(message || 'Réessaie dans un instant.', 'error', 'Achat impossible');
      })
      .finally(() => { setPurchasingDocumentId(null); });
  };

  // Suggested packs (built client-side from the catalogue) have no server-side
  // row — their id looks like `local-pack-…`, not a UUID. They can't be bought
  // through the pack endpoint, so we unlock their PDFs individually instead.
  const isSuggestedPack = (pack: CampusPdfPack) => pack.id.startsWith('local-pack-');

  const unlockSuggestedPack = async (pack: CampusPdfPack, pendingIds: string[]) => {
    setPurchasingPackId(pack.id);
    const unlocked: string[] = [];
    try {
      for (const id of pendingIds) {
        try {
          await purchasePdfDocument(id);
          unlocked.push(id);
        } catch (error) {
          const message = (error instanceof Error ? error.message : '').toLowerCase();
          if (message.includes('insufficient') || message.includes('solde')) break;
          // Skip per-document errors (e.g. already owned) and continue.
        }
      }
      if (unlocked.length) {
        setPurchasedDocuments((current) => Array.from(new Set([...unlocked, ...current])));
        await syncStudentAccount(studentSession ?? undefined);
      }
      if (unlocked.length === pendingIds.length) {
        setPurchasedPacks((current) => [pack.id, ...current.filter((id) => id !== pack.id)]);
        showToast(`${pack.title} est maintenant dans ta bibliothèque.`, 'success', 'Pack débloqué 🎉');
      } else if (unlocked.length > 0) {
        showToast(
          `${unlocked.length}/${pendingIds.length} PDF débloqués. Solde insuffisant pour le reste.`,
          'warning',
          'Pack partiellement débloqué',
        );
      } else {
        setInsufficientVisible(true);
      }
    } finally {
      setPurchasingPackId(null);
    }
  };

  const buyPack = (pack: CampusPdfPack) => {
    if (purchasedPacks.includes(pack.id)) { showToast('Ce pack est déjà dans ta bibliothèque.', 'info', 'Pack déjà acheté'); return; }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour acheter ce pack avec ton wallet.'); setAuthVisible(true); return; }

    if (isSuggestedPack(pack)) {
      const pendingIds = pack.documentIds.filter((id) => !purchasedDocuments.includes(id));
      if (!pendingIds.length) {
        setPurchasedPacks((current) => [pack.id, ...current.filter((id) => id !== pack.id)]);
        showToast('Tu possèdes déjà tous les PDF de ce pack.', 'info', 'Déjà débloqué');
        return;
      }
      const total = pendingIds.reduce(
        (sum, id) => sum + (pdfDocuments.find((doc) => doc.id === id)?.price ?? 0),
        0,
      );
      Alert.alert(
        'Débloquer ce pack',
        `Cette sélection regroupe ${pack.documentCount} PDF. Débloque les ${pendingIds.length} PDF restants pour ${formatCoins(total)} C ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Débloquer', onPress: () => { void unlockSuggestedPack(pack, pendingIds); } },
        ],
      );
      return;
    }

    setPurchasingPackId(pack.id);
    purchasePdfPack(pack.id)
      .then(async (result) => {
        const unlockedIds = result.documentIds.length ? result.documentIds : pack.documentIds;
        setPurchasedPacks((current) => [pack.id, ...current.filter((id) => id !== pack.id)]);
        setPurchasedDocuments((current) => Array.from(new Set([...unlockedIds, ...current])));
        await syncStudentAccount(studentSession);
        showToast(`${pack.title} est maintenant dans ta bibliothèque.`, 'success', 'Pack acheté 🎉');
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('insufficient')) { setInsufficientVisible(true); return; }
        showToast(message || 'Réessaie dans un instant.', 'error', 'Achat impossible');
      })
      .finally(() => { setPurchasingPackId(null); });
  };

  const rechargeWallet = async () => {
    const amount = Number.parseInt(rechargeAmount, 10);
    if (!Number.isFinite(amount) || amount < 500) { Alert.alert('Montant invalide', 'Le minimum de recharge est 500 FCFA.'); return; }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour recharger ton wallet PDF.'); setAuthVisible(true); return; }
    const parsedPhone = parseCameroonMobile(rechargePhone);
    if (!parsedPhone.ok) { Alert.alert('Numéro invalide', parsedPhone.error); return; }
    const mismatch = operatorMismatchMessage(parsedPhone.operator, provider === 'Orange Money' ? 'orange' : 'mtn');
    if (mismatch) { Alert.alert('Opérateur différent', mismatch); return; }
    try {
      setRechargeLoading(true);
      setPollingMessage('Initialisation de la transaction...');
      const res = await topUpStudentWallet(amount, provider, parsedPhone.e164);
      const reference = res.reference;
      setRechargePaymentUrl(res.paymentUrl || null);
      let attempts = 0;
      const maxAttempts = 60;
      setPollingMessage('Ouverture du paiement sécurisé SasPay... Validez sur votre téléphone une fois sur la page.');

      if (res.paymentUrl) {
        try {
          void WebBrowser.openBrowserAsync(res.paymentUrl);
        } catch {
          Linking.openURL(res.paymentUrl).catch(() => {});
        }
      }

      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          const statusRes = await checkTopUpStatus(reference);
          if (statusRes.status === 'success') {
            clearInterval(pollInterval);
            rechargePollRef.current = null;
            setRechargeLoading(false);
            setPollingMessage('');
            setRechargeVisible(false);
            try {
              void WebBrowser.dismissBrowser();
            } catch {}
            if (statusRes.balanceCoins !== undefined) setBalance(statusRes.balanceCoins);
            await syncStudentAccount(studentSession);
            Alert.alert('Recharge réussie', `${formatCoins(amount)} Coins ajoutés via ${provider}.`);
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            rechargePollRef.current = null;
            setRechargeLoading(false);
            setPollingMessage('');
            Alert.alert(
              'Paiement non validé',
              statusRes.failureMessage ||
                provider === 'Orange Money'
                  ? `La transaction a été rejetée ou a expiré. Avec Orange Money, compose ${ORANGE_MONEY_APPROVAL_USSD} pour valider, ou rouvre la page de paiement SasPay.`
                  : 'La transaction a été rejetée ou a expiré. Vérifie ton solde MTN MoMo, ou rouvre la page de paiement SasPay.',
            );
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            rechargePollRef.current = null;
            setRechargeLoading(false);
            setPollingMessage('');
            Alert.alert('Délai dépassé', 'Le délai de validation a expiré.');
          }
        } catch {}
      }, 3000);
      rechargePollRef.current = pollInterval;
    } catch (error) {
      setRechargeLoading(false);
      setPollingMessage('');
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Réessayez dans un instant.');
    }
  };

  const cancelRechargePolling = () => {
    if (rechargePollRef.current) {
      clearInterval(rechargePollRef.current);
      rechargePollRef.current = null;
    }
    try {
      void WebBrowser.dismissBrowser();
    } catch {}
    setRechargeLoading(false);
    setPollingMessage('');
    setRechargeVisible(false);
  };

  React.useEffect(() => () => {
    if (rechargePollRef.current) clearInterval(rechargePollRef.current);
  }, []);

  const handleDownloadUpdate = async () => {
    setUpdateLoading(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch { Alert.alert('Erreur', 'Impossible de télécharger la mise a jour.'); setUpdateLoading(false); }
  };

  // ── Derived state ────────────────────────────────────────────────────────
  // 100 % wallet: a PDF is owned only when bought (individually or via a pack).
  const effectivePurchasedDocuments = purchasedDocuments;
  const ownedLibrary = pdfDocuments.filter((d) => effectivePurchasedDocuments.includes(d.id));
  const openSection = (section: AppSection) => {
    if (section === 'home') { setActiveSection(section); setClientTab('packs'); return; }
    if (section === 'explore') { setActiveSection(section); setClientTab('catalog'); return; }
    if (section === 'library') {
      if (!studentSession) { setActiveSection('account'); setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour ouvrir ta bibliothèque.'); setAuthVisible(true); return; }
      setActiveSection(section); setClientTab('library'); return;
    }
    if (section === 'documents') {
      if (!studentSession) { setActiveSection('account'); setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour rédiger tes documents.'); setAuthVisible(true); return; }
      setActiveSection(section); return;
    }
    if (section === 'premium') { setActiveSection('account'); setRechargeVisible(true); return; }
    setActiveSection(section);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!fontsLoaded && !fontError && !fontTimeout) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: stitchColors.background }}>
        <ActivityIndicator size="large" color={stitchColors.primary} />
      </View>
    );
  }

  if (editingDocumentId) {
    const { DocumentEditorScreen } = require('./features/documents/DocumentEditorScreen');
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: stitchColors.background }}>
          <StatusBar barStyle="dark-content" />
          <DocumentEditorScreen
            documentId={editingDocumentId}
            onClose={() => setEditingDocumentId(null)}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const showAuthGate = !studentSession;
  // Real initials only; while the profile loads the avatar stays empty instead of fake letters.
  const initials = studentProfile?.name?.trim()
    ? studentProfile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : '';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={stitchColors.surface} translucent={false} />

        <Toast toast={toast} onDismiss={() => setToast(null)} />

        {/* Update Banner */}
        {updateAvailable && (
          <View style={{ backgroundColor: stitchColors.surfaceContainerHigh, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: stitchColors.white, fontSize: 14, fontWeight: '600', flex: 1 }}>Nouvelle version disponible !</Text>
            <Pressable onPress={handleDownloadUpdate} disabled={updateLoading} style={{ backgroundColor: stitchColors.paper, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              {updateLoading ? <ActivityIndicator size="small" color={stitchColors.ink} /> : <Text style={{ color: stitchColors.ink, fontSize: 13, fontWeight: '700' }}>Mettre à jour</Text>}
            </Pressable>
          </View>
        )}

        {/* Loading */}
        {isSessionRestoring ? (
          <View style={styles.loadingScreen}>
            <Text style={styles.loadingEyebrow}>CAMPUS 360</Text>
            <View style={styles.loadingRule} />
            <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} />
            <ActivityIndicator size="large" color={stitchColors.emeraldTone} />
            <Text style={styles.loadingText}>Chargement de ton espace...</Text>
          </View>
        ) : !hasSeenOnboarding ? (
          <IntroSliderScreen
            onFinish={() => {
              setHasSeenOnboarding(true);
              (async () => {
                try {
                  if (Platform.OS === 'web') {
                    if (typeof localStorage !== 'undefined') localStorage.setItem(introSeenStorageKey, '1');
                  } else {
                    await SecureStore.setItemAsync(introSeenStorageKey, '1');
                  }
                } catch {}
              })();
            }}
          />
        ) : showAuthGate ? (
          <AuthScreen
            mode={authMode}
            email={authEmail}
            password={authPassword}
            name={authName}
            loading={authLoading}
            notice={authNotice}
            canGoogle={authCapabilities.google}
            canPasswordReset={authCapabilities.passwordReset}
            passwordConfirm={authPasswordConfirm}
            onPasswordConfirmChange={setAuthPasswordConfirm}
            otp={authOtp}
            otpCooldown={otpCooldown}
            onOtpChange={setAuthOtp}
            onResendOtp={resendAuthOtp}
            onModeChange={(nextMode) => { setAuthNotice(''); setAuthOtp(''); setAuthMode(nextMode); }}
            onEmailChange={setAuthEmail}
            onPasswordChange={setAuthPassword}
            onNameChange={setAuthName}
            onSubmit={submitAuth}
            onGoogle={handleGoogleSignIn}
          />
        ) : studentSession && !isOnboardingCompleted && (!studentProfile?.skills || studentProfile.skills.length === 0) ? (
          <OnboardingScreen
            initialName={studentProfile?.name || studentSession.user.name || ''}
            initialUniversity={studentProfile?.university || ''}
            initialFaculty={studentProfile?.faculty || ''}
            initialLevel={studentProfile?.level || ''}
            onSkip={finishOnboarding}
            onCompleteOnboarding={async (onboardingData) => {
              await finishOnboarding();
              // Only the study fields are collected here: name comes from sign-up,
              // WhatsApp is asked at the first application.
              const updated: StudentProfile = {
                ...(studentProfile || {
                  id: studentSession.user.id,
                  name: studentSession.user.name || '',
                  email: studentSession.user.email,
                  role: 'STUDENT',
                }),
                university: onboardingData.university,
                faculty: onboardingData.faculty,
                level: onboardingData.level,
                skills: onboardingData.skills,
              };
              setStudentProfile(updated);
              updateStudentProfile({
                university: onboardingData.university,
                faculty: onboardingData.faculty,
                level: onboardingData.level,
                skills: onboardingData.skills,
              }).catch((e) => console.warn('Sync profile error:', e));
              // Welcome message with matched internships + skills stored for new-offer alerts.
              completeStudentOnboarding(onboardingData.skills).catch((e) => console.warn('Onboarding automation error:', e));
              showToast('Profil complété ! Découvre tes stages.');
            }}
          />
        ) : (
          <View style={styles.appShell}>
            {/* TopBar (masqué sur l'écran profil qui possède déjà son propre en-tête dédié) */}
            {activeSection !== 'account' && (
              <TopBar
                appName="Campus 360"
                onBellPress={() => setNotificationsVisible(true)}
                hasUnread={notifications.length > 0}
                unreadCount={notifications.length}
                onAvatarPress={() => openSection('account')}
                avatarInitials={initials}
                locationName={
                  studentProfile?.university
                    ? [studentProfile.university, studentProfile.faculty].filter(Boolean).join(' • ')
                    : 'Campus 360'
                }
                onLocationPress={() => openSection('account')}
                iaCredits={iaCredits}
                onWalletPress={() => openSection('account')}
                onSearchPress={() => openSection('stages')}
              />
            )}

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.scrollContent,
                compactScreen && styles.scrollContentCompact,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handlePullToRefresh}
                  colors={[stitchColors.emeraldTone]}
                />
              }
            >
              {activeSection === 'stages' && (
                <StagesScreen
                  studentProfile={{
                    // Real values only: these feed the CV / application sent to recruiters.
                    fullName: studentProfile?.name || '',
                    email: studentProfile?.email || '',
                    phoneWhatsapp: studentProfile?.whatsappPhone || studentProfile?.phone,
                    major: studentProfile?.faculty || '',
                    educationLevel: studentProfile?.level || '',
                    skills: studentProfile?.skills ?? [],
                    tokens: iaCredits,
                  }}
                  onOpenWallet={() => openSection('account')}
                  onProfileSaved={applyApplicationProfilePatch}
                />
              )}

              {activeSection === 'applications' && (
                <ApplicationsTimelineScreen
                  studentName={studentProfile?.name || 'Étudiant'}
                  onBack={() => openSection('account')}
                />
              )}

              {activeSection === 'resources' && (
                <ResourcesScreen
                  documents={pdfDocuments}
                  packs={pdfPacks}
                  purchasedDocumentIds={effectivePurchasedDocuments}
                  purchasedPackIds={purchasedPacks}
                  ownedDocuments={ownedLibrary}
                  documentsLoading={documentsLoading}
                  documentsError={documentsError}
                  purchasingDocumentId={purchasingDocumentId}
                  purchasingPackId={purchasingPackId}
                  onBuyDocument={buyDocument}
                  onBuyPack={buyPack}
                  onOpenPdf={setReadingDocument}
                  onRefreshDocuments={() => refreshDocuments()}
                  onOpenAssistant={() => openSection('documents')}
                />
              )}

              {activeSection === 'home' && (
                <HomeScreen
                  studentProfile={studentProfile}
                  studentName={studentProfile?.name}
                  studentSkills={studentProfile?.skills ?? []}
                  profileComplete={Boolean(
                    studentProfile?.name
                    && studentProfile?.university
                    && studentProfile?.faculty
                    && studentProfile?.level
                    && studentProfile?.skills?.length
                  )}
                  balance={balance}
                  iaCredits={iaCredits}
                  transactions={transactions}
                  onRecharge={() => openSection('account')}
                  onStages={() => openSection('stages')}
                  onApplications={() => openSection('applications')}
                  onProfileSaved={applyApplicationProfilePatch}
                  onDocuments={() => openSection('documents')}
                  onResources={() => openSection('resources')}
                  onProfile={() => openSection('account')}
                />
              )}

              {activeSection === 'explore' && (
                <ExploreScreen
                  documents={pdfDocuments}
                  packs={pdfPacks}
                  purchasedDocumentIds={effectivePurchasedDocuments}
                  loading={documentsLoading}
                  error={documentsError}
                  onBuyDocument={buyDocument}
                  onBuyPack={buyPack}
                  purchasingDocumentId={purchasingDocumentId}
                  purchasingPackId={purchasingPackId}
                  onRefresh={() => refreshDocuments()}
                />
              )}

              {activeSection === 'library' && (
                <LibraryScreen
                  ownedDocuments={ownedLibrary}
                  onOpenDocument={setReadingDocument}
                  onExplore={() => openSection('resources')}
                />
              )}

              {activeSection === 'documents' && (
                <DocumentsScreen
                  onEditDocument={(id) => setEditingDocumentId(id)}
                />
              )}

              {activeSection === 'account' && (
                <ProfileScreen
                  studentProfile={studentProfile}
                  balance={balance}
                  iaCredits={iaCredits}
                  transactions={transactions}
                  purchasedDocumentsCount={ownedLibrary.length}
                  syncingAccount={syncingAccount}
                  onOpenNotificationsSettings={() => {
                    Notifications.getPermissionsAsync()
                      .then((perm) => setNotifPermission(perm.granted ? 'granted' : 'denied'))
                      .catch(() => setNotifPermission('unknown'));
                    setNotificationsSettingsVisible(true);
                  }}
                  onOpenSecuritySettings={() => setSecuritySettingsVisible(true)}
                  onOpenSupport={() => setSupportModalVisible(true)}
                  onSync={() => syncStudentAccount(studentSession ?? undefined)}
                  onRecharge={() => { setRechargeVisible(true); }}
                  onPremium={() => openSection('premium')}
                  onLibrary={() => openSection('resources')}
                  onDocuments={() => openSection('documents')}
                  onApplications={() => openSection('applications')}
                  onSignInPress={() => {
                    setAuthMode('sign-in');
                    setAuthNotice('');
                    setAuthVisible(true);
                  }}
                  onSignOut={signOutStudent}
                  onDeleteAccount={() => setDeleteAccountVisible(true)}
                />
              )}



              {activeSection !== 'stages' && activeSection !== 'applications' && activeSection !== 'resources' && activeSection !== 'premium' && activeSection !== 'account' && activeSection !== 'home' && activeSection !== 'explore' && activeSection !== 'library' && activeSection !== 'documents' ? (
                <PdfStudentSection
                  documents={pdfDocuments}
                  packs={pdfPacks}
                  purchasedDocumentIds={effectivePurchasedDocuments}
                  purchasedPackIds={purchasedPacks}
                  onBuyDocument={buyDocument}
                  onBuyPack={buyPack}
                  formatCoins={formatCoins}
                  accessToken={studentSession ? 'better-auth' : undefined}
                  loading={documentsLoading}
                  error={documentsError}
                  purchasingDocumentId={purchasingDocumentId}
                  purchasingPackId={purchasingPackId}
                  onRefresh={() => refreshDocuments()}
                  externalTab={activeSection === 'explore' ? 'packs' : 'library'}
                />
              ) : null}
            </ScrollView>

            <SimplePdfReaderModal
              document={readingDocument}
              accessToken={studentSession ? 'better-auth' : undefined}
              onClose={() => setReadingDocument(null)}
            />

            {/* BottomNav */}
            <BottomNav
              activeSection={activeSection}
              onPress={(key) => openSection(key as AppSection)}
            />
          </View>
        )}

        {/* ── Modals ── */}

        {/* Account Modal */}
        <Modal transparent animationType="slide" visible={accountVisible}>
          <ModalCard>
            <Text style={styles.modalTitle}>Mon compte</Text>
            <View style={styles.accountHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{studentProfile?.name ?? 'Étudiant Campus 360'}</Text>
                <Text style={{ ...stitchTypography.bodyMd, color: stitchColors.onSurfaceVariant }}>{studentProfile?.email ?? studentSession?.user.email ?? 'Connecte'}{syncingAccount ? ' - sync...' : ''}</Text>
              </View>
            </View>
            <View style={styles.walletPanel}>
              <View style={styles.walletPanelTop}>
                <Text style={styles.kicker}>Solde du wallet</Text>
                <Pressable onPress={() => syncStudentAccount(studentSession ?? undefined)}>
                  <Text style={styles.inlineUtilityText}>{syncingAccount ? 'Sync...' : 'Actualiser'}</Text>
                </Pressable>
              </View>
              <Text style={styles.walletAmount}>{formatCoins(balance)} FCFA</Text>
              <Text style={styles.walletHint}>Portefeuille prépayé • {iaCredits} cr IA</Text>
            </View>
            <View style={styles.accountQuickRow}>
              <Pressable style={styles.accountQuickAction} onPress={() => { setAccountVisible(false); openSection('library'); }}>
                <Text style={styles.accountQuickActionLabel}>Bibliothèque</Text>
                <Text style={styles.accountQuickActionValue}>{`${purchasedDocuments.length} PDF`}</Text>
              </Pressable>
              <Pressable style={styles.accountQuickAction} onPress={() => { setAccountVisible(false); setRechargeVisible(true); }}>
                <Text style={styles.accountQuickActionLabel}>Wallet</Text>
                <Text style={styles.accountQuickActionValue}>{`${formatCoins(balance)} FCFA`}</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 8 }}>
              <PrimaryButtonLocal label="Recharger mon portefeuille (MoMo / OM)" fluid onPress={() => { setAccountVisible(false); setRechargeVisible(true); }} />
            </View>
            {!studentProfile?.email && (
              <View style={{ marginTop: 8 }}>
                <PrimaryButtonLocal
                  label="Se connecter avec mon compte existant"
                  variant="secondary"
                  fluid
                  onPress={() => {
                    setAccountVisible(false);
                    setAuthMode('sign-in');
                    setAuthNotice('');
                    setAuthVisible(true);
                  }}
                />
              </View>
            )}
            <View style={styles.modalFooterRow}>
              <Pressable style={styles.ghostAction} onPress={() => setAccountVisible(false)}><Text style={styles.ghostActionText}>Fermer</Text></Pressable>
              <Pressable style={styles.ghostDangerAction} onPress={signOutStudent}><Text style={styles.ghostDangerActionText}>Déconnexion</Text></Pressable>
            </View>
          </ModalCard>
        </Modal>

        {/* Recharge Modal */}
        <Modal transparent animationType="slide" visible={rechargeVisible}>
          <ModalCard>
            <View style={styles.rechargeHero}>
              <View style={styles.rechargeHeroBadge}><Text style={styles.rechargeHeroBadgeText}>C</Text></View>
              <Text style={styles.modalTitle}>Recharger mon wallet</Text>
              <Text style={{ ...stitchTypography.bodyMd, color: stitchColors.onSurfaceVariant }}>Ajoute des coins pour postuler, rédiger avec l’IA et acheter tes PDF.</Text>
            </View>
            <View style={styles.walletPanel}>
              <Text style={styles.kicker}>Solde actuel</Text>
              <Text style={styles.walletAmount}>{formatCoins(balance)} C</Text>
            </View>
            <View style={{ backgroundColor: stitchColors.emeraldBg, borderRadius: 12, padding: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={{ fontSize: 13, color: stitchColors.emeraldDeep, fontWeight: '600', flex: 1, lineHeight: 18 }}>
                Wallet rechargeable des <Text style={{ fontWeight: '900', color: stitchColors.emeraldTone }}>500 FCFA minimum</Text>
              </Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Montant à ajouter</Text>
              <TextInput keyboardType="numeric" value={rechargeAmount} onChangeText={setRechargeAmount} style={{ backgroundColor: stitchColors.surfaceContainerLow, borderWidth: 1, borderColor: stitchColors.outlineVariant, borderRadius: stitchRadius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: stitchColors.onSurface, outlineStyle: 'none', outlineWidth: 0 } as any} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[500, 1000, 2500].map((amount) => {
                const active = rechargeAmount === String(amount);
                const isMin = amount === 500;
                return (
                  <Pressable key={amount} style={[styles.rechargePreset, active && styles.rechargePresetActive, isMin && { backgroundColor: stitchColors.emeraldBg, borderColor: stitchColors.emeraldTone, borderWidth: 2 }]} onPress={() => setRechargeAmount(String(amount))}>
                    <Text style={[styles.rechargePresetText, active && styles.rechargePresetTextActive, isMin && { color: stitchColors.emeraldTone, fontWeight: '800' }]}>{isMin ? '✨ ' : ''}{formatCoins(amount)} C{isMin ? ' min' : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Moyen de paiement</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['MTN MoMo', 'Orange Money'] as const).map((item) => (
                  <Pressable key={item} style={[styles.providerButton, provider === item && styles.providerButtonActive]} onPress={() => setProvider(item)}>
                    <Text style={[styles.providerButtonText, provider === item && styles.providerButtonActiveText]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Numéro Mobile Money</Text>
              <TextInput keyboardType="phone-pad" placeholder="Ex. 6XX XX XX XX" placeholderTextColor={stitchColors.inkSubtle} value={rechargePhone} onChangeText={handleRechargePhoneChange} style={{ backgroundColor: stitchColors.surfaceContainerLow, borderWidth: 1, borderColor: stitchColors.outlineVariant, borderRadius: stitchRadius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: stitchColors.onSurface, outlineStyle: 'none', outlineWidth: 0 } as any} />
              {rechargePhone.replace(/\D/g, '').length >= 9 ? (
                <Text style={{ marginTop: 6, fontSize: 12, fontWeight: '600', color: rechargePhoneCheck.ok ? stitchColors.emeraldTone : stitchColors.error }}>
                  {rechargePhoneCheck.ok ? `Numéro ${OPERATOR_LABELS[rechargePhoneCheck.operator]} détecté (${rechargePhoneCheck.e164})` : rechargePhoneCheck.error}
                </Text>
              ) : null}
            </View>
            {rechargeLoading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={stitchColors.emeraldTone} />
                <Text style={{ color: stitchColors.emeraldTone, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{pollingMessage}</Text>
                {rechargePaymentUrl ? (
                  <PrimaryButtonLocal label="Ouvrir la page de paiement SasPay" variant="secondary" fluid onPress={() => { Linking.openURL(rechargePaymentUrl).catch(() => {}); }} />
                ) : null}
                <PrimaryButtonLocal label="Annuler" variant="secondary" fluid onPress={cancelRechargePolling} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {/* Two equal columns: each "fluid" button would otherwise take the full row. */}
                <View style={{ flex: 1 }}>
                  <PrimaryButtonLocal label="Annuler" variant="secondary" fluid onPress={cancelRechargePolling} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButtonLocal label="Valider" fluid onPress={rechargeWallet} />
                </View>
              </View>
            )}
          </ModalCard>
        </Modal>

        {/* Insufficient Modal */}
        <Modal transparent animationType="fade" visible={insufficientVisible}>
          <ModalCard>
            <View style={styles.rechargeHero}>
              <View style={[styles.rechargeHeroBadge, styles.rechargeHeroAlert]}><Text style={styles.rechargeHeroBadgeText}>!</Text></View>
              <Text style={styles.modalTitle}>Solde insuffisant</Text>
              <Text style={{ ...stitchTypography.bodyMd, color: stitchColors.onSurfaceVariant }}>Recharge via MTN MoMo ou Orange Money pour continuer cet achat PDF.</Text>
            </View>
            <View style={{ backgroundColor: stitchColors.errorBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ ...stitchTypography.labelMd, fontWeight: '600', color: stitchColors.error }}>Action recommandée</Text>
              <Text style={{ ...stitchTypography.bodyMd, color: stitchColors.error, marginTop: 4 }}>Ajoute des coins puis reviens sur ton achat.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PrimaryButtonLocal label="Fermer" variant="secondary" fluid onPress={() => setInsufficientVisible(false)} />
              <PrimaryButtonLocal label="Recharger" fluid onPress={() => { setInsufficientVisible(false); setRechargeVisible(true); }} />
            </View>
          </ModalCard>
        </Modal>

        {/* Notifications Modal */}
        <Modal transparent animationType="slide" visible={notificationsVisible} onRequestClose={() => setNotificationsVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNotificationsVisible(false)}>
            <Pressable style={[styles.dropdownModalCard, { height: '65%', padding: 0 }]} onPress={() => {}}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: stitchColors.inkFaint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft }}>Notifications</Text>
                <Pressable onPress={() => setNotificationsVisible(false)}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, color: stitchColors.inkMuted }}>✕</Text>
                  </View>
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: 20, gap: 16 }}>
                  {notifications.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ fontSize: 15, color: stitchColors.inkMuted }}>Aucune notification</Text></View>
                  ) : notifications.map((notif) => {
                    let emoji = '🔔';
                    let bgColor = `${stitchColors.ink}0D`;
                    const lowerTitle = notif.title.toLowerCase();
                    if (lowerTitle.includes('recharge') || lowerTitle.includes('crédité')) { emoji = '💸'; bgColor = stitchColors.emeraldBg; }
                    else if (lowerTitle.includes('pack') || lowerTitle.includes('iut')) { emoji = '✨'; bgColor = stitchColors.siennaBg; }
                    else if (lowerTitle.includes('premium')) { emoji = '👑'; bgColor = stitchColors.warningBg; }
                    let timeStr = 'Récemment';
                    try { const diffMs = Date.now() - new Date(notif.receivedAt).getTime(); const diffMins = Math.floor(diffMs / 60000); const diffHrs = Math.floor(diffMins / 60); if (diffMins < 60) timeStr = `Il y a ${diffMins} min`; else if (diffHrs < 24) timeStr = `Il y a ${diffHrs} h`; } catch {}
                    return (
                      <View key={notif.id} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 24 }}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: stitchColors.inkSoft }}>{notif.title}</Text>
                          <Text style={{ fontSize: 14, color: stitchColors.inkMuted, marginTop: 2 }}>{notif.body}</Text>
                          <Text style={{ fontSize: 12, color: stitchColors.inkSubtle, marginTop: 4 }}>{timeStr}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Notifications Settings */}
        <Modal transparent animationType="slide" visible={notificationsSettingsVisible} onRequestClose={() => setNotificationsSettingsVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNotificationsSettingsVisible(false)}>
            <Pressable style={[styles.dropdownModalCard, { height: '55%', padding: 0 }]} onPress={() => {}}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: stitchColors.inkFaint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft }}>Gérer les notifications</Text>
                <Pressable onPress={() => setNotificationsSettingsVisible(false)}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, color: stitchColors.inkMuted }}>✕</Text>
                  </View>
                </Pressable>
              </View>
              <View style={{ flex: 1, padding: 20, gap: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: stitchColors.inkSoft }}>
                  {notifPermission === 'granted'
                    ? 'Notifications activées'
                    : notifPermission === 'denied'
                      ? 'Notifications désactivées'
                      : 'État des notifications inconnu'}
                </Text>
                <Text style={{ fontSize: 13, color: stitchColors.inkMuted, lineHeight: 19 }}>
                  Campus 360 t'envoie les alertes de tes candidatures, achats et recharges. Pour les activer ou les couper, passe par les réglages de ton téléphone.
                </Text>
                <PrimaryButtonLocal label="Ouvrir les réglages" onPress={() => { Linking.openSettings().catch(() => {}); }} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Security Settings */}
        <Modal transparent animationType="slide" visible={securitySettingsVisible} onRequestClose={() => setSecuritySettingsVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSecuritySettingsVisible(false)}>
            <Pressable style={[styles.dropdownModalCard, { height: '85%', padding: 0 }]} onPress={() => {}}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: stitchColors.inkFaint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft }}>Sécurité</Text>
                <Pressable onPress={() => setSecuritySettingsVisible(false)}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, color: stitchColors.inkMuted }}>✕</Text>
                  </View>
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: stitchColors.inkMuted, marginBottom: 16 }}>CHANGER LE MOT DE PASSE</Text>
                <View style={{ gap: 12, marginBottom: 32 }}>
                  {[
                    { placeholder: 'Mot de passe actuel', value: currentPassword, onChange: setCurrentPassword },
                    { placeholder: 'Nouveau mot de passe', value: newPassword, onChange: setNewPassword },
                    { placeholder: 'Confirmer le nouveau mot de passe', value: confirmPassword, onChange: setConfirmPassword },
                  ].map(({ placeholder, value, onChange }, i) => (
                    <TextInput key={i} style={{ backgroundColor: stitchColors.surface, borderWidth: 1, borderColor: stitchColors.inkFaint, borderRadius: stitchRadius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: stitchColors.onSurface, outlineStyle: 'none', outlineWidth: 0 } as any} placeholder={placeholder} secureTextEntry value={value} onChangeText={onChange} editable={!updatingPassword} />
                  ))}
                  <PrimaryButtonLocal label={updatingPassword ? 'Mise à jour...' : 'Mettre à jour'} onPress={handleUpdatePassword} disabled={updatingPassword} loading={updatingPassword} />
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Support Modal */}
        <Modal transparent animationType="slide" visible={supportModalVisible} onRequestClose={() => setSupportModalVisible(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSupportModalVisible(false)}>
            <Pressable style={[styles.dropdownModalCard, { padding: 0 }]} onPress={() => {}}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: stitchColors.inkFaint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft }}>Support Client</Text>
                <Pressable onPress={() => setSupportModalVisible(false)}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, color: stitchColors.inkMuted }}>✕</Text>
                  </View>
                </Pressable>
              </View>
              <View style={{ padding: 20, alignItems: 'center' }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: stitchColors.emeraldBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 40 }}>💬</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: stitchColors.inkSoft, textAlign: 'center', marginBottom: 8 }}>Besoin d'aide ?</Text>
                <Text style={{ fontSize: 14, color: stitchColors.inkMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>Notre équipe est disponible sur WhatsApp pour t'aider avec tes recharges, tes PDF ou tout autre problème.</Text>
                {publicEnv.supportWhatsapp ? (
                  <Pressable style={{ backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, width: '100%', justifyContent: 'center' }} onPress={() => Linking.openURL(`https://wa.me/${publicEnv.supportWhatsapp}`)}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>
                    <Text style={{ color: stitchColors.white, fontSize: 16, fontWeight: '700' }}>Discuter sur WhatsApp</Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 14, color: stitchColors.inkMuted, textAlign: 'center' }}>Support WhatsApp indisponible pour le moment.</Text>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Delete Account Modal */}
        <DeleteAccountModal
          visible={deleteAccountVisible}
          onClose={() => setDeleteAccountVisible(false)}
          onAccountDeleted={signOutStudent}
        />

        {/* Free Pdf Selector */}
        <FreePdfSelector
          visible={freePdfSelectorVisible}
          documents={pdfDocuments}
          onComplete={() => {
            setFreePdfSelectorVisible(false);
            Alert.alert('Bienvenue ! 🎉', 'Tu as réclamé tes PDFs gratuits. Bonne révision !');
            syncStudentAccount(studentSession ?? undefined);
          }}
          onClose={() => setFreePdfSelectorVisible(false)}
          studentSession={studentSession}
        />

        {/* Auth Modal when triggered from within the application */}
        <Modal
          visible={authVisible}
          animationType="slide"
          onRequestClose={() => setAuthVisible(false)}
        >
          <AuthScreen
            mode={authMode}
            email={authEmail}
            password={authPassword}
            name={authName}
            loading={authLoading}
            notice={authNotice}
            canGoogle={authCapabilities.google}
            canPasswordReset={authCapabilities.passwordReset}
            passwordConfirm={authPasswordConfirm}
            onPasswordConfirmChange={setAuthPasswordConfirm}
            otp={authOtp}
            otpCooldown={otpCooldown}
            onOtpChange={setAuthOtp}
            onResendOtp={resendAuthOtp}
            onModeChange={(nextMode) => { setAuthNotice(''); setAuthOtp(''); setAuthMode(nextMode); }}
            onEmailChange={setAuthEmail}
            onPasswordChange={setAuthPassword}
            onNameChange={setAuthName}
            onSubmit={submitAuth}
            onGoogle={handleGoogleSignIn}
            onClose={() => setAuthVisible(false)}
          />
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Shared styles (from original App.tsx) ────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: stitchColors.surface },
  appShell: { flex: 1, backgroundColor: stitchColors.background },
  scrollContent: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingBottom: 160 },
  scrollContentCompact: { paddingBottom: 116 },
  loadingScreen: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingEyebrow: { fontFamily: stitchTypography.monoEyebrow.fontFamily, fontSize: 12, letterSpacing: 2, color: stitchColors.white, fontWeight: '700' },
  loadingRule: { width: 48, height: 1, backgroundColor: stitchColors.sienna },

  loadingText: { color: stitchColors.inkSubtle, fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(19, 27, 46, 0.32)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: stitchColors.surfaceContainerLowest, borderTopLeftRadius: stitchRadius.xl, borderTopRightRadius: stitchRadius.xl, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, shadowColor: stitchColors.ink, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 16 },
  modalTitle: { ...stitchTypography.headlineMd, color: stitchColors.onSurface, marginBottom: 16, textAlign: 'center' },

  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: stitchColors.surfaceContainerHighest },
  avatarText: { color: stitchColors.white, fontSize: 16, fontWeight: '800' },
  cardTitle: { ...stitchTypography.labelMd, fontWeight: '700', color: stitchColors.onSurface },

  walletPanel: { backgroundColor: stitchColors.surfaceContainerLow, borderRadius: stitchRadius.lg, padding: 16, marginBottom: 16 },
  walletPanelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  kicker: { ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  inlineUtilityText: { ...stitchTypography.labelSm, color: stitchColors.primary, fontWeight: '600' },
  walletAmount: { ...stitchTypography.headlineMd, color: stitchColors.primary, fontWeight: '700' },
  walletHint: { ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant, marginTop: 2 },

  accountQuickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  accountQuickAction: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh, borderRadius: stitchRadius.md, padding: 12, alignItems: 'center' },
  accountQuickActionLabel: { ...stitchTypography.labelSm, color: stitchColors.onSurfaceVariant },
  accountQuickActionValue: { ...stitchTypography.labelMd, fontWeight: '700', color: stitchColors.onSurface, marginTop: 2 },

  modalFooterRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  ghostAction: { paddingVertical: 10, paddingHorizontal: 16 },
  ghostActionText: { ...stitchTypography.labelMd, color: stitchColors.onSurfaceVariant, fontWeight: '600' },
  ghostDangerAction: { paddingVertical: 10, paddingHorizontal: 16 },
  ghostDangerActionText: { ...stitchTypography.labelMd, color: stitchColors.error, fontWeight: '600' },

  rechargeHero: { alignItems: 'center', marginBottom: 16, gap: 8 },
  rechargeHeroBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center' },
  rechargeHeroAlert: { backgroundColor: stitchColors.error },
  rechargeHeroBadgeText: { color: stitchColors.white, fontSize: 20, fontWeight: '900' },

  rechargePreset: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh, borderRadius: stitchRadius.md, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: stitchColors.outlineVariant },
  rechargePresetActive: { backgroundColor: stitchColors.primaryFixed, borderColor: stitchColors.primary },
  rechargePresetText: { ...stitchTypography.labelSm, fontWeight: '600', color: stitchColors.onSurfaceVariant },
  rechargePresetTextActive: { color: stitchColors.primary, fontWeight: '700' },

  providerButton: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh, borderRadius: stitchRadius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: stitchColors.outlineVariant },
  providerButtonActive: { backgroundColor: stitchColors.primaryFixed, borderColor: stitchColors.primary },
  providerButtonText: { ...stitchTypography.labelMd, color: stitchColors.onSurfaceVariant, fontWeight: '600' },
  providerButtonActiveText: { color: stitchColors.primary, fontWeight: '700' },

  dropdownModalCard: { backgroundColor: stitchColors.surfaceContainerLowest, borderTopLeftRadius: stitchRadius.xl, borderTopRightRadius: stitchRadius.xl, padding: 20, shadowColor: stitchColors.ink, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },

  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: stitchColors.outlineVariant },
  dropdownItemActive: { backgroundColor: `${stitchColors.primary}10` },
  dropdownItemText: { ...stitchTypography.bodyMd, color: stitchColors.onSurface },
  dropdownItemTextActive: { color: stitchColors.primary, fontWeight: '700' },

  // Premium section — direct, bold sans, dark tiles + gradient accents
  premiumContainer: { flex: 1, backgroundColor: stitchColors.background },
  premiumContent: { padding: 24, paddingBottom: 160, width: '100%', maxWidth: 1040, alignSelf: 'center' },

  premiumHero: { marginBottom: 28 },
  premiumEyebrow: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.6, color: stitchColors.sienna, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  premiumTitle: { fontFamily: SANS, fontSize: 30, fontWeight: '700', color: stitchColors.ink, lineHeight: 36, letterSpacing: -0.6, marginBottom: 8 },
  premiumSubtitle: { fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.inkMuted, lineHeight: 21 },

  blockTitle: { fontFamily: SANS, fontSize: 18, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.3, marginBottom: 14 },

  passStack: { gap: 14, marginBottom: 36 },
  passCard: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 22,
    position: 'relative',
  },
  passCardFeatured: { borderColor: stitchColors.siennaDeep, backgroundColor: stitchColors.surfaceContainer },
  passCardCurrent: { borderColor: stitchColors.emerald },
  passRibbon: { position: 'absolute', top: -12, right: 22, paddingHorizontal: 12, paddingVertical: 6, borderRadius: stitchRadius.full },
  passRibbonText: { color: stitchColors.white, fontFamily: SANS, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  passCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  passKicker: { fontFamily: fontFamilies.inter, fontSize: 12, letterSpacing: 0.2, color: stitchColors.inkMuted, fontWeight: '600' },
  passCurrentTag: { fontFamily: MONO, fontSize: 9, fontWeight: '700', color: stitchColors.emerald, letterSpacing: 1.2 },
  passName: { fontFamily: SANS, fontSize: 22, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4, marginBottom: 12 },
  passPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  passPrice: { fontFamily: SANS, fontSize: 32, fontWeight: '800', color: stitchColors.ink, letterSpacing: -0.8 },
  passPriceUnit: { fontFamily: fontFamilies.inter, fontSize: 13, color: stitchColors.inkMuted },
  passBody: { fontFamily: fontFamilies.inter, fontSize: 14, color: stitchColors.inkMuted, lineHeight: 20, marginBottom: 16 },
  passBullets: { gap: 10, marginBottom: 20 },
  passBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passBulletIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: stitchColors.emeraldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  passBulletIconFeatured: { backgroundColor: stitchColors.siennaSoft },
  passBulletText: { flex: 1, fontFamily: fontFamilies.inter, fontSize: 13.5, color: stitchColors.inkSoft, lineHeight: 19 },
  passCta: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button,
  },
  passCtaText: { color: stitchColors.ink, fontFamily: SANS, fontSize: 14, fontWeight: '700' },
  passCtaFeatured: { paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button },
  passCtaFeaturedText: { color: stitchColors.white, fontFamily: SANS, fontSize: 14, fontWeight: '700' },

  // IA top-up — icon-tile grid
  iaSection: { marginBottom: 28 },
  iaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iaTile: {
    width: '31%',
    backgroundColor: stitchColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  iaTilePressed: { backgroundColor: stitchColors.surfaceContainerHigh },
  iaTileIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: stitchColors.siennaBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  iaTileCredits: { fontFamily: SANS, fontSize: 20, fontWeight: '800', color: stitchColors.ink, letterSpacing: -0.4 },
  iaTileCreditsLabel: { fontFamily: MONO, fontSize: 8, color: stitchColors.inkMuted, letterSpacing: 1, marginBottom: 4 },
  iaTileName: { fontFamily: fontFamilies.inter, fontSize: 12, fontWeight: '600', color: stitchColors.inkSoft },
  iaTilePrice: { fontFamily: SANS, fontSize: 12, fontWeight: '700', color: stitchColors.sienna, marginTop: 2 },

  // Wallet callout
  walletCallout: {
    backgroundColor: stitchColors.surface,
    borderRadius: stitchRadius.card,
    borderWidth: 1,
    borderColor: stitchColors.glassBorder,
    padding: 22,
    marginBottom: 32,
  },
  walletCalloutTitle: { fontFamily: SANS, fontSize: 19, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.3, marginBottom: 6 },
  walletCalloutBody: { fontFamily: fontFamilies.inter, fontSize: 13.5, color: stitchColors.inkMuted, lineHeight: 20, marginBottom: 16 },
  walletCalloutCta: { paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button },
  walletCalloutCtaText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: stitchColors.white },
});

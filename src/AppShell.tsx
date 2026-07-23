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
import { Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

import {
  clearStudentSession,
  getAuthCapabilities,
  getStudentAccount,
  loadStudentSession,
  requestStudentPasswordReset,
  resetStudentPassword,
  signInStudent,
  signInWithGoogle,
  signUpStudent,
  topUpStudentWallet,
  checkTopUpStatus,
  purchaseSubscription,
  purchaseIaPack,
  registerPushToken,
  type StudentProfile,
  type StudentSession,
  updateStudentProfile,
  changeStudentPassword,
} from './features/auth/betterAuth';
import { OnboardingScreen } from './features/onboarding/OnboardingScreen';
import { FreePdfSelector } from './features/onboarding/FreePdfSelector';
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
} from './theme/stitch';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) as string;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) as string;
const SANS = Platform.select({ ios: 'System', android: 'sans-serif-medium', web: 'Outfit, sans-serif' }) as string;

import { TopBar, BottomNav } from './ui/GlassComponents';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { LibraryScreen } from './ui/screens/LibraryScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';
import { AuthScreen } from './ui/screens/AuthScreen';
import { DocumentsScreen } from './features/documents/DocumentsScreen';

const logo = require('../assets/icon.png');
const onboardingStorageKey = 'campus-bordes.onboarding-seen';

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

const CAMEROON_UNIVERSITIES = [
  'Université de Douala',
  'Université de Yaoundé I',
  'Université de Yaoundé II',
  'Université de Dschang',
  'Université de Buea',
  'Université de Bamenda',
  'Université de Ngaoundéré',
  'Université de Maroua',
  'ENSP (Polytechnique)',
  'ENAM',
  'IUC',
  'IUT',
  'IUG',
  'UCAC',
  'Autre / Privé',
];

const CAMEROON_FACULTIES = [
  'Informatique et Génie Logiciel',
  'Génie Informatique',
  'Génie Réseaux et Télécommunications',
  'Génie Électrique',
  'Génie Civil',
  'Génie Mécanique',
  'Techniques de Commercialisation',
  'Logistique Industrielle',
  'Gestion Comptable et Financière',
  'Médecine et Pharmacie',
  'Droit et Sciences Politiques',
  'Sciences Économiques et Gestion',
  'Ingénierie et Technologies',
  'Lettres et Sciences Humaines',
  'Mathématiques et Physique',
  'Comptabilité et Finance',
  'Communication',
  'Agronomie',
  'Autre',
];

const CAMEROON_LEVELS = [
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2',
  'BTS 1ère année',
  'BTS 2ème année',
  'Cycle Ingénieur',
  'Autre',
];

type ClientCatalogTab = 'packs' | 'catalog' | 'library';
type AppSection = 'home' | 'explore' | 'library' | 'documents' | 'account' | 'premium';

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
      <Text style={{ fontFamily: Platform.select({ ios: 'sans-serif', android: 'sans-serif', web: 'Inter, sans-serif' }) as string, fontSize: 14, lineHeight: 20, letterSpacing: 0.14, fontWeight: '600', color: variant === 'secondary' ? stitchColors.primary : stitchColors.paper }}>
        {loading ? 'Patiente...' : label}
      </Text>
    </Pressable>
  );
}

export function AppShell() {
  const [fontsLoaded] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const { width } = useWindowDimensions();
  const compactScreen = width < 390;
  const narrowScreen = width < 460;

  // ── State (copied verbatim from App.tsx) ────────────────────────────────
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = React.useState(false);
  const [notificationsSettingsVisible, setNotificationsSettingsVisible] = React.useState(false);
  const [editingDocumentId, setEditingDocumentId] = React.useState<string | null>(null);
  const [securitySettingsVisible, setSecuritySettingsVisible] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [updatingPassword, setUpdatingPassword] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [notifNewPdf, setNotifNewPdf] = React.useState(true);
  const [notifPromos, setNotifPromos] = React.useState(false);
  const [notifAlerts, setNotifAlerts] = React.useState(true);
  const [supportModalVisible, setSupportModalVisible] = React.useState(false);
  const [balance, setBalance] = React.useState(0);
  const [iaCredits, setIaCredits] = React.useState(0);
  const [subscriptionTier, setSubscriptionTier] = React.useState<'free' | 'basic' | 'premium'>('free');
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = React.useState<string | null>(null);
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
  const [subscriptionVisible, setSubscriptionVisible] = React.useState(false);
  const [universityModalVisible, setUniversityModalVisible] = React.useState(false);
  const [facultyModalVisible, setFacultyModalVisible] = React.useState(false);
  const [levelModalVisible, setLevelModalVisible] = React.useState(false);
  const [rechargeAmount, setRechargeAmount] = React.useState('1000');
  const [provider, setProvider] = React.useState<'MTN MoMo' | 'Orange Money'>('MTN MoMo');
  const [insufficientVisible, setInsufficientVisible] = React.useState(false);
  const [accountVisible, setAccountVisible] = React.useState(false);
  const [authVisible, setAuthVisible] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'sign-in' | 'sign-up' | 'reset' | 'new-password' | 'verify-email'>('sign-in');
  const [showPassword, setShowPassword] = React.useState(false);
  const [authEmail, setAuthEmail] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');
  const [authName, setAuthName] = React.useState('');
  const [authPhone, setAuthPhone] = React.useState('');
  const [authWhatsappPhone, setAuthWhatsappPhone] = React.useState('');
  const [authUniversity, setAuthUniversity] = React.useState('');
  const [authFaculty, setAuthFaculty] = React.useState('');
  const [authLevel, setAuthLevel] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);
  const [authNotice, setAuthNotice] = React.useState('');
  const [authCapabilities, setAuthCapabilities] = React.useState({ passwordReset: false, google: false });
  const [resetToken, setResetToken] = React.useState('');
  const [onboardingVisible, setOnboardingVisible] = React.useState(false);
  const [freePdfSelectorVisible, setFreePdfSelectorVisible] = React.useState(false);
  const [onboardingIndex, setOnboardingIndex] = React.useState(0);
  const [studentSession, setStudentSession] = React.useState<StudentSession | null>(null);
  const [studentProfile, setStudentProfile] = React.useState<StudentProfile | null>(null);
  const [syncingAccount, setSyncingAccount] = React.useState(false);
  const [clientTab, setClientTab] = React.useState<ClientCatalogTab>('packs');
  const [activeSection, setActiveSection] = React.useState<AppSection>('home');
  const [isSessionRestoring, setIsSessionRestoring] = React.useState(true);
  const [rechargePhone, setRechargePhone] = React.useState('');
  const [rechargeLoading, setRechargeLoading] = React.useState(false);
  const [pollingMessage, setPollingMessage] = React.useState('');
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
      setRechargePhone(studentProfile?.phone || studentProfile?.whatsappPhone || '');
    }
  }, [rechargeVisible, studentProfile]);

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
    const handleAuthLink = (url: string | null) => {
      if (!url || !url.startsWith('campus-bordes://reset-password')) return;
      const token = new URL(url).searchParams.get('token');
      if (!token) return;
      setResetToken(token);
      setAuthMode('new-password');
      setAuthNotice('Choisis maintenant ton nouveau mot de passe.');
      setAuthVisible(true);
    };
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthLink(url));
    Linking.getInitialURL().then(handleAuthLink).catch(() => undefined);

    const restoreSession = async () => {
      try {
        const storedSession = await loadStudentSession();
        if (storedSession) {
          if (mounted) setStudentSession(storedSession);
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

    return () => { mounted = false; linkSub.remove(); };
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) setUpdateAvailable(true);
      } catch {}
    };
    checkForUpdates();
  }, []);

  React.useEffect(() => {
    if (authMode === 'sign-up') return;
    setAuthPhone(''); setAuthWhatsappPhone('');
    setAuthUniversity(''); setAuthFaculty(''); setAuthLevel('');
  }, [authMode]);

  React.useEffect(() => {
    if (!studentSession) { setOnboardingVisible(false); return; }
    const checkOnboarding = async () => {
      try {
        let seen = '0';
        if (Platform.OS === 'web') {
          seen = localStorage.getItem(onboardingStorageKey) || '0';
        } else {
          seen = await SecureStore.getItemAsync(onboardingStorageKey) || '0';
        }
        setOnboardingVisible(seen !== '1');
      } catch { setOnboardingVisible(true); }
    };
    checkOnboarding();
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
      setBalance(account.wallet.balanceCoins);
      setIaCredits(account.wallet.iaCredits);
      setSubscriptionTier(account.subscription.tier);
      setSubscriptionExpiresAt(account.subscription.expiresAt);
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
    } finally { setSyncingAccount(false); }
  };

  const submitAuth = async () => {
    const email = authEmail.trim();
    const password = authPassword.trim();
    const name = authName.trim();
    const whatsappPhone = authWhatsappPhone.trim();
    const phone = whatsappPhone;
    const university = authUniversity.trim();
    const faculty = authFaculty.trim();
    const level = authLevel.trim();

    if (authMode === 'new-password') {
      if (!resetToken || password.length < 8) {
        Alert.alert('Nouveau mot de passe', 'Choisis au moins 8 caracteres.');
        return;
      }
      setAuthLoading(true);
      try {
        await resetStudentPassword(resetToken, password);
        setResetToken('');
        setAuthPassword('');
        setAuthMode('sign-in');
        setAuthNotice('Mot de passe modifie. Tu peux te connecter.');
      } catch (error) {
        Alert.alert('Lien invalide', error instanceof Error ? error.message : 'Demande un nouveau lien.');
      } finally { setAuthLoading(false); }
      return;
    }

    if (!email) { Alert.alert('Connexion', 'Entre ton email.'); return; }
    if ((authMode === 'sign-in' || authMode === 'sign-up') && !password) { Alert.alert('Connexion', 'Entre ton mot de passe.'); return; }
    if (authMode === 'sign-up' && !name) { Alert.alert('Création du compte', 'Entre ton nom.'); return; }
    if (authMode === 'sign-up' && !whatsappPhone) { Alert.alert('Création du compte', 'Entre ton numero WhatsApp.'); return; }
    if (authMode === 'sign-up' && !university) { Alert.alert('Création du compte', 'Choisis ton université.'); return; }
    if (authMode === 'sign-up' && !faculty) { Alert.alert('Création du compte', 'Entre ta filière.'); return; }

    setAuthLoading(true);
    setAuthNotice('');
    try {
      if (authMode === 'reset') {
        await requestStudentPasswordReset(email);
        setAuthNotice('Lien de reinitialisation envoye.');
        Alert.alert('Email envoye', 'Ouvre le lien recu pour changer ton mot de passe.');
        return;
      }
      const session =
        authMode === 'sign-in'
          ? await signInStudent(email, password)
          : await signUpStudent(email, password, name, { phone, whatsappPhone, university, faculty, level });
      if (!session) { setAuthMode('verify-email'); return; }
      setStudentSession(session);
      if (authMode === 'sign-up') {
        const updatedProfile = await updateStudentProfile({ name, phone, whatsappPhone, university, faculty, level });
        setStudentProfile(updatedProfile);
      }
      await syncStudentAccount(session);
      setAuthVisible(false);
      setActiveSection('home');
      if (authMode === 'sign-up') { setFreePdfSelectorVisible(true); }
      else { Alert.alert('Connecte', 'Tes achats PDF et ton wallet sont synchronises.'); }
    } catch (error) {
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
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
    try {
      if (Platform.OS === 'web') { localStorage.setItem(onboardingStorageKey, '1'); }
      else { await SecureStore.setItemAsync(onboardingStorageKey, '1'); }
    } catch {}
    setOnboardingVisible(false);
  };

  const signOutStudent = async () => {
    setStudentSession(null);
    await clearStudentSession().catch(() => undefined);
    setStudentProfile(null);
    setPurchasedDocuments([]); setPurchasedPacks([]);
    setBalance(0); setIaCredits(0);
    setSubscriptionTier('free'); setSubscriptionExpiresAt(null);
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
    if (purchasedDocuments.includes(document.id)) { Alert.alert('Déjà acheté', 'Ce PDF est déjà dans ta bibliothèque.'); return; }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour acheter ce PDF avec ton wallet.'); setAuthVisible(true); return; }
    setPurchasingDocumentId(document.id);
    recordPdfAnalyticsEvent({ eventType: 'purchase_start', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, subject: document.subject, level: document.level } });
    purchasePdfDocument(document.id)
      .then(async () => {
        setPurchasedDocuments((current) => [document.id, ...current.filter((id) => id !== document.id)]);
        await syncStudentAccount(studentSession);
        recordPdfAnalyticsEvent({ eventType: 'purchase_success', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, subject: document.subject, level: document.level } });
        Alert.alert('PDF acheté', `${document.title} est maintenant dans Mes PDF.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        recordPdfAnalyticsEvent({ eventType: 'purchase_failed', documentId: document.id, accessToken: 'better-auth', metadata: { price: document.price, reason: message || 'unknown' } });
        if (message.toLowerCase().includes('insufficient')) { setInsufficientVisible(true); return; }
        Alert.alert('Achat impossible', message || 'Réessaie dans un instant.');
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
        Alert.alert('Pack débloqué', `${pack.title} est maintenant dans ta bibliothèque.`);
      } else if (unlocked.length > 0) {
        Alert.alert(
          'Pack partiellement débloqué',
          `${unlocked.length}/${pendingIds.length} PDF débloqués. Solde insuffisant pour le reste.`,
        );
      } else {
        setInsufficientVisible(true);
      }
    } finally {
      setPurchasingPackId(null);
    }
  };

  const buyPack = (pack: CampusPdfPack) => {
    if (purchasedPacks.includes(pack.id)) { Alert.alert('Pack déjà acheté', 'Ce pack est déjà dans ta bibliothèque.'); return; }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour acheter ce pack avec ton wallet.'); setAuthVisible(true); return; }

    if (isSuggestedPack(pack)) {
      const pendingIds = pack.documentIds.filter((id) => !purchasedDocuments.includes(id));
      if (!pendingIds.length) {
        setPurchasedPacks((current) => [pack.id, ...current.filter((id) => id !== pack.id)]);
        Alert.alert('Déjà débloqué', 'Tu possèdes déjà tous les PDF de ce pack.');
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
        Alert.alert('Pack acheté', `${pack.title} est maintenant dans ta bibliothèque.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('insufficient')) { setInsufficientVisible(true); return; }
        Alert.alert('Achat impossible', message || 'Réessaie dans un instant.');
      })
      .finally(() => { setPurchasingPackId(null); });
  };

  const rechargeWallet = async () => {
    const amount = Number.parseInt(rechargeAmount, 10);
    if (!Number.isFinite(amount) || amount < 500) { Alert.alert('Montant invalide', 'Le minimum de recharge est 500 FCFA.'); return; }
    if (!studentSession) { setAuthMode('sign-in'); setAuthNotice('Connecte-toi pour recharger ton wallet PDF.'); setAuthVisible(true); return; }
    if (!rechargePhone.trim()) { Alert.alert('Numéro requis', 'Veuillez saisir votre numéro de téléphone Mobile Money.'); return; }
    try {
      setRechargeLoading(true);
      setPollingMessage('Initialisation de la transaction...');
      const res = await topUpStudentWallet(amount, provider, rechargePhone.trim());
      const reference = res.reference;
      let attempts = 0;
      const maxAttempts = 20;
      setPollingMessage('Demande envoyée. Veuillez valider le message de confirmation sur votre téléphone...');
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
            if (statusRes.balanceCoins !== undefined) setBalance(statusRes.balanceCoins);
            setTransactions((current) => [makeTransaction(`Recharge ${provider}`, amount, 'topup'), ...current]);
            await syncStudentAccount(studentSession);
            Alert.alert('Recharge réussie', `${formatCoins(amount)} Coins ajoutés via ${provider}.`);
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            rechargePollRef.current = null;
            setRechargeLoading(false);
            setPollingMessage('');
            Alert.alert('Paiement échoué', 'La transaction a été rejetée ou a échoué.');
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
    setRechargeLoading(false);
    setPollingMessage('');
    setRechargeVisible(false);
  };

  React.useEffect(() => () => {
    if (rechargePollRef.current) clearInterval(rechargePollRef.current);
  }, []);

  const buySubscription = async (tier: 'basic' | 'premium') => {
    try {
      const result = await purchaseSubscription(tier);
      setSubscriptionTier(result.tier as 'basic' | 'premium');
      setSubscriptionExpiresAt(result.expiresAt);
      Alert.alert('Abonnement activé', `Tu as souscrit au forfait ${tier}.`);
      await syncStudentAccount(studentSession ?? undefined);
    } catch (error) { Alert.alert('Achat impossible', error instanceof Error ? error.message : 'Solde insuffisant ou erreur.'); }
  };

  const buyIaPack = async (packId: 'micro' | 'standard' | 'boost') => {
    try {
      const result = await purchaseIaPack(packId);
      setBalance(result.balanceCoins);
      setIaCredits(result.iaCredits);
      Alert.alert('Pack IA ajouté', 'Tes crédits IA ont été mis à jour.');
      await syncStudentAccount(studentSession ?? undefined);
    } catch (error) { Alert.alert('Achat impossible', error instanceof Error ? error.message : 'Solde insuffisant ou erreur.'); }
  };

  const handleDownloadUpdate = async () => {
    setUpdateLoading(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch { Alert.alert('Erreur', 'Impossible de télécharger la mise a jour.'); setUpdateLoading(false); }
  };

  // ── Derived state ────────────────────────────────────────────────────────
  const hasSubscription = subscriptionTier === 'basic' || subscriptionTier === 'premium';
  const effectivePurchasedDocuments = hasSubscription
    ? Array.from(new Set([...pdfDocuments.map((d) => d.id), ...purchasedDocuments]))
    : purchasedDocuments;
  const ownedLibrary = pdfDocuments.filter((d) => effectivePurchasedDocuments.includes(d.id));
  const publishedPacks = pdfPacks.filter((p) => p.status === 'published');
  const homePacks = [...publishedPacks].sort((a, b) => {
    const leftVal = a.discountPercent * 10 + a.documentCount;
    const rightVal = b.discountPercent * 10 + b.documentCount;
    return rightVal - leftVal;
  });

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
    if (section === 'premium') { setActiveSection('premium'); setSubscriptionVisible(false); return; }
    setActiveSection(section);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!fontsLoaded) return null;

  if (editingDocumentId) {
    const { DocumentEditorScreen } = require('./features/documents/DocumentEditorScreen');
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: stitchColors.background }}>
          <StatusBar barStyle="dark-content" />
          <DocumentEditorScreen documentId={editingDocumentId} onClose={() => setEditingDocumentId(null)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const showAuthGate = !studentSession;
  const initials = studentProfile?.name?.slice(0, 2).toUpperCase() ?? 'CB';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={stitchColors.surface} translucent={false} />

        {/* Update Banner */}
        {updateAvailable && (
          <View style={{ backgroundColor: stitchColors.surfaceContainerHigh, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 }}>Nouvelle version disponible !</Text>
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
          <OnboardingScreen onFinish={() => setHasSeenOnboarding(true)} />
        ) : showAuthGate ? (
          <AuthScreen
            mode={authMode}
            email={authEmail}
            password={authPassword}
            name={authName}
            whatsappPhone={authWhatsappPhone}
            university={authUniversity}
            faculty={authFaculty}
            level={authLevel}
            loading={authLoading}
            notice={authNotice}
            canGoogle={authCapabilities.google}
            canPasswordReset={authCapabilities.passwordReset}
            onModeChange={setAuthMode}
            onEmailChange={setAuthEmail}
            onPasswordChange={setAuthPassword}
            onNameChange={setAuthName}
            onWhatsappChange={setAuthWhatsappPhone}
            onUniversityChange={setAuthUniversity}
            onFacultyChange={setAuthFaculty}
            onLevelChange={setAuthLevel}
            onSubmit={submitAuth}
            onGoogle={handleGoogleSignIn}
          />
        ) : (
          <View style={styles.appShell}>
            {/* TopBar */}
            <TopBar
              appName="Campus 360"
              onBellPress={() => setNotificationsVisible(true)}
              hasUnread={notifications.length > 0}
              onAvatarPress={() => openSection('account')}
              avatarInitials={initials}
            />

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
              {activeSection === 'home' && (
                <HomeScreen
                  studentName={studentProfile?.name}
                  balance={balance}
                  iaCredits={iaCredits}
                  transactions={transactions}
                  homePacks={homePacks}
                  ownedDocuments={ownedLibrary}
                  onRecharge={() => openSection('account')}
                  onExplore={() => openSection('explore')}
                  onBuyPack={buyPack}
                  purchasingPackId={purchasingPackId}
                  onDocuments={() => openSection('documents')}
                  onLibrary={() => openSection('library')}
                  onPremium={() => openSection('premium')}
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
                  onOpenDocument={buyDocument}
                  onExplore={() => openSection('explore')}
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
                  subscriptionTier={subscriptionTier}
                  transactions={transactions}
                  purchasedDocumentsCount={ownedLibrary.length}
                  syncingAccount={syncingAccount}
                  notifNewPdf={notifNewPdf}
                  notifPromos={notifPromos}
                  notifAlerts={notifAlerts}
                  onToggleNotifNewPdf={setNotifNewPdf}
                  onToggleNotifPromos={setNotifPromos}
                  onToggleNotifAlerts={setNotifAlerts}
                  onOpenNotificationsSettings={() => setNotificationsSettingsVisible(true)}
                  onOpenSecuritySettings={() => setSecuritySettingsVisible(true)}
                  onOpenSupport={() => setSupportModalVisible(true)}
                  onSync={() => syncStudentAccount(studentSession ?? undefined)}
                  onRecharge={() => { setAccountVisible(true); }}
                  onPremium={() => openSection('premium')}
                  onLibrary={() => openSection('library')}
                  onDocuments={() => openSection('documents')}
                  onSignOut={signOutStudent}
                />
              )}

              {activeSection === 'premium' && (
                <PremiumSection
                  subscriptionTier={subscriptionTier}
                  balance={balance}
                  iaCredits={iaCredits}
                  onBuySubscription={buySubscription}
                  onBuyIaPack={buyIaPack}
                  onRecharge={() => { setActiveSection('account'); setRechargeVisible(true); }}
                />
              )}

              {activeSection !== 'premium' && activeSection !== 'account' && activeSection !== 'home' && activeSection !== 'explore' && activeSection !== 'library' && activeSection !== 'documents' ? (
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
            <Text style={styles.modalTitle}>Compte PDF</Text>
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
                <Text style={styles.kicker}>Solde PDF & IA</Text>
                <Pressable onPress={() => syncStudentAccount(studentSession ?? undefined)}>
                  <Text style={styles.inlineUtilityText}>{syncingAccount ? 'Sync...' : 'Actualiser'}</Text>
                </Pressable>
              </View>
              <Text style={styles.walletAmount}>{formatCoins(balance)} C</Text>
              <Text style={styles.walletHint}>{subscriptionTier === 'premium' ? 'Premium' : subscriptionTier === 'basic' ? 'Basic' : 'Gratuit'} • {iaCredits} cr IA</Text>
            </View>
            <View style={styles.accountQuickRow}>
              <Pressable style={styles.accountQuickAction} onPress={() => { setAccountVisible(false); openSection('library'); }}>
                <Text style={styles.accountQuickActionLabel}>Bibliothèque</Text>
                <Text style={styles.accountQuickActionValue}>{`${purchasedDocuments.length} PDF`}</Text>
              </Pressable>
              <Pressable style={styles.accountQuickAction} onPress={() => { setAccountVisible(false); setRechargeVisible(true); }}>
                <Text style={styles.accountQuickActionLabel}>Wallet</Text>
                <Text style={styles.accountQuickActionValue}>{`${formatCoins(balance)} C`}</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 8 }}>
              <PrimaryButtonLocal label="👑 Passer en Premium" fluid onPress={() => { setAccountVisible(false); openSection('premium'); }} />
            </View>
            <View style={{ marginTop: 8 }}>
              <PrimaryButtonLocal label="Recharger le wallet" fluid onPress={() => { setAccountVisible(false); setRechargeVisible(true); }} />
            </View>
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
              <Text style={styles.modalTitle}>Recharger le wallet PDF</Text>
              <Text style={{ ...stitchTypography.bodyMd, color: stitchColors.onSurfaceVariant }}>Ajoute des coins pour acheter tes packs et PDF sans friction.</Text>
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
              <TextInput keyboardType="phone-pad" placeholder="Ex: +237680000000" placeholderTextColor={stitchColors.inkSubtle} value={rechargePhone} onChangeText={setRechargePhone} style={{ backgroundColor: stitchColors.surfaceContainerLow, borderWidth: 1, borderColor: stitchColors.outlineVariant, borderRadius: stitchRadius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: stitchColors.onSurface, outlineStyle: 'none', outlineWidth: 0 } as any} />
            </View>
            {rechargeLoading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={stitchColors.emeraldTone} />
                <Text style={{ color: stitchColors.emeraldTone, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{pollingMessage}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <PrimaryButtonLocal label="Annuler" variant="secondary" fluid onPress={cancelRechargePolling} />
                <PrimaryButtonLocal label="Valider" fluid onPress={rechargeWallet} />
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
              <ScrollView style={{ flex: 1, padding: 20 }}>
                {[
                  { label: 'Nouveaux PDF et Packs', desc: 'Sois alerté dès qu\'on ajoute de nouveaux sujets pour ta filière.', value: notifNewPdf, onChange: setNotifNewPdf },
                  { label: 'Promotions et Offres', desc: 'Reçois des codes promos et réductions sur les recharges.', value: notifPromos, onChange: setNotifPromos },
                  { label: 'Alertes Comptes', desc: 'Informations sur tes achats et recharges de coins.', value: notifAlerts, onChange: setNotifAlerts },
                ].map(({ label, desc, value, onChange }) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: stitchColors.inkSoft }}>{label}</Text>
                      <Text style={{ fontSize: 13, color: stitchColors.inkMuted, marginTop: 4 }}>{desc}</Text>
                    </View>
                    <Switch value={value} onValueChange={onChange} trackColor={{ false: stitchColors.inkFaint, true: stitchColors.emeraldTone }} thumbColor={stitchColors.white} />
                  </View>
                ))}
              </ScrollView>
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
                <Text style={{ fontSize: 14, fontWeight: '700', color: stitchColors.inkMuted, marginBottom: 16 }}>SESSIONS ACTIVES</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: stitchColors.surface, borderRadius: 12, borderWidth: 1, borderColor: stitchColors.inkFaint }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${stitchColors.ink}12`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Smartphone size={20} color={stitchColors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: stitchColors.inkSoft }}>Appareil Actuel (Web)</Text>
                    <Text style={{ fontSize: 13, color: stitchColors.inkMuted }}>Connecté depuis Yaoundé</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: stitchColors.emeraldTone, fontWeight: '700' }}>Actif</Text>
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
                <Pressable style={{ backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, width: '100%', justifyContent: 'center' }} onPress={() => Linking.openURL('https://wa.me/237690273500')}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Discuter sur WhatsApp</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* University Picker */}
        <PickerModal
          visible={universityModalVisible}
          title="Choisis ton université"
          options={CAMEROON_UNIVERSITIES}
          selected={authUniversity}
          onSelect={(v) => { setAuthUniversity(v); setUniversityModalVisible(false); }}
          onClose={() => setUniversityModalVisible(false)}
        />

        {/* Faculty Picker */}
        <PickerModal
          visible={facultyModalVisible}
          title="Choisis ta filière"
          options={CAMEROON_FACULTIES}
          selected={authFaculty}
          onSelect={(v) => { setAuthFaculty(v); setFacultyModalVisible(false); }}
          onClose={() => setFacultyModalVisible(false)}
        />

        {/* Level Picker */}
        <PickerModal
          visible={levelModalVisible}
          title="Choisis ton niveau"
          options={CAMEROON_LEVELS}
          selected={authLevel}
          onSelect={(v) => { setAuthLevel(v); setLevelModalVisible(false); }}
          onClose={() => setLevelModalVisible(false)}
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

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Picker Modal ──────────────────────────────────────────────────────────────
function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.dropdownModalCard, { padding: 0 }]} onPress={() => {}}>
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: stitchColors.inkFaint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: stitchColors.inkSoft }}>{title}</Text>
            <Pressable onPress={onClose}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${stitchColors.ink}0D`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, color: stitchColors.inkMuted }}>✕</Text>
              </View>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.dropdownItem, selected === opt && styles.dropdownItemActive]}
                onPress={() => onSelect(opt)}
              >
                <Text style={[styles.dropdownItemText, selected === opt && styles.dropdownItemTextActive]}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Premium Section ───────────────────────────────────────────────────────────
function PremiumSection({
  subscriptionTier,
  balance,
  iaCredits,
  onBuySubscription,
  onBuyIaPack,
  onRecharge,
}: {
  subscriptionTier: 'free' | 'basic' | 'premium';
  balance: number;
  iaCredits: number;
  onBuySubscription: (tier: 'basic' | 'premium') => void;
  onBuyIaPack: (packId: 'micro' | 'standard' | 'boost') => void;
  onRecharge: () => void;
}) {
  const PASSES = [
    {
      key: 'free' as const,
      folio: '— 01',
      name: 'Découverte',
      price: 'Gratuit',
      priceUnit: "toujours",
      kicker: 'Pour commencer',
      body: "Tu fouilles le catalogue, tu achètes les PDFs à l'unité. C'est le pied dedans.",
      bullets: ["Aperçu gratuit de chaque PDF", "Achat à l'unité depuis ton wallet", "5 questions IA par jour"],
      isFeatured: false,
      cta: 'Tu es ici',
    },
    {
      key: 'basic' as const,
      folio: '— 02',
      name: 'Étudiant',
      price: '1 000',
      priceUnit: 'C / mois',
      kicker: 'Pour les sessions intenses',
      body: "Tout le catalogue ouvert. Tu lis, tu révises, tu reprends. L'IA attendra l'année prochaine.",
      bullets: ["Tout le catalogue, sans limite", "Lecture hors-ligne", "Synchronisation multi-appareils"],
      isFeatured: false,
      cta: "S'abonner",
    },
    {
      key: 'premium' as const,
      folio: '— 03',
      name: 'Bibliothécaire',
      price: '2 000',
      priceUnit: 'C / mois',
      kicker: 'Pour ceux qui posent les bonnes questions',
      body: "Le catalogue entier, plus 100 questions IA par mois. L'assistant te résume, t'explique, te quiz.",
      bullets: ["Tout Découverte et Étudiant inclus", "100 crédits IA par mois", "Fiches, résumés et quiz générés"],
      isFeatured: true,
      cta: "Passer Bibliothécaire",
    },
  ];

  const IA_PACKS = [
    { id: 'micro' as const, name: 'Micro', credits: 20, price: 250, note: 'Une soirée' },
    { id: 'standard' as const, name: 'Standard', credits: 50, price: 500, note: 'Un weekend' },
    { id: 'boost' as const, name: 'Boost', credits: 120, price: 1000, note: "Une session d'examen" },
  ];

  return (
    <View style={[styles.premiumContainer, styles.premiumContent]}>
      <View style={styles.premiumHero}>
        <Text style={styles.premiumEyebrow}>PREMIUM</Text>
        <Text style={styles.premiumTitle}>Débloquez tout.</Text>
        <Text style={styles.premiumSubtitle}>
          Choisis ton rythme. Change ou annule à tout moment.
        </Text>
      </View>

      <View style={styles.passStack}>
        {PASSES.map((pass) => {
          const isCurrent = (pass.key === 'free' && subscriptionTier === 'free') || (pass.key === 'basic' && subscriptionTier === 'basic') || (pass.key === 'premium' && subscriptionTier === 'premium');
          return (
            <View
              key={pass.key}
              style={[
                styles.passCard,
                pass.isFeatured && styles.passCardFeatured,
                isCurrent && styles.passCardCurrent,
              ]}
            >
              {pass.isFeatured ? (
                <LinearGradient
                  colors={brandGradient.colors}
                  start={brandGradient.horizontal.start}
                  end={brandGradient.horizontal.end}
                  style={styles.passRibbon}
                >
                  <Text style={styles.passRibbonText}>LE PLUS CHOISI</Text>
                </LinearGradient>
              ) : null}

              <View style={styles.passCardTop}>
                <Text style={styles.passKicker}>{pass.kicker.toUpperCase()}</Text>
                {isCurrent ? <Text style={styles.passCurrentTag}>EN COURS</Text> : null}
              </View>

              <Text style={styles.passName}>{pass.name}</Text>

              <View style={styles.passPriceRow}>
                <Text style={styles.passPrice}>{pass.price}</Text>
                {pass.priceUnit ? <Text style={styles.passPriceUnit}>{pass.priceUnit}</Text> : null}
              </View>

              <Text style={styles.passBody}>{pass.body}</Text>

              <View style={styles.passBullets}>
                {pass.bullets.map((b) => (
                  <View key={b} style={styles.passBulletRow}>
                    <View style={[styles.passBulletIcon, pass.isFeatured && styles.passBulletIconFeatured]}>
                      <Check size={11} color={pass.isFeatured ? '#FFFFFF' : stitchColors.emerald} strokeWidth={3} />
                    </View>
                    <Text style={styles.passBulletText}>{b}</Text>
                  </View>
                ))}
              </View>

              {pass.isFeatured ? (
                <Pressable
                  onPress={() => onBuySubscription('premium')}
                  disabled={isCurrent}
                  style={({ pressed }) => [isCurrent && { opacity: 0.5 }, pressed && !isCurrent && { opacity: 0.9 }]}
                >
                  <LinearGradient
                    colors={brandGradient.colors}
                    start={brandGradient.horizontal.start}
                    end={brandGradient.horizontal.end}
                    style={styles.passCtaFeatured}
                  >
                    <Text style={styles.passCtaFeaturedText}>{isCurrent ? 'Tu es ici' : pass.cta}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.passCta, isCurrent && { opacity: 0.5 }]}
                  onPress={() => { if (pass.key === 'free') return; onBuySubscription(pass.key as 'basic' | 'premium'); }}
                  disabled={pass.key === 'free' || isCurrent}
                >
                  <Text style={styles.passCtaText}>{isCurrent ? 'Tu es ici' : pass.cta}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* IA top-up — icon-tile grid (consistent with Home quick actions) */}
      <View style={styles.iaSection}>
        <Text style={styles.blockTitle}>Bons de recharge IA</Text>
        <View style={styles.iaGrid}>
          {IA_PACKS.map((pack) => (
            <Pressable
              key={pack.id}
              style={({ pressed }) => [styles.iaTile, pressed && styles.iaTilePressed]}
              onPress={() => onBuyIaPack(pack.id)}
            >
              <View style={styles.iaTileIcon}>
                <Sparkles size={18} color={stitchColors.sienna} strokeWidth={2} />
              </View>
              <Text style={styles.iaTileCredits}>{pack.credits}</Text>
              <Text style={styles.iaTileCreditsLabel}>CRÉDITS</Text>
              <Text style={styles.iaTileName}>{pack.name}</Text>
              <Text style={styles.iaTilePrice}>{pack.price} C</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Wallet callout */}
      <View style={styles.walletCallout}>
        <Text style={styles.walletCalloutTitle}>Besoin de Coins ?</Text>
        <Text style={styles.walletCalloutBody}>
          Recharge via Mobile Money (MoMo / Orange Money), puis paie ce que tu veux.
        </Text>
        <Pressable onPress={onRecharge} style={({ pressed }) => pressed && { opacity: 0.9 }}>
          <LinearGradient
            colors={brandGradient.colors}
            start={brandGradient.horizontal.start}
            end={brandGradient.horizontal.end}
            style={styles.walletCalloutCta}
          >
            <Text style={styles.walletCalloutCtaText}>Recharger le wallet</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ── Shared styles (from original App.tsx) ────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: stitchColors.surface },
  appShell: { flex: 1, backgroundColor: stitchColors.background },
  scrollContent: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingBottom: 160 },
  scrollContentCompact: { paddingBottom: 116 },
  loadingScreen: { flex: 1, backgroundColor: stitchColors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingEyebrow: { fontFamily: stitchTypography.monoEyebrow.fontFamily, fontSize: 12, letterSpacing: 2, color: '#FFFFFF', fontWeight: '700' },
  loadingRule: { width: 48, height: 1, backgroundColor: stitchColors.sienna },

  loadingText: { color: stitchColors.inkSubtle, fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(19, 27, 46, 0.32)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: stitchColors.surfaceContainerLowest, borderTopLeftRadius: stitchRadius.xl, borderTopRightRadius: stitchRadius.xl, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, shadowColor: stitchColors.ink, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 16 },
  modalTitle: { ...stitchTypography.headlineMd, color: stitchColors.onSurface, marginBottom: 16, textAlign: 'center' },

  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: stitchColors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: stitchColors.surfaceContainerHighest },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
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
  rechargeHeroBadgeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },

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
  premiumSubtitle: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: stitchColors.inkMuted, lineHeight: 21 },

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
  passRibbonText: { color: '#FFFFFF', fontFamily: SANS, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  passCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  passKicker: { fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0.2, color: stitchColors.inkMuted, fontWeight: '600' },
  passCurrentTag: { fontFamily: MONO, fontSize: 9, fontWeight: '700', color: stitchColors.emerald, letterSpacing: 1.2 },
  passName: { fontFamily: SANS, fontSize: 22, fontWeight: '700', color: stitchColors.ink, letterSpacing: -0.4, marginBottom: 12 },
  passPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  passPrice: { fontFamily: SANS, fontSize: 32, fontWeight: '800', color: stitchColors.ink, letterSpacing: -0.8 },
  passPriceUnit: { fontFamily: 'Inter, sans-serif', fontSize: 13, color: stitchColors.inkMuted },
  passBody: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: stitchColors.inkMuted, lineHeight: 20, marginBottom: 16 },
  passBullets: { gap: 10, marginBottom: 20 },
  passBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passBulletIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: stitchColors.emeraldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  passBulletIconFeatured: { backgroundColor: stitchColors.siennaSoft },
  passBulletText: { flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: stitchColors.inkSoft, lineHeight: 19 },
  passCta: {
    backgroundColor: stitchColors.surfaceContainerHigh,
    paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button,
  },
  passCtaText: { color: stitchColors.ink, fontFamily: SANS, fontSize: 14, fontWeight: '700' },
  passCtaFeatured: { paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button },
  passCtaFeaturedText: { color: '#FFFFFF', fontFamily: SANS, fontSize: 14, fontWeight: '700' },

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
  iaTileName: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '600', color: stitchColors.inkSoft },
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
  walletCalloutBody: { fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: stitchColors.inkMuted, lineHeight: 20, marginBottom: 16 },
  walletCalloutCta: { paddingVertical: 14, alignItems: 'center', borderRadius: stitchRadius.button },
  walletCalloutCtaText: { fontFamily: SANS, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

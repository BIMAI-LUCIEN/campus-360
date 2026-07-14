import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { type ReactNode, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import {
  Alert,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from 'react-native';
import { Bell, Shield, MessageSquare, Smartphone, Wallet, BookOpen, Crown, Home, Search, User, Sparkles, FileText } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

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
} from './src/features/auth/betterAuth';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { FreePdfSelector } from './src/features/onboarding/FreePdfSelector';
import { PdfStudentSection } from './src/features/pdf/PdfStudentSection';
import { DocumentsScreen } from './src/features/documents/DocumentsScreen';
import { DocumentEditorWebView } from './src/features/documents/DocumentEditorWebView';
import {
  buildSuggestedPacks,
  listPublishedPdfDocuments,
  listPublishedPdfPacks,
  purchasePdfPack,
  purchasePdfDocument,
  recordPdfAnalyticsEvent,
} from './src/features/pdf/pdfApi';
import type { CampusDocument, CampusPdfPack, Transaction } from './src/types';

type ClientCatalogTab = 'packs' | 'catalog' | 'library';
type AppSection = 'home' | 'explore' | 'library' | 'documents' | 'account' | 'premium';

const logo = require('./assets/icon.png');
const catalogCard = require('./assets/catalog-card.png');
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

function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  fluid,
  style,
  textStyle,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  fluid?: boolean;
  style?: any;
  textStyle?: any;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        fluid && styles.fluid,
        {
          transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
          opacity: disabled ? 0.5 : (pressed ? 0.9 : 1),
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.secondaryButtonText,
          variant === 'danger' && styles.dangerButtonText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ModalCard({ children }: { children: ReactNode }) {
  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>{children}</View>
    </View>
  );
}

function NavGlyph({ section, active }: { section: AppSection; active: boolean }) {
  const iconColor = active ? colors.primaryDeep : '#8CA0B8';
  const size = 20;

  if (section === 'home') {
    return <Home size={size} color={iconColor} />;
  }

  if (section === 'explore') {
    return <Search size={size} color={iconColor} />;
  }

  if (section === 'library') {
    return <BookOpen size={size} color={iconColor} />;
  }

  if (section === 'documents') {
    return <FileText size={size} color={iconColor} />;
  }

  return <User size={size} color={iconColor} />;
}

const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        try {
          return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        } catch {}
      },
    };
  }
  return {
    getItem: (key: string) => {
      try {
        return SecureStore.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        SecureStore.setItem(key, value);
      } catch {}
    },
  };
};

const onboardingSlides = [
  {
    title: 'Trouve le bon PDF',
    text: 'Recherche par université, filière, matière ou niveau.',
  },
  {
    title: 'Preview puis achat',
    text: 'Regarde un apercu, puis débloqué le PDF avec ton wallet.',
  },
  {
    title: 'Lis et revise',
    text: 'Garde tes achats et utilise l assistant pour réviser plus vite.',
  },
];

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const { width } = useWindowDimensions();
  const compactScreen = width < 390;
  const narrowScreen = width < 460;
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsSettingsVisible, setNotificationsSettingsVisible] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [securitySettingsVisible, setSecuritySettingsVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [notifNewPdf, setNotifNewPdf] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [balance, setBalance] = useState(0);
  const [iaCredits, setIaCredits] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<'free'|'basic'|'premium'>('free');
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasedDocuments, setPurchasedDocuments] = useState<string[]>([]);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);
  const [pdfDocuments, setPdfDocuments] = useState<CampusDocument[]>([]);
  const [pdfPacks, setPdfPacks] = useState<CampusPdfPack[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [purchasingDocumentId, setPurchasingDocumentId] = useState<string | null>(null);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [rechargeVisible, setRechargeVisible] = useState(false);
  const [subscriptionVisible, setSubscriptionVisible] = useState(false);
  const [universityModalVisible, setUniversityModalVisible] = useState(false);
  const [facultyModalVisible, setFacultyModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [provider, setProvider] = useState<'MTN MoMo' | 'Orange Money'>('MTN MoMo');
  const [insufficientVisible, setInsufficientVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up' | 'reset' | 'new-password' | 'verify-email'>('sign-in');
  const [showPassword, setShowPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authWhatsappPhone, setAuthWhatsappPhone] = useState('');
  const [authUniversity, setAuthUniversity] = useState('');
  const [authFaculty, setAuthFaculty] = useState('');
  const [authLevel, setAuthLevel] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [authCapabilities, setAuthCapabilities] = useState({ passwordReset: false, google: false });
  const [resetToken, setResetToken] = useState('');
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [freePdfSelectorVisible, setFreePdfSelectorVisible] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [syncingAccount, setSyncingAccount] = useState(false);
  const [clientTab, setClientTab] = useState<ClientCatalogTab>('packs');
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    body: string;
    receivedAt: string;
    data?: any;
  }>>([]);

  const registerForPushNotifications = async () => {
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

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notification] Permission non accordée.');
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn(
          "[Notification] Aucun Project ID (EAS) trouvé dans app.json.\n" +
          "Pour obtenir un jeton push sous Expo SDK 54, vous devez :\n" +
          "1. Créer/enregistrer le projet via 'npx eas project:init'\n" +
          "2. Vérifier que 'extra.eas.projectId' est présent dans app.json."
        );
        return;
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const pushToken = tokenResult.data;
      // Don't log full push tokens — they are addressable identifiers.
      console.log('[Notification] Push token obtained (length):', pushToken.length);

      await registerPushToken(
        pushToken,
        Platform.OS === 'android' ? 'Android Device' : Platform.OS === 'ios' ? 'iOS Device' : 'Web Device',
        Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web'
      );
      console.log('[Notification] Token registered with server.');
    } catch (error) {
      console.warn(
        "[Notification] Impossible d'enregistrer le token push. Remarques :\n" +
        "- Sous Android (Expo SDK 53+), Expo Go ne supporte plus les push notifications à distance. Vous devez utiliser un build de développement (npx expo run:android).\n" +
        "- Détails de l'erreur :",
        error
      );
    }
  };

  useEffect(() => {
    if (studentSession) {
      registerForPushNotifications();
    }
  }, [studentSession]);

  useEffect(() => {
    if (rechargeVisible) {
      setRechargePhone(studentProfile?.phone || studentProfile?.whatsappPhone || '');
    }
  }, [rechargeVisible, studentProfile]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      setNotifications((prev) => [
        {
          id: notification.request.identifier,
          title: notification.request.content.title || 'Notification',
          body: notification.request.content.body || '',
          receivedAt: new Date().toISOString(),
          data: notification.request.content.data,
        },
        ...prev,
      ]);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
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
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleAuthLink(url));
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

    return () => {
      mounted = false;
      linkSubscription.remove();
    };
  }, []);

  // In-app update check
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch {
        // Silent fail — don't block the app
      }
    };

    checkForUpdates();
  }, []);

  const handleDownloadUpdate = async () => {
    setUpdateLoading(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger la mise a jour. Réessaie plus tard.');
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    if (authMode === 'sign-up') return;
    setAuthPhone('');
    setAuthWhatsappPhone('');
    setAuthUniversity('');
    setAuthFaculty('');
    setAuthLevel('');
  }, [authMode]);

  useEffect(() => {
    if (!studentSession) {
      setOnboardingVisible(false);
      return;
    }
    const checkOnboarding = async () => {
      try {
        let seen = '0';
        if (Platform.OS === 'web') {
          seen = localStorage.getItem(onboardingStorageKey) || '0';
        } else {
          seen = await SecureStore.getItemAsync(onboardingStorageKey) || '0';
        }
        setOnboardingVisible(seen !== '1');
      } catch {
        setOnboardingVisible(true);
      }
    };
    checkOnboarding();
  }, [studentSession]);

  const refreshDocuments = async (mounted = true) => {
    setDocumentsLoading(true);
    setDocumentsError('');
    listPublishedPdfDocuments()
      .then(async (documents) => {
        const remotePacks = await listPublishedPdfPacks(documents);
        const packs = remotePacks.length ? remotePacks : buildSuggestedPacks(documents);
        if (mounted) setPdfDocuments(documents);
        if (mounted) setPdfPacks(packs);
        recordPdfAnalyticsEvent({
          eventType: 'catalog_view',
          accessToken: studentSession ? 'better-auth' : undefined,
          metadata: { documentCount: documents.length, packCount: packs.length },
        });
      })
      .catch((error) => {
        if (mounted) setPdfDocuments([]);
        if (mounted) setPdfPacks([]);
        if (mounted) setDocumentsError(error instanceof Error ? error.message : 'Chargement impossible.');
      })
      .finally(() => {
        if (mounted) setDocumentsLoading(false);
      });
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
          label:
            row.type === 'purchase'
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
          date: new Date(row.created_at).toLocaleDateString('fr-CM', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
        })),
      );
    } finally {
      setSyncingAccount(false);
    }
  };

  const submitAuth = async () => {
    // authEmail intentionally not logged — it's PII.
    console.log('submitAuth starting...', { authMode });
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
        console.error('reset password error:', error);
        Alert.alert('Lien invalide', error instanceof Error ? error.message : 'Demande un nouveau lien.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    if (!email) {
      Alert.alert('Connexion', 'Entre ton email.');
      return;
    }
    if ((authMode === 'sign-in' || authMode === 'sign-up') && !password) {
      Alert.alert('Connexion', 'Entre ton mot de passe.');
      return;
    }
    if (authMode === 'sign-up' && !name) {
      Alert.alert('Création du compte', 'Entre ton nom.');
      return;
    }
    if (authMode === 'sign-up' && !whatsappPhone) {
      Alert.alert('Création du compte', 'Entre ton numero WhatsApp.');
      return;
    }
    if (authMode === 'sign-up' && !university) {
      Alert.alert('Création du compte', 'Choisis ton université.');
      return;
    }
    if (authMode === 'sign-up' && !faculty) {
      Alert.alert('Création du compte', 'Entre ta filière.');
      return;
    }

    setAuthLoading(true);
    setAuthNotice('');
    try {
      if (authMode === 'reset') {
        await requestStudentPasswordReset(email);
        setAuthNotice('Lien de reinitialisation envoye.');
        Alert.alert('Email envoye', 'Ouvre le lien recu pour changer ton mot de passe.');
        return;
      }

      console.log('Attempting authentication via Better Auth...');
      const session =
        authMode === 'sign-in'
          ? await signInStudent(email, password)
          : await signUpStudent(email, password, name, {
              phone,
              whatsappPhone,
              university,
              faculty,
              level,
            });

      // Don't dump the whole session (which contains the email and id).
      console.log('Auth session received:', Boolean(session));
      if (!session) {
        setAuthMode('verify-email');
        return;
      }

      setStudentSession(session);
      if (authMode === 'sign-up') {
        const updatedProfile = await updateStudentProfile({
          name,
          phone,
          whatsappPhone,
          university,
          faculty,
          level,
        });
        setStudentProfile(updatedProfile);
      }
      await syncStudentAccount(session);
      setAuthVisible(false);
      setActiveSection('home');
      // Trigger free PDF selector for new sign-ups
      if (authMode === 'sign-up') {
        setFreePdfSelectorVisible(true);
      } else {
        Alert.alert('Connecte', 'Tes achats PDF et ton wallet sont synchronises.');
      }
    } catch (error) {
      console.error('submitAuth error:', error);
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('handleGoogleSignIn starting...');
    setAuthLoading(true);
    setAuthNotice('');
    try {
      const session = await signInWithGoogle();
      console.log('Google Auth session received:', Boolean(session));
      if (!session) {
        setAuthNotice('Erreur lors de la connexion Google.');
        return;
      }
      setStudentSession(session);
      await syncStudentAccount(session);
      setAuthVisible(false);
      setActiveSection('home');
      Alert.alert('Connecte', 'Connexion via Google réussie.');
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Réessaie dans un instant.');
    } finally {
      setAuthLoading(false);
    }
  };

  const finishOnboarding = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(onboardingStorageKey, '1');
      } else {
        await SecureStore.setItemAsync(onboardingStorageKey, '1');
      }
    } catch {}
    setOnboardingVisible(false);
  };

  const signOutStudent = async () => {
    setStudentSession(null);
    await clearStudentSession().catch(() => undefined);
    setStudentProfile(null);
    setPurchasedDocuments([]);
    setPurchasedPacks([]);
    setBalance(0);
    setIaCredits(0);
    setSubscriptionTier('free');
    setSubscriptionExpiresAt(null);
    setTransactions([]);
    setAccountVisible(false);
    setActiveSection('home');
    setAuthMode('sign-in');
    setAuthNotice('');
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Changement de mot de passe', 'Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Changement de mot de passe', 'Le nouveau mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Changement de mot de passe', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await changeStudentPassword(currentPassword, newPassword);
      Alert.alert('Succès', 'Votre mot de passe a été mis à jour.');
      setSecuritySettingsVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de changer le mot de passe.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      if (studentSession) {
        await syncStudentAccount(studentSession);
      }
      await refreshDocuments();
    } catch (err) {
      console.warn('Error during pull to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const buyDocument = (document: CampusDocument) => {
    if (purchasedDocuments.includes(document.id)) {
      Alert.alert('Déjà acheté', 'Ce PDF est deja dans ta bibliothèque.');
      return;
    }

    if (!studentSession) {
      setAuthMode('sign-in');
      setAuthNotice('Connecte-toi pour acheter ce PDF avec ton wallet.');
      setAuthVisible(true);
      return;
    }

    setPurchasingDocumentId(document.id);
    recordPdfAnalyticsEvent({
      eventType: 'purchase_start',
      documentId: document.id,
      accessToken: 'better-auth',
      metadata: {
        price: document.price,
        subject: document.subject,
        level: document.level,
      },
    });
    purchasePdfDocument(document.id)
      .then(async () => {
        setPurchasedDocuments((current) => [document.id, ...current.filter((id) => id !== document.id)]);
        await syncStudentAccount(studentSession);
        recordPdfAnalyticsEvent({
          eventType: 'purchase_success',
          documentId: document.id,
          accessToken: 'better-auth',
          metadata: {
            price: document.price,
            subject: document.subject,
            level: document.level,
          },
        });
        Alert.alert('PDF acheté', `${document.title} est maintenant dans Mes PDF.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        recordPdfAnalyticsEvent({
          eventType: 'purchase_failed',
          documentId: document.id,
          accessToken: 'better-auth',
          metadata: {
            price: document.price,
            reason: message || 'unknown',
          },
        });
        if (message.toLowerCase().includes('insufficient')) {
          setInsufficientVisible(true);
          return;
        }
        Alert.alert('Achat impossible', message || 'Réessaie dans un instant.');
      })
      .finally(() => {
        setPurchasingDocumentId(null);
      });
  };

  const buyPack = (pack: CampusPdfPack) => {
    if (purchasedPacks.includes(pack.id)) {
      Alert.alert('Pack déjà acheté', 'Ce pack est deja dans ta bibliothèque.');
      return;
    }

    if (!studentSession) {
      setAuthMode('sign-in');
      setAuthNotice('Connecte-toi pour acheter ce pack avec ton wallet.');
      setAuthVisible(true);
      return;
    }

    setPurchasingPackId(pack.id);
    purchasePdfPack(pack.id)
      .then(async (result) => {
        const unlockedIds = result.documentIds.length ? result.documentIds : pack.documentIds;
        setPurchasedPacks((current) => [pack.id, ...current.filter((id) => id !== pack.id)]);
        setPurchasedDocuments((current) =>
          Array.from(new Set([...unlockedIds, ...current])),
        );
        await syncStudentAccount(studentSession);
        Alert.alert('Pack acheté', `${pack.title} est maintenant dans ta bibliothèque.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('insufficient')) {
          setInsufficientVisible(true);
          return;
        }
        Alert.alert('Achat impossible', message || 'Réessaie dans un instant.');
      })
      .finally(() => {
        setPurchasingPackId(null);
      });
  };

  const rechargeWallet = async () => {
    const amount = Number.parseInt(rechargeAmount, 10);
    if (!Number.isFinite(amount) || amount < 500) {
      Alert.alert('Montant invalide', 'Le minimum de recharge est 500 FCFA.');
      return;
    }

    if (!studentSession) {
      setAuthMode('sign-in');
      setAuthNotice('Connecte-toi pour recharger ton wallet PDF.');
      setAuthVisible(true);
      return;
    }

    if (!rechargePhone.trim()) {
      Alert.alert('Numéro requis', 'Veuillez saisir votre numéro de téléphone Mobile Money pour valider le débit direct.');
      return;
    }

    try {
      setRechargeLoading(true);
      setPollingMessage('Initialisation de la transaction...');

      const res = await topUpStudentWallet(amount, provider, rechargePhone.trim());
      const reference = res.reference;
      
      let attempts = 0;
      const maxAttempts = 20; // 60 seconds total polling time
      setPollingMessage('Demande envoyée. Veuillez valider le message de confirmation (USSD/PIN) sur votre téléphone...');

      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          const statusRes = await checkTopUpStatus(reference);

          if (statusRes.status === 'success') {
            clearInterval(pollInterval);
            setRechargeLoading(false);
            setPollingMessage('');
            setRechargeVisible(false);
            if (statusRes.balanceCoins !== undefined) {
              setBalance(statusRes.balanceCoins);
            }
            setTransactions((current) => [
              makeTransaction(`Recharge ${provider}`, amount, 'topup'),
              ...current,
            ]);
            await syncStudentAccount(studentSession);
            Alert.alert('Recharge réussie', `${formatCoins(amount)} Coins ajoutés via ${provider}.`);
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            setRechargeLoading(false);
            setPollingMessage('');
            Alert.alert('Paiement échoué', 'La transaction a été rejetée ou a échoué.');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setRechargeLoading(false);
            setPollingMessage('');
            Alert.alert(
              'Délai dépassé',
              'Le délai de validation a expiré. Si vous avez validé le débit, votre solde sera mis à jour en arrière-plan d\'ici quelques instants.'
            );
          }
        } catch (pollErr) {
          console.error('[Topup Polling] Error:', pollErr);
        }
      }, 3000);

    } catch (error) {
      setRechargeLoading(false);
      setPollingMessage('');
      Alert.alert('Recharge impossible', error instanceof Error ? error.message : 'Réessayez dans un instant.');
    }
  };

  const buySubscription = async (tier: 'basic' | 'premium') => {
    try {
      const result = await purchaseSubscription(tier);
      setSubscriptionTier(result.tier as 'basic' | 'premium');
      setSubscriptionExpiresAt(result.expiresAt);
      Alert.alert('Abonnement activé', `Tu as souscrit au forfait ${tier}.`);
      await syncStudentAccount(studentSession ?? undefined);
    } catch (error) {
      Alert.alert('Achat impossible', error instanceof Error ? error.message : 'Solde insuffisant ou erreur.');
    }
  };

  const buyIaPack = async (packId: 'micro' | 'standard' | 'boost') => {
    try {
      const result = await purchaseIaPack(packId);
      setBalance(result.balanceCoins);
      setIaCredits(result.iaCredits);
      Alert.alert('Pack IA ajouté', `Tes crédits IA ont été mis à jour.`);
      await syncStudentAccount(studentSession ?? undefined);
    } catch (error) {
      Alert.alert('Achat impossible', error instanceof Error ? error.message : 'Solde insuffisant ou erreur.');
    }
  };

  const hasSubscription = subscriptionTier === 'basic' || subscriptionTier === 'premium';
  const effectivePurchasedDocuments = hasSubscription 
    ? Array.from(new Set([...pdfDocuments.map(d => d.id), ...purchasedDocuments]))
    : purchasedDocuments;
    
  const ownedLibrary = pdfDocuments.filter((document) => effectivePurchasedDocuments.includes(document.id));
  const publishedPacks = pdfPacks.filter((pack) => pack.status === 'published');
  const recentTransaction = transactions[0] ?? null;
  const continueDocument = ownedLibrary[0] ?? null;
  const publishedDocumentCount = pdfDocuments.filter((document) => document.status === 'published').length;
  const homePacks = [...publishedPacks].sort((left, right) => {
    const leftValue = left.discountPercent * 10 + left.documentCount;
    const rightValue = right.discountPercent * 10 + right.documentCount;
    return rightValue - leftValue;
  });
  const featuredHomePack = homePacks[0] ?? null;
  const secondaryHomePacks = homePacks.slice(1, 3);
  const activityItems = [
    studentSession
      ? {
          id: 'wallet',
          tone: 'neutral' as const,
          title: balance < 300 ? 'Wallet a surveiller' : 'Wallet disponible',
          body:
            balance < 300
              ? 'Ton solde devient limité pour acheter un nouveau PDF.'
              : `Tu peux encore depenser ${formatCoins(balance)} C dans le catalogue.`,
        }
      : {
          id: 'welcome',
          tone: 'neutral' as const,
          title: 'Compte non connecte',
          body: 'Connecte-toi pour synchroniser ton wallet, tes achats et ta révision.',
        },
    continueDocument
      ? {
          id: 'resume',
          tone: 'primary' as const,
          title: 'Reprendre ta révision',
          body: `Le PDF "${continueDocument.title}" est pret a etre rouvert.`,
        }
      : {
          id: 'discover',
          tone: 'primary' as const,
          title: 'Premier pack conseille',
          body: 'Commence par un pack pour débloquer plusieurs documents en une fois.',
        },
    recentTransaction
      ? {
          id: 'activity',
          tone: 'success' as const,
          title: 'Derniere activite',
          body: `${recentTransaction.label} - ${recentTransaction.date}`,
        }
      : {
          id: 'history',
          tone: 'neutral' as const,
          title: 'Aucune activite recente',
          body: 'Tes achats et recharges apparaitront ici.',
        },
  ];
  const aiTips = [
    continueDocument
      ? `Demande a l assistant un quiz rapide sur "${continueDocument.title}".`
      : 'Utilise les packs pour gagner du temps sur plusieurs PDF lies.',
    purchasedDocuments.length > 0
      ? 'Ouvre un PDF depuis ta bibliothèque puis utilise "Resume" pour réviser plus vite.'
      : "Débloqué un premier PDF pour lancer la lecture sécurisée dans l'application.",
    balance < 300
      ? 'Garde toujours un petit solde pour acheter un PDF urgent.'
      : 'Ton solde actuel te permet de tester un nouveau document ou un pack.',
  ];
  const openSection = (section: AppSection) => {
    if (section === 'home') {
      setActiveSection(section);
      setClientTab('packs');
      return;
    }

    if (section === 'explore') {
      setActiveSection(section);
      setClientTab('catalog');
      return;
    }

    if (section === 'library') {
      if (!studentSession) {
        setActiveSection('account');
        setAuthMode('sign-in');
        setAuthNotice('Connecte-toi pour ouvrir ta bibliothèque.');
        setAuthVisible(true);
        return;
      }
      setActiveSection(section);
      setClientTab('library');
      return;
    }

    if (section === 'documents') {
      if (!studentSession) {
        setActiveSection('account');
        setAuthMode('sign-in');
        setAuthNotice('Connecte-toi pour rédiger tes documents.');
        setAuthVisible(true);
        return;
      }
      setActiveSection(section);
      return;
    }

    if (section === 'premium') {
      setActiveSection('premium');
      setSubscriptionVisible(false); // In case it was opened via modal
      return;
    }

    setActiveSection(section);
  };

  const showAuthGate = !studentSession;

  const renderAuthCard = (closable: boolean) => (
    <>
      <View style={styles.authHero}>
        <View style={styles.authHeroMark}>
          <Text style={styles.authHeroMarkText}>CB</Text>
        </View>
        <Text style={styles.modalTitle}>
          {authMode === 'sign-up'
            ? 'Créer un compte'
            : authMode === 'reset'
              ? 'Mot de passe oublie'
              : authMode === 'new-password'
                ? 'Nouveau mot de passe'
                : authMode === 'verify-email'
                  ? 'Confirmation e-mail'
                  : 'Connexion'}
        </Text>
      </View>

      {authMode === 'sign-in' || authMode === 'sign-up' ? (
        <View style={styles.authModeSwitch}>
          <Pressable
            style={[styles.authModeChip, authMode === 'sign-in' && styles.authModeChipActive]}
            onPress={() => {
              setAuthMode('sign-in');
              setAuthNotice('');
            }}
          >
            <Text style={[styles.authModeChipText, authMode === 'sign-in' && styles.authModeChipTextActive]}>
              Connexion
            </Text>
          </Pressable>
          <Pressable
            style={[styles.authModeChip, authMode === 'sign-up' && styles.authModeChipActive]}
            onPress={() => {
              setAuthMode('sign-up');
              setAuthNotice('');
            }}
          >
            <Text style={[styles.authModeChipText, authMode === 'sign-up' && styles.authModeChipTextActive]}>
              Inscription
            </Text>
          </Pressable>
        </View>
      ) : null}

      {authMode === 'verify-email' ? (
        <View style={styles.authFormCard}>
          <View style={styles.verifyEmailContainer}>
            <Text style={styles.verifyEmailIcon}>✉️</Text>
            <Text style={styles.verifyEmailText}>
              Un e-mail de confirmation a été envoyé à :
            </Text>
            <Text style={styles.verifyEmailAddress}>
              {authEmail}
            </Text>
            <Text style={styles.verifyEmailDescription}>
              Cliquez sur le lien dans cet e-mail pour activer votre compte. Une fois activé, vous pourrez vous connecter.
            </Text>
            <Text style={styles.verifyEmailNote}>
              Pensez à vérifier votre dossier spams/courriers indésirables si vous ne le recevez pas dans quelques minutes.
            </Text>
          </View>
          
          <Pressable
            style={styles.authPrimaryButton}
            onPress={() => {
              setAuthMode('sign-in');
              setAuthNotice('');
            }}
          >
            <Text style={styles.authPrimaryButtonText}>Retour à la connexion</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.authFormCard}>
            {authMode === 'sign-up' ? (
              <>
                <View style={styles.inputGroup}>
                  <TextInput
                    value={authName}
                    onChangeText={setAuthName}
                    placeholder="Nom complet"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    keyboardType="phone-pad"
                    value={authWhatsappPhone}
                    onChangeText={setAuthWhatsappPhone}
                    placeholder="Numero WhatsApp"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
              </>
            ) : null}

            {authMode !== 'new-password' ? (
              <View style={styles.inputGroup}>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  placeholder="Adresse email"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
            ) : null}

            {authMode === 'sign-up' ? (
              <>
                <View style={styles.inputGroup}>
                  <Pressable
                    style={styles.inputDropdown}
                    onPress={() => setUniversityModalVisible(true)}
                  >
                    <Text
                      style={[
                        styles.inputDropdownText,
                        !authUniversity && styles.inputDropdownTextPlaceholder,
                      ]}
                    >
                      {authUniversity || 'Choisir ton université'}
                    </Text>
                    <Text style={styles.inputDropdownArrow}>▼</Text>
                  </Pressable>
                </View>
                <View style={styles.authGridRow}>
                  <View style={[styles.inputGroup, styles.flex]}>
                    <Pressable
                      style={styles.inputDropdown}
                      onPress={() => setFacultyModalVisible(true)}
                    >
                      <Text
                        style={[
                          styles.inputDropdownText,
                          !authFaculty && styles.inputDropdownTextPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {authFaculty || 'Filière'}
                      </Text>
                      <Text style={styles.inputDropdownArrow}>▼</Text>
                    </Pressable>
                  </View>
                  <View style={[styles.inputGroup, styles.flex]}>
                    <Pressable
                      style={styles.inputDropdown}
                      onPress={() => setLevelModalVisible(true)}
                    >
                      <Text
                        style={[
                          styles.inputDropdownText,
                          !authLevel && styles.inputDropdownTextPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {authLevel || 'Niveau'}
                      </Text>
                      <Text style={styles.inputDropdownArrow}>▼</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}

            {authMode !== 'reset' ? (
              <View style={styles.inputGroup}>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    secureTextEntry={!showPassword}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    placeholder={authMode === 'sign-up' || authMode === 'new-password' ? 'Mot de passe (8 caract. min.)' : 'Mot de passe'}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { paddingRight: 80 }]}
                  />
                  <Pressable
                    style={{
                      position: 'absolute',
                      right: 12,
                      height: '100%',
                      justifyContent: 'center',
                      paddingHorizontal: 8,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {authMode === 'sign-in' && authCapabilities.passwordReset ? (
              <Pressable
                style={styles.forgotPasswordLink}
                onPress={() => {
                  setAuthMode('reset');
                  setAuthNotice('');
                }}
              >
                <Text style={styles.authLinkText}>Mot de passe oublie ?</Text>
              </Pressable>
            ) : null}

            {authNotice ? <Text style={styles.noticeText}>{authNotice}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.authPrimaryButton,
                authLoading && styles.buttonDisabled,
                pressed && !authLoading && styles.pressed,
              ]}
              onPress={submitAuth}
              disabled={authLoading}
            >
              <Text style={styles.authPrimaryButtonText}>
                {authLoading
                  ? 'Patiente...'
                  : authMode === 'sign-in'
                    ? "Entrer dans l'application"
                    : authMode === 'sign-up'
                      ? 'Créer mon espace'
                      : authMode === 'new-password'
                        ? 'Modifier le mot de passe'
                        : 'Envoyer le lien'}
              </Text>
            </Pressable>

            {(authMode === 'sign-in' || authMode === 'sign-up') && authCapabilities.google ? (
              <>
                <View style={styles.authDivider}>
                  <View style={styles.authDividerLine} />
                  <Text style={styles.authDividerText}>OU</Text>
                  <View style={styles.authDividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.googleButton,
                    authLoading && styles.buttonDisabled,
                    pressed && !authLoading && styles.pressed,
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  <View style={styles.googleMarkWrap}>
                    <Text style={styles.googleMark}>G</Text>
                  </View>
                  <View style={styles.googleButtonTextWrap}>
                    <Text style={styles.googleButtonLabel}>Google</Text>
                    <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
                  </View>
                </Pressable>
              </>
            ) : null}
          </View>

          <Pressable
            style={styles.authSwitchLink}
            onPress={() => {
              setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in');
              setAuthNotice('');
            }}
          >
            <Text style={styles.authSwitchText}>
              {authMode === 'sign-in'
                ? 'Pas encore de compte ? '
                : authMode === 'sign-up'
                  ? 'Deja un compte ? '
                  : ''}
              <Text style={styles.authLinkText}>
                {authMode === 'sign-in' ? 'Créer un compte' : authMode === 'sign-up' ? 'Se connecter' : 'Retour à la connexion'}
              </Text>
            </Text>
          </Pressable>
        </>
      )}

      {closable ? (
        <Pressable style={styles.closeAuthButton} onPress={() => setAuthVisible(false)}>
          <Text style={styles.closeAuthButtonText}>Fermer</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (editingDocumentId) {
    return (
      <DocumentEditorWebView
        documentId={editingDocumentId}
        onClose={() => setEditingDocumentId(null)}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.shell}>
        <View style={[styles.topBar, narrowScreen && styles.topBarCompact]}>
          <View style={styles.headerBrand}>
            <Image source={logo} style={styles.headerLogo} />
            <Text style={styles.appName} numberOfLines={1}>Campus-Bordes</Text>
          </View>
          <Pressable 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'relative' }} 
            onPress={() => setNotificationsVisible(true)}
          >
            <Bell size={18} color="#475569" />
            <View style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#FFFFFF' }} />
          </Pressable>
        </View>

        {/* Update available banner */}
        {updateAvailable && (
          <View style={{ backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 }}>
              Nouvelle version disponible !
            </Text>
            <Pressable
              onPress={handleDownloadUpdate}
              disabled={updateLoading}
              style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '700' }}>Mettre à jour</Text>
              )}
            </Pressable>
          </View>
        )}

        {isSessionRestoring ? (
          <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} />
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>Chargement de Campus-Bordes...</Text>
          </View>
        ) : !hasSeenOnboarding ? (
          <OnboardingScreen onFinish={() => setHasSeenOnboarding(true)} />
        ) : showAuthGate ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={[styles.content, compactScreen && styles.contentCompact]} showsVerticalScrollIndicator={false}>
              <View style={styles.authGateLayout}>
                <View style={styles.authGateCard}>
                  {renderAuthCard(false)}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, compactScreen && styles.contentCompact]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} colors={['#059669']} />
            }
          >
          {activeSection === 'home' ? (
            <View style={styles.clientDashboard}>
              {/* Editorial hero — paper background, ink type, no emoji */}
              <View style={styles.homeHero}>
                <View style={styles.homeHeroTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.homeHeroEyebrow}>CAMPUS 360 — ÉDITION DU JOUR</Text>
                    <View style={styles.homeHeroRule} />
                    <Text style={styles.homeHeroGreeting}>
                      {studentSession
                        ? `Bonjour, ${studentProfile?.name?.split(' ')[0] ?? 'Étudiant'}.`
                        : 'Bonjour.'}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.homeWalletChip,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => setAccountVisible(true)}
                  >
                    <Text style={styles.homeWalletCoin}>₵</Text>
                    <View>
                      <Text style={styles.homeWalletAmount}>{formatCoins(balance)}</Text>
                      <Text style={styles.homeWalletLabel}>Coins</Text>
                    </View>
                  </Pressable>
                </View>

                <Text style={styles.homeHeroSubtitle}>
                  {studentSession
                    ? 'Retrouve vite les bons PDF, ouvre ta bibliothèque et reprends ta révision.'
                    : 'Trouve des PDF fiables, preview avant achat et revise avec l assistant IA.'}
                </Text>

                <View style={styles.homeHeroFootnote}>
                  <Text style={styles.homeHeroFootnoteText}>
                    {publishedDocumentCount} PDF publiés
                    {homePacks.length ? `  ·  ${homePacks.length} packs en vente` : ''}
                  </Text>
                </View>
              </View>

              {/* Perks strip — monospace, paper, no emoji */}
              <View style={styles.homePerks}>
                {[
                  { num: '3', label: 'PDFs gratuits' },
                  { num: '5', label: 'Requêtes IA / jour' },
                  { num: '∞', label: 'Mode hors-ligne' },
                  { num: '↔', label: 'Multi-devices' },
                ].map((p, i) => (
                  <View key={p.label} style={[styles.homePerk, i !== 0 && styles.homePerkDivider]}>
                    <Text style={styles.homePerkNum}>{p.num}</Text>
                    <Text style={styles.homePerkLabel}>{p.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.homeMainStack}>
                {/* Catalogue card */}
                <View style={styles.homeCard}>
                  <View style={styles.homeCardFeatureRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.homeCardKicker}>— LE CATALOGUE</Text>
                      <Text style={styles.homeCardTitle}>Acheter et lire des PDF campus</Text>
                      <Text style={styles.homeCardBody}>
                        Recherche par université, filière et niveau. Preview gratuite, puis lecture avec l'assistant IA.
                      </Text>
                    </View>
                    <View style={styles.homeCardImageWrap}>
                      <Image source={catalogCard} style={styles.homeCardImage} resizeMode="cover" />
                    </View>
                  </View>
                  <View style={styles.homeCardTagsRow}>
                    <View style={styles.homeCardTag}><Text style={styles.homeCardTagText}>— Preview</Text></View>
                    <View style={styles.homeCardTag}><Text style={styles.homeCardTagText}>— Sécurisé</Text></View>
                    <View style={[styles.homeCardTag, styles.homeCardTagEm]}>
                      <Text style={[styles.homeCardTagText, styles.homeCardTagTextEm]}>— Assistant IA</Text>
                    </View>
                  </View>
                  <View style={styles.homeCardActions}>
                    <Pressable
                      style={({ pressed }) => [styles.homeCardCta, pressed && { opacity: 0.85 }]}
                      onPress={() => openSection('explore')}
                    >
                      <Text style={styles.homeCardCtaText}>Explorer le catalogue</Text>
                      <Text style={styles.homeCardCtaArrow}>→</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.homeCardCtaSecondary, pressed && { opacity: 0.85 }]}
                      onPress={() => openSection('library')}
                    >
                      <Text style={styles.homeCardCtaSecondaryText}>
                        {continueDocument ? 'Continuer la lecture' : 'Ouvrir ma bibliothèque'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Rédaction card */}
                <View style={styles.homeCard}>
                  <View style={styles.homeCardFeatureRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.homeCardKicker, { color: '#047857' }]}>— LA RÉDACTION</Text>
                      <Text style={styles.homeCardTitle}>Rapport de Stage & Mémoire</Text>
                      <Text style={styles.homeCardBody}>
                        Rédige tes rapports d'internship et mémoires, génère tes chapitres par IA, et exporte en Word ou PDF.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.homeCardActions}>
                    <Pressable
                      style={({ pressed }) => [styles.homeCardCta, pressed && { opacity: 0.85 }]}
                      onPress={() => openSection('documents')}
                    >
                      <Text style={styles.homeCardCtaText}>Rédiger mon document</Text>
                      <Text style={styles.homeCardCtaArrow}>→</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Featured pack */}
                {featuredHomePack ? (
                  <Pressable
                    style={({ pressed }) => [styles.homeFeatured, pressed && { opacity: 0.9 }]}
                    onPress={() => openSection('explore')}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.homeFeaturedKicker}>— PACK RECOMMANDÉ</Text>
                      <View style={styles.homeFeaturedRule} />
                      <Text style={styles.homeFeaturedTitle}>{featuredHomePack.title}</Text>
                      <Text style={styles.homeFeaturedMeta} numberOfLines={2}>
                        {featuredHomePack.documentCount} PDF  ·  {featuredHomePack.level}  ·  reduc. {featuredHomePack.discountPercent}%
                      </Text>
                    </View>
                    <View style={styles.homeFeaturedPriceBlock}>
                      <Text style={styles.homeFeaturedPrice}>{formatCoins(featuredHomePack.price)}</Text>
                      <Text style={styles.homeFeaturedPriceUnit}>C</Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {activeSection === 'account' ? (
            <View style={styles.accountSection}>
              <View style={styles.accountSurface}>
                {/* Editorial profile card */}
                <View style={styles.accountProfileCard}>
                  <View style={[styles.accountHeroRow, narrowScreen && styles.accountHeroRowCompact]}>
                    <View style={styles.avatarLarge}>
                      <Text style={styles.avatarLargeText}>
                        {studentProfile?.name?.slice(0, 2).toUpperCase() ?? 'ET'}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.accountProfileEyebrow}>CAMPUS 360 — FICHE LECTEUR</Text>
                      <View style={styles.accountProfileRule} />
                      <Text style={styles.accountProfileName}>{studentProfile?.name ?? 'Étudiant Campus-Bordes'}</Text>
                      <Text style={styles.accountProfileEmail}>
                        {studentProfile?.email ?? studentSession.user.email ?? 'Connecte'}
                      </Text>
                      {studentProfile?.university ? (
                        <View style={styles.accountProfileTagsRow}>
                          <View style={styles.accountProfileTag}><Text style={styles.accountProfileTagText}>{studentProfile.university}</Text></View>
                          {studentProfile.faculty && (
                            <View style={styles.accountProfileTag}><Text style={styles.accountProfileTagText}>{studentProfile.faculty}</Text></View>
                          )}
                          {studentProfile.level && (
                            <View style={[styles.accountProfileTag, styles.accountProfileTagEm]}>
                              <Text style={[styles.accountProfileTagText, styles.accountProfileTagTextEm]}>{studentProfile.level}</Text>
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={[styles.accountSummaryGrid, narrowScreen && styles.accountSummaryGridCompact, { marginTop: 14 }]}>
                  <View style={styles.accountSummaryCard}>
                    <Text style={styles.accountSummaryLabel}>— SOLDE</Text>
                    <Text style={styles.accountSummaryValue}>{formatCoins(balance)}</Text>
                    <Text style={styles.accountSummaryUnit}>Coins</Text>
                    <View style={styles.accountSummaryTagsRow}>
                      <View style={[
                        styles.accountSummaryTier,
                        subscriptionTier === 'premium' && { backgroundColor: '#0F172A', borderColor: '#0F172A' },
                        subscriptionTier === 'basic' && { backgroundColor: '#F6F1E7', borderColor: '#0F172A' },
                      ]}>
                        {subscriptionTier === 'premium' ? (
                          <Crown size={11} color="#F6F1E7" style={{ marginRight: 4 }} />
                        ) : (
                          <Shield size={11} color={subscriptionTier === 'basic' ? '#0F172A' : '#475569'} style={{ marginRight: 4 }} />
                        )}
                        <Text style={[
                          styles.accountSummaryTierText,
                          subscriptionTier === 'premium' && { color: '#F6F1E7' },
                        ]}>
                          {subscriptionTier === 'premium' ? 'Bibliothécaire' : subscriptionTier === 'basic' ? 'Étudiant' : 'Découverte'}
                        </Text>
                      </View>
                      <View style={styles.accountSummaryIa}>
                        <Sparkles size={11} color="#7C3AED" style={{ marginRight: 4 }} />
                        <Text style={styles.accountSummaryIaText}>{iaCredits} cr. IA</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.accountSummaryCard}>
                    <Text style={styles.accountSummaryLabel}>— BIBLIOTHÈQUE</Text>
                    <Text style={styles.accountSummaryValue}>
                      {hasSubscription ? '∞' : purchasedDocuments.length}
                    </Text>
                    <Text style={styles.accountSummaryUnit}>
                      {hasSubscription ? 'Abonnement actif' : 'PDF débloqués'}
                    </Text>
                  </View>
                </View>

                {/* Avantages — editorial list */}
                <View style={styles.accountPerksBlock}>
                  <Text style={styles.accountPerksHeading}>— Tes avantages Campus-Bordes</Text>
                  {[
                    { num: '3', title: 'PDFs gratuits', desc: 'Choisis tes premiers cours dans le catalogue' },
                    { num: '3 500+', title: 'PDFs disponibles', desc: 'Catalogue Universités & Filières' },
                    { num: '5', title: 'Requêtes IA par jour', desc: 'Fiches, résumés et quiz sur tes PDF' },
                    { num: '500', title: 'FCFA min. wallet', desc: 'Recharge via MTN MoMo ou Orange Money' },
                    { num: '∞', title: 'Sync multi-appareils', desc: 'Compte et achats synchronisés' },
                    { num: '↓', title: 'Mode hors-ligne', desc: 'Lis tes PDF sans connexion après téléchargement' },
                  ].map((perk, i) => (
                    <View key={perk.title} style={[styles.accountPerkRow, i !== 0 && styles.accountPerkRowBorder]}>
                      <Text style={styles.accountPerkNum}>{perk.num}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accountPerkTitle}>{perk.title}</Text>
                        <Text style={styles.accountPerkDesc}>{perk.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.accountActionStack}>
                  <Pressable
                    style={({ pressed }) => [styles.accountCtaPrimary, pressed && { opacity: 0.85 }]}
                    onPress={() => openSection('premium')}
                  >
                    <Text style={styles.accountCtaPrimaryText}>Passer Bibliothécaire</Text>
                    <Text style={styles.accountCtaPrimaryArrow}>→</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.accountCtaSecondary, pressed && { opacity: 0.85 }]}
                    onPress={() => setRechargeVisible(true)}
                  >
                    <Text style={styles.accountCtaSecondaryText}>Recharger le wallet</Text>
                  </Pressable>
                </View>

                {/* Rédaction & Documents */}
                <View style={styles.accountMenuGroup}>
                  <Text style={styles.accountMenuGroupHeading}>— Rédaction & Documents</Text>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, pressed && { backgroundColor: '#EDE6D3' }]}
                    onPress={() => openSection('documents')}
                  >
                    <View style={styles.accountMenuItemIcon}><BookOpen size={16} color="#0F172A" /></View>
                    <Text style={styles.accountMenuItemText}>Mes documents rédigés</Text>
                    <Text style={styles.accountMenuItemArrow}>→</Text>
                  </Pressable>
                </View>

                {/* Réglages & Sécurité */}
                <View style={styles.accountMenuGroup}>
                  <Text style={styles.accountMenuGroupHeading}>— Réglages & Sécurité</Text>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, pressed && { backgroundColor: '#EDE6D3' }]}
                    onPress={() => setNotificationsSettingsVisible(true)}
                  >
                    <View style={styles.accountMenuItemIcon}><Bell size={16} color="#0F172A" /></View>
                    <Text style={styles.accountMenuItemText}>Gérer les notifications</Text>
                    <Text style={styles.accountMenuItemArrow}>→</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, pressed && { backgroundColor: '#EDE6D3' }]}
                    onPress={() => setSecuritySettingsVisible(true)}
                  >
                    <View style={styles.accountMenuItemIcon}><Shield size={16} color="#0F172A" /></View>
                    <Text style={styles.accountMenuItemText}>Sécurité & Mot de passe</Text>
                    <Text style={styles.accountMenuItemArrow}>→</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, pressed && { backgroundColor: '#EDE6D3' }]}
                    onPress={() => setSupportModalVisible(true)}
                  >
                    <View style={styles.accountMenuItemIcon}><MessageSquare size={16} color="#0F172A" /></View>
                    <Text style={styles.accountMenuItemText}>Contacter le support</Text>
                    <Text style={styles.accountMenuItemArrow}>→</Text>
                  </Pressable>
                </View>

                {/* Système */}
                <View style={styles.accountMenuGroup}>
                  <Text style={styles.accountMenuGroupHeading}>— Système</Text>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, pressed && { backgroundColor: '#EDE6D3' }]}
                    onPress={() => syncStudentAccount(studentSession ?? undefined)}
                  >
                    <View style={styles.accountMenuItemIcon}><Text style={styles.accountMenuItemIconGlyph}>↻</Text></View>
                    <Text style={styles.accountMenuItemText}>{syncingAccount ? 'Synchronisation...' : 'Synchroniser le compte'}</Text>
                    <Text style={styles.accountMenuItemArrow}>→</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.accountMenuItem, styles.accountMenuItemDanger, pressed && { backgroundColor: '#FDE2D2' }]}
                    onPress={signOutStudent}
                  >
                    <View style={[styles.accountMenuItemIcon, styles.accountMenuItemIconDanger]}><Text style={[styles.accountMenuItemIconGlyph, { color: '#B7410E' }]}>↗</Text></View>
                    <Text style={[styles.accountMenuItemText, { color: '#B7410E' }]}>Déconnexion</Text>
                    <Text style={[styles.accountMenuItemArrow, { color: '#B7410E' }]}>→</Text>
                  </Pressable>
                </View>

                {/* Historique */}
                {studentSession && transactions.length ? (
                  <View style={styles.accountHistorySection}>
                    <Text style={styles.accountMenuGroupHeading}>— Historique récent</Text>
                    {transactions.slice(0, 3).map((transaction) => (
                      <View key={transaction.id} style={styles.accountHistoryRow}>
                        <View style={[
                          styles.accountHistoryMarker,
                          { backgroundColor: transaction.amount > 0 ? '#047857' : '#94A3B8' },
                        ]}>
                          <Text style={styles.accountHistoryArrow}>{transaction.amount > 0 ? '↓' : '↑'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.accountHistoryLabel}>{transaction.label}</Text>
                          <Text style={styles.accountHistoryDate}>{transaction.date}</Text>
                        </View>
                        <Text style={[
                          styles.accountHistoryAmount,
                          { color: transaction.amount > 0 ? '#047857' : '#475569' },
                        ]}>
                          {transaction.amount > 0 ? '+' : ''}{formatCoins(transaction.amount)} C
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Bibliothèque callout */}
                <View style={styles.accountSupportCard}>
                  <Text style={styles.accountSupportTitle}>Bibliothèque sécurisée</Text>
                  <Text style={styles.accountSupportBody}>
                    Retrouve tes documents achetés pour les relire, générer des quiz ou utiliser l'assistant IA hors catalogue.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.accountSupportCta, pressed && { opacity: 0.85 }]}
                    onPress={() => openSection('library')}
                  >
                    <Text style={styles.accountSupportCtaText}>Ouvrir ma bibliothèque</Text>
                    <Text style={styles.accountSupportCtaArrow}>→</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : activeSection === 'premium' ? (
            <View style={styles.premiumSection}>
              {/* Editorial hero */}
              <View style={styles.passHero}>
                <Text style={styles.passHeroEyebrow}>CAMPUS 360 — CARTE D'ADHÉSION</Text>
                <View style={styles.passHeroRule} />
                <Text style={styles.passHeroTitle}>Trois façons de lire.</Text>
                <Text style={styles.passHeroSubtitle}>
                  Choisis ton rythme. Tu peux changer ou annuler à tout moment.
                </Text>
              </View>

              {/* The three passes */}
              <View style={styles.passStack}>
                {[
                  {
                    key: 'free' as const,
                    folio: '— 01',
                    name: 'Découverte',
                    price: 'Gratuit',
                    priceUnit: "toujours",
                    kicker: 'Pour commencer',
                    body: "Tu fouilles le catalogue, tu achètes les PDFs à l'unité. C'est le pied dedans.",
                    bullets: [
                      "Aperçu gratuit de chaque PDF",
                      "Achat à l'unité depuis ton wallet",
                      "5 questions IA par jour",
                    ],
                    accent: '#0F172A',
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
                    bullets: [
                      "Tout le catalogue, sans limite",
                      "Lecture hors-ligne",
                      "Synchronisation multi-appareils",
                    ],
                    accent: '#047857',
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
                    bullets: [
                      "Tout Découverte et Étudiant inclus",
                      "100 crédits IA par mois",
                      "Fiches, résumés et quiz générés",
                    ],
                    accent: '#B7410E',
                    isFeatured: true,
                    cta: "Passer Bibliothécaire",
                  },
                ].map((pass) => {
                  const isCurrent =
                    (pass.key === 'free' && subscriptionTier === 'free') ||
                    (pass.key === 'basic' && subscriptionTier === 'basic') ||
                    (pass.key === 'premium' && subscriptionTier === 'premium');
                  return (
                    <View
                      key={pass.key}
                      style={[
                        styles.passCard,
                        pass.isFeatured && styles.passCardFeatured,
                        isCurrent && styles.passCardCurrent,
                      ]}
                    >
                      {pass.isFeatured && (
                        <View style={styles.passBadgeRibbon}>
                          <Text style={styles.passBadgeRibbonText}>— LE PLUS CHOISI</Text>
                        </View>
                      )}

                      <View style={styles.passCardTop}>
                        <Text style={styles.passFolio}>{pass.folio}</Text>
                        {isCurrent && (
                          <View style={styles.passCurrentPill}>
                            <Text style={styles.passCurrentPillText}>EN COURS</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.passName,
                          pass.isFeatured && styles.passNameFeatured,
                        ]}
                      >
                        {pass.name}
                      </Text>

                      <Text style={styles.passKicker}>{pass.kicker.toUpperCase()}</Text>

                      <View style={styles.passPriceRow}>
                        <Text
                          style={[
                            styles.passPrice,
                            pass.isFeatured && styles.passPriceFeatured,
                          ]}
                        >
                          {pass.price}
                        </Text>
                        {pass.priceUnit && (
                          <Text
                            style={[
                              styles.passPriceUnit,
                              pass.isFeatured && { color: '#F6F1E7' },
                            ]}
                          >
                            {' '}{pass.priceUnit}
                          </Text>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.passBody,
                          pass.isFeatured && { color: '#F6F1E7' },
                        ]}
                      >
                        {pass.body}
                      </Text>

                      <View style={styles.passBullets}>
                        {pass.bullets.map((b) => (
                          <View key={b} style={styles.passBulletRow}>
                            <View
                              style={[
                                styles.passBulletTick,
                                pass.isFeatured && { backgroundColor: '#F6F1E7' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.passBulletText,
                                pass.isFeatured && { color: '#F6F1E7' },
                              ]}
                            >
                              {b}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          pass.isFeatured ? styles.passCtaFeatured : styles.passCta,
                          pressed && { opacity: 0.85 },
                        ]}
                        onPress={() => {
                          if (pass.key === 'free') return;
                          buySubscription(pass.key as 'basic' | 'premium');
                        }}
                        disabled={pass.key === 'free' || isCurrent}
                      >
                        <Text
                          style={[
                            pass.isFeatured ? styles.passCtaFeaturedText : styles.passCtaText,
                            isCurrent && { opacity: 0.6 },
                          ]}
                        >
                          {isCurrent ? 'Tu es ici' : pass.cta}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* IA top-up — old-style tickets */}
              <View style={styles.ticketSection}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketEyebrow}>BONS DE RECHARGE IA</Text>
                  <View style={styles.ticketHeaderRule} />
                  <Text style={styles.ticketTitle}>À la carte.</Text>
                  <Text style={styles.ticketSubtitle}>
                    Pour les sessions de révision qui s'éternisent.
                  </Text>
                </View>

                <View style={styles.ticketList}>
                  {[
                    { id: 'micro' as const, name: 'Micro', credits: 20, price: 250, note: 'Une soirée' },
                    { id: 'standard' as const, name: 'Standard', credits: 50, price: 500, note: 'Un weekend' },
                    { id: 'boost' as const, name: 'Boost', credits: 120, price: 1000, note: 'Une session d\'examen' },
                  ].map((pack, i) => (
                    <Pressable
                      key={pack.id}
                      style={({ pressed }) => [
                        styles.ticketRow,
                        pressed && styles.ticketRowPressed,
                      ]}
                      onPress={() => buyIaPack(pack.id)}
                    >
                      {/* The perforated edge */}
                      <View style={styles.ticketPerfLeft} />
                      <View style={styles.ticketPerfRight} />

                      <View style={styles.ticketLeft}>
                        <Text style={styles.ticketFolio}>— T0{i + 1}</Text>
                        <Text style={styles.ticketName}>{pack.name}</Text>
                        <Text style={styles.ticketNote}>{pack.note}</Text>
                      </View>

                      <View style={styles.ticketDivider} />

                      <View style={styles.ticketRight}>
                        <View style={styles.ticketCreditsBlock}>
                          <Text style={styles.ticketCreditsNum}>{pack.credits}</Text>
                          <Text style={styles.ticketCreditsLabel}>crédits</Text>
                        </View>
                        <Text style={styles.ticketPrice}>{pack.price} C</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Wallet callout — reduced to a single line */}
              <View style={styles.walletNote}>
                <View style={styles.walletNoteRule} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <Text style={styles.walletNoteCoin}>₵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.walletNoteTitle}>Besoin de Coins ?</Text>
                    <Text style={styles.walletNoteBody}>
                      Recharge via Mobile Money (MoMo / Orange Money), puis paie ce que tu veux.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.walletNoteCta, pressed && { opacity: 0.85 }]}
                  onPress={() => setRechargeVisible(true)}
                >
                  <Text style={styles.walletNoteCtaText}>Recharger →</Text>
                </Pressable>
              </View>
            </View>
          ) : activeSection === 'documents' ? (
            <DocumentsScreen onEditDocument={(id) => setEditingDocumentId(id)} />
          ) : activeSection === 'home' ? null : (
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
          )}
        </ScrollView>
        )}

        {studentSession ? (
        <View style={[styles.bottomNav, compactScreen && styles.bottomNavCompact]}>
          {[
            { key: 'home', label: 'Accueil' },
            { key: 'explore', label: 'Explorer' },
            { key: 'library', label: 'Biblio' },
            { key: 'documents', label: 'Rédaction' },
            { key: 'account', label: 'Compte' },
          ].map((item) => {
            const active = activeSection === item.key;
            return (
              <Pressable key={item.key} style={[styles.navItem, compactScreen && styles.navItemCompact]} onPress={() => openSection(item.key as AppSection)}>
                <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                  <NavGlyph section={item.key as AppSection} active={active} />
                </View>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        ) : null}
      </View>

      <Modal transparent animationType="slide" visible={accountVisible}>
        <ModalCard>
          <Text style={styles.modalTitle}>Compte PDF</Text>
          <View style={styles.accountHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{studentProfile?.name?.slice(0, 2).toUpperCase() ?? 'ET'}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>
                {studentProfile?.name ?? 'Étudiant Campus-Bordes'}
              </Text>
              <Text style={styles.bodyMuted}>
                {`${studentProfile?.email ?? studentSession?.user.email ?? 'Connecte'}${syncingAccount ? ' - sync...' : ''}`}
              </Text>
            </View>
          </View>

          <View style={styles.walletPanel}>
            <View style={styles.walletPanelTop}>
              <Text style={styles.kicker}>Solde PDF & IA</Text>
              <Pressable style={styles.inlineUtility} onPress={() => syncStudentAccount(studentSession ?? undefined)}>
                <Text style={styles.inlineUtilityText}>{syncingAccount ? 'Sync...' : 'Actualiser'}</Text>
              </Pressable>
            </View>
            <Text style={styles.walletAmount}>{formatCoins(balance)} C</Text>
            <Text style={styles.walletHint}>
              {subscriptionTier === 'premium' ? 'Premium' : subscriptionTier === 'basic' ? 'Basic' : 'Gratuit'} • {iaCredits} cr IA
            </Text>
          </View>

          <View style={styles.accountQuickRow}>
            <Pressable
              style={styles.accountQuickAction}
              onPress={() => {
                setAccountVisible(false);
                openSection('library');
              }}
            >
              <Text style={styles.accountQuickActionLabel}>Bibliothèque</Text>
              <Text style={styles.accountQuickActionValue}>{`${purchasedDocuments.length} PDF`}</Text>
            </Pressable>
            <Pressable
              style={styles.accountQuickAction}
              onPress={() => {
                setAccountVisible(false);
                setRechargeVisible(true);
              }}
            >
              <Text style={styles.accountQuickActionLabel}>Wallet</Text>
              <Text style={styles.accountQuickActionValue}>{`${formatCoins(balance)} C`}</Text>
            </Pressable>
          </View>

          <View style={styles.modalPrimaryRow}>
            <PrimaryButton label="👑 Passer en Premium" fluid onPress={() => { setAccountVisible(false); openSection('premium'); }} />
          </View>
          <View style={[styles.modalPrimaryRow, { marginTop: 8 }]}>
            <PrimaryButton label="Recharger le wallet" fluid onPress={() => { setAccountVisible(false); setRechargeVisible(true); }} />
          </View>

          <View style={styles.modalFooterRow}>
            <Pressable style={styles.ghostAction} onPress={() => setAccountVisible(false)}>
              <Text style={styles.ghostActionText}>Fermer</Text>
            </Pressable>
            <Pressable style={styles.ghostDangerAction} onPress={signOutStudent}>
              <Text style={styles.ghostDangerActionText}>Deconnexion</Text>
            </Pressable>
          </View>
        </ModalCard>
      </Modal>

      <Modal transparent animationType="slide" visible={rechargeVisible}>
        <ModalCard>
          <View style={styles.rechargeHero}>
            <View style={styles.rechargeHeroBadge}>
              <Text style={styles.rechargeHeroBadgeText}>C</Text>
            </View>
            <Text style={styles.modalTitle}>Recharger le wallet PDF</Text>
            <Text style={styles.bodyMuted}>Ajoute des coins pour acheter tes packs et PDF sans friction.</Text>
          </View>

          <View style={styles.walletPanel}>
            <Text style={styles.kicker}>Solde actuel</Text>
            <Text style={styles.walletAmount}>{formatCoins(balance)} C</Text>
          </View>

            <View style={styles.authFormCard}>
            {/* Min amount callout */}
            <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={{ fontSize: 13, color: '#065F46', fontWeight: '600', flex: 1, lineHeight: 18 }}>
                Wallet rechargeable des <Text style={{ fontWeight: '900', color: '#059669' }}>500 FCFA minimum</Text>
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Montant à ajouter</Text>
              <TextInput keyboardType="numeric" value={rechargeAmount} onChangeText={setRechargeAmount} style={styles.input} />
            </View>

            <View style={styles.rechargePresetRow}>
              {[500, 1000, 2500].map((amount) => {
                const active = rechargeAmount === String(amount);
                const isMin = amount === 500;
                return (
                  <Pressable
                    key={amount}
                    style={[
                      styles.rechargePreset,
                      active && styles.rechargePresetActive,
                      isMin && { backgroundColor: '#ECFDF5', borderColor: '#059669', borderWidth: 2 }
                    ]}
                    onPress={() => setRechargeAmount(String(amount))}
                  >
                    <Text style={[
                      styles.rechargePresetText,
                      active && styles.rechargePresetTextActive,
                      isMin && { color: '#059669', fontWeight: '800' }
                    ]}>
                      {isMin ? '✨ ' : ''}{formatCoins(amount)} C{isMin ? ' min' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Moyen de paiement</Text>
            <View style={styles.providerRow}>
              {(['MTN MoMo', 'Orange Money'] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[styles.providerButton, provider === item && styles.providerButtonActive]}
                  onPress={() => setProvider(item)}
                >
                  <Text style={[styles.providerButtonText, provider === item && styles.providerButtonActiveText]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={styles.inputLabel}>Numéro de téléphone Mobile Money</Text>
              <TextInput
                keyboardType="phone-pad"
                placeholder="Ex: +237680000000"
                placeholderTextColor="#94A3B8"
                value={rechargePhone}
                onChangeText={setRechargePhone}
                style={styles.input}
              />
            </View>
          </View>
          {rechargeLoading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingHorizontal: 16 }}>
                {pollingMessage}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <PrimaryButton label="Annuler" variant="secondary" fluid onPress={() => setRechargeVisible(false)} />
              <PrimaryButton label="Valider" fluid onPress={rechargeWallet} />
            </View>
          )}
        </ModalCard>
      </Modal>

      <Modal transparent animationType="slide" visible={subscriptionVisible}>
        <ModalCard>
          <View style={styles.rechargeHero}>
            <Text style={styles.modalTitle}>Forfaits & IA</Text>
            <Text style={styles.bodyMuted}>Passe à la vitesse supérieure pour tes révisions.</Text>
          </View>

          <View style={styles.walletPanel}>
            <Text style={styles.kicker}>Forfait actuel: {subscriptionTier === 'premium' ? 'Premium' : subscriptionTier === 'basic' ? 'Basic' : 'Gratuit'}</Text>
            {subscriptionExpiresAt && <Text style={styles.bodyMuted}>Expire le: {new Date(subscriptionExpiresAt).toLocaleDateString('fr-CM')}</Text>}
            <Text style={styles.walletAmount}>{iaCredits} Crédits IA</Text>
            <Text style={styles.walletHint}>Solde Wallet: {formatCoins(balance)} C</Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.authFormCard}>
              <Text style={styles.inputLabel}>Abonnements (Accès illimité PDF)</Text>
              
              <View style={[styles.rechargePreset, { marginBottom: 12, padding: 12 }]}>
                <Text style={styles.dashboardSectionTitle}>Basic (1 000 C / mois)</Text>
                <Text style={styles.bodyMuted}>Accès à TOUS les PDF en illimite. Pas de crédits IA inclus.</Text>
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton label="S'abonner à Basic" onPress={() => buySubscription('basic')} />
                </View>
              </View>

              <View style={[styles.rechargePreset, { marginBottom: 12, padding: 12 }]}>
                <Text style={styles.dashboardSectionTitle}>Premium (2 000 C / mois)</Text>
                <Text style={styles.bodyMuted}>Accès illimité PDF + 100 Crédits IA inclus pour poser tes questions au document.</Text>
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton label="S'abonner à Premium" onPress={() => buySubscription('premium')} />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Recharges IA (A la carte)</Text>

              <View style={[styles.rechargePreset, { marginBottom: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashboardSectionTitle}>Micro (20 Credits)</Text>
                  <Text style={styles.bodyMuted}>250 Coins</Text>
                </View>
                <PrimaryButton label="Acheter" onPress={() => buyIaPack('micro')} />
              </View>

              <View style={[styles.rechargePreset, { marginBottom: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashboardSectionTitle}>Standard (50 Credits)</Text>
                  <Text style={styles.bodyMuted}>500 Coins</Text>
                </View>
                <PrimaryButton label="Acheter" onPress={() => buyIaPack('standard')} />
              </View>

              <View style={[styles.rechargePreset, { marginBottom: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashboardSectionTitle}>Boost (120 Credits)</Text>
                  <Text style={styles.bodyMuted}>1 000 Coins</Text>
                </View>
                <PrimaryButton label="Acheter" onPress={() => buyIaPack('boost')} />
              </View>

            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <PrimaryButton label="Fermer" variant="secondary" fluid onPress={() => setSubscriptionVisible(false)} />
          </View>
        </ModalCard>
      </Modal>

      <Modal transparent animationType="slide" visible={authVisible && !showAuthGate}>
        <ModalCard>
          {renderAuthCard(true)}
        </ModalCard>
      </Modal>

      <Modal transparent animationType="fade" visible={onboardingVisible}>
        <ModalCard>
          <View style={styles.onboardingTop}>
            <View style={styles.onboardingMark}>
              <Text style={styles.onboardingMarkText}>{onboardingIndex + 1}</Text>
            </View>
            <Text style={styles.stepText}>{onboardingIndex + 1}/3</Text>
          </View>
          <Text style={styles.onboardingTitle}>{onboardingSlides[onboardingIndex].title}</Text>
          <Text style={styles.onboardingText}>{onboardingSlides[onboardingIndex].text}</Text>
          <View style={styles.dotsRow}>
            {onboardingSlides.map((slide) => (
              <View
                key={slide.title}
                style={[styles.dot, slide.title === onboardingSlides[onboardingIndex].title && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.buttonRow}>
            <PrimaryButton label="Passer" variant="secondary" fluid onPress={finishOnboarding} />
            <PrimaryButton
              label={onboardingIndex === onboardingSlides.length - 1 ? 'Commencer' : 'Suivant'}
              fluid
              onPress={() => {
                if (onboardingIndex === onboardingSlides.length - 1) {
                  finishOnboarding();
                  return;
                }
                setOnboardingIndex((current) => current + 1);
              }}
            />
          </View>
        </ModalCard>
      </Modal>

      <FreePdfSelector
        visible={freePdfSelectorVisible}
        documents={pdfDocuments}
        onComplete={() => {
          setFreePdfSelectorVisible(false);
          Alert.alert('Bienvenue ! 🎉', 'Tu as réclamé tes PDFs gratuits. Bonne révision !');
          syncStudentAccount(studentSession ?? undefined);
        }}
        onClose={() => {
          setFreePdfSelectorVisible(false);
        }}
        studentSession={studentSession}
      />

      <Modal transparent animationType="fade" visible={insufficientVisible}>
        <ModalCard>
          <View style={styles.rechargeHero}>
            <View style={[styles.rechargeHeroBadge, styles.rechargeHeroAlert]}>
              <Text style={styles.rechargeHeroBadgeText}>!</Text>
            </View>
            <Text style={styles.modalTitle}>Solde insuffisant</Text>
            <Text style={styles.bodyMuted}>Recharge via MTN MoMo ou Orange Money pour continuer cet achat PDF.</Text>
          </View>
          <View style={styles.insufficientPanel}>
            <Text style={styles.kicker}>Action recommandée</Text>
            <Text style={styles.insufficientTitle}>Ajoute des coins puis reviens sur ton achat.</Text>
            <Text style={styles.bodyMuted}>Ton wallet reprendra ensuite le flux d achat plus naturellement.</Text>
          </View>
          <View style={styles.buttonRow}>
            <PrimaryButton label="Fermer" variant="secondary" fluid onPress={() => setInsufficientVisible(false)} />
            <PrimaryButton
              label="Recharger"
              fluid
              onPress={() => {
                setInsufficientVisible(false);
                setRechargeVisible(true);
              }}
            />
          </View>
        </ModalCard>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={universityModalVisible}
        onRequestClose={() => setUniversityModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setUniversityModalVisible(false)}
        >
          <Pressable style={styles.dropdownModalCard} onPress={() => {}}>
            <Text style={styles.dropdownModalTitle}>Choisis ton université</Text>
            <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {CAMEROON_UNIVERSITIES.map((univ) => (
                <Pressable
                  key={univ}
                  style={[
                    styles.dropdownItem,
                    authUniversity === univ && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setAuthUniversity(univ);
                    setUniversityModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      authUniversity === univ && styles.dropdownItemTextActive,
                    ]}
                  >
                    {univ}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.dropdownCloseButton}
              onPress={() => setUniversityModalVisible(false)}
            >
              <Text style={styles.dropdownCloseButtonText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={facultyModalVisible}
        onRequestClose={() => setFacultyModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFacultyModalVisible(false)}
        >
          <Pressable style={styles.dropdownModalCard} onPress={() => {}}>
            <Text style={styles.dropdownModalTitle}>Choisis ta filière</Text>
            <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {CAMEROON_FACULTIES.map((fac) => (
                <Pressable
                  key={fac}
                  style={[
                    styles.dropdownItem,
                    authFaculty === fac && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setAuthFaculty(fac);
                    setFacultyModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      authFaculty === fac && styles.dropdownItemTextActive,
                    ]}
                  >
                    {fac}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.dropdownCloseButton}
              onPress={() => setFacultyModalVisible(false)}
            >
              <Text style={styles.dropdownCloseButtonText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={levelModalVisible}
        onRequestClose={() => setLevelModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLevelModalVisible(false)}
        >
          <Pressable style={styles.dropdownModalCard} onPress={() => {}}>
            <Text style={styles.dropdownModalTitle}>Choisis ton niveau</Text>
            <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {CAMEROON_LEVELS.map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[
                    styles.dropdownItem,
                    authLevel === lvl && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setAuthLevel(lvl);
                    setLevelModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      authLevel === lvl && styles.dropdownItemTextActive,
                    ]}
                  >
                    {lvl}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.dropdownCloseButton}
              onPress={() => setLevelModalVisible(false)}
            >
              <Text style={styles.dropdownCloseButtonText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNotificationsVisible(false)}
        >
          <Pressable style={[styles.dropdownModalCard, { height: '60%', padding: 0 }]} onPress={() => {}}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Notifications</Text>
              <Pressable onPress={() => setNotificationsVisible(false)}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
                </View>
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ padding: 20, gap: 16 }}>
                {notifications.length === 0 ? (
                  <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15, color: '#64748B' }}>Aucune notification</Text>
                  </View>
                ) : (
                  notifications.map((notif) => {
                    let emoji = '🔔';
                    let bgColor = '#F1F5F9';
                    const lowerTitle = notif.title.toLowerCase();
                    const lowerBody = notif.body.toLowerCase();
                    if (lowerTitle.includes('recharge') || lowerBody.includes('recharge') || lowerTitle.includes('crédité') || lowerBody.includes('crédité')) {
                      emoji = '💸';
                      bgColor = '#F0FDF4';
                    } else if (lowerTitle.includes('pack') || lowerBody.includes('pack') || lowerTitle.includes('iut') || lowerBody.includes('iut')) {
                      emoji = '✨';
                      bgColor = '#EFF6FF';
                    } else if (lowerTitle.includes('premium') || lowerBody.includes('premium')) {
                      emoji = '👑';
                      bgColor = '#FFFBEB';
                    }

                    let timeStr = 'Récemment';
                    try {
                      const diffMs = Date.now() - new Date(notif.receivedAt).getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHrs = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHrs / 24);
                      if (diffMins < 1) {
                        timeStr = "À l'instant";
                      } else if (diffMins < 60) {
                        timeStr = `Il y a ${diffMins} min`;
                      } else if (diffHrs < 24) {
                        timeStr = `Il y a ${diffHrs} h`;
                      } else {
                        timeStr = `Il y a ${diffDays} j`;
                      }
                    } catch {}

                    return (
                      <View key={notif.id} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 24 }}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>{notif.title}</Text>
                          <Text style={{ fontSize: 14, color: '#475569', marginTop: 2 }}>{notif.body}</Text>
                          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{timeStr}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- NOTIFICATIONS SETTINGS MODAL --- */}
      <Modal
        transparent
        animationType="slide"
        visible={notificationsSettingsVisible}
        onRequestClose={() => setNotificationsSettingsVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setNotificationsSettingsVisible(false)}>
          <Pressable style={[styles.dropdownModalCard, { height: '50%', padding: 0 }]} onPress={() => {}}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Gérer les notifications</Text>
              <Pressable onPress={() => setNotificationsSettingsVisible(false)}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
                </View>
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>Nouveaux PDF et Packs</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Sois alerté dès qu'on ajoute de nouveaux sujets pour ta filière.</Text>
                </View>
                <Switch 
                  value={notifNewPdf} 
                  onValueChange={setNotifNewPdf} 
                  trackColor={{ false: '#E2E8F0', true: '#059669' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>Promotions et Offres</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Reçois des codes promos et réductions sur les recharges.</Text>
                </View>
                <Switch 
                  value={notifPromos} 
                  onValueChange={setNotifPromos} 
                  trackColor={{ false: '#E2E8F0', true: '#059669' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>Alertes Compes</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Informations sur tes achats et recharges de coins.</Text>
                </View>
                <Switch 
                  value={notifAlerts} 
                  onValueChange={setNotifAlerts} 
                  trackColor={{ false: '#E2E8F0', true: '#059669' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- SECURITY SETTINGS MODAL --- */}
      <Modal
        transparent
        animationType="slide"
        visible={securitySettingsVisible}
        onRequestClose={() => setSecuritySettingsVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSecuritySettingsVisible(false)}>
          <Pressable style={[styles.dropdownModalCard, { height: '85%', padding: 0 }]} onPress={() => {}}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Sécurité</Text>
              <Pressable onPress={() => setSecuritySettingsVisible(false)}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
                </View>
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 16 }}>CHANGER LE MOT DE PASSE</Text>
              <View style={{ gap: 12, marginBottom: 32 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                  placeholder="Mot de passe actuel"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!updatingPassword}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                  placeholder="Nouveau mot de passe"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!updatingPassword}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                  placeholder="Confirmer le nouveau mot de passe"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!updatingPassword}
                />
                <PrimaryButton
                  label={updatingPassword ? "Mise à jour..." : "Mettre à jour"}
                  onPress={handleUpdatePassword}
                  disabled={updatingPassword}
                />
              </View>

              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 16 }}>SESSIONS ACTIVES</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 32 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Smartphone size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>Appareil Actuel (Web)</Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Connecté depuis Yaoundé</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '700' }}>Actif</Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* --- SUPPORT MODAL --- */}
      <Modal
        transparent
        animationType="slide"
        visible={supportModalVisible}
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSupportModalVisible(false)}>
          <Pressable style={[styles.dropdownModalCard, { padding: 0 }]} onPress={() => {}}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B' }}>Support Client</Text>
              <Pressable onPress={() => setSupportModalVisible(false)}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
                </View>
              </Pressable>
            </View>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 40 }}>💬</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8 }}>Besoin d'aide ?</Text>
              <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                Notre équipe est disponible sur WhatsApp pour t'aider avec tes recharges, tes PDF ou tout autre problème.
              </Text>
              <Pressable
                style={{ backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, width: '100%', justifyContent: 'center' }}
                onPress={() => Linking.openURL('https://wa.me/237690273500')}
              >
                <Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Discuter sur WhatsApp</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const colors = {
  ink: '#0F172A',         // Slate 900 (softer dark)
  muted: '#64748B',       // Slate 500
  line: '#E2E8F0',        // Slate 200
  soft: '#F8FAFC',        // Slate 50
  primary: '#3B82F6',     // Premium Electric Blue
  primaryDeep: '#1E40AF', // Deep Royal Blue
  primarySoft: '#EFF6FF', // Soft Sky Tint
  green: '#10B981',       // Softer Emerald Green
  red: '#EF4444',         // Premium Red Accent
};

const styles = StyleSheet.create({
  // ── Premium / library passes (editorial) ───────────────────────────────
  premiumSection: { flex: 1, padding: 16, backgroundColor: '#F6F1E7' },

  // Hero
  passHero: { marginBottom: 28 },
  passHeroEyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 10,
  },
  passHeroRule: { height: 1, backgroundColor: '#0F172A', marginBottom: 16 },
  passHeroTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 36,
    letterSpacing: -1,
    marginBottom: 8,
  },
  passHeroSubtitle: {
    fontFamily: 'serif',
    fontSize: 15,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 22,
  },

  // Pass stack
  passStack: { gap: 14, marginBottom: 36 },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 22,
    borderWidth: 1,
    borderColor: '#0F172A',
    position: 'relative',
  },
  passCardFeatured: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    transform: [{ translateY: -4 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  passCardCurrent: {
    borderColor: '#B7410E',
    borderWidth: 2,
  },
  passBadgeRibbon: {
    position: 'absolute',
    top: -10,
    left: 22,
    backgroundColor: '#B7410E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  passBadgeRibbonText: {
    color: '#F6F1E7',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  passCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passFolio: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#B7410E',
    fontWeight: '700',
    letterSpacing: 1,
  },
  passCurrentPill: {
    backgroundColor: '#B7410E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  passCurrentPillText: {
    color: '#F6F1E7',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  passName: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  passNameFeatured: { color: '#F6F1E7' },
  passKicker: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 14,
  },
  passPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  passPrice: {
    fontFamily: 'serif',
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 40,
    letterSpacing: -1,
  },
  passPriceFeatured: { color: '#F6F1E7' },
  passPriceUnit: {
    fontFamily: 'serif',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#475569',
  },
  passBody: {
    fontFamily: 'serif',
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  passBullets: { gap: 8, marginBottom: 20 },
  passBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  passBulletTick: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#0F172A',
    marginTop: 8,
  },
  passBulletText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  passCta: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  passCtaText: {
    color: '#0F172A',
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
  },
  passCtaFeatured: {
    backgroundColor: '#B7410E',
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  passCtaFeaturedText: {
    color: '#F6F1E7',
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
  },

  // IA top-up tickets
  ticketSection: { marginBottom: 28 },
  ticketHeader: { marginBottom: 18 },
  ticketEyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 8,
  },
  ticketHeaderRule: { height: 1, backgroundColor: '#0F172A', marginBottom: 14 },
  ticketTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  ticketSubtitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 20,
  },
  ticketList: { gap: 10 },
  ticketRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    borderStyle: 'dashed',
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  ticketRowPressed: { backgroundColor: '#EDE6D3' },
  ticketPerfLeft: {
    position: 'absolute',
    left: -4,
    top: '40%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F6F1E7',
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  ticketPerfRight: {
    position: 'absolute',
    right: -4,
    top: '40%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F6F1E7',
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  ticketLeft: { flex: 1, paddingRight: 12 },
  ticketFolio: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#B7410E',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  ticketName: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  ticketNote: {
    fontFamily: 'serif',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
  },
  ticketDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#0F172A',
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },
  ticketRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketCreditsBlock: { alignItems: 'flex-end' },
  ticketCreditsNum: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
  },
  ticketCreditsLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#475569',
    letterSpacing: 1,
  },
  ticketPrice: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#B7410E',
  },

  // Wallet note (compact)
  walletNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#0F172A',
    marginBottom: 32,
  },
  walletNoteRule: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#B7410E',
  },
  walletNoteCoin: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '900',
    color: '#B7410E',
  },
  walletNoteTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  walletNoteBody: {
    fontFamily: 'serif',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 17,
  },
  walletNoteCta: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  walletNoteCtaText: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: '#B7410E',
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.soft,
  },
  topBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topBarCompact: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  appName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  content: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: 14,
    paddingBottom: 112,
  },
  contentCompact: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 108,
  },
  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#168CF2',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bottomNavCompact: {
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 60,
  },
  navItemCompact: {
    minHeight: 56,
    gap: 4,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  navIconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  navGlyphTone: {
    backgroundColor: '#8CA0B8',
  },
  navGlyphToneActive: {
    backgroundColor: colors.primaryDeep,
  },
  navGlyphHome: {
    width: 18,
    height: 18,
    alignItems: 'center',
  },
  navGlyphRoof: {
    width: 12,
    height: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    transform: [{ rotate: '45deg' }],
    marginTop: 1,
    marginBottom: -1,
  },
  navGlyphBody: {
    width: 12,
    height: 9,
    borderRadius: 3,
    marginTop: 1,
  },
  navGlyphExplore: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyphCircle: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  navGlyphHandle: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 999,
    transform: [{ rotate: '45deg' }, { translateX: 4 }, { translateY: 4 }],
  },
  navGlyphLibrary: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navGlyphBook: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  navGlyphAccount: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyphHead: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginBottom: 1,
  },
  navGlyphShoulders: {
    width: 12,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  navIconLetter: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  navIconLetterActive: {
    color: colors.primaryDeep,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  navLabelActive: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  // ── Account section (editorial) ────────────────────────────────────────
  accountSection: {
    gap: 14,
  },
  accountSurface: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    gap: 18,
  },
  accountProfileCard: {
    backgroundColor: '#F6F1E7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 20,
  },
  accountHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  accountHeroRowCompact: {
    gap: 12,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: '#F6F1E7',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  accountProfileEyebrow: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 6,
  },
  accountProfileRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 10,
  },
  accountProfileName: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
    marginBottom: 4,
  },
  accountProfileEmail: {
    fontFamily: 'serif',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 18,
  },
  accountProfileTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  accountProfileTag: {
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  accountProfileTagEm: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  accountProfileTagText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountProfileTagTextEm: { color: '#F6F1E7' },
  accountSummaryGrid: {
    gap: 10,
  },
  accountSummaryGridCompact: {
    gap: 8,
  },
  accountSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 16,
  },
  accountSummaryLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 8,
  },
  accountSummaryValue: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 36,
    letterSpacing: -1,
  },
  accountSummaryUnit: {
    fontFamily: 'serif',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 2,
  },
  accountSummaryTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  accountSummaryTier: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  accountSummaryTierText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountSummaryIa: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  accountSummaryIaText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountPerksBlock: {
    backgroundColor: '#F6F1E7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 16,
  },
  accountPerksHeading: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 12,
  },
  accountPerkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 14,
  },
  accountPerkRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },
  accountPerkNum: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '900',
    color: '#B7410E',
    lineHeight: 24,
    minWidth: 60,
  },
  accountPerkTitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  accountPerkDesc: {
    fontFamily: 'serif',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  accountActionStack: {
    gap: 10,
  },
  accountCtaPrimary: {
    backgroundColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  accountCtaPrimaryText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#F6F1E7',
  },
  accountCtaPrimaryArrow: {
    fontFamily: 'serif',
    fontSize: 16,
    color: '#B7410E',
  },
  accountCtaSecondary: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingVertical: 14,
    alignItems: 'center',
  },
  accountCtaSecondaryText: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountMenuGroup: {
    marginTop: 8,
  },
  accountMenuGroupHeading: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 10,
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 12,
  },
  accountMenuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#F6F1E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountMenuItemIconDanger: {
    backgroundColor: '#FDE2D2',
  },
  accountMenuItemIconGlyph: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountMenuItemText: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountMenuItemArrow: {
    fontFamily: 'serif',
    fontSize: 16,
    color: '#475569',
  },
  accountMenuItemDanger: {
    borderColor: '#B7410E',
  },
  accountHistorySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 14,
  },
  accountHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  accountHistoryMarker: {
    width: 32,
    height: 32,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHistoryArrow: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '900',
    color: '#F6F1E7',
  },
  accountHistoryLabel: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountHistoryDate: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#475569',
    letterSpacing: 0.5,
  },
  accountHistoryAmount: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
  },
  accountSupportCard: {
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 22,
  },
  accountSupportTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#F6F1E7',
    marginBottom: 8,
  },
  accountSupportBody: {
    fontFamily: 'serif',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
    lineHeight: 19,
  },
  accountSupportCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  accountSupportCtaText: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#B7410E',
  },
  accountSupportCtaArrow: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#B7410E',
  },
  // ── Home dashboard (editorial) ─────────────────────────────────────────
  clientDashboard: {
    gap: 14,
    marginBottom: 18,
  },
  homeHero: {
    backgroundColor: '#F6F1E7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 20,
  },
  homeHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  homeHeroEyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 8,
  },
  homeHeroRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 12,
  },
  homeHeroGreeting: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  homeWalletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  homeWalletCoin: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '900',
    color: '#B7410E',
  },
  homeWalletAmount: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#F6F1E7',
    lineHeight: 18,
  },
  homeWalletLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 1,
  },
  homeHeroSubtitle: {
    fontFamily: 'serif',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 21,
    marginTop: 14,
  },
  homeHeroFootnote: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },
  homeHeroFootnoteText: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#0F172A',
    fontWeight: '600',
  },
  // Perks strip
  homePerks: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingVertical: 14,
  },
  homePerk: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  homePerkDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#0F172A',
  },
  homePerkNum: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '900',
    color: '#B7410E',
    lineHeight: 26,
  },
  homePerkLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#0F172A',
    letterSpacing: 0.8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  // Main cards
  homeMainStack: { gap: 12 },
  homeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 20,
  },
  homeCardFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  homeCardKicker: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 8,
  },
  homeCardTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  homeCardBody: {
    fontFamily: 'serif',
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  homeCardImageWrap: {
    width: 84,
    height: 100,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0F172A',
    flexShrink: 0,
  },
  homeCardImage: {
    width: '100%',
    height: '100%',
  },
  homeCardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 16,
  },
  homeCardTag: {
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  homeCardTagEm: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  homeCardTagText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  homeCardTagTextEm: { color: '#F6F1E7' },
  homeCardActions: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    gap: 10,
  },
  homeCardCta: {
    backgroundColor: '#0F172A',
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  homeCardCtaText: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    color: '#F6F1E7',
  },
  homeCardCtaArrow: {
    fontFamily: 'serif',
    fontSize: 16,
    color: '#B7410E',
  },
  homeCardCtaSecondary: {
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  homeCardCtaSecondaryText: {
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  // Featured pack
  homeFeatured: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F1E7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#B7410E',
    padding: 18,
    gap: 14,
  },
  homeFeaturedKicker: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#B7410E',
    fontWeight: '700',
    marginBottom: 6,
  },
  homeFeaturedRule: {
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  homeFeaturedTitle: {
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 6,
  },
  homeFeaturedMeta: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#475569',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  homeFeaturedPriceBlock: {
    alignItems: 'flex-end',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#0F172A',
  },
  homeFeaturedPrice: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
  },
  homeFeaturedPriceUnit: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#B7410E',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginTop: 2,
  },
  dashboardHeroMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dashboardHeroProof: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F6FAFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dashboardHeroProofText: {
    color: '#516274',
    fontSize: 12,
    fontWeight: '800',
  },
  dashboardHeroMetaChip: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#F6FAFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dashboardHeroMetaValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  dashboardHeroMetaLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  dashboardAccountPill: {
    alignSelf: 'flex-start',
    minWidth: 132,
    borderRadius: 22,
    backgroundColor: '#EEF5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dashboardAccountPillLabel: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardAccountPillValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  dashboardMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dashboardMetricsRowCompact: {
    flexWrap: 'wrap',
    gap: 8,
  },
  dashboardMetricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    minHeight: 92,
    justifyContent: 'space-between',
  },
  dashboardMetricCardCompact: {
    minWidth: '48%',
    flexBasis: '48%',
    padding: 12,
    minHeight: 84,
  },
  dashboardMetricValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  dashboardMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  dashboardActionGrid: {
    gap: 12,
  },
  dashboardActionCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    gap: 14,
  },
  dashboardActionPrimary: {
    backgroundColor: '#EEF6FF',
    
  },
  dashboardActionCardMint: {
    backgroundColor: '#F4FBF8',
    
  },
  dashboardActionCardSky: {
    backgroundColor: '#F7FAFF',
    
  },
  dashboardActionCardLavender: {
    backgroundColor: '#F7F6FF',
    
  },
  dashboardFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dashboardFeatureText: {
    flex: 1,
    minWidth: 0,
  },
  dashboardFeatureImageWrap: {
    width: 104,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8F1FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    flexShrink: 0,
  },
  dashboardFeatureImage: {
    width: '100%',
    height: '100%',
  },
  dashboardActionKicker: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardActionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  dashboardActionText: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '600',
  },
  dashboardActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dashboardActionTag: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  dashboardActionTagMint: {
    backgroundColor: 'rgba(33,166,107,0.09)',
    
  },
  dashboardActionTagSky: {
    backgroundColor: 'rgba(37,99,235,0.07)',
    
  },
  dashboardActionTagLavender: {
    backgroundColor: 'rgba(98,95,196,0.09)',
    
  },
  dashboardActionTagText: {
    color: '#516274',
    fontSize: 12,
    fontWeight: '700',
  },
  dashboardActionLink: {
    color: colors.primaryDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  dashboardInfoRow: {
    gap: 10,
  },
  dashboardInfoCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
  },
  dashboardSectionTitle: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardInfoMain: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  dashboardInfoSub: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '600',
  },
  activityFeed: {
    gap: 10,
    marginTop: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
  },
  activityItemPrimary: {
    backgroundColor: '#EFF6FF',
    
  },
  activityItemSuccess: {
    backgroundColor: '#F1FBF6',
    
  },
  activityMarker: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#9CA3AF',
    marginTop: 6,
  },
  activityMarkerPrimary: {
    backgroundColor: colors.primary,
  },
  activityMarkerSuccess: {
    backgroundColor: colors.green,
  },
  activityTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  tipsList: {
    gap: 10,
    marginTop: 10,
  },
  homeShowcase: {
    gap: 10,
  },
  homeFeaturedPack: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    gap: 10,
  },
  homeFeaturedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  homeMiniPackList: {
    gap: 8,
  },
  homeMiniPackCard: {
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
  },
  homeMiniPackTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  homeMiniPackMeta: {
    color: colors.muted,
    marginTop: 6,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    color: colors.ink,
    lineHeight: 20,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  bodyMuted: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 19,
  },
  kicker: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  walletPanel: {
    borderRadius: 16,
    
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginTop: 16,
  },
  walletPanelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletAmount: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 8,
  },
  walletHint: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 19,
    fontWeight: '600',
  },
  accountQuickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountQuickAction: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    minHeight: 82,
    justifyContent: 'space-between',
  },
  accountQuickActionLabel: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  accountQuickActionValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  inlineUtility: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineUtilityText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  history: {
    marginTop: 18,
    gap: 8,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  listRow: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    
    borderColor: colors.line,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: {
    backgroundColor: colors.green,
  },
  dotRed: {
    backgroundColor: colors.red,
  },
  amountPositive: {
    color: colors.green,
    fontWeight: '900',
  },
  amountNegative: {
    color: colors.red,
    fontWeight: '900',
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#2B6DE8',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButtonText: {
    color: colors.primaryDeep,
  },
  dangerButton: {
    backgroundColor: '#FFF3F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
  },
  dangerButtonText: {
    color: colors.red,
  },
  fluid: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  modalPrimaryRow: {
    marginTop: 16,
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  ghostAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  ghostActionText: {
    color: colors.muted,
    fontWeight: '800',
  },
  ghostDangerAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  ghostDangerActionText: {
    color: colors.red,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.32)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 22,
    
    borderColor: colors.line,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  // ── Auth gate (editorial) ──────────────────────────────────────────────
  authGateLayout: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 48,
  },
  authGateCard: {
    borderRadius: 4,
    backgroundColor: '#F6F1E7',
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 8,
  },
  authHeroMark: {
    width: 56,
    height: 56,
    borderRadius: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  authHeroMarkText: {
    color: '#F6F1E7',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  authModeSwitch: {
    flexDirection: 'row',
    borderRadius: 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 3,
    marginTop: 16,
    gap: 0,
  },
  authModeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  authModeChipActive: {
    backgroundColor: '#0F172A',
  },
  authModeChipText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  authModeChipTextActive: {
    color: '#F6F1E7',
  },
  authFormCard: {
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0F172A',
    padding: 16,
    marginTop: 14,
  },
  inputGroup: {
    marginTop: 10,
  },
  authGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  authSectionLabel: {
    color: '#B7410E',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 2,
  },
  inputLabel: {
    color: '#0F172A',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  rechargeHero: {
    alignItems: 'flex-start',
  },
  rechargeHeroBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rechargeHeroAlert: {
    backgroundColor: '#FFF3F3',
  },
  rechargeHeroBadgeText: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  rechargePresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  rechargePreset: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rechargePresetActive: {
    backgroundColor: colors.primarySoft,
    
  },
  rechargePresetText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  rechargePresetTextActive: {
    color: colors.primaryDeep,
  },
  input: {
    minHeight: 48,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    paddingHorizontal: 14,
    fontWeight: '700',
    fontFamily: 'serif',
    fontSize: 15,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  providerButton: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
  },
  providerButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  providerButtonText: {
    color: '#0F172A',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  providerButtonActiveText: {
    color: colors.primaryDeep,
  },
  insufficientPanel: {
    borderRadius: 20,
    backgroundColor: '#FFF8F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    marginTop: 16,
  },
  insufficientTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 6,
  },
  forgotPasswordLink: {
    minHeight: 44,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
  },
  authLinkText: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  authPrimaryButton: {
    minHeight: 50,
    borderRadius: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
  },
  authPrimaryButtonText: {
    color: '#F6F1E7',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: 0.3,
  },
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0F172A',
  },
  authDividerText: {
    color: '#475569',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  googleButton: {
    minHeight: 56,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  googleMarkWrap: {
    width: 32,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMark: {
    color: '#F6F1E7',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  googleButtonTextWrap: {
    flex: 1,
  },
  googleButtonLabel: {
    color: '#475569',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  googleButtonText: {
    color: '#0F172A',
    fontFamily: 'serif',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  authSwitchLink: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  authSwitchText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 13,
    fontWeight: '700',
  },
  closeAuthButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeAuthButtonText: {
    color: colors.muted,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.primaryDeep,
    fontWeight: '900',
    marginTop: 10,
    lineHeight: 18,
  },
  onboardingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  onboardingMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingMarkText: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  stepText: {
    color: colors.muted,
    fontWeight: '900',
  },
  onboardingTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  onboardingText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  inputDropdown: {
    minHeight: 46,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  inputDropdownText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  inputDropdownTextPlaceholder: {
    color: colors.muted,
  },
  inputDropdownArrow: {
    color: colors.muted,
    fontSize: 10,
  },
  dropdownModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 14,
    textAlign: 'center',
  },
  dropdownScrollView: {
    marginBottom: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: colors.primarySoft,
  },
  dropdownItemText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownItemTextActive: {
    color: colors.primaryDeep,
  },
  dropdownCloseButton: {
    marginTop: 8,
    backgroundColor: '#F3F7FB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dropdownCloseButtonText: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },
  verifyEmailContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  verifyEmailIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  verifyEmailText: {
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  verifyEmailAddress: {
    fontSize: 16,
    color: colors.primaryDeep,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  verifyEmailDescription: {
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  verifyEmailNote: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 16,
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '800',
    textAlign: 'center',
  },
});

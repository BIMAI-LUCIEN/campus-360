import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from 'react-native';
import { Bell, Shield, MessageSquare, Smartphone, Wallet, BookOpen, Crown, Home, Search, User, Sparkles, FileText } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
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
} from './src/features/auth/betterAuth';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { PdfStudentSection } from './src/features/pdf/PdfStudentSection';
import { ReportsScreen } from './src/features/reports/ReportsScreen';
import { ReportEditorWebView } from './src/features/reports/ReportEditorWebView';
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
type AppSection = 'home' | 'explore' | 'library' | 'reports' | 'account' | 'premium';

const logo = require('./assets/icon.png');
const catalogCard = require('./assets/catalog-card.png');
const onboardingStorageKey = 'campus-3602.onboarding-seen';

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
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  fluid?: boolean;
  style?: any;
  textStyle?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        fluid && styles.fluid,
        {
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.9 : 1,
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

  if (section === 'reports') {
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
    text: 'Recherche par universite, filiere, matiere ou niveau.',
  },
  {
    title: 'Preview puis achat',
    text: 'Regarde un apercu, puis debloque le PDF avec ton wallet.',
  },
  {
    title: 'Lis et revise',
    text: 'Garde tes achats et utilise l assistant pour reviser plus vite.',
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
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [securitySettingsVisible, setSecuritySettingsVisible] = useState(false);
  
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
      if (!url || !url.startsWith('campus-3602://reset-password')) return;
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
      Alert.alert('Creation du compte', 'Entre ton nom.');
      return;
    }
    if (authMode === 'sign-up' && !whatsappPhone) {
      Alert.alert('Creation du compte', 'Entre ton numero WhatsApp.');
      return;
    }
    if (authMode === 'sign-up' && !university) {
      Alert.alert('Creation du compte', 'Choisis ton universite.');
      return;
    }
    if (authMode === 'sign-up' && !faculty) {
      Alert.alert('Creation du compte', 'Entre ta filiere.');
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
      Alert.alert('Connecte', 'Tes achats PDF et ton wallet sont synchronises.');
    } catch (error) {
      console.error('submitAuth error:', error);
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Reessaie dans un instant.');
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
      Alert.alert('Connecte', 'Connexion via Google reussie.');
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Connexion impossible', error instanceof Error ? error.message : 'Reessaie dans un instant.');
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

  const buyDocument = (document: CampusDocument) => {
    if (purchasedDocuments.includes(document.id)) {
      Alert.alert('Deja achete', 'Ce PDF est deja dans ta bibliotheque.');
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
        Alert.alert('PDF achete', `${document.title} est maintenant dans Mes PDF.`);
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
        Alert.alert('Achat impossible', message || 'Reessaie dans un instant.');
      })
      .finally(() => {
        setPurchasingDocumentId(null);
      });
  };

  const buyPack = (pack: CampusPdfPack) => {
    if (purchasedPacks.includes(pack.id)) {
      Alert.alert('Pack deja achete', 'Ce pack est deja dans ta bibliotheque.');
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
        Alert.alert('Pack achete', `${pack.title} est maintenant dans ta bibliotheque.`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('insufficient')) {
          setInsufficientVisible(true);
          return;
        }
        Alert.alert('Achat impossible', message || 'Reessaie dans un instant.');
      })
      .finally(() => {
        setPurchasingPackId(null);
      });
  };

  const rechargeWallet = async () => {
    const amount = Number.parseInt(rechargeAmount, 10);
    if (!Number.isFinite(amount) || amount < 100) {
      Alert.alert('Montant invalide', 'Le minimum de recharge est 100 FCFA.');
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
      Alert.alert('Abonnement active', `Tu as souscrit au forfait ${tier}.`);
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
      Alert.alert('Pack IA ajoute', `Tes credits IA ont ete mis a jour.`);
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
              ? 'Ton solde devient limite pour acheter un nouveau PDF.'
              : `Tu peux encore depenser ${formatCoins(balance)} C dans le catalogue.`,
        }
      : {
          id: 'welcome',
          tone: 'neutral' as const,
          title: 'Compte non connecte',
          body: 'Connecte-toi pour synchroniser ton wallet, tes achats et ta revision.',
        },
    continueDocument
      ? {
          id: 'resume',
          tone: 'primary' as const,
          title: 'Reprendre ta revision',
          body: `Le PDF "${continueDocument.title}" est pret a etre rouvert.`,
        }
      : {
          id: 'discover',
          tone: 'primary' as const,
          title: 'Premier pack conseille',
          body: 'Commence par un pack pour debloquer plusieurs documents en une fois.',
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
      ? 'Ouvre un PDF depuis ta bibliotheque puis utilise "Resume" pour reviser plus vite.'
      : 'Debloque un premier PDF pour lancer la lecture securisee dans l application.',
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
        setAuthNotice('Connecte-toi pour ouvrir ta bibliotheque.');
        setAuthVisible(true);
        return;
      }
      setActiveSection(section);
      setClientTab('library');
      return;
    }

    if (section === 'reports') {
      if (!studentSession) {
        setActiveSection('account');
        setAuthMode('sign-in');
        setAuthNotice('Connecte-toi pour rédiger tes rapports de stage.');
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
            ? 'Creer un compte'
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
                      {authUniversity || 'Choisir ton universite'}
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
                    ? 'Entrer dans l application'
                    : authMode === 'sign-up'
                      ? 'Creer mon espace'
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
                {authMode === 'sign-in' ? 'Creer un compte' : authMode === 'sign-up' ? 'Se connecter' : 'Retour a la connexion'}
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

  if (editingReportId) {
    return (
      <ReportEditorWebView
        reportId={editingReportId}
        onClose={() => setEditingReportId(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.shell}>
        <View style={[styles.topBar, narrowScreen && styles.topBarCompact]}>
          <View style={styles.headerBrand}>
            <Image source={logo} style={styles.headerLogo} />
            <Text style={styles.appName} numberOfLines={1}>Campus 3602</Text>
          </View>
          <Pressable 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'relative' }} 
            onPress={() => setNotificationsVisible(true)}
          >
            <Bell size={18} color="#475569" />
            <View style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#FFFFFF' }} />
          </Pressable>
        </View>

        {isSessionRestoring ? (
          <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <Image source={logo} style={{ width: 80, height: 80, borderRadius: 20 }} />
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>Chargement de Campus 3602...</Text>
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
          <ScrollView contentContainerStyle={[styles.content, compactScreen && styles.contentCompact]} showsVerticalScrollIndicator={false}>
          {activeSection === 'home' ? (
            <View style={styles.clientDashboard}>
              <View style={[styles.dashboardHero, narrowScreen && styles.dashboardHeroCompact, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={[styles.dashboardHeroContent, { width: '100%' }]}>
                  <View style={[styles.flex, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }]}>
                    <View style={styles.dashboardHeroText}>
                      <Text style={[styles.dashboardEyebrow, { fontSize: 14, color: '#64748B', textTransform: 'none', fontWeight: '500' }]}>👋 Bienvenue sur Campus 3602</Text>
                      <Text style={[styles.dashboardTitle, { fontSize: 28, fontWeight: '800', marginTop: 4, marginBottom: 8 }]}>
                        {studentProfile?.name?.split(' ')[0] ?? 'Etudiant'}
                      </Text>
                    </View>
                    <Pressable
                      style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
                      onPress={() => setAccountVisible(true)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>🪙</Text>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E293B' }}>{formatCoins(balance)} C</Text>
                    </Pressable>
                  </View>
                  
                  <Text style={[styles.dashboardSubtitle, { fontSize: 15, lineHeight: 22, color: '#475569', marginTop: 8 }]}>
                    {studentSession
                      ? 'Retrouve vite les bons PDF, ouvre ta bibliotheque et reprends ta revision.'
                      : 'Trouve des PDF fiables, preview avant achat et revise avec l assistant IA.'}
                  </Text>
                  
                  <View style={[styles.dashboardHeroProof, { marginTop: 16, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }]}>
                    <Text style={[styles.dashboardHeroProofText, { color: '#2563EB', fontWeight: '600', fontSize: 13 }]}>
                      📚 {publishedDocumentCount} PDF publies{homePacks.length ? ` • ${homePacks.length} packs disponibles` : ''}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.homeMainStack}>
                <View style={[styles.homeLeadCard, { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }]}>
                  <View style={styles.dashboardFeatureRow}>
                    <View style={[styles.dashboardFeatureText, { flex: 1 }]}>
                      <Text style={[styles.dashboardActionKicker, { fontSize: 13, color: '#2563EB', textTransform: 'none', marginBottom: 6 }]}>✨ Decouvre le catalogue</Text>
                      <Text style={[styles.dashboardActionTitle, { fontSize: 20, fontWeight: '700', lineHeight: 28 }]}>Acheter et lire des PDF campus</Text>
                      <Text style={[styles.dashboardActionText, { fontSize: 14, color: '#64748B', lineHeight: 22, marginTop: 8 }]}>
                        Recherche par universite, filiere et niveau. Preview gratuite, puis lecture avec l'assistant IA.
                      </Text>
                    </View>
                    <View style={[styles.dashboardFeatureImageWrap, { marginLeft: 16, borderRadius: 16, overflow: 'hidden' }]}>
                      <Image source={catalogCard} style={[styles.dashboardFeatureImage, { width: 90, height: 110 }]} resizeMode="cover" />
                    </View>
                  </View>
                  <View style={[styles.homeBenefitRow, { marginTop: 20, gap: 8 }]}>
                    <View style={[styles.homeBenefitChip, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }]}>
                      <Text style={[styles.homeBenefitText, { color: '#475569', fontSize: 12, fontWeight: '600' }]}>👁️ Preview</Text>
                    </View>
                    <View style={[styles.homeBenefitChip, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }]}>
                      <Text style={[styles.homeBenefitText, { color: '#475569', fontSize: 12, fontWeight: '600' }]}>🔒 Securise</Text>
                    </View>
                    <View style={[styles.homeBenefitChip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }]}>
                      <Text style={[styles.homeBenefitText, { color: '#1D4ED8', fontSize: 12, fontWeight: '700' }]}>🤖 IA</Text>
                    </View>
                  </View>
                  <View style={[styles.homeLeadActions, { marginTop: 24, gap: 12 }]}>
                    <PrimaryButton 
                      label="Explorer le catalogue" 
                      fluid 
                      onPress={() => openSection('explore')} 
                    />
                    <PrimaryButton
                      label={continueDocument ? 'Continuer la lecture' : 'Ouvrir ma bibliotheque'}
                      variant="secondary"
                      fluid
                      onPress={() => openSection('library')}
                      style={{ backgroundColor: 'transparent', borderColor: '#E2E8F0', borderWidth: 1 }}
                    />
                  </View>
                </View>

                <View style={[styles.homeLeadCard, { borderRadius: 24, padding: 24, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }]}>
                  <View style={styles.dashboardFeatureRow}>
                    <View style={[styles.dashboardFeatureText, { flex: 1 }]}>
                      <Text style={[styles.dashboardActionKicker, { fontSize: 13, color: '#10B981', textTransform: 'none', marginBottom: 6 }]}>✨ Rédaction & Rapport</Text>
                      <Text style={[styles.dashboardActionTitle, { fontSize: 20, fontWeight: '700', lineHeight: 28 }]}>Rapport de Stage & Mémoire</Text>
                      <Text style={[styles.dashboardActionText, { fontSize: 14, color: '#64748B', lineHeight: 22, marginTop: 8 }]}>
                        Rédigez vos rapports d'internship et mémoires directement, générez vos chapitres par IA, et exportez en Word / PDF.
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.homeLeadActions, { marginTop: 24 }]}>
                    <PrimaryButton 
                      label="Rédiger mon rapport" 
                      fluid 
                      onPress={() => openSection('reports')} 
                      style={{ backgroundColor: '#10B981' }}
                    />
                  </View>
                </View>

                {featuredHomePack ? (
                  <Pressable style={[styles.homeFeatureStrip, { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }]} onPress={() => openSection('explore')}>
                    <View style={styles.flex}>
                      <Text style={[styles.dashboardSectionTitle, { fontSize: 13, textTransform: 'none', color: '#64748B', marginBottom: 4 }]}>⭐ Pack Recommande</Text>
                      <Text style={[styles.homeFeatureStripTitle, { fontSize: 18, color: '#1E293B', marginBottom: 6 }]}>{featuredHomePack.title}</Text>
                      <Text style={[styles.dashboardInfoSub, { fontSize: 13, color: '#94A3B8' }]} numberOfLines={2}>
                        {featuredHomePack.documentCount} PDF • {featuredHomePack.level} • reduc. {featuredHomePack.discountPercent}%
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={[styles.homeFeatureStripPrice, { fontSize: 16, color: '#1D4ED8', fontWeight: 'bold' }]}>{formatCoins(featuredHomePack.price)} C</Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {activeSection === 'account' ? (
            <View style={styles.accountSection}>
              <View style={styles.accountSurface}>
                <View style={[styles.accountHeroRow, narrowScreen && styles.accountHeroRowCompact]}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarLargeText}>
                      {studentProfile?.name?.slice(0, 2).toUpperCase() ?? 'ET'}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.dashboardSectionTitle, { fontSize: 13, textTransform: 'none', color: '#64748B' }]}>Espace Compte</Text>
                    <Text style={[styles.accountSurfaceTitle, { fontSize: 22, fontWeight: '700' }]}>{studentProfile?.name ?? 'Etudiant Campus 3602'}</Text>
                    <Text style={[styles.dashboardInfoSub, { fontSize: 15, color: '#94A3B8' }]}>
                      {studentProfile?.email ?? studentSession.user.email ?? 'Connecte'}
                    </Text>
                    {studentProfile?.university ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>{studentProfile.university}</Text>
                        </View>
                        {studentProfile.faculty && (
                          <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>{studentProfile.faculty}</Text>
                          </View>
                        )}
                        {studentProfile.level && (
                          <View style={{ backgroundColor: '#F4FBF8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>{studentProfile.level}</Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.accountSummaryGrid, narrowScreen && styles.accountSummaryGridCompact, { marginTop: 16 }]}>
                  <View style={[styles.accountSummaryCard, narrowScreen && styles.accountSummaryCardCompact, { borderRadius: 24, padding: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Wallet size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={[styles.dashboardSectionTitle, { fontSize: 13, textTransform: 'none', color: '#64748B', marginBottom: 0 }]}>Solde PDF & IA</Text>
                    </View>
                    <Text style={[styles.accountSummaryValue, { fontSize: 24 }]}>{formatCoins(balance)} C</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: subscriptionTier === 'premium' ? '#FDF2F8' : subscriptionTier === 'basic' ? '#EFF6FF' : '#F1F5F9',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: subscriptionTier === 'premium' ? '#FBCFE8' : subscriptionTier === 'basic' ? '#BFDBFE' : '#E2E8F0'
                      }}>
                        {subscriptionTier === 'premium' ? (
                          <Crown size={12} color="#DB2777" style={{ marginRight: 4 }} />
                        ) : (
                          <Shield size={12} color={subscriptionTier === 'basic' ? '#2563EB' : '#64748B'} style={{ marginRight: 4 }} />
                        )}
                        <Text style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: subscriptionTier === 'premium' ? '#DB2777' : subscriptionTier === 'basic' ? '#2563EB' : '#64748B'
                        }}>
                          {subscriptionTier === 'premium' ? 'Premium' : subscriptionTier === 'basic' ? 'Basic' : 'Gratuit'}
                        </Text>
                      </View>

                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F5F3FF',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#DDD6FE'
                      }}>
                        <Sparkles size={12} color="#7C3AED" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#7C3AED' }}>
                          {iaCredits} cr. IA
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.accountSummaryCard, narrowScreen && styles.accountSummaryCardCompact, { borderRadius: 24, padding: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <BookOpen size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={[styles.dashboardSectionTitle, { fontSize: 13, textTransform: 'none', color: '#64748B', marginBottom: 0 }]}>Bibliotheque</Text>
                    </View>
                    <Text style={[styles.accountSummaryValue, { fontSize: 24 }]}>{hasSubscription ? 'Illimite' : purchasedDocuments.length}</Text>
                    <Text style={[styles.dashboardInfoSub, { marginTop: 8, fontSize: 13, color: '#94A3B8' }]}>{hasSubscription ? 'Abonnement actif.' : 'PDF debloques.'}</Text>
                  </View>
                </View>

                <View style={[styles.accountActionStack, { marginTop: 32 }]}>
                  <PrimaryButton 
                    label="👑 Passer en Premium" 
                    fluid 
                    onPress={() => openSection('premium')} 
                    style={{ backgroundColor: '#FCD34D' }}
                    textStyle={{ color: '#1E3A8A', fontSize: 16, fontWeight: 'bold' }}
                  />
                  <PrimaryButton 
                    label="Recharger le wallet" 
                    fluid 
                    onPress={() => setRechargeVisible(true)} 
                    variant="secondary"
                    style={{ backgroundColor: 'transparent', borderColor: '#E2E8F0', borderWidth: 1 }}
                  />
                </View>

                <View style={{ marginTop: 32, gap: 12 }}>
                  <Text style={[styles.dashboardSectionTitle, { fontSize: 16, textTransform: 'none', color: '#1E293B', marginBottom: 4 }]}>Rédaction & Rapports</Text>
                  
                  <Pressable style={styles.accountMenuItem} onPress={() => openSection('reports')}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={18} color="#2563EB" />
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex]}>Mes Rapports de stage</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>
                </View>

                <View style={{ marginTop: 32, gap: 12 }}>
                  <Text style={[styles.dashboardSectionTitle, { fontSize: 16, textTransform: 'none', color: '#1E293B', marginBottom: 4 }]}>Réglages & Sécurité</Text>
                  
                  <Pressable style={styles.accountMenuItem} onPress={() => setNotificationsSettingsVisible(true)}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={18} color="#EF4444" />
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex]}>Gérer les notifications</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>

                  <Pressable style={styles.accountMenuItem} onPress={() => setSecuritySettingsVisible(true)}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex]}>Sécurité & Mot de passe</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>
                  
                  <Pressable style={styles.accountMenuItem} onPress={() => setSupportModalVisible(true)}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={18} color="#64748B" />
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex]}>Contacter le support</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>
                </View>

                <View style={{ marginTop: 32, gap: 12 }}>
                  <Text style={[styles.dashboardSectionTitle, { fontSize: 16, textTransform: 'none', color: '#1E293B', marginBottom: 4 }]}>Système</Text>
                  <Pressable style={styles.accountMenuItem} onPress={() => syncStudentAccount(studentSession ?? undefined)}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>🔄</Text>
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex]}>{syncingAccount ? 'Synchronisation...' : 'Synchroniser le compte'}</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>
                  
                  <Pressable style={[styles.accountMenuItem, { marginTop: 8 }]} onPress={signOutStudent}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>🚪</Text>
                    </View>
                    <Text style={[styles.accountMenuItemText, styles.flex, { color: '#EF4444' }]}>Deconnexion</Text>
                    <Text style={styles.accountMenuItemArrow}>›</Text>
                  </Pressable>
                </View>

                {studentSession && transactions.length ? (
                  <View style={[styles.accountHistorySection, { marginTop: 40 }]}>
                    <Text style={[styles.dashboardSectionTitle, { fontSize: 16, textTransform: 'none', color: '#1E293B', marginBottom: 16 }]}>Historique recent</Text>
                    {transactions.slice(0, 3).map((transaction) => (
                      <View key={transaction.id} style={[styles.listRow, { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }]}>
                        <View style={[styles.transactionDot, { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: transaction.amount > 0 ? '#ECFDF5' : '#FEF2F2' }]}>
                          <Text style={{ fontSize: 18 }}>{transaction.amount > 0 ? '↓' : '↑'}</Text>
                        </View>
                        <View style={[styles.flex, { marginLeft: 12 }]}>
                          <Text style={[styles.cardTitle, { fontSize: 15, color: '#1E293B' }]}>{transaction.label}</Text>
                          <Text style={[styles.bodyMuted, { fontSize: 13, marginTop: 2 }]}>
                            {transaction.date}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: transaction.amount > 0 ? '#D1FAE5' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={[transaction.amount > 0 ? styles.amountPositive : styles.amountNegative, { fontSize: 13, fontWeight: '700', color: transaction.amount > 0 ? '#059669' : '#64748B' }]}>
                            {transaction.amount > 0 ? '+' : ''}
                            {formatCoins(transaction.amount)} C
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={[styles.accountSupportCard, { marginTop: 32, backgroundColor: '#F8FAFC', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }]}>
                  <Text style={[styles.accountSupportTitle, { fontSize: 18, color: '#1E293B', marginBottom: 8 }]}>📚 Bibliotheque securisee</Text>
                  <Text style={[styles.dashboardInfoSub, { fontSize: 14, color: '#64748B', lineHeight: 22 }]}>
                    Retrouve tes documents achetes pour les relire, generer des quiz ou utiliser l'assistant IA hors catalogue.
                  </Text>
                  <Pressable style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }} onPress={() => openSection('library')}>
                    <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 15 }}>Ouvrir ma bibliotheque</Text>
                    <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 18, marginLeft: 6 }}>→</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : activeSection === 'premium' ? (
            <View style={styles.premiumSection}>
              <View style={styles.premiumHero}>
                <Text style={styles.premiumCrown}>👑</Text>
                <Text style={styles.premiumTitle}>Passe en mode Premium</Text>
                <Text style={styles.premiumSubtitle}>Abonne-toi pour debloquer tous les documents et profiter de l'IA sans limites.</Text>
              </View>

              <View style={styles.premiumPlansContainer}>
                <View style={[styles.premiumPlanCard, subscriptionTier === 'basic' && styles.premiumPlanCardActive]}>
                  {subscriptionTier === 'basic' && <View style={styles.premiumActiveBadge}><Text style={styles.premiumActiveBadgeText}>Ton forfait</Text></View>}
                  <Text style={styles.premiumPlanName}>Basic</Text>
                  <Text style={styles.premiumPlanPrice}>1 000 <Text style={styles.premiumPlanPriceUnit}>C / mois</Text></Text>
                  <View style={styles.premiumPlanFeatures}>
                    <Text style={styles.premiumPlanFeature}>✓ Acces ILLIMITE a tous les PDF</Text>
                    <Text style={styles.premiumPlanFeature}>✓ Lecture securisee hors-ligne</Text>
                    <Text style={[styles.premiumPlanFeature, styles.premiumPlanFeatureMuted]}>✗ Assistant IA inclus</Text>
                  </View>
                  <View style={{ marginTop: 20 }}>
                    <PrimaryButton label={subscriptionTier === 'basic' ? "Actif" : "S'abonner a Basic"} variant={subscriptionTier === 'basic' ? 'secondary' : 'primary'} onPress={() => buySubscription('basic')} />
                  </View>
                </View>

                <View style={[styles.premiumPlanCard, styles.premiumPlanCardFeatured, subscriptionTier === 'premium' && styles.premiumPlanCardActive]}>
                  <View style={styles.premiumFeaturedBadge}><Text style={styles.premiumFeaturedBadgeText}>Recommande</Text></View>
                  <Text style={[styles.premiumPlanName, { color: '#FFFFFF' }]}>Premium</Text>
                  <Text style={[styles.premiumPlanPrice, { color: '#FFFFFF' }]}>2 000 <Text style={[styles.premiumPlanPriceUnit, { color: '#E0E7FF' }]}>C / mois</Text></Text>
                  <View style={styles.premiumPlanFeatures}>
                    <Text style={[styles.premiumPlanFeature, { color: '#FFFFFF' }]}>✓ Acces ILLIMITE a tous les PDF</Text>
                    <Text style={[styles.premiumPlanFeature, { color: '#FFFFFF' }]}>✓ Lecture securisee hors-ligne</Text>
                    <Text style={[styles.premiumPlanFeature, { color: '#FFFFFF', fontWeight: 'bold' }]}>✓ 100 Credits IA / mois inclus</Text>
                  </View>
                  <View style={{ marginTop: 20 }}>
                    <PrimaryButton 
                      label={subscriptionTier === 'premium' ? "Actif" : "S'abonner a Premium"} 
                      onPress={() => buySubscription('premium')} 
                      variant={subscriptionTier === 'premium' ? 'secondary' : 'primary'}
                      style={subscriptionTier !== 'premium' ? { backgroundColor: '#FCD34D' } : undefined}
                      textStyle={subscriptionTier !== 'premium' ? { color: '#1E3A8A' } : undefined}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.premiumIaSection}>
                <Text style={[styles.premiumSectionTitle, { fontSize: 20, color: '#1E293B', fontWeight: '800' }]}>Recharges IA (À la carte)</Text>
                <Text style={[styles.premiumSectionSubtitle, { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 16 }]}>Besoin de plus de questions ? Recharge ton assistant IA directement.</Text>
                
                <View style={[styles.premiumIaGrid, { gap: 12 }]}>
                  {[
                    { id: 'micro', name: 'Micro', credits: 20, price: 250, highlight: false },
                    { id: 'standard', name: 'Standard', credits: 50, price: 500, highlight: false },
                    { id: 'boost', name: 'Boost', credits: 120, price: 1000, highlight: true },
                  ].map(pack => (
                    <View key={pack.id} style={[styles.premiumIaCard, { borderRadius: 20, padding: 16, borderTopWidth: pack.highlight ? 4 : 0, borderTopColor: '#3B82F6', shadowOpacity: pack.highlight ? 0.08 : 0.04, elevation: pack.highlight ? 3 : 1 }]}>
                      <Text style={[styles.premiumIaCardName, { color: pack.highlight ? '#2563EB' : '#64748B', fontSize: 13, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 }]}>{pack.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 8 }}>
                        <Text style={{ fontSize: 28, color: '#1E293B', fontWeight: '900' }}>{pack.credits}</Text>
                        <Text style={{ fontSize: 18, color: '#3B82F6' }}>⚡</Text>
                      </View>
                      <Pressable 
                        style={({pressed}) => [
                          styles.premiumIaCardButton, 
                          { 
                            backgroundColor: pack.highlight ? '#3B82F6' : '#EFF6FF',
                            paddingVertical: 10,
                            borderRadius: 14,
                            marginTop: 4,
                            transform: [{ scale: pressed ? 0.96 : 1 }]
                          }
                        ]} 
                        onPress={() => buyIaPack(pack.id as any)}
                      >
                        <Text style={[styles.premiumIaCardButtonText, { color: pack.highlight ? '#FFFFFF' : '#2563EB', fontSize: 14, fontWeight: '800' }]}>{pack.price} C</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.premiumRechargeSection, { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 24, marginTop: 32, marginBottom: 16, borderColor: '#E2E8F0', borderWidth: 1, shadowOpacity: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 28 }}>🪙</Text>
                  <Text style={[styles.premiumSectionTitle, { fontSize: 20, color: '#1E293B', fontWeight: '800' }]}>Besoin de Coins ?</Text>
                </View>
                <Text style={[styles.premiumSectionSubtitle, { fontSize: 14, color: '#64748B', lineHeight: 20 }]}>
                  Recharge ton portefeuille via Mobile Money (MoMo/OM) pour souscrire a un abonnement ou acheter des packs IA.
                </Text>
                <View style={{ marginTop: 24 }}>
                  <PrimaryButton label="Recharger mon Wallet" onPress={() => setRechargeVisible(true)} variant="primary" fluid />
                </View>
              </View>
            </View>
          ) : activeSection === 'reports' ? (
            <ReportsScreen onEditReport={(id) => setEditingReportId(id)} />
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
            { key: 'reports', label: 'Rapports' },
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
                {studentProfile?.name ?? 'Etudiant Campus 3602'}
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
              <Text style={styles.accountQuickActionLabel}>Bibliotheque</Text>
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Montant a ajouter</Text>
              <TextInput keyboardType="numeric" value={rechargeAmount} onChangeText={setRechargeAmount} style={styles.input} />
            </View>

            <View style={styles.rechargePresetRow}>
              {[500, 1000, 2500].map((amount) => {
                const active = rechargeAmount === String(amount);
                return (
                  <Pressable
                    key={amount}
                    style={[styles.rechargePreset, active && styles.rechargePresetActive]}
                    onPress={() => setRechargeAmount(String(amount))}
                  >
                    <Text style={[styles.rechargePresetText, active && styles.rechargePresetTextActive]}>
                      {formatCoins(amount)} C
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
            <Text style={styles.bodyMuted}>Passe a la vitesse superieure pour tes revisions.</Text>
          </View>

          <View style={styles.walletPanel}>
            <Text style={styles.kicker}>Forfait actuel: {subscriptionTier === 'premium' ? 'Premium' : subscriptionTier === 'basic' ? 'Basic' : 'Gratuit'}</Text>
            {subscriptionExpiresAt && <Text style={styles.bodyMuted}>Expire le: {new Date(subscriptionExpiresAt).toLocaleDateString('fr-CM')}</Text>}
            <Text style={styles.walletAmount}>{iaCredits} Credits IA</Text>
            <Text style={styles.walletHint}>Solde Wallet: {formatCoins(balance)} C</Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.authFormCard}>
              <Text style={styles.inputLabel}>Abonnements (Acces illimite PDF)</Text>
              
              <View style={[styles.rechargePreset, { marginBottom: 12, padding: 12 }]}>
                <Text style={styles.dashboardSectionTitle}>Basic (1 000 C / mois)</Text>
                <Text style={styles.bodyMuted}>Acces a TOUS les PDF en illimite. Pas de credits IA inclus.</Text>
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton label="S'abonner a Basic" onPress={() => buySubscription('basic')} />
                </View>
              </View>

              <View style={[styles.rechargePreset, { marginBottom: 12, padding: 12 }]}>
                <Text style={styles.dashboardSectionTitle}>Premium (2 000 C / mois)</Text>
                <Text style={styles.bodyMuted}>Acces illimite PDF + 100 Credits IA inclus pour poser tes questions au document.</Text>
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton label="S'abonner a Premium" onPress={() => buySubscription('premium')} />
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
            <Text style={styles.kicker}>Action recommandee</Text>
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
          <View style={styles.dropdownModalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownModalTitle}>Choisis ton universite</Text>
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
          </View>
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
          <View style={styles.dropdownModalCard} onStartShouldSetResponder={() => true}>
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
          </View>
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
          <View style={styles.dropdownModalCard} onStartShouldSetResponder={() => true}>
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
          </View>
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
          <View style={[styles.dropdownModalCard, { height: '60%', padding: 0 }]} onStartShouldSetResponder={() => true}>
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
          </View>
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
          <View style={[styles.dropdownModalCard, { height: '50%', padding: 0 }]} onStartShouldSetResponder={() => true}>
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
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>Alertes Compte</Text>
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
          </View>
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
          <View style={[styles.dropdownModalCard, { height: '85%', padding: 0 }]} onStartShouldSetResponder={() => true}>
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
                <TextInput style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]} placeholder="Mot de passe actuel" secureTextEntry />
                <TextInput style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]} placeholder="Nouveau mot de passe" secureTextEntry />
                <TextInput style={[styles.input, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]} placeholder="Confirmer le nouveau mot de passe" secureTextEntry />
                <PrimaryButton label="Mettre à jour" onPress={() => setSecuritySettingsVisible(false)} />
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
          </View>
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
          <View style={[styles.dropdownModalCard, { padding: 0 }]} onStartShouldSetResponder={() => true}>
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
              <Pressable style={{ backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, width: '100%', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Discuter sur WhatsApp</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
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
  premiumSection: { flex: 1, padding: 16, backgroundColor: '#F9FAFB' },
  premiumHero: { alignItems: 'center', marginBottom: 24, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  premiumCrown: { fontSize: 48, marginBottom: 12 },
  premiumTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  premiumSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  premiumPlansContainer: { gap: 16, marginBottom: 32 },
  premiumPlanCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  premiumPlanCardActive: { shadowColor: '#3B82F6', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  premiumPlanCardFeatured: { backgroundColor: '#1E3A8A' },
  premiumActiveBadge: { position: 'absolute', top: -12, right: 24, backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  premiumActiveBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  premiumFeaturedBadge: { position: 'absolute', top: -12, left: '50%', transform: [{ translateX: -50 }], backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  premiumFeaturedBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  premiumPlanName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  premiumPlanPrice: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 16 },
  premiumPlanPriceUnit: { fontSize: 16, fontWeight: 'normal', color: '#6B7280' },
  premiumPlanFeatures: { gap: 12 },
  premiumPlanFeature: { fontSize: 15, color: '#4B5563' },
  premiumPlanFeatureMuted: { color: '#9CA3AF' },
  premiumIaSection: { marginBottom: 32 },
  premiumSectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  premiumSectionSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 16 },
  premiumIaGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  premiumIaCard: { flex: 1, minWidth: 100, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  premiumIaCardName: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  premiumIaCardCredits: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  premiumIaCardButton: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, width: '100%', alignItems: 'center' },
  premiumIaCardButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  premiumRechargeSection: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 40 },
  
  accountMenuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  accountMenuItemIcon: { fontSize: 20, marginRight: 12 },
  accountMenuItemText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
  accountMenuItemArrow: { fontSize: 20, color: '#CBD5E1', fontWeight: 'bold' },

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
  accountSection: {
    gap: 14,
  },
  accountSurface: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    gap: 16,
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
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: colors.primaryDeep,
    fontSize: 20,
    fontWeight: '900',
  },
  accountSurfaceTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  accountSummaryGrid: {
    gap: 10,
  },
  accountSummaryGridCompact: {
    gap: 8,
  },
  accountFocusStrip: {
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accountFocusTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  accountFocusBadge: {
    width: 88,
    minHeight: 88,
    borderRadius: 24,
    backgroundColor: '#EEF5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  accountFocusBadgeValue: {
    color: colors.primaryDeep,
    fontSize: 28,
    fontWeight: '900',
  },
  accountFocusBadgeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  accountSummaryCard: {
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
  },
  accountSummaryCardCompact: {
    padding: 14,
  },
  accountSummaryValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  accountActionStack: {
    gap: 10,
  },
  accountHistorySection: {
    gap: 8,
  },
  accountSupportCard: {
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    gap: 10,
  },
  accountSupportTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  accountSupportLink: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountSupportLinkText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  clientDashboard: {
    gap: 14,
    marginBottom: 18,
  },
  dashboardHero: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    gap: 14,
  },
  dashboardHeroCompact: {
    gap: 14,
  },
  dashboardHeroContent: {
    gap: 14,
  },
  dashboardHeroText: {
    gap: 2,
  },
  dashboardEyebrow: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  dashboardSubtitle: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 20,
    fontWeight: '600',
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
    borderRadius: 24,
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
    borderRadius: 22,
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
  homeMainStack: {
    gap: 12,
  },
  homeLeadCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 18,
    gap: 16,
  },
  homeBenefitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  homeBenefitChip: {
    borderRadius: 999,
    backgroundColor: '#F3F8FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  homeBenefitText: {
    color: colors.primaryDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  homeLeadActions: {
    flexDirection: 'row',
    gap: 10,
  },
  homeCtaButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  homeCtaPrimary: {
    backgroundColor: colors.primary,
  },
  homeCtaSecondary: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  homeCtaPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  homeCtaSecondaryText: {
    color: colors.primaryDeep,
    fontWeight: '900',
  },
  homeFeatureStrip: {
    borderRadius: 22,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  homeFeatureStripTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  homeFeatureStripPrice: {
    color: colors.primaryDeep,
    fontSize: 18,
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
  homeFeaturedEyebrow: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  homeFeaturedTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  homeFeaturedPrice: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  homeFeaturedMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  homeFeaturedMeta: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '900',
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
  authGateLayout: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 48,
  },
  authGateCard: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#168CF2',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 8,
  },
  authHeroMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  authHeroMarkText: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  authModeSwitch: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: '#F3F7FB',
    padding: 4,
    marginTop: 16,
    gap: 6,
  },
  authModeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  authModeChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#168CF2',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  authModeChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  authModeChipTextActive: {
    color: colors.ink,
  },
  authFormCard: {
    borderRadius: 18,
    backgroundColor: '#F8FBFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 14,
    marginTop: 12,
  },
  inputGroup: {
    marginTop: 8,
  },
  authGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  authSectionLabel: {
    color: colors.primaryDeep,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginTop: 6,
    marginBottom: 2,
  },
  inputLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
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
    minHeight: 46,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    color: colors.ink,
    paddingHorizontal: 12,
    fontWeight: '700',
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  providerButton: {
    flex: 1,
    borderRadius: 8,
    
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    padding: 11,
    alignItems: 'center',
  },
  providerButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  providerButtonText: {
    color: colors.muted,
    fontWeight: '900',
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
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#168CF2',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  authPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
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
    backgroundColor: colors.line,
  },
  authDividerText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  googleButton: {
    minHeight: 62,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  googleMarkWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMark: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontWeight: '900',
  },
  googleButtonTextWrap: {
    flex: 1,
  },
  googleButtonLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  googleButtonText: {
    color: colors.ink,
    fontWeight: '900',
    marginTop: 2,
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

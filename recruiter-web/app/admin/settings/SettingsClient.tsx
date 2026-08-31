'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  User,
  Bell,
  Shield,
  Sliders,
  Palette,
  Plug,
  CreditCard,
  LifeBuoy,
  CheckCircle2,
  Camera,
  Trash2,
  ShoppingCart,
  UserPlus,
  BarChart3,
  AlertCircle,
  Sparkles,
  Smartphone,
  Sun,
  Moon,
  Monitor,
  Plus,
  Key,
  Webhook,
  Copy,
  Send,
  BookOpen,
  Activity,
  MessageSquare,
  LogOut,
  Check,
  Upload,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import {
  Card,
  CardHeader,
  Button,
  IconButton,
  Pill,
  Avatar,
  PageHeader,
} from '../_components/ui';

type SettingsUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SectionId =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'preferences'
  | 'appearance'
  | 'integrations'
  | 'billing'
  | 'support';

type Section = {
  id: SectionId;
  label: string;
  icon: typeof User;
  description: string;
};

const SECTIONS: Section[] = [
  { id: 'profile', label: 'Profil', icon: User, description: 'Tes informations personnelles' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Choisis ce qu’on te dit' },
  { id: 'security', label: 'Sécurité', icon: Shield, description: 'Mot de passe et 2FA' },
  { id: 'preferences', label: 'Préférences', icon: Sliders, description: 'Langue, devise, fuseau' },
  { id: 'appearance', label: 'Apparence', icon: Palette, description: 'Thème et densité' },
  { id: 'integrations', label: 'Intégrations', icon: Plug, description: 'Clés API et webhooks' },
  { id: 'billing', label: 'Facturation', icon: CreditCard, description: 'Plan et paiements' },
  { id: 'support', label: 'Support & Aide', icon: LifeBuoy, description: 'Documentation et contact' },
];

type Toast = {
  id: number;
  message: string;
};

type EmailNotifKey =
  | 'purchase'
  | 'signup'
  | 'weekly'
  | 'system'
  | 'product';

const EMAIL_NOTIFS: Array<{
  key: EmailNotifKey;
  label: string;
  description: string;
  icon: typeof ShoppingCart;
}> = [
  { key: 'purchase', label: 'Nouvel achat', description: 'Quand un étudiant achète un produit ou un PDF.', icon: ShoppingCart },
  { key: 'signup', label: 'Nouvel étudiant inscrit', description: 'À chaque nouvelle inscription validée.', icon: UserPlus },
  { key: 'weekly', label: 'Rapport hebdomadaire', description: 'Synthèse chaque lundi matin de ton activité.', icon: BarChart3 },
  { key: 'system', label: 'Alertes système', description: 'Pannes, latence élevée, quotas API.', icon: AlertCircle },
  { key: 'product', label: 'Mise à jour produit', description: 'Nouvelles features et améliorations.', icon: Sparkles },
];

type ThemeKey = 'light' | 'dark' | 'system';
type DensityKey = 'comfortable' | 'compact';

const THEMES: Array<{
  key: ThemeKey;
  label: string;
  icon: typeof Sun;
  preview: ReactNode;
}> = [
  {
    key: 'light',
    label: 'Clair',
    icon: Sun,
    preview: (
      <div className="h-20 w-full rounded-md border border-border-light bg-white p-2">
        <div className="h-2 w-1/2 rounded bg-slate-200" />
        <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-100" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded bg-slate-100" />
      </div>
    ),
  },
  {
    key: 'dark',
    label: 'Sombre',
    icon: Moon,
    preview: (
      <div className="h-20 w-full rounded-md border border-border-light bg-slate-900 p-2">
        <div className="h-2 w-1/2 rounded bg-slate-700" />
        <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-800" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded bg-slate-800" />
      </div>
    ),
  },
  {
    key: 'system',
    label: 'Système',
    icon: Monitor,
    preview: (
      <div className="h-20 w-full overflow-hidden rounded-md border border-border-light">
        <div className="grid h-full grid-cols-2">
          <div className="bg-white p-2">
            <div className="h-2 w-1/2 rounded bg-slate-200" />
            <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-100" />
          </div>
          <div className="bg-slate-900 p-2">
            <div className="h-2 w-1/2 rounded bg-slate-700" />
            <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-800" />
          </div>
        </div>
      </div>
    ),
  },
];

const DENSITIES: Array<{
  key: DensityKey;
  label: string;
  description: string;
}> = [
  { key: 'comfortable', label: 'Confortable', description: 'Plus d’espace entre les lignes et les cartes.' },
  { key: 'compact', label: 'Compact', description: 'Plus d’information visible à l’écran.' },
];

type ApiKey = {
  id: string;
  provider: string;
  icon: typeof Key;
  preview: string;
  lastUsed: string;
};

const API_KEYS: ApiKey[] = [
  { id: 'resend', provider: 'Resend', icon: Send, preview: 're_sk_live_••••••••8a2f', lastUsed: '2026-06-28' },
  { id: 'openai', provider: 'OpenAI', icon: Sparkles, preview: 'sk-proj-••••••••41de', lastUsed: '2026-06-30' },
  { id: 'betterauth', provider: 'Better Auth', icon: Shield, preview: 'ba_live_••••••••c9b1', lastUsed: '2026-06-29' },
  { id: 'supabase', provider: 'Supabase', icon: Key, preview: 'sbp_••••••••0e7c', lastUsed: '2026-06-27' },
];

type WebhookEntry = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
};

const WEBHOOKS: WebhookEntry[] = [
  { id: 'wh-1', url: 'https://api.campus360.app/hooks/new-pdf', events: ['pdf.created', 'pdf.published'], active: true },
  { id: 'wh-2', url: 'https://hooks.zapier.com/campus360/leads', events: ['user.signup'], active: true },
  { id: 'wh-3', url: 'https://internal.campus360.app/billing-sync', events: ['subscription.renewed', 'subscription.canceled'], active: false },
];

type Session = {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current?: boolean;
};

const SESSIONS: Session[] = [
  { id: 's1', device: 'MacBook Pro · Chrome 128', location: 'Yaoundé, Cameroun', ip: '154.72.18.4', lastActive: 'À l’instant', current: true },
  { id: 's2', device: 'iPhone 15 · Safari', location: 'Douala, Cameroun', ip: '154.72.18.4', lastActive: 'Il y a 2 heures' },
  { id: 's3', device: 'Windows · Edge', location: 'Paris, France', ip: '82.124.12.90', lastActive: 'Hier à 18:42' },
  { id: 's4', device: 'iPad · Safari', location: 'Bafoussam, Cameroun', ip: '154.72.18.4', lastActive: 'Il y a 4 jours' },
];

type PaymentMethod = {
  id: string;
  type: 'mobile' | 'card';
  label: string;
  detail: string;
  primary?: boolean;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-1', type: 'mobile', label: 'MTN Mobile Money', detail: '+237 6•• •• •• 41', primary: true },
  { id: 'pm-2', type: 'mobile', label: 'Orange Money', detail: '+237 6•• •• •• 88' },
  { id: 'pm-3', type: 'card', label: 'Visa', detail: '•••• •••• •••• 4242 · expire 09/28' },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        checked ? 'bg-primary' : 'bg-surface-3',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-md border border-success-soft bg-success-bg p-3 text-sm font-medium text-success shadow-card"
        >
          <CheckCircle2 size={16} />
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-2 text-success hover:text-fg cursor-pointer"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-fg-faint">{hint}</span> : null}
    </label>
  );
}

function inputClass(extra = '') {
  return [
    'w-full rounded-md border border-border bg-bg px-3 h-10 text-sm text-fg',
    'placeholder:text-fg-faint outline-none transition-colors',
    'focus:border-primary focus:ring-2 focus:ring-primary-soft',
    'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle',
    extra,
  ].join(' ');
}

export function SettingsClient({ user }: { user: SettingsUser | null }) {
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // ─── Profile state ────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail] = useState(user?.email ?? '');
  const [profileBio, setProfileBio] = useState(
    'Passionné par l’éducation numérique en Afrique centrale.',
  );

  // ─── Notifications state ──────────────────────────────────────────────
  const [emailNotifs, setEmailNotifs] = useState<Record<EmailNotifKey, boolean>>({
    purchase: true,
    signup: true,
    weekly: false,
    system: true,
    product: false,
  });

  // ─── Security state ───────────────────────────────────────────────────
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [twoFA, setTwoFA] = useState(false);

  // ─── Preferences state ────────────────────────────────────────────────
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('XAF');
  const [timezone, setTimezone] = useState('Africa/Douala');
  const [pushNotifs, setPushNotifs] = useState(true);

  // ─── Appearance state ─────────────────────────────────────────────────
  const [theme, setTheme] = useState<ThemeKey>('light');
  const [density, setDensity] = useState<DensityKey>('comfortable');

  // ─── Integrations state ───────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(API_KEYS);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(WEBHOOKS);

  // ─── Billing state ────────────────────────────────────────────────────
  const [paymentMethods] = useState<PaymentMethod[]>(PAYMENT_METHODS);

  // ─── Support state ────────────────────────────────────────────────────
  const [supportMessage, setSupportMessage] = useState('');

  // Scroll the active section into view (left sidebar)
  const sidebarRef = useRef<HTMLDivElement>(null);

  const pushToast = (message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
  }, [user]);

  const revokeApiKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    pushToast('Clé API révoquée');
  };

  const toggleWebhook = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)),
    );
    pushToast('Webhook mis à jour');
  };

  const activeMeta = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0],
    [activeSection],
  );

  return (
    <div>
      <PageHeader
        breadcrumb={{ parent: 'Dashboard', current: 'Configuration' }}
        title="Configuration"
        subtitle="Personnalise ton espace admin et configure Campus 360."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* ─── Left: section nav ─────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            ref={sidebarRef}
            aria-label="Sections de configuration"
            className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-surface p-2 shadow-card lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-2"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex shrink-0 items-center gap-3 rounded-md px-3 h-10 text-sm font-medium transition-colors cursor-pointer',
                    'hover:bg-surface-2 hover:text-fg',
                    'w-full text-left',
                    isActive
                      ? 'bg-primary-softer text-primary font-semibold'
                      : 'text-fg-muted',
                  ].join(' ')}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ─── Right: section content ───────────────────────────────── */}
        <div className="min-w-0 flex flex-col gap-6">
          {activeSection === 'profile' && (
            <ProfileSection
              name={profileName}
              email={profileEmail}
              bio={profileBio}
              image={user?.image ?? null}
              onNameChange={setProfileName}
              onBioChange={setProfileBio}
              onSave={() => {
                pushToast('Édition du profil bientôt disponible');
              }}
              onUploadPhoto={() => {
                pushToast('Changement de photo bientôt disponible');
              }}
              onDeleteAccount={() => {
                pushToast('Suppression de compte bientôt disponible — contacte le support');
              }}
            />
          )}

          {activeSection === 'notifications' && (
            <NotificationsSection
              prefs={emailNotifs}
              onToggle={(key, next) =>
                setEmailNotifs((prev) => ({ ...prev, [key]: next }))
              }
              onSave={() => {
                pushToast('Préférences de notifications bientôt disponibles');
              }}
            />
          )}

          {activeSection === 'security' && (
            <SecuritySection
              oldPwd={oldPwd}
              newPwd={newPwd}
              confirmPwd={confirmPwd}
              twoFA={twoFA}
              sessions={SESSIONS}
              onOldPwdChange={setOldPwd}
              onNewPwdChange={setNewPwd}
              onConfirmPwdChange={setConfirmPwd}
              onChangePassword={async () => {
                if (!oldPwd) {
                  pushToast('Indique ton mot de passe actuel');
                  return;
                }
                if (!newPwd || newPwd !== confirmPwd) {
                  pushToast('Les mots de passe ne correspondent pas');
                  return;
                }
                const result = await authClient.changePassword({
                  currentPassword: oldPwd,
                  newPassword: newPwd,
                  revokeOtherSessions: false,
                });
                if (result.error) {
                  pushToast(result.error.message ?? 'Changement de mot de passe impossible');
                  return;
                }
                setOldPwd('');
                setNewPwd('');
                setConfirmPwd('');
                pushToast('Mot de passe changé');
              }}
              onToggle2FA={() => {
                pushToast('Authentification à deux facteurs bientôt disponible');
              }}
              onRevokeSession={() => {
                pushToast('Gestion des sessions bientôt disponible');
              }}
            />
          )}

          {activeSection === 'preferences' && (
            <PreferencesSection
              language={language}
              currency={currency}
              timezone={timezone}
              pushNotifs={pushNotifs}
              onLanguageChange={setLanguage}
              onCurrencyChange={setCurrency}
              onTimezoneChange={setTimezone}
              onPushChange={setPushNotifs}
              onSave={() => {
                pushToast('Préférences bientôt disponibles');
              }}
            />
          )}

          {activeSection === 'appearance' && (
            <AppearanceSection
              theme={theme}
              density={density}
              onThemeChange={setTheme}
              onDensityChange={setDensity}
              onSave={() => {
                pushToast('Apparence bientôt disponible');
              }}
            />
          )}

          {activeSection === 'integrations' && (
            <IntegrationsSection
              apiKeys={apiKeys}
              webhooks={webhooks}
              onRevokeKey={revokeApiKey}
              onToggleWebhook={toggleWebhook}
              onAddIntegration={() => {
                pushToast('Intégrations bientôt disponibles');
              }}
            />
          )}

          {activeSection === 'billing' && (
            <BillingSection paymentMethods={paymentMethods} />
          )}

          {activeSection === 'support' && (
            <SupportSection
              message={supportMessage}
              onMessageChange={setSupportMessage}
              onSubmit={() => {
                if (!supportMessage.trim()) return;
                pushToast('Formulaire support bientôt disponible — écris-nous par email en attendant');
              }}
            />
          )}
        </div>
      </div>

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}

// ─── Section: Profil ──────────────────────────────────────────────────────

function ProfileSection({
  name,
  email,
  bio,
  image,
  onNameChange,
  onBioChange,
  onSave,
  onUploadPhoto,
  onDeleteAccount,
}: {
  name: string;
  email: string;
  bio: string;
  image: string | null | undefined;
  onNameChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onSave: () => void;
  onUploadPhoto: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Informations personnelles"
          subtitle="Mets à jour ton nom, ta bio et ton email."
        />
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <Avatar name={name || 'Admin'} src={image ?? undefined} size={80} ring />
            <div>
              <p className="font-display text-base font-bold text-fg">
                {name || 'Admin'}
              </p>
              <p className="text-sm text-fg-subtle">{email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom complet" htmlFor="profile-name">
              <input
                id="profile-name"
                type="text"
                className={inputClass()}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ton nom"
              />
            </Field>
            <Field label="Email" htmlFor="profile-email">
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  className={inputClass('pr-24')}
                  value={email}
                  disabled
                  readOnly
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Pill tone="green">vérifié</Pill>
                </span>
              </div>
            </Field>
          </div>

          <Field
            label="Bio"
            htmlFor="profile-bio"
            hint="Quelques mots à propos de toi. Visible par ton équipe."
          >
            <textarea
              id="profile-bio"
              className={inputClass('h-24 py-2 leading-relaxed')}
              value={bio}
              onChange={(e) => onBioChange(e.target.value)}
              placeholder="Parle un peu de toi…"
            />
          </Field>

          <div className="flex justify-end">
            <Button variant="primary" icon={Check} onClick={onSave}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Photo de profil"
          subtitle="Une photo aide ton équipe à te reconnaître plus vite."
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-bg px-6 py-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Camera size={20} />
          </span>
          <p className="font-semibold text-fg">Glisse ta photo ici</p>
          <p className="text-xs text-fg-subtle">
            PNG, JPG ou WEBP · 5 Mo max · 800×800 recommandé
          </p>
          <Button variant="secondary" icon={Upload} size="sm" onClick={onUploadPhoto}>
            Parcourir mes fichiers
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Zone de danger"
          subtitle="Actions irréversibles. Procède avec prudence."
        />
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-danger-bg bg-danger-bg/40 p-4 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-fg">Supprimer mon compte</p>
            <p className="mt-1 text-sm text-fg-subtle">
              Toutes tes données seront effacées après 30 jours. Action définitive.
            </p>
          </div>
          <Button variant="danger" icon={Trash2} onClick={onDeleteAccount}>
            Supprimer mon compte
          </Button>
        </div>
      </Card>
    </>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────

function NotificationsSection({
  prefs,
  onToggle,
  onSave,
}: {
  prefs: Record<EmailNotifKey, boolean>;
  onToggle: (key: EmailNotifKey, next: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Notifications email"
        subtitle="Reçois uniquement ce qui est utile pour piloter Campus 360."
      />
      <div className="flex flex-col divide-y divide-border-light">
        {EMAIL_NOTIFS.map(({ key, label, description, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon size={16} />
              </span>
              <div>
                <p className="font-semibold text-fg">{label}</p>
                <p className="text-sm text-fg-subtle">{description}</p>
              </div>
            </div>
            <Toggle
              label={label}
              checked={prefs[key]}
              onChange={(next) => onToggle(key, next)}
            />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" icon={Check} onClick={onSave}>
          Sauvegarder
        </Button>
      </div>
    </Card>
  );
}

// ─── Section: Sécurité ────────────────────────────────────────────────────

function SecuritySection({
  oldPwd,
  newPwd,
  confirmPwd,
  twoFA,
  sessions,
  onOldPwdChange,
  onNewPwdChange,
  onConfirmPwdChange,
  onChangePassword,
  onToggle2FA,
  onRevokeSession,
}: {
  oldPwd: string;
  newPwd: string;
  confirmPwd: string;
  twoFA: boolean;
  sessions: Session[];
  onOldPwdChange: (v: string) => void;
  onNewPwdChange: (v: string) => void;
  onConfirmPwdChange: (v: string) => void;
  onChangePassword: () => void;
  onToggle2FA: (next: boolean) => void;
  onRevokeSession: (id: string) => void;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Mot de passe"
          subtitle="Change ton mot de passe régulièrement pour rester protégé."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Ancien mot de passe" htmlFor="old-pwd">
            <input
              id="old-pwd"
              type="password"
              autoComplete="current-password"
              className={inputClass()}
              value={oldPwd}
              onChange={(e) => onOldPwdChange(e.target.value)}
            />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="new-pwd">
            <input
              id="new-pwd"
              type="password"
              autoComplete="new-password"
              className={inputClass()}
              value={newPwd}
              onChange={(e) => onNewPwdChange(e.target.value)}
            />
          </Field>
          <Field label="Confirmer" htmlFor="confirm-pwd">
            <input
              id="confirm-pwd"
              type="password"
              autoComplete="new-password"
              className={inputClass()}
              value={confirmPwd}
              onChange={(e) => onConfirmPwdChange(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" icon={Shield} onClick={onChangePassword}>
            Changer le mot de passe
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Authentification à deux facteurs (2FA)"
          subtitle="Une couche de sécurité supplémentaire via une app d’authentification."
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border-light bg-bg p-4">
          <div>
            <p className="font-semibold text-fg">Activer 2FA</p>
            <p className="mt-1 text-sm text-fg-subtle">
              Utilise Google Authenticator, 1Password ou Authy pour générer tes codes.
            </p>
            <div className="mt-3">
              <Pill tone={twoFA ? 'green' : 'neutral'}>
                {twoFA ? 'Actif' : 'Désactivé'}
              </Pill>
            </div>
          </div>
          <Toggle label="Activer 2FA" checked={twoFA} onChange={onToggle2FA} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-6 pb-3">
          <CardHeader
            title="Sessions actives"
            subtitle="Déconnecte les appareils que tu n’utilises plus."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="px-6 py-3 font-semibold">Appareil</th>
                <th className="px-3 py-3 font-semibold">Localisation</th>
                <th className="px-3 py-3 font-semibold">Adresse IP</th>
                <th className="px-3 py-3 font-semibold">Dernière activité</th>
                <th className="px-6 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2/60">
                  <td className="px-6 py-3 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className="text-fg-subtle" />
                      {s.device}
                      {s.current ? <Pill tone="green">Cette session</Pill> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{s.location}</td>
                  <td className="px-3 py-3 font-mono text-xs text-fg-subtle">{s.ip}</td>
                  <td className="px-3 py-3 text-fg-muted">{s.lastActive}</td>
                  <td className="px-6 py-3 text-right">
                    {s.current ? (
                      <span className="text-xs text-fg-faint">—</span>
                    ) : (
                      <IconButton
                        icon={LogOut}
                        label="Déconnecter cette session"
                        onClick={() => onRevokeSession(s.id)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ─── Section: Préférences ─────────────────────────────────────────────────

function PreferencesSection({
  language,
  currency,
  timezone,
  pushNotifs,
  onLanguageChange,
  onCurrencyChange,
  onTimezoneChange,
  onPushChange,
  onSave,
}: {
  language: string;
  currency: string;
  timezone: string;
  pushNotifs: boolean;
  onLanguageChange: (v: string) => void;
  onCurrencyChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onPushChange: (next: boolean) => void;
  onSave: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Langue et région"
          subtitle="Adapte l’interface à tes habitudes."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Langue" htmlFor="lang">
            <select
              id="lang"
              className={inputClass('cursor-pointer')}
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Devise" htmlFor="currency">
            <select
              id="currency"
              className={inputClass('cursor-pointer')}
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              <option value="XAF">FCFA (XAF)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </Field>
          <Field label="Fuseau horaire" htmlFor="tz">
            <select
              id="tz"
              className={inputClass('cursor-pointer')}
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
            >
              <option value="Africa/Douala">Africa/Douala (GMT+1)</option>
              <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
              <option value="Europe/Paris">Europe/Paris (GMT+2)</option>
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" icon={Check} onClick={onSave}>
            Sauvegarder
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Notifications push navigateur"
          subtitle="Affiche des alertes même quand l’onglet n’est pas actif."
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border-light bg-bg p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Bell size={16} />
            </span>
            <div>
              <p className="font-semibold text-fg">Activer les notifications push</p>
              <p className="text-sm text-fg-subtle">
                Tu peux les autoriser ou bloquer depuis les paramètres de ton navigateur.
              </p>
            </div>
          </div>
          <Toggle
            label="Activer les notifications push"
            checked={pushNotifs}
            onChange={onPushChange}
          />
        </div>
      </Card>
    </>
  );
}

// ─── Section: Apparence ───────────────────────────────────────────────────

function AppearanceSection({
  theme,
  density,
  onThemeChange,
  onDensityChange,
  onSave,
}: {
  theme: ThemeKey;
  density: DensityKey;
  onThemeChange: (t: ThemeKey) => void;
  onDensityChange: (d: DensityKey) => void;
  onSave: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Thème"
          subtitle="Choisis un mode qui te convient."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onThemeChange(t.key)}
                aria-pressed={isActive}
                className={[
                  'flex flex-col gap-3 rounded-xl border-2 p-3 text-left transition-colors cursor-pointer',
                  isActive
                    ? 'border-primary bg-primary-softer'
                    : 'border-border bg-surface hover:border-border-strong',
                ].join(' ')}
              >
                {t.preview}
                <div className="flex items-center justify-between">
                  <span
                    className={[
                      'inline-flex items-center gap-2 text-sm font-semibold',
                      isActive ? 'text-primary' : 'text-fg',
                    ].join(' ')}
                  >
                    <Icon size={14} />
                    {t.label}
                  </span>
                  {isActive ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Check size={12} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Densité"
          subtitle="Plus ou moins d’espace dans les listes et les tableaux."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {DENSITIES.map((d) => {
            const isActive = density === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onDensityChange(d.key)}
                aria-pressed={isActive}
                className={[
                  'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors cursor-pointer',
                  isActive
                    ? 'border-primary bg-primary-softer'
                    : 'border-border bg-surface hover:border-border-strong',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isActive ? 'border-primary' : 'border-border-strong',
                  ].join(' ')}
                >
                  {isActive ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span>
                  <span
                    className={[
                      'block text-sm font-semibold',
                      isActive ? 'text-primary' : 'text-fg',
                    ].join(' ')}
                  >
                    {d.label}
                  </span>
                  <span className="mt-1 block text-sm text-fg-subtle">
                    {d.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" icon={Check} onClick={onSave}>
            Sauvegarder
          </Button>
        </div>
      </Card>
    </>
  );
}

// ─── Section: Intégrations ────────────────────────────────────────────────

function IntegrationsSection({
  apiKeys,
  webhooks,
  onRevokeKey,
  onToggleWebhook,
  onAddIntegration,
}: {
  apiKeys: ApiKey[];
  webhooks: WebhookEntry[];
  onRevokeKey: (id: string) => void;
  onToggleWebhook: (id: string) => void;
  onAddIntegration: () => void;
}) {
  return (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between p-6 pb-3">
          <CardHeader
            title="Clés API"
            subtitle="Révoque immédiatement toute clé compromise."
          />
          <Button variant="secondary" icon={Plus} size="sm" onClick={onAddIntegration}>
            Nouvelle clé
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="px-6 py-3 font-semibold">Fournisseur</th>
                <th className="px-3 py-3 font-semibold">Clé</th>
                <th className="px-3 py-3 font-semibold">Dernière utilisation</th>
                <th className="px-6 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {apiKeys.map((k) => {
                const Icon = k.icon;
                return (
                  <tr key={k.id} className="hover:bg-surface-2/60">
                    <td className="px-6 py-3 font-medium text-fg">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Icon size={14} />
                        </span>
                        {k.provider}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg-subtle">
                      <div className="flex items-center gap-2">
                        <span>{k.preview}</span>
                        <button
                          type="button"
                          aria-label="Copier"
                          className="text-fg-faint hover:text-fg-muted cursor-pointer"
                          onClick={() => {
                            // TODO: persist to /api/admin/settings (copy key)
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-fg-muted">
                      {new Date(k.lastUsed).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <IconButton
                        icon={Trash2}
                        label="Révoquer la clé"
                        variant="danger"
                        onClick={() => onRevokeKey(k.id)}
                      />
                    </td>
                  </tr>
                );
              })}
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-fg-subtle">
                    Aucune clé API active.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-6 pb-3">
          <CardHeader
            title="Webhooks"
            subtitle="Envoie des événements Campus 360 vers tes services externes."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="px-6 py-3 font-semibold">URL</th>
                <th className="px-3 py-3 font-semibold">Événements</th>
                <th className="px-3 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {webhooks.map((w) => (
                <tr key={w.id} className="hover:bg-surface-2/60">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-fg">
                      <Webhook size={14} className="text-fg-subtle" />
                      {w.url}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {w.events.map((ev) => (
                        <Pill key={ev} tone="blue">
                          {ev}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={w.active ? 'green' : 'neutral'}>
                      {w.active ? 'Actif' : 'Inactif'}
                    </Pill>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleWebhook(w.id)}
                    >
                      {w.active ? 'Désactiver' : 'Activer'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="font-display text-base font-bold text-fg">
              Ajouter une intégration
            </p>
            <p className="mt-1 text-sm text-fg-subtle">
              Connecte Slack, Notion, Zapier ou n8n en quelques clics.
            </p>
          </div>
          <Button variant="secondary" icon={Plus} onClick={onAddIntegration}>
            Ajouter une intégration
          </Button>
        </div>
      </Card>
    </>
  );
}

// ─── Section: Facturation ─────────────────────────────────────────────────

function BillingSection({
  paymentMethods,
}: {
  paymentMethods: PaymentMethod[];
}) {
  const includedFeatures = [
    'Utilisateurs illimités',
    'Stockage PDF : 50 Go',
    'Analytics avancés et exports',
    'Webhooks et API publique',
    'Support prioritaire',
  ];

  return (
    <>
      <Card>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-bold text-fg">
                Campus 360 Pro
              </p>
              <Pill tone="green">Actuel</Pill>
            </div>
            <p className="mt-2 text-sm text-fg-subtle">
              Pour les équipes qui veulent piloter Campus 360 en marque blanche.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {includedFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-fg-muted">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary-soft bg-primary-softer px-5 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Aujourd’hui
            </p>
            <p className="mt-1 font-display text-xl font-bold text-primary">
              Gratuit (beta)
            </p>
            <p className="mt-1 text-xs text-fg-subtle">5 000 FCFA / mois après beta</p>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-6 pb-3">
          <CardHeader
            title="Moyens de paiement"
            subtitle="Tous les moyens que tu as enregistrés pour Campus 360 Pro."
            action={
              <Button variant="secondary" size="sm" icon={Plus}>
                Ajouter un moyen
              </Button>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Détails</th>
                <th className="px-6 py-3 text-right font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {paymentMethods.map((pm) => (
                <tr key={pm.id} className="hover:bg-surface-2/60">
                  <td className="px-6 py-3 font-medium text-fg">{pm.label}</td>
                  <td className="px-3 py-3 font-mono text-xs text-fg-muted">{pm.detail}</td>
                  <td className="px-6 py-3 text-right">
                    {pm.primary ? (
                      <Pill tone="blue">Principal</Pill>
                    ) : (
                      <Button variant="ghost" size="sm">
                        Définir par défaut
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

// ─── Section: Support ─────────────────────────────────────────────────────

function SupportSection({
  message,
  onMessageChange,
  onSubmit,
}: {
  message: string;
  onMessageChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader
          title="Centre d’aide"
          subtitle="Trouve rapidement la réponse à ta question."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: 'Documentation', icon: BookOpen, hint: 'Guides, API, tutoriels.' },
            { label: 'Statut', icon: Activity, hint: 'Disponibilité des services.' },
            { label: 'Contact', icon: MessageSquare, hint: 'Notre équipe te répond.' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href="#"
                className="group flex flex-col gap-3 rounded-lg border border-border-light bg-bg p-4 transition-colors hover:border-primary hover:bg-primary-softer"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="font-semibold text-fg group-hover:text-primary">{link.label}</p>
                  <p className="mt-1 text-sm text-fg-subtle">{link.hint}</p>
                </div>
              </a>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Contacter le support"
          subtitle="Décris ton problème, on revient vers toi sous 24h ouvrées."
        />
        <Field label="Ton message" htmlFor="support-message">
          <textarea
            id="support-message"
            className={inputClass('h-32 py-2 leading-relaxed')}
            placeholder="Bonjour, j’ai un souci avec…"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
          />
        </Field>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-fg-subtle">
            Les pièces jointes ne sont pas encore prises en charge depuis la page Configuration.
          </p>
          <Button
            variant="primary"
            icon={Send}
            onClick={onSubmit}
            disabled={!message.trim()}
          >
            Envoyer
          </Button>
        </div>
      </Card>
    </>
  );
}
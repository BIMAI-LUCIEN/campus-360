// Remote app configuration edited from the admin dashboard (GET /api/mobile/config):
// maintenance screen, forced update and home announcement. A network failure keeps
// the last known config (or none): the student is never blocked by an outage.
import React from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { mobileApiBaseUrl } from '../auth/betterAuth';
import { fontFamilies, stitchColors } from '../../theme/stitch';

type RemoteConfig = {
  maintenance?: { enabled?: boolean; message?: string };
  minVersion?: { android?: string; ios?: string; recommended?: string; updateUrl?: string };
  announcement?: { enabled?: boolean; title?: string; message?: string; tone?: string; link?: string };
};

const CACHE_KEY = 'campus360.remoteConfig';

const compareVersions = (a: string, b: string) => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
};

const readCache = async (): Promise<RemoteConfig | null> => {
  try {
    if (Platform.OS === 'web') return null;
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RemoteConfig) : null;
  } catch {
    return null;
  }
};

const writeCache = async (config: RemoteConfig) => {
  try {
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(config));
  } catch {
    // Cache is a convenience only.
  }
};

export function RemoteConfigGate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<RemoteConfig | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch(`${mobileApiBaseUrl}/api/mobile/config`);
      if (!response.ok) return;
      const next = (await response.json()) as RemoteConfig;
      setConfig(next);
      void writeCache(next);
    } catch {
      // Offline: keep the last known config.
    }
  }, []);

  React.useEffect(() => {
    void readCache().then((cached) => {
      if (cached) setConfig((current) => current ?? cached);
    });
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const minVersion = Platform.OS === 'ios' ? config?.minVersion?.ios : config?.minVersion?.android;
  const updateUrl = config?.minVersion?.updateUrl || 'https://campus360b.site';

  if (config?.maintenance?.enabled) {
    return (
      <BlockingScreen
        title="Maintenance en cours"
        message={config.maintenance.message || 'Campus 360 revient dans quelques minutes.'}
        actionLabel="Réessayer"
        onAction={() => void refresh()}
      />
    );
  }

  if (Platform.OS !== 'web' && minVersion && compareVersions(appVersion, minVersion) < 0) {
    return (
      <BlockingScreen
        title="Mise à jour nécessaire"
        message={`Ta version (${appVersion}) n'est plus prise en charge. Installe la dernière version de Campus 360 pour continuer.`}
        actionLabel="Mettre à jour"
        onAction={() => void Linking.openURL(updateUrl)}
      />
    );
  }

  const announcement = config?.announcement;
  const announcementKey = announcement ? `${announcement.title}|${announcement.message}` : '';
  const showAnnouncement =
    Boolean(announcement?.enabled && (announcement.title || announcement.message)) &&
    dismissedAnnouncement !== announcementKey;

  return (
    <View style={styles.flex}>
      {children}
      {showAnnouncement && announcement ? (
        <View style={styles.bannerWrap} pointerEvents="box-none">
          <View style={[styles.banner, announcement.tone === 'warning' && styles.bannerWarning]}>
            <Pressable
              style={styles.flex}
              disabled={!announcement.link}
              onPress={() => announcement.link && void Linking.openURL(announcement.link)}
            >
              {announcement.title ? <Text style={styles.bannerTitle}>{announcement.title}</Text> : null}
              {announcement.message ? <Text style={styles.bannerText}>{announcement.message}</Text> : null}
            </Pressable>
            <Pressable
              accessibilityLabel="Fermer l'annonce"
              hitSlop={12}
              onPress={() => setDismissedAnnouncement(announcementKey)}
            >
              <Text style={styles.bannerClose}>✕</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function BlockingScreen(props: { title: string; message: string; actionLabel: string; onAction: () => void }) {
  return (
    <View style={styles.blocking}>
      <Text style={styles.blockingBrand}>Campus 360</Text>
      <Text style={styles.blockingTitle}>{props.title}</Text>
      <Text style={styles.blockingMessage}>{props.message}</Text>
      <Pressable style={styles.blockingButton} onPress={props.onAction}>
        <Text style={styles.blockingButtonText}>{props.actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bannerWrap: { position: 'absolute', left: 12, right: 12, bottom: 96 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: stitchColors.ink,
  },
  bannerWarning: { backgroundColor: stitchColors.siennaDeep },
  bannerTitle: { color: stitchColors.paper, fontFamily: fontFamilies.displaySemi, fontSize: 14, marginBottom: 2 },
  bannerText: { color: stitchColors.paperSoft, fontFamily: fontFamilies.inter, fontSize: 13, lineHeight: 18 },
  bannerClose: { color: stitchColors.paperSoft, fontSize: 14 },
  blocking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: stitchColors.paper,
  },
  blockingBrand: { color: stitchColors.sienna, fontFamily: fontFamilies.displaySemi, fontSize: 14, marginBottom: 16 },
  blockingTitle: { color: stitchColors.ink, fontFamily: fontFamilies.display, fontSize: 24, textAlign: 'center', marginBottom: 12 },
  blockingMessage: {
    color: stitchColors.inkMuted,
    fontFamily: fontFamilies.inter,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  blockingButton: { backgroundColor: stitchColors.sienna, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  blockingButtonText: { color: stitchColors.paper, fontFamily: fontFamilies.interSemi, fontSize: 15 },
});

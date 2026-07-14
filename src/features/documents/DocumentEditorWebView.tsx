import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { authBaseUrl, authClient } from '../auth/betterAuth';
import { publicEnv } from '../../config/env';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK     = '#0F172A';
const PAPER   = '#F6F1E7';
const SIENNA  = '#B7410E';
const EMERALD = '#047857';
const MUTED   = '#475569';
const SOFT    = '#94A3B8';

type DocumentEditorWebViewProps = {
  documentId: string;
  onClose: () => void;
};

export function DocumentEditorWebView({ documentId, onClose }: DocumentEditorWebViewProps) {
  const [connectionError, setConnectionError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  // Get the current session cookie
  const cookie = Platform.OS !== 'web' && typeof (authClient as any).getCookie === 'function'
    ? (authClient as any).getCookie()
    : '';
  const token = cookie?.split('better-auth.session_token=')[1]?.split(';')[0] || '';

  // Construct the URL
  const editorUrl = `${publicEnv.adminUrl}/documents/${documentId}?mode=mobile${token ? `&token=${token}` : ''}`;

  console.log(`[WebView Editor] Loading URL: ${editorUrl}`);

  const handleRetry = () => {
    setConnectionError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const WebViewComponent = WebView as any;

  // ─── Markup ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Manuscript header ─────────────────────────────────────────────── */}
      <View style={styles.manuscriptHeader}>
        {/* Close / Quitter */}
        <Pressable onPress={onClose} style={styles.closePill}>
          <Text style={styles.closePillText}>Fermer</Text>
        </Pressable>

        {/* Document title — placeholder, serif italic like a manuscript */}
        <Text style={styles.docTitle} numberOfLines={1}>
          Sans titre
        </Text>

        {/* Status badge — monospace sienna, editorial */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>EN COURS D'ÉCRITURE</Text>
        </View>
      </View>

      {/* ── Folio / breadcrumb strip ─────────────────────────────────────── */}
      <View style={styles.folioStrip}>
        <Text style={styles.folioLabel}>
          Document
          <Text style={styles.folioSep}> / </Text>
          <Text style={styles.folioSection}>Rédiger</Text>
        </Text>

        {/* Reload — minimal ink pill on the right */}
        <Pressable onPress={handleRetry} style={styles.reloadPill} disabled={isLoading}>
          <Text style={styles.reloadPillText}>Recharger</Text>
        </Pressable>
      </View>

      {/* ── WebView or error ─────────────────────────────────────────────── */}
      <View style={styles.webViewContainer}>
        {connectionError ? (
          <View style={styles.errorContainer}>

            {/* Editorial rule mark */}
            <View style={styles.errorRule} />
            <Text style={styles.errorEyebrow}>CONNEXION INTERROMPUE</Text>
            <View style={styles.errorRule} />

            <Text style={styles.errorTitle}>L'éditeur n'est pas accessible</Text>
            <Text style={styles.errorDesc}>
              L'éditeur de rapport nécessite une connexion active pour charger l'interface
              et enregistrer vos modifications en temps réel.
            </Text>
            <Text style={styles.errorHint}>
              Vérifiez que le serveur est démarré ou que vous êtes connecté au même réseau wifi.
            </Text>

            <View style={styles.errorActions}>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </Pressable>
              <Pressable style={styles.exitButton} onPress={onClose}>
                <Text style={styles.exitButtonText}>Retour au tableau de bord</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, position: 'relative' }}>

            {/* Web loading bar — thin editorial line at top */}
            {isLoading && (
              <View style={styles.loadingBar} />
            )}

            {Platform.OS === 'web' ? (
              <iframe
                src={editorUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#090D16',
                }}
                onLoad={() => setIsLoading(false)}
                title="Édition de rapport"
              />
            ) : (
              <WebViewComponent
                ref={webViewRef}
                source={{
                  uri: editorUrl,
                  headers: cookie ? { 'Cookie': cookie } : undefined,
                }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                startInLoadingState={false}
                onLoadStart={() => {
                  setIsLoading(true);
                  setConnectionError(false);
                }}
                onLoadEnd={() => setIsLoading(false)}
                onError={(syntheticEvent: any) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('[WebView Editor] Error loading editor page:', nativeEvent);
                  setConnectionError(true);
                  setIsLoading(false);
                }}
                onHttpError={(syntheticEvent: any) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('[WebView Editor] HTTP Error loading editor page:', nativeEvent.statusCode);
                  if (nativeEvent.statusCode >= 400) {
                    setConnectionError(true);
                  }
                  setIsLoading(false);
                }}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16', // deep writing-surface dark
  },

  // ── Manuscript header ──────────────────────────────────────────────────────
  manuscriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAPER,
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  closePill: {
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  closePillText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: INK,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  docTitle: {
    flex: 1,
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
    color: INK,
    textAlign: 'left',
  },

  statusBadge: {
    borderWidth: 1,
    borderColor: SIENNA,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    color: SIENNA,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // ── Folio strip ──────────────────────────────────────────────────────────
  folioStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: INK,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  folioLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  folioSep: {
    color: SOFT,
  },
  folioSection: {
    color: SOFT,
  },

  reloadPill: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  reloadPillText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '600',
    color: SOFT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── WebView ───────────────────────────────────────────────────────────────
  webViewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#090D16',
  },

  // ── Loading bar ───────────────────────────────────────────────────────────
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: EMERALD,
    zIndex: 10,
  },

  // ── Error state ───────────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    gap: 0,
  },

  errorRule: {
    width: 32,
    height: 1,
    backgroundColor: MUTED,
    marginVertical: 10,
  },
  errorEyebrow: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: SIENNA,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginVertical: 6,
  },
  errorTitle: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '900',
    color: PAPER,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  errorDesc: {
    color: SOFT,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorHint: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },

  errorActions: {
    width: '100%',
    marginTop: 32,
    gap: 10,
  },
  retryButton: {
    backgroundColor: EMERALD,
    borderRadius: 3,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: PAPER,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  exitButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 3,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    color: SOFT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

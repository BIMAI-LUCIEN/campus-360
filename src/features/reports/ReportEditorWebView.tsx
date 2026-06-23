import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { authBaseUrl, authClient } from '../auth/betterAuth';

type ReportEditorWebViewProps = {
  reportId: string;
  onClose: () => void;
};

export function ReportEditorWebView({ reportId, onClose }: ReportEditorWebViewProps) {
  const [connectionError, setConnectionError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  // Get the current session cookie
  const cookie = (authClient as any).getCookie?.() || '';
  
  // Construct the URL
  const editorUrl = `${authBaseUrl}/reports/${reportId}?mode=mobile`;
  
  console.log(`[WebView Editor] Loading URL: ${editorUrl}`);

  const handleRetry = () => {
    setConnectionError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const WebViewComponent = WebView as any;

  return (
    <SafeAreaView style={styles.container}>
      {/* Mini Native Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕ Quitter</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Édition de rapport</Text>
        <Pressable onPress={handleRetry} style={styles.reloadHeaderButton} disabled={isLoading}>
          <Text style={styles.reloadHeaderText}>🔄</Text>
        </Pressable>
      </View>

      {/* WebView or Connection Error screen */}
      <View style={styles.webViewContainer}>
        {connectionError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📡</Text>
            <Text style={styles.errorTitle}>Connexion impossible</Text>
            <Text style={styles.errorDesc}>
              L'éditeur de rapport nécessite une connexion active pour charger l'interface et enregistrer vos modifications en temps réel.
            </Text>
            <Text style={styles.errorSubDesc}>
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
            startInLoadingState={true}
            onLoadStart={() => {
              setIsLoading(true);
              setConnectionError(false);
            }}
            onLoadEnd={() => setIsLoading(false)}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.loadingText}>Chargement de l'éditeur guidé...</Text>
              </View>
            )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B', // Slate 800
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  backButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  reloadHeaderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadHeaderText: {
    fontSize: 14,
  },
  webViewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorSubDesc: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorActions: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  retryButton: {
    backgroundColor: '#10B981', // Emerald 500
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exitButton: {
    backgroundColor: 'transparent',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});

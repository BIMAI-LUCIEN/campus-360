// Minimal PDF reader modal for documents the student already owns.
// Used by the Library tab, which only needs to open a PDF — not the full
// catalogue/search/AI-assistant surface that PdfStudentSection carries.
import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { authWebBaseUrl } from '../auth/betterAuth';
import { createSignedPdfUrl } from './pdfApi';
import type { CampusDocument } from '../../types';
import { stitchColors } from '../../theme/stitch';

interface SimplePdfReaderModalProps {
  document: CampusDocument | null;
  accessToken?: string;
  onClose: () => void;
}

export function SimplePdfReaderModal({ document, accessToken, onClose }: SimplePdfReaderModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!document) {
      setUrl('');
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setUrl('');
    createSignedPdfUrl('documents', document.filePath, accessToken, 1800)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'PDF indisponible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document, accessToken]);

  return (
    <Modal animationType="slide" visible={Boolean(document)} onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{document?.title ?? ''}</Text>
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={stitchColors.sienna} size="large" />
              <Text style={styles.bodyText}>Ouverture du PDF...</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorTitle}>PDF indisponible</Text>
              <Text style={styles.bodyText}>{error}</Text>
            </View>
          ) : url ? (
            Platform.OS === 'web' ? (
              createElement('iframe', {
                src: `${authWebBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(url)}`,
                title: document?.title ?? 'PDF',
                style: { width: '100%', height: '100%', border: '0', backgroundColor: stitchColors.paper },
              })
            ) : (
              <WebView
                source={{ uri: `${authWebBaseUrl}/pdf-viewer.html?url=${encodeURIComponent(url)}` }}
                style={styles.webview}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.centered}>
                    <ActivityIndicator color={stitchColors.sienna} size="large" />
                  </View>
                )}
                javaScriptEnabled
                domStorageEnabled
                scalesPageToFit
              />
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: stitchColors.paper },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: stitchColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.inkFaint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stitchColors.inkFaint,
    backgroundColor: stitchColors.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: stitchColors.ink,
  },
  body: { flex: 1 },
  webview: { flex: 1, backgroundColor: stitchColors.paper },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: stitchColors.ink },
  bodyText: { fontSize: 13, color: stitchColors.inkMuted, textAlign: 'center' },
});

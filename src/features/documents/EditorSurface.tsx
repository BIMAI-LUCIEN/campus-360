import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { stitchColors } from '../../theme/stitch';

// Hosts an HTML page (editor, preview, style sample): a WebView on the phone,
// an iframe on the web. `injectJavaScript` runs code inside the page.

export type EditorSurfaceHandle = {
  injectJavaScript: (script: string) => void;
};

type EditorSurfaceProps = {
  html: string;
  onMessage: (event: any) => void;
};

export const EditorSurface = React.forwardRef<EditorSurfaceHandle, EditorSurfaceProps>(
  ({ html, onMessage }, forwardedRef) => {
    const nativeRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow || !event.data) return;
        const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        onMessage({ nativeEvent: { data } });
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onMessage]);

    React.useImperativeHandle(forwardedRef, () => ({
      injectJavaScript(script: string) {
        if (Platform.OS === 'web') {
          (iframeRef.current?.contentWindow as any)?.eval(script);
          return;
        }
        nativeRef.current?.injectJavaScript(script);
      },
    }), []);

    if (Platform.OS === 'web') {
      return React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'Éditeur WYSIWYG Campus 360',
        style: {
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: stitchColors.background,
        },
      });
    }

    return (
      <WebView
        ref={nativeRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        textZoom={100}
        keyboardDisplayRequiresUserAction={false}
      />
    );
  }
);

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: stitchColors.background,
  },
});

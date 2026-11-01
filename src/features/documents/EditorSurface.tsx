import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { stitchColors } from '../../theme/stitch';

// Hosts an HTML page (editor, preview, style sample): a WebView on the phone,
// an iframe on the web. `injectJavaScript` runs code inside the page.
//
// On the web the iframe is sandboxed (scripts only, no same-origin): a script that
// slipped into a document cannot read the app's session. The page receives the
// injected code by postMessage through the bridge added below.
const WEB_BRIDGE =
  '<script>window.addEventListener("message",function(e){if(e.source===window.parent&&e.data&&typeof e.data.__c360Inject==="string"){(0,eval)(e.data.__c360Inject);}});</script>';

const withWebBridge = (html: string) =>
  /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => head + WEB_BRIDGE) : WEB_BRIDGE + html;

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
          iframeRef.current?.contentWindow?.postMessage({ __c360Inject: script }, '*');
          return;
        }
        nativeRef.current?.injectJavaScript(script);
      },
    }), []);

    if (Platform.OS === 'web') {
      return React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: withWebBridge(html),
        sandbox: 'allow-scripts allow-modals allow-popups allow-downloads',
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

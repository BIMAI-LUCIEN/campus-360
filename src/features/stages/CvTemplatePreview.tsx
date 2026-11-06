import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { OfficialCvData } from '../../types';
import { generateOfficialCvHtml, type CvStyle, type CvTemplateId } from './cvHtml';
import { stitchColors } from '../../theme/stitch';

interface CvTemplatePreviewProps {
  cv: OfficialCvData;
  template: CvTemplateId;
  /** Accent colour, font and spacing chosen by the student. */
  style?: CvStyle | null;
}

// Width of an A4 page in CSS pixels.
const A4_WIDTH_PX = 794;

// The printed HTML, shrunk to the width of the screen: the page keeps its A4
// layout (zoom) and the templates printed with page margins get them back.
const PRINT_PADDING: Partial<Record<CvTemplateId, string>> = { classic: '15mm 20mm', ats: '14mm 17mm' };
const fitToWidth = (html: string, width: number, template: CvTemplateId): string => {
  const zoom = Math.max(0.2, Math.min(1, width / A4_WIDTH_PX)).toFixed(4);
  const style = `<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html { zoom: ${zoom}; } body { width: 210mm; ${PRINT_PADDING[template] ? `padding: ${PRINT_PADDING[template]};` : ''} }</style>`;
  return html.replace('</head>', `${style}</head>`);
};

// Preview of the exact HTML that is exported to PDF, so what the student sees is what gets printed.
export function CvTemplatePreview({ cv, template, style }: CvTemplatePreviewProps) {
  const [width, setWidth] = useState(0);
  const html = width ? fitToWidth(generateOfficialCvHtml(cv, template, style), width, template) : '';
  return (
    <View
      style={{ flex: 1, backgroundColor: stitchColors.white }}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {!html ? null : Platform.OS === 'web'
        ? React.createElement('iframe', {
            srcDoc: html,
            sandbox: '',
            title: 'Aperçu du CV',
            style: { width: '100%', height: '100%', border: 0, backgroundColor: stitchColors.white },
          })
        : <WebView originWhitelist={['*']} javaScriptEnabled={false} source={{ html }} style={{ flex: 1, backgroundColor: stitchColors.white }} />}
    </View>
  );
}

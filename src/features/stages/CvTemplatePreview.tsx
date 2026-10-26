import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { OfficialCvData } from '../../types';
import { generateOfficialCvHtml, type CvTemplateId } from './cvHtml';
import { stitchColors } from '../../theme/stitch';

interface CvTemplatePreviewProps {
  cv: OfficialCvData;
  template: CvTemplateId;
}

// Width of an A4 page in CSS pixels.
const A4_WIDTH_PX = 794;

// The printed HTML, shrunk to the width of the screen: the page keeps its A4
// layout (zoom) and the classic template gets its print margins back.
const fitToWidth = (html: string, width: number, template: CvTemplateId): string => {
  const zoom = Math.max(0.2, Math.min(1, width / A4_WIDTH_PX)).toFixed(4);
  const style = `<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html { zoom: ${zoom}; } body { width: 210mm; ${template === 'classic' ? 'padding: 15mm 20mm;' : ''} }</style>`;
  return html.replace('</head>', `${style}</head>`);
};

// Preview of the exact HTML that is exported to PDF, so what the student sees is what gets printed.
export function CvTemplatePreview({ cv, template }: CvTemplatePreviewProps) {
  const [width, setWidth] = useState(0);
  const html = width ? fitToWidth(generateOfficialCvHtml(cv, template), width, template) : '';
  return (
    <View
      style={{ flex: 1, backgroundColor: stitchColors.white }}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
    >
      {!html ? null : Platform.OS === 'web'
        ? React.createElement('iframe', {
            srcDoc: html,
            title: 'Aperçu du CV',
            style: { width: '100%', height: '100%', border: 0, backgroundColor: stitchColors.white },
          })
        : <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1, backgroundColor: stitchColors.white }} />}
    </View>
  );
}

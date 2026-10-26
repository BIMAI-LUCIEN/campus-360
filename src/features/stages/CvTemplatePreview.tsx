import React from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { OfficialCvData } from '../../types';
import { generateOfficialCvHtml, type CvTemplateId } from './cvHtml';
import { stitchColors } from '../../theme/stitch';

interface CvTemplatePreviewProps {
  cv: OfficialCvData;
  template: CvTemplateId;
}

// Preview of the exact HTML that is exported to PDF, so what the student sees is what gets printed.
export function CvTemplatePreview({ cv, template }: CvTemplatePreviewProps) {
  const html = generateOfficialCvHtml(cv, template);
  return (
    <View style={{ flex: 1, backgroundColor: stitchColors.white }}>
      {Platform.OS === 'web'
        ? React.createElement('iframe', {
            srcDoc: html,
            title: 'Aperçu du CV',
            style: { width: '100%', height: '100%', border: 0, backgroundColor: stitchColors.white },
          })
        : <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1, backgroundColor: stitchColors.white }} />}
    </View>
  );
}

import React from 'react';
import { StyleSheet, Text, View, TextStyle, ViewStyle, Platform } from 'react-native';

export type FormattedMarkdownProps = {
  content: string;
  baseTextColor?: string;
  isDark?: boolean;
  style?: ViewStyle;
};

type InlineToken = {
  type: 'text' | 'bold' | 'italic' | 'boldItalic' | 'code';
  content: string;
};

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  // Regex patterns for inline formatting
  // 1. `code`
  // 2. ***bold italic***
  // 3. **bold** or __bold__
  // 4. *italic* or _italic_
  const pattern = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      if (remaining) {
        tokens.push({ type: 'text', content: remaining });
      }
      break;
    }

    const index = match.index;
    if (index > 0) {
      tokens.push({ type: 'text', content: remaining.slice(0, index) });
    }

    const raw = match[0];
    if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', content: raw.slice(1, -1) });
    } else if (raw.startsWith('***') && raw.endsWith('***')) {
      tokens.push({ type: 'boldItalic', content: raw.slice(3, -3) });
    } else if ((raw.startsWith('**') && raw.endsWith('**')) || (raw.startsWith('__') && raw.endsWith('__'))) {
      tokens.push({ type: 'bold', content: raw.slice(2, -2) });
    } else if ((raw.startsWith('*') && raw.endsWith('*')) || (raw.startsWith('_') && raw.endsWith('_'))) {
      tokens.push({ type: 'italic', content: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', content: raw });
    }

    remaining = remaining.slice(index + raw.length);
  }

  return tokens;
}

export function FormattedMarkdown({
  content,
  baseTextColor = '#F7F7F8',
  isDark = true,
  style,
}: FormattedMarkdownProps) {
  if (!content) return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const textColor = baseTextColor;
  const boldColor = isDark ? '#FFFFFF' : '#0F172A';
  const primaryAccent = isDark ? '#38BDF8' : '#0284C7';
  const headingColor = isDark ? '#FFFFFF' : '#0F172A';
  const codeBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)';
  const codeBorder = isDark ? '#334155' : '#E2E8F0';
  const quoteBorder = isDark ? '#38BDF8' : '#0284C7';
  const quoteBg = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)';

  const renderInline = (text: string, inlineStyle?: TextStyle) => {
    const tokens = parseInlineTokens(text);
    return tokens.map((token, idx) => {
      if (token.type === 'bold') {
        return (
          <Text
            key={idx}
            style={[
              {
                fontWeight: '700',
                color: inlineStyle?.color || boldColor,
              },
              inlineStyle,
              { fontWeight: '700' },
            ]}
          >
            {token.content}
          </Text>
        );
      }
      if (token.type === 'italic') {
        return (
          <Text
            key={idx}
            style={[
              {
                fontStyle: 'italic',
                color: inlineStyle?.color || textColor,
              },
              inlineStyle,
              { fontStyle: 'italic' },
            ]}
          >
            {token.content}
          </Text>
        );
      }
      if (token.type === 'boldItalic') {
        return (
          <Text
            key={idx}
            style={[
              {
                fontWeight: '700',
                fontStyle: 'italic',
                color: inlineStyle?.color || boldColor,
              },
              inlineStyle,
              { fontWeight: '700', fontStyle: 'italic' },
            ]}
          >
            {token.content}
          </Text>
        );
      }
      if (token.type === 'code') {
        return (
          <Text
            key={idx}
            style={[
              {
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                fontSize: 12,
                backgroundColor: codeBg,
                color: isDark ? '#F472B6' : '#BE185D',
                paddingHorizontal: 5,
                paddingVertical: 1.5,
                borderRadius: 4,
              },
              inlineStyle,
            ]}
          >
            {token.content}
          </Text>
        );
      }
      return (
        <Text key={idx} style={[{ color: textColor }, inlineStyle]}>
          {token.content}
        </Text>
      );
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code block toggles (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <View
            key={`code-block-${i}`}
            style={{
              backgroundColor: codeBg,
              borderColor: codeBorder,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
              marginVertical: 6,
            }}
          >
            {codeBlockLang ? (
              <Text style={{ fontSize: 10, fontWeight: '700', color: primaryAccent, marginBottom: 4, textTransform: 'uppercase' }}>
                {codeBlockLang}
              </Text>
            ) : null}
            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: headingColor, lineHeight: 18 }}>
              {codeBlockContent.join('\n')}
            </Text>
          </View>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // 2. Empty line
    if (!trimmed) {
      elements.push(<View key={`empty-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // 3. Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <View
          key={`hr-${i}`}
          style={{
            height: 1,
            backgroundColor: codeBorder,
            marginVertical: 10,
            width: '100%',
          }}
        />
      );
      continue;
    }

    // 4. Headings (# H1, ## H2, ### H3, #### H4)
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <View key={`h1-${i}`} style={{ marginTop: 10, marginBottom: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: primaryAccent, lineHeight: 23, letterSpacing: -0.2 }}>
            {renderInline(h1Match[1], { fontSize: 17, fontWeight: '800', color: primaryAccent })}
          </Text>
        </View>
      );
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <View key={`h2-${i}`} style={{ marginTop: 8, marginBottom: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: primaryAccent, lineHeight: 21, letterSpacing: -0.1 }}>
            {renderInline(h2Match[1], { fontSize: 15, fontWeight: '700', color: primaryAccent })}
          </Text>
        </View>
      );
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <View key={`h3-${i}`} style={{ marginTop: 6, marginBottom: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FBBF24' : '#B45309', lineHeight: 20 }}>
            {renderInline(h3Match[1], { fontSize: 14, fontWeight: '700', color: isDark ? '#FBBF24' : '#B45309' })}
          </Text>
        </View>
      );
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      elements.push(
        <View key={`h4-${i}`} style={{ marginTop: 4, marginBottom: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: headingColor, lineHeight: 18 }}>
            {renderInline(h4Match[1], { fontSize: 13, fontWeight: '700', color: headingColor })}
          </Text>
        </View>
      );
      continue;
    }

    // 5. Blockquote (> quote)
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      elements.push(
        <View
          key={`quote-${i}`}
          style={{
            flexDirection: 'row',
            borderLeftWidth: 3,
            borderLeftColor: quoteBorder,
            backgroundColor: quoteBg,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 4,
            marginVertical: 4,
          }}
        >
          <Text style={{ fontSize: 13, lineHeight: 19, color: textColor, fontStyle: 'italic' }}>
            {renderInline(quoteMatch[1], { fontSize: 13, fontStyle: 'italic', color: textColor })}
          </Text>
        </View>
      );
      continue;
    }

    // 6. Ordered list (1. item, 2. item)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      const num = orderedMatch[1];
      const text = orderedMatch[2];
      elements.push(
        <View key={`ol-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2.5, paddingLeft: 4 }}>
          <View
            style={{
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.1)',
              borderRadius: 10,
              paddingHorizontal: 5,
              paddingVertical: 1,
              marginRight: 8,
              marginTop: 2,
              minWidth: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: primaryAccent }}>
              {num}
            </Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: textColor }}>
            {renderInline(text, { fontSize: 13.5, lineHeight: 20, color: textColor })}
          </Text>
        </View>
      );
      continue;
    }

    // 7. Unordered list (- item, * item, + item)
    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      const text = unorderedMatch[1];
      elements.push(
        <View key={`ul-${i}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2.5, paddingLeft: 4 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: primaryAccent,
              marginRight: 8,
              marginTop: 7,
            }}
          />
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: textColor }}>
            {renderInline(text, { fontSize: 13.5, lineHeight: 20, color: textColor })}
          </Text>
        </View>
      );
      continue;
    }

    // 8. Standard paragraph
    elements.push(
      <Text key={`p-${i}`} style={{ fontSize: 14, lineHeight: 21, color: textColor, marginVertical: 1.5 }}>
        {renderInline(trimmed, { fontSize: 14, lineHeight: 21, color: textColor })}
      </Text>
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <View
        key="code-block-unclosed"
        style={{
          backgroundColor: codeBg,
          borderColor: codeBorder,
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginVertical: 6,
        }}
      >
        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: headingColor, lineHeight: 18 }}>
          {codeBlockContent.join('\n')}
        </Text>
      </View>
    );
  }

  return <View style={style}>{elements}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

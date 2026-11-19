import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageLoadEventData,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Maximize2 } from 'lucide-react-native';
import { stitchColors } from '../theme/stitch';
import type { StageJob } from '../types';

const DEFAULT_RATIO_MIN = 0.45;
const DEFAULT_RATIO_MAX = 2.5;
const MAX_RATIO_CACHE = 300;
const ratioCache = new Map<string, number>();

export function hasCustomFlyer(
  job: Pick<StageJob, 'flyerUrl'> | null | undefined,
): boolean {
  const url = job?.flyerUrl?.trim();
  return Boolean(url && !url.includes('placeholder'));
}

export function computeAdaptiveImageHeight(
  containerWidth: number,
  naturalRatio: number,
  opts?: { minAspectRatio?: number; maxAspectRatio?: number; maxHeight?: number },
): number {
  const safeWidth =
    Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 360;
  const safeRatio =
    Number.isFinite(naturalRatio) && naturalRatio > 0 ? naturalRatio : 1;
  const minAspectRatio = opts?.minAspectRatio ?? DEFAULT_RATIO_MIN;
  const maxAspectRatio = opts?.maxAspectRatio ?? DEFAULT_RATIO_MAX;
  const clampedRatio = Math.min(
    maxAspectRatio,
    Math.max(minAspectRatio, safeRatio),
  );
  const rawHeight = Math.round(safeWidth / clampedRatio);
  if (opts?.maxHeight && opts.maxHeight > 0) {
    return Math.min(rawHeight, opts.maxHeight);
  }
  return rawHeight;
}

function cacheRatio(url: string, width: number, height: number): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  const ratio = width / height;
  if (ratioCache.size >= MAX_RATIO_CACHE) {
    ratioCache.clear();
  }
  ratioCache.set(url, ratio);
  return ratio;
}

export interface AdaptiveOfferImageProps {
  uri: string;
  fallbackUri?: string;
  width: number;
  defaultAspectRatio?: number;
  minAspectRatio?: number;
  maxAspectRatio?: number;
  maxHeight?: number;
  fallbackHeight?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  showZoomHint?: boolean;
  testID?: string;
}

export const AdaptiveOfferImage = React.memo(function AdaptiveOfferImage({
  uri,
  fallbackUri,
  width,
  defaultAspectRatio = 0.85,
  minAspectRatio = DEFAULT_RATIO_MIN,
  maxAspectRatio = DEFAULT_RATIO_MAX,
  maxHeight,
  fallbackHeight = 180,
  accessibilityLabel,
  style,
  onPress,
  showZoomHint = false,
  testID,
}: AdaptiveOfferImageProps) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [ratio, setRatio] = useState<number | null>(() => ratioCache.get(uri) ?? null);
  const [loaded, setLoaded] = useState(() => ratioCache.has(uri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const cached = ratioCache.get(uri);
    if (cached) {
      setRatio(cached);
      setLoaded(true);
      return;
    }
    setRatio(null);
    setLoaded(false);

    let cancelled = false;
    try {
      Image.getSize(
        uri,
        (w, h) => {
          if (cancelled) return;
          const next = cacheRatio(uri, w, h);
          if (next !== null) setRatio(next);
          setLoaded(true);
        },
        () => {
          // On certains appareils ou réseaux, onLoad fournit aussi la taille naturelle.
        },
      );
    } catch {
      // Ignoré : onLoad gérera la mesure si disponible.
    }

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = Math.round(e.nativeEvent.layout.width);
    if (measured > 0) {
      setLayoutWidth((prev) => (prev === measured ? prev : measured));
    }
  }, []);

  const handleLoad = useCallback(
    (e: NativeSyntheticEvent<ImageLoadEventData>) => {
      const src = e?.nativeEvent?.source;
      if (src && src.width > 0 && src.height > 0) {
        const next = cacheRatio(uri, src.width, src.height);
        if (next !== null) setRatio(next);
      }
      setLoaded(true);
    },
    [uri],
  );

  const handleError = useCallback(() => {
    if (fallbackUri) {
      setFailed(true);
    }
    setLoaded(true);
  }, [fallbackUri]);

  if (failed && fallbackUri) {
    return (
      <View
        testID={testID}
        style={[styles.frame, { height: fallbackHeight }, style]}
        onLayout={handleLayout}
      >
        <Image
          source={{ uri: fallbackUri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  const effectiveWidth = layoutWidth > 0 ? layoutWidth : Math.max(120, width);
  const adaptiveHeight = computeAdaptiveImageHeight(
    effectiveWidth,
    ratio ?? defaultAspectRatio,
    { minAspectRatio, maxAspectRatio, maxHeight },
  );

  const body = (
    <View
      style={[styles.frame, { height: adaptiveHeight }, style]}
      onLayout={handleLayout}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
      />

      {!loaded && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={stitchColors.sienna} />
        </View>
      )}

      {showZoomHint && onPress && (
        <View style={styles.zoomHintBadge} pointerEvents="none">
          <Maximize2 size={12} color={stitchColors.white} />
          <Text style={styles.zoomHintText}>Agrandir</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel ?? "Voir l'affiche en plein écran"}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View testID={testID}>
      {body}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: stitchColors.paperSoft,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomHintBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  zoomHintText: {
    color: stitchColors.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
});

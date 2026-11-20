import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'src', 'ui', 'AdaptiveOfferImage.tsx');

function loadAdaptiveOfferModule() {
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE_PATH,
  });

  const mod = { exports: {} };
  const Fragment = Symbol('Fragment');
  const createElement = (type, props, ...children) => ({
    type,
    props: props || {},
    children: children.flat().filter((c) => c !== null && c !== undefined && c !== false),
  });
  const fakeReact = {
    Fragment,
    createElement,
    memo: (c) => c,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn) => fn,
  };
  fakeReact.default = fakeReact;

  const FakeImage = Object.assign(function Image() {}, { getSize: () => {} });
  const fakeRn = {
    ActivityIndicator: 'ActivityIndicator',
    Image: FakeImage,
    Pressable: 'Pressable',
    StyleSheet: {
      create: (s) => s,
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    Text: 'Text',
    View: 'View',
  };
  const realRequire = createRequire(import.meta.url);
  const customRequire = (id) => {
    if (id === 'react') return fakeReact;
    if (id === 'react-native') return fakeRn;
    if (id === 'lucide-react-native') return { Maximize2: 'Maximize2' };
    if (id.includes('theme/stitch')) {
      return { stitchColors: { paperSoft: '#F1F5F9', sienna: '#7C3AED', white: '#FFFFFF' } };
    }
    return realRequire(id);
  };

  const fn = new Function('require', 'module', 'exports', transpiled.outputText);
  fn(customRequire, mod, mod.exports);
  return { ...mod.exports, Fragment, FakeImage };
}

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return style;
}

const { hasCustomFlyer, computeAdaptiveImageHeight, AdaptiveOfferImage, Fragment, FakeImage } = loadAdaptiveOfferModule();

test('hasCustomFlyer : détecte uniquement les vraies affiches non placeholder', () => {
  assert.equal(hasCustomFlyer(null), false);
  assert.equal(hasCustomFlyer(undefined), false);
  assert.equal(hasCustomFlyer({}), false);
  assert.equal(hasCustomFlyer({ flyerUrl: '' }), false);
  assert.equal(hasCustomFlyer({ flyerUrl: '   ' }), false);
  assert.equal(hasCustomFlyer({ flyerUrl: 'https://example.com/placeholder-image.png' }), false);

  assert.equal(hasCustomFlyer({ flyerUrl: 'https://media.licdn.com/dms/image/v2/D4D22AQ/flyer.jpg' }), true);
  assert.equal(hasCustomFlyer({ flyerUrl: 'https://scontent-iad6-1.xx.fbcdn.net/v/t39.3/offer.jpg' }), true);
  assert.equal(hasCustomFlyer({ flyerUrl: 'https://res.cloudinary.com/demo/image/upload/v1/flyer.png' }), true);
});

test('computeAdaptiveImageHeight : respecte les proportions courantes (4:5, 1:1, 16:9, 9:16)', () => {
  assert.equal(computeAdaptiveImageHeight(390, 1080 / 1350), 488);
  assert.equal(computeAdaptiveImageHeight(390, 1), 390);
  assert.equal(computeAdaptiveImageHeight(390, 16 / 9), 219);
  assert.equal(computeAdaptiveImageHeight(390, 1080 / 1920, { maxHeight: 717 }), 693);
  assert.equal(computeAdaptiveImageHeight(390, 1080 / 1920, { maxHeight: 480 }), 480);
});

test('computeAdaptiveImageHeight : borne les ratios extrêmes et protège des entrées invalides', () => {
  assert.equal(computeAdaptiveImageHeight(390, 0.25, { minAspectRatio: 0.45 }), 867);
  assert.equal(computeAdaptiveImageHeight(390, 5, { maxAspectRatio: 2.5 }), 156);

  for (const w of [0, -10, Number.NaN]) {
    for (const r of [0, -2, Number.NaN]) {
      const h = computeAdaptiveImageHeight(w, r);
      assert.equal(Number.isFinite(h), true);
      assert.ok(h > 0);
    }
  }
});

test('AdaptiveOfferImage : racine Pressable/View porte directement width 100% et height > 0 sans wrapper intermédiaire', () => {
  for (const withPress of [true, false]) {
    const tree = AdaptiveOfferImage({
      uri: 'https://media.licdn.com/dms/image/v2/D4E22AQHWAty32-Ocow/feedshar.jpg',
      fallbackUri: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
      width: 390,
      style: { maxWidth: 680, alignSelf: 'center' },
      showZoomHint: withPress,
      onPress: withPress ? () => {} : undefined,
      testID: 'detail-offer-flyer',
    });

    assert.equal(tree.type, withPress ? 'Pressable' : 'View');
    const rootStyle = flattenStyle(tree.props.style);
    assert.equal(rootStyle.width, '100%');
    assert.equal(typeof rootStyle.height, 'number');
    assert.ok(rootStyle.height > 0);

    const directChildren = tree.children.flatMap((c) => (c?.type === Fragment ? c.children : [c]));
    const imgNode = directChildren.find((c) => c?.type === FakeImage);
    assert.ok(imgNode, 'Image doit être enfant direct de la racine');
    const imgStyle = flattenStyle(imgNode.props.style);
    assert.equal(imgStyle.width, '100%');
    assert.equal(imgStyle.height, '100%');
    assert.equal(imgNode.props.resizeMode, 'contain');
    assert.equal(typeof imgNode.props.onLoad, 'function');
    assert.equal(typeof imgNode.props.onLoadEnd, 'function');
    assert.equal(typeof imgNode.props.onError, 'function');
  }
});

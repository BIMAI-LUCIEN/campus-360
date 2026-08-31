/**
 * Android Digital Asset Links — `/ .well-known/assetlinks.json`
 *
 * Tells Android 12+ that the APK at /downloads/campus-360.apk is the
 * legitimate "web-installed" companion of https://campus360b.site.
 * Required for browsers to surface a "Install app" prompt in place of
 * a plain file download.
 *
 * The `sha256_cert_fingerprints` array MUST match the SHA-256 of the
 * signing certificate that produced the released APK. For an EAS-managed
 * build this is the upload key (production) or the debug key (preview /
 * development). After the first EAS build completes, replace the
 * placeholder below with the real fingerprint from:
 *
 *   $ keytool -list -v -keystore <your-keystore.jks> \
 *             -alias <your-key-alias> | grep SHA256
 *
 * Or for an installed debug APK:
 *
 *   $ apksigner verify --print-certs path/to/app.apk
 *
 * Reference: https://developers.google.com/digital-asset-links/v1/getting-started
 */

export const dynamic = 'force-static';

const ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.campus360b.app',
      // TODO: replace with the real SHA-256 fingerprint of the EAS upload
      // key. Two values are accepted: the SHA-256 of the signing certificate
      // and (optionally) the SHA-256 of the rotation key.
      sha256_cert_fingerprints: [
        '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
      ],
    },
  },
];

export function GET() {
  return new Response(JSON.stringify(ASSET_LINKS, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

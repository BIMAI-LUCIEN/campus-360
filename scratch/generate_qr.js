const os = require('os');
const qrcode = require('qrcode');
const path = require('path');

const interfaces = os.networkInterfaces();
let ip = '127.0.0.1';
for (const dev in interfaces) {
  const iface = interfaces[dev];
  for (let i = 0; i < iface.length; i++) {
    const alias = iface[i];
    if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
      ip = alias.address;
      break;
    }
  }
}

const url = `exp://${ip}:8081`;
const outputPath = path.join(__dirname, '..', 'expo-phone-qr-current.png');
qrcode.toFile(outputPath, url, { width: 300 }, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`QR code generated for ${url}`);
  }
});

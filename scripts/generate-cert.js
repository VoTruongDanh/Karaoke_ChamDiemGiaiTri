/**
 * Generate self-signed SSL certificate for local HTTPS development
 * This allows microphone access over LAN
 */

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const os = require('os');

const certDir = path.join(__dirname, '..', 'certs');
const keyFile = path.join(certDir, 'localhost-key.pem');
const certFile = path.join(certDir, 'localhost.pem');

// Create certs directory if not exists
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Check if certificates already exist
if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  console.log('✅ SSL certificates already exist in ./certs/');
  process.exit(0);
}

console.log('🔐 Generating self-signed SSL certificate...\n');

// Get all local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = ['127.0.0.1'];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const localIPs = getLocalIPs();
console.log('Local IPs:', localIPs.join(', '));

// Generate a key pair
console.log('Generating RSA key pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
console.log('Creating certificate...');
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01' + Date.now().toString(16);

// Set validity (1 year)
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Set subject and issuer
const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'Karaoke TV Web App' },
  { shortName: 'OU', value: 'Development' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

// Set extensions
const altNames = [
  { type: 2, value: 'localhost' }, // DNS
];

// Add IP addresses
localIPs.forEach(ip => {
  altNames.push({ type: 7, ip: ip });
});

cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: true
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    keyEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true
  },
  {
    name: 'subjectAltName',
    altNames: altNames
  }
]);

// Self-sign the certificate
console.log('Signing certificate...');
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

// Save files
fs.writeFileSync(keyFile, privateKeyPem);
fs.writeFileSync(certFile, certPem);

console.log('\n✅ Self-signed certificate generated successfully!');
console.log('\n📁 Files created:');
console.log(`   Key:  ${keyFile}`);
console.log(`   Cert: ${certFile}`);
console.log('\n⚠️  Lần đầu truy cập, trình duyệt sẽ cảnh báo bảo mật.');
console.log('   Nhấn "Advanced" → "Proceed to localhost (unsafe)" để tiếp tục.');
console.log('\n💡 Certificate hợp lệ cho:');
console.log('   - localhost');
localIPs.forEach(ip => console.log(`   - ${ip}`));

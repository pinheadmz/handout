/* eslint max-len: "off" */
'use strict';

const argv = process.argv;
if (argv.length !== 4)
  throw new Error('usage: node hnssec-gen.js <NAME> <HOST-IP>');
let name = argv[2];
const host = argv[3];

if (name.slice(-1) === '.')
  name = name.slice(0, -1);

const fs = require('fs');
const Path = require('path');
const {dnssec} = require('bns');
const {RSASHA256} = dnssec.algs;
const {ZONE, KSK} = dnssec.keyFlags;
const {rsa, SHA256, encoding} = require('bcrypto');
const {x509, pem} = encoding;

console.log('\nGenerating SSL key and self-signed certificate...');

// Create key pair and get JSON for pubkey
const priv = rsa.privateKeyGenerate(2048);
const pub = rsa.publicKeyCreate(priv);
const pubJSON = rsa.publicKeyExport(pub);

// Timestamps and serial number
// Use *yesterday* for start time to avoid UTC/timezone conflict
const date = new Date();
const month = date.getMonth() + 1;
const day = date.getDate();
if (day > 1) {
  date.setDate(day - 1);
} else {
  date.setMonth((month + 11) % 12);
  date.setDate(30);
}

const serial =
  String(date.getFullYear()) +
  ('0' + String(month)).slice(-2) +
  ('0' + String(day)).slice(-2) +
  '00';
const notBefore = date.toISOString().split('.')[0] + 'Z';
date.setMonth(date.getMonth() + 3);
const notAfter = date.toISOString().split('.')[0] + 'Z';

// hex-encode IP address
let ipaddr = '';
const bytes = host.split('.');
for (const byte of bytes)
  ipaddr += Buffer.from([parseInt(byte)]).toString('hex');

// Basic details, leave out optional and more complex stuff
const tbsJSON = {
  version: 2,
  serialNumber: serial,
  signature: {
    algorithm: 'RSASHA256',
    parameters: {
      type: 'NULL',
      node: null
    }
  },
  issuer: [],
  validity: {
    notBefore: { type: 'UTCTime', node: notBefore },
    notAfter: { type: 'UTCTime', node: notAfter }
  },
  subject: [],
  subjectPublicKeyInfo: {
    algorithm: {
      algorithm: 'RSAPublicKey',
      parameters: {
        type: 'NULL',
        node: null
      }
    },
    publicKey: {
      modulus: pubJSON.n,
      publicExponent: pubJSON.e
    }
  },
  extensions: [
    {
      extnID: 'SubjectAltName',
      critical: false,
      extnValue: [
        { type: 'DNSName', node: name },
        { type: 'DNSName', node: `*.${name}` },
        { type: 'IPAddress', node: ipaddr }
      ]
    },
    {
      extnID: 'BasicConstraints',
      critical: false,
      extnValue: {cA: false, pathLenConstraint: 0}
    },
    {
      extnID: 'KeyUsage',
      critical: false,
      extnValue: [
        'digitalSignature',
        'nonRepudiation',
        'keyEncipherment',
        'dataEncipherment'
      ]
    }
  ]
};

// Create to-be-signed certificate object
const tbs = x509.TBSCertificate.fromJSON(tbsJSON);

// Use helper functions for the complicated details
tbs.issuer = x509.Entity.fromJSON({
  COMMONNAME: name
});
tbs.subject = x509.Entity.fromJSON({
  COMMONNAME: name
});

// Serialize
const msg = SHA256.digest(tbs.encode());

// Sign
const sig = rsa.sign('SHA256', msg, priv);

// Complete
const cert = new x509.Certificate();
cert.tbsCertificate = tbs;
cert.signatureAlgorithm.fromJSON({
  algorithm: 'RSASHA256',
  parameters: {
    type: 'NULL',
    node: null
  }
});
cert.signature.fromJSON({bits: sig.length * 8, value: sig.toString('hex')});

// Output SSL
fs.writeFileSync(
  Path.join(__dirname, '..', 'conf', 'ssl', `${name}.crt`),
  cert.toPEM()
);

fs.writeFileSync(
  Path.join(__dirname, '..', 'conf', 'ssl', `${name}.key`),
  pem.toPEM(priv, 'RSA PRIVATE KEY')
);

// DNSSEC
name += '.';

console.log('\nGenerating DNSSEC keys...');

const kpriv = dnssec.createPrivate(RSASHA256, 2048);
const kkey = dnssec.makeKey(name, RSASHA256, kpriv, ZONE | KSK);
dnssec.writeKeys(Path.join(__dirname, '..', 'conf', 'ksk'), kkey, kpriv);

const zpriv = dnssec.createPrivate(RSASHA256, 2048);
const zkey = dnssec.makeKey(name, RSASHA256, zpriv, ZONE);
dnssec.writeKeys(Path.join(__dirname, '..', 'conf', 'zsk'), zkey, zpriv);

console.log('\nWriting new conf/handout.conf...');

const file = `
  host: ${host}
  domain: ${name}
  kskkey: ${dnssec.filename(name, kkey.data.algorithm, kkey.data.keyTag())}.key
  kskpriv: ${dnssec.filename(name, kkey.data.algorithm, kkey.data.keyTag())}.private
  zskkey: ${dnssec.filename(name, zkey.data.algorithm, zkey.data.keyTag())}.key
  zskpriv: ${dnssec.filename(name, zkey.data.algorithm, zkey.data.keyTag())}.private
`;
fs.writeFileSync(Path.join(__dirname, '..', 'conf', 'handout.conf'), file);

const ds = dnssec.createDS(kkey);

console.log('\nDS record for root zone:');
console.log(ds.toString());

console.log('\nGLUE4 record, Bob format:');
console.log(
  `ns.${name}`,
  host
);

console.log('\nDS record, Bob format:');
console.log(
  ds.data.keyTag,
  ds.data.algorithm,
  ds.data.digestType,
  ds.data.digest.toString('hex')
);

const json = {
  records: [
    {
      type: 'GLUE4',
      ns: `ns.${name}`,
      address: `${host}`
    },
    {
      type: 'DS',
      keyTag: ds.data.keyTag,
      algorithm: ds.data.algorithm,
      digestType: ds.data.digestType,
      digest: ds.data.digest.toString('hex')
    }
  ]
};
fs.writeFileSync(Path.join(__dirname, '..', 'conf', 'hsw-rpc_sendupdate.txt'), JSON.stringify(json));

console.log('\nAll records, hsw-rpc sendupdate format:');
console.log(JSON.stringify(json));


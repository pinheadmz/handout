/* eslint max-len: "off" */
'use strict';

const argv = process.argv;
if (argv.length !== 4)
  throw new Error('usage: node hnssec-gen.js <NAME> <HOST-IP>');
const name = argv[2];
const host = argv[3];

const fs = require('fs');
const Path = require('path');
const {dnssec} = require('bns');
const {RSASHA256} = dnssec.algs;
const {ZONE, KSK} = dnssec.keyFlags;

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


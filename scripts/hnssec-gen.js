'use strict';

const argv = process.argv;
if (argv.length !== 3)
  throw new Error('usage: node hnssec-gen.js <NAME>');
const name = argv[2];

const fs = require('fs');
const Path = require('path');
const {dnssec} = require('bns');
const {RSASHA256} = dnssec.algs;
const {ZSK, KSK} = dnssec.keyFlags;

let priv = dnssec.createPrivate(RSASHA256, 2048);
let key = dnssec.makeKey(name, RSASHA256, priv, KSK);
dnssec.writeKeys(Path.join(__dirname, '..', 'conf', 'ksk'), key, priv);

console.log('\nAdd these lines to conf/handout.conf:');

console.log(
  'kskkey: '
  + `${dnssec.filename(name, key.data.algorithm, key.data.keyTag())}.key`
);
console.log(
  'kskpriv: '
  + `${dnssec.filename(name, key.data.algorithm, key.data.keyTag())}.private`
);

const ds = dnssec.createDS(key);
fs.writeFileSync(Path.join(__dirname, '..', 'conf', 'ksk', 'ds.txt'), ds);

priv = dnssec.createPrivate(RSASHA256, 2048);
key = dnssec.makeKey(name, RSASHA256, priv, ZSK);
dnssec.writeKeys(Path.join(__dirname, '..', 'conf', 'zsk'), key, priv);

console.log(
  'zskkey: '
  + `${dnssec.filename(name, key.data.algorithm, key.data.keyTag())}.key`
);
console.log(
  'zskpriv: '
  + `${dnssec.filename(name, key.data.algorithm, key.data.keyTag())}.private`
);

console.log('\nDS record for root zone:');
console.log(ds.toString());

console.log('\nDS record, Bob format:');
console.log(
  ds.data.keyTag,
  ds.data.algorithm,
  ds.data.digestType,
  ds.data.digest.toString('hex')
);

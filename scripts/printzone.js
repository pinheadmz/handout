/* eslint-disable no-return-assign */
'use strict';

const fs = require('fs');
const Path = require('path');
const Config = require('bcfg');
const {toZone} = require('bns/lib/wire');
const AuthNS = require('../lib/authserver');

const config = new Config('handout');
config.prefix = '';
config.parseArg();
config.open(Path.join(__dirname, '..', 'conf', 'handout.conf'));

const authns = new AuthNS({
  test: config.bool('test', false),
  domain: config.str('domain'),
  host: config.str('host'),
  kskkey: config.str('kskkey'),
  kskpriv: config.str('kskpriv'),
  zskkey: config.str('zskkey'),
  zskpriv: config.str('zskpriv')
});

authns.init();
let records = [];
authns.server.zone.names.forEach((recordMap) => {
  recordMap.rrs.forEach(
    rr => records = records.concat(rr)
  );
  recordMap.sigs.forEach(
    rr => records = records.concat(rr)
  );
});

const zone = toZone(records);
const path = Path.join(__dirname, '..', 'conf', `${authns.domain}zone`);
fs.writeFileSync(path, zone);

console.log('\n', zone);
console.log(`\nZone file saved to: ${path}`);

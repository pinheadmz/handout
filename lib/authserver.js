'use strict';

const bns = require('bns');
const {AuthServer, dnssec, constants} = bns;
const {types} = constants;
const {keyFlags} = dnssec;
const Path = require('path');
const fs = require('fs');

class AuthNS {
  constructor(options) {
    this.logger = options.logger.context('authns');
    this.domain = options.domain;
    this.host = options.host;
    this.zskkey = options.zskkey;
    this.zskpriv = options.zskpriv;
    this.kskkey = options.kskkey;
    this.kskpriv = options.kskpriv;

    this.server = new AuthServer({
      tcp: true,
      edns: true,
      dnssec: true
    });
  }

  init() {
    this.server.setOrigin(this.domain);
    this.server.zone.clearRecords();

    // A records for TLD and all subdomains
    this.server.zone.fromString(
      `${this.domain} 21600 IN A ${this.host}`
    );

    // DNSKEY: ZSK
    let file = Path.join(__dirname, '..', 'conf', 'zsk', this.zskkey);
    this.server.zone.fromString(
      fs.readFileSync(file).toString('ascii')
    );

    // DNSKEY: KSK
    file = Path.join(__dirname, '..', 'conf', 'ksk', this.kskkey);
    this.server.zone.fromString(
      fs.readFileSync(file).toString('ascii')
    );

    // Sign ZSK with KSK
    let dir = Path.join(__dirname, '..', 'conf', 'ksk', this.kskpriv);
    let str = fs.readFileSync(dir, 'ascii');
    let [alg, priv] = dnssec.decodePrivate(str);
    let key = dnssec.makeKey(this.domain, alg, priv, keyFlags.KSK);
    let rrs = this.server.zone.get(this.domain, types.DNSKEY);
    let sig = dnssec.sign(key, priv, rrs);
    this.server.zone.fromString(sig.toString());

    // Sign A with ZSK
    dir = Path.join(__dirname, '..', 'conf', 'zsk', this.zskpriv);
    str = fs.readFileSync(dir, 'ascii');
    [alg, priv] = dnssec.decodePrivate(str);
    key = dnssec.makeKey(this.domain, alg, priv, keyFlags.ZSK);
    rrs = this.server.zone.get(this.domain, types.A);
    for (const rr of rrs) {
      sig = dnssec.sign(key, priv, [rr]);
      this.server.zone.fromString(sig.toString());
    }

    // Answer questions and log
    this.server.on('query', (req, res, rinfo) => {
      this.logger.debug(`${rinfo.address} req: ${req.question}`);
    });

    // Start
    this.server.bind(53, this.host);
    this.logger.debug(
      `Authoritative Nameserver opened for domain ${this.domain}`
    );
  }
}

/*
 * Expose
 */

module.exports = AuthNS;

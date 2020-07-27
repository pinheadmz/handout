'use strict';

const bns = require('bns');
const {AuthServer, dnssec, constants, tlsa} = bns;
const {types} = constants;
const {keyFlags} = dnssec;
const {KSK, ZONE} = keyFlags;
const {encoding} = require('bcrypto');
const {pem} = encoding;
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
    this.port = options.test ? 53530 : 53;

    this.server = new AuthServer({
      tcp: true,
      edns: true,
      dnssec: true
    });
  }

  init() {
    this.server.setOrigin(this.domain);
    const zone = this.server.zone;

    // Create SOA
    zone.fromString(
      `${this.domain} 21600 IN SOA ns.${this.domain} email.${this.domain} ` +
      parseInt(Date.now() / 1000) + ' 86400 7200 604800 300'
    );

    // Create self-referencing NS
    zone.fromString(
      `${this.domain} 21600 IN NS ns.${this.domain}`
    );

    // Create A record for TLD all subdomains
    zone.fromString(
      `${this.domain} 21600 IN A ${this.host}`
    );
    zone.fromString(
      `*.${this.domain} 21600 IN A ${this.host}`
    );

    // Create TLSA from certificate
    const ssldir =
      Path.join(__dirname, '..', 'conf', 'ssl', this.domain + 'crt');
    const certfile = fs.readFileSync(ssldir, 'ascii');
    const cert = pem.fromPEM(certfile, 'CERTIFICATE');
    const tlsarr = tlsa.create(cert, this.domain, 'tcp', 443);
    zone.insert(tlsarr);
    // Wildcard the TLSA for subdomains
    const tlsaWild = tlsarr.clone();
    tlsaWild.name = `*.${this.domain}`;
    zone.insert(tlsaWild);

    // Create DNSKEY for ZSK
    let file = Path.join(__dirname, '..', 'conf', 'zsk', this.zskkey);
    zone.fromString(
      fs.readFileSync(file).toString('ascii')
    );

    // Create DNSKEY for KSK
    file = Path.join(__dirname, '..', 'conf', 'ksk', this.kskkey);
    zone.fromString(
      fs.readFileSync(file).toString('ascii')
    );

    // Sign DNSKEY RRset with KSK
    file = Path.join(__dirname, '..', 'conf', 'ksk', this.kskpriv);
    let string = fs.readFileSync(file, 'ascii');
    const [kalg, KSKpriv] = dnssec.decodePrivate(string);
    const KSKkey = dnssec.makeKey(this.domain, kalg, KSKpriv, ZONE | KSK);
    const DNSKEYrrset = this.server.zone.get(this.domain, types.DNSKEY);
    const RRSIGdnskey = dnssec.sign(KSKkey, KSKpriv, DNSKEYrrset);
    zone.insert(RRSIGdnskey);

    // Sign all other RRsets with ZSK
    file = Path.join(__dirname, '..', 'conf', 'zsk', this.zskpriv);
    string = fs.readFileSync(file, 'ascii');
    const [zalg, ZSKpriv] = dnssec.decodePrivate(string);
    const ZSKkey = dnssec.makeKey(this.domain, zalg, ZSKpriv, ZONE);

    for (const [, map] of zone.names) {
      for (const [, rrs] of map.rrs)
        zone.insert(dnssec.sign(ZSKkey, ZSKpriv, rrs));
    }

    // Add ZSK directly to zone to sign wildcards ad-hoc
    this.server.setZSKFromString(string);

    // Answer questions and log
    this.server.on('query', (req, res, rinfo) => {
      this.logger.debug(`${rinfo.address} req: ${req.question}`);
    });

    // Start
    this.server.bind(this.port, this.host);
    this.logger.debug(
      `Authoritative Nameserver opened for domain ${this.domain}`
    );
  }
}

/*
 * Expose
 */

module.exports = AuthNS;

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

    // Sign DNSKEY with KSK
    const kdir = Path.join(__dirname, '..', 'conf', 'ksk', this.kskpriv);
    const kstr = fs.readFileSync(kdir, 'ascii');
    const [kalg, kpriv] = dnssec.decodePrivate(kstr);
    const kkey = dnssec.makeKey(this.domain, kalg, kpriv, ZONE | KSK);
    const krrs = this.server.zone.get(this.domain, types.DNSKEY);
    const ksigDNSKEY = dnssec.sign(kkey, kpriv, krrs);
    this.server.zone.fromString(ksigDNSKEY.toString());

    // Sign A with ZSK
    const zdir = Path.join(__dirname, '..', 'conf', 'zsk', this.zskpriv);
    const zstr = fs.readFileSync(zdir, 'ascii');
    const [zalg, zpriv] = dnssec.decodePrivate(zstr);
    const zkey = dnssec.makeKey(this.domain, zalg, zpriv, ZONE);
    const zrrs = this.server.zone.get(this.domain, types.A);
    const zsigA = dnssec.sign(zkey, zpriv, zrrs);
    this.server.zone.fromString(zsigA.toString());

    // Create TLSA from certificate and sign
    const ssldir =
      Path.join(__dirname, '..', 'conf', 'ssl', this.domain + 'crt');
    const certfile = fs.readFileSync(ssldir, 'ascii');
    const cert = pem.fromPEM(certfile, 'CERTIFICATE');
    const tlsarr = tlsa.create(cert, this.domain, 'tcp', 443);
    this.server.zone.fromString(tlsarr.toString());
    const tlsasig = dnssec.sign(zkey, zpriv, [tlsarr]);
    this.server.zone.fromString(tlsasig.toString());

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

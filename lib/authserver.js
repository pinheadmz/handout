'use strict';

const bns = require('bns');
const {AuthServer} = bns;

class AuthNS {
  constructor(options) {
    this.logger = options.logger.context('authns');
    this.domain = options.domain;
    this.host = options.host;

    this.server = new AuthServer({
      tcp: true,
      edns: true,
      dnssec: true
    });
  }

  init() {
    this.server.setOrigin(this.domain);
    this.server.zone.clearRecords();
    this.server.zone.fromString(
      `${this.domain} 21600 IN A ${this.host}`
    );

    this.server.on('query', (req, res, rinfo) => {
      this.logger.debug(`${rinfo.address} req: ${req.question}`);
    });

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

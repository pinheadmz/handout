'use strict';

const bdb = require('bdb');
const Path = require('path');
const {SHA256} = require('bcrypto');

class POCDB {
  constructor () {
    this.db = bdb.create({
      memory: false,
      location: Path.join(__dirname, 'data')
    });

    this.layout = {
      // [subdomain] -> PW hash
      P: bdb.key('P', ['ascii']),
      // [subdomain] -> current status
      S: bdb.key('S', ['ascii']),
      // [timstamp][subdomain] -> historical status
      H: bdb.key('H', ['uint32', 'ascii'])
    };
  }

  open() {
    return this.db.open();
  }

  async getHistory() {
    const items = await this.db.range({
      limit: 10,
      reverse: true,
      values: true,
      gte: this.layout.H.min(),
      lte: this.layout.H.max()
    });

    const ret = [];
    for (const item of items) {
      const [timestamp, subdomain] = this.layout.H.decode(item.key);
      const status = item.value.toString('ascii');
      ret.push({timestamp, subdomain, status});
    }

    return ret;
  }

  async getStatus(subdomain) {
    const buf = await this.db.get(this.layout.S.encode(subdomain));

    if (buf)
      return buf.toString('ascii');
    else
      return '';
  }

  async setStatus(subdomain, status) {
    const timestamp = parseInt(Date.now() / 1000);
    await this.db.put(
      this.layout.H.encode(timestamp, subdomain),
      Buffer.from(status)
    );

    return this.db.put(this.layout.S.encode(subdomain), Buffer.from(status));
  }

  async checkPW(subdomain, password) {
    if (!await this.exists(subdomain))
      return false;

    const expected = await this.db.get(this.layout.P.encode(subdomain));
    const actual = SHA256.digest(Buffer.from('POCpoc' + subdomain + password));

    return expected.equals(actual);
  }

  setPW(subdomain, password) {
    const hash = SHA256.digest(Buffer.from('POCpoc' + subdomain + password));
    return this.db.put(this.layout.P.encode(subdomain), hash);
  }

  exists(subdomain) {
    return this.db.has(this.layout.P.encode(subdomain));
  }
}

module.exports = POCDB;

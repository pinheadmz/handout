'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const Chains = require('./chains');

class Webserver {
  constructor(options) {
    this.domain = options.domain.slice(0, -1),
    this.host = options.host;
    this.html = options.html;
    this.logger = options.logger.context('webserver');

    this.chains = new Chains();

    this.server = bweb.server({
      host: '0.0.0.0',
      port: 443,
      sockets: false,
      ssl: true,
      keyFile:
        Path.join(__dirname, '..', 'conf', 'ssl', `${this.domain}.key`),
      certFile:
        Path.join(__dirname, '..', 'conf', 'ssl', `${this.domain}.crt`)
    });
  }

  async init() {
    await this.chains.init();
    this.server.use(this.server.router());

    this.server.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.server.get('/', (req, res) => {
      this.sendFile(req, res, 'index.html');
    });

    this.server.get('/latest', async (req, res) => {
      try {
        const latest = await this.chains.latest();
        res.json(200, latest);
      } catch(e) {
        this.logger.error(e);
        res.send(500, null);
      }
    });

    this.server.get('/:href(*)', (req, res) => {
      this.sendFile(req, res, req.url);
    });

    const redirect = bweb.server({
      host: '0.0.0.0',
      port: 80,
      sockets: false,
      ssl: false
    });

    redirect.use(redirect.router());
    redirect.get('*', (req, res) => {
      res.redirect(`https://${this.domain}./`);
    });
    redirect.on('error', (err) => {
      console.error('Redirect error:', err.stack);
    });
    redirect.open();

    this.server.open();
    this.logger.debug(`Webserver opened at host ${this.host}`);
  }

  sendFile(req, res, file) {
    const location = Path.join(this.html, file);
    let data = null;
    let code = 500;
    try {
      data = fs.readFileSync(location);
      code = 200;
    } catch (e) {
      code = 404;
    }
    res.send(code, data);
    this.logger.debug(`${req.socket.remoteAddress} req: ${file} (${code})`);
  }
}

/*
 * Expose
 */

module.exports = Webserver;

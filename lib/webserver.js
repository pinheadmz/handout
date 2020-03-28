'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const Profile = require('../app/profile');

class Webserver {
  constructor(options) {
    this.domain = options.domain.slice(0, -1),
    this.host = options.host;
    this.html = options.html;
    this.logger = options.logger.context('webserver');

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

  init() {
    this.server.use(this.server.router());

    this.server.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.server.get('/', (req, res) => {
      const uri = req.headers.host;
      const labels = uri.split('.');
      const name = labels[0];
      if (name === 'proofofconcept')
        this.sendFile(req, res, 'index.html');
      else
        this.sendProfile(req, res, name);
    });

    this.server.get('/:href(*)', (req, res) => {
      this.sendFile(req, res, req.url);
    });

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

  sendProfile(req, res, name) {
    const profile = new Profile(name);
    const data = profile.render();

    res.send(200, data);
    this.logger.debug(`${req.socket.remoteAddress} req profile: ${name}`);
  }
}

/*
 * Expose
 */

module.exports = Webserver;

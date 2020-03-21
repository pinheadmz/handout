'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');

class Webserver {
  constructor(options) {
    this.host = options.host;
    this.html = options.html;
    this.logger = options.logger.context('webserver');

    this.server = bweb.server({
      host: '0.0.0.0',
      port: 80,
      sockets: false,
      ssl: false
    });
  }

  init() {
    this.server.use(this.server.router());

    this.server.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.server.get('/', (req, res) => {
      this.sendFile(req, res, 'index.html');
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
    this.logger.debug(`${req.headers.host} req: ${file} (${code})`);
  }
}

/*
 * Expose
 */

module.exports = Webserver;

'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const Chains = require('./chains');
// const {ChainEntry} = require('hsd');

class Webserver {
  constructor(options) {
    this.domain = options.domain.slice(0, -1),
    this.host = options.host;
    this.html = options.html;
    this.logger = options.logger.context('webserver');
    this.params =
      options.test ?
        {treeinterval: 5, halvening: 2500} :
        {treeinterval: 36, halvening: 170000};

    this.chains = new Chains(options);

    this.https = bweb.server({
      host: '0.0.0.0',
      port: 443,
      sockets: true,
      ssl: true,
      keyFile:
        Path.join(__dirname, '..', 'conf', 'ssl', `${this.domain}.key`),
      certFile:
        Path.join(__dirname, '..', 'conf', 'ssl', `${this.domain}.crt`)
    });

    this.http = bweb.server({
      host: '0.0.0.0',
      port: 80,
      sockets: true,
      ssl: false
    });
  }

  async init() {
    await this.chains.init();

    this.chains.on('block', (blocks) => {
      const wss = this.https.channel('blocks');
      const ws = this.http.channel('blocks');

      if (wss) {
        for (const socket of wss) {
          socket.fire('blocks', blocks);
        }
      }

      if (ws) {
        for (const socket of ws) {
          socket.fire('blocks', blocks);
        }
      }

      this.logger.debug(
        '%d blocks sent to %d wss and %d ws',
        Object.keys(blocks).length,
        wss ? wss.size : 0,
        ws ? ws.size : 0
      );
    });

    this.https.use(this.https.router());
    this.http.use(this.http.router());

    this.https.handleSocket = (socket) => {
      this.logger.debug('secure socket opened to %s', socket.host);
      socket.join('blocks');
    };
    this.http.handleSocket = (socket) => {
      this.logger.debug('socket opened to %s', socket.host);
      socket.join('blocks');
    };

    this.https.on('error', (err) => {
      console.error('Server error:', err.stack);
    });
    this.http.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.https.get('/', (req, res) => {
      this.sendFile(req, res, 'index.html');
    });
    this.http.get('/', (req, res) => {
      this.sendFile(req, res, 'index.html');
    });

    this.https.get('/params', (req, res) => {
      res.send(200, JSON.stringify(this.params));
    });
    this.http.get('/params', (req, res) => {
      res.send(200, JSON.stringify(this.params));
    });

    this.https.get('/:href(*)', (req, res) => {
      this.sendFile(req, res, req.url);
    });
    this.http.get('/:href(*)', (req, res) => {
      this.sendFile(req, res, req.url);
    });

    this.https.open();
    this.http.open();
    this.logger.info(`Webserver opened at host ${this.host}`);

    // crazy fast-forward test mode
    // let height = 3000;
    // while (true) {
    //   const header = await this.chains.hsd.getBlockHeader(height);
    //   this.chains.addBlock(ChainEntry.fromJSON(header));
    //   await new Promise(r => setTimeout(r, 100));
    //   height++;
    // }
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

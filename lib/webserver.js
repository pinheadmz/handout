'use strict';

const bweb = require('bweb');
const fs = require('bfile');
const Path = require('path');
const Profile = require('../app/profile');
const Edit = require('../app/edit');
const Index = require('../app/index');
const POCDB = require('../app/db');

class Webserver {
  constructor(options) {
    this.domain = options.domain.slice(0, -1),
    this.host = options.host;
    this.html = options.html;
    this.logger = options.logger.context('webserver');
    this.db = new POCDB();

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
    await this.db.open();

    this.server.use(this.server.bodyParser({type: 'form'}));
    this.server.use(this.server.router());

    this.server.on('error', (err) => {
      console.error('Server error:', err.stack);
    });

    this.server.get('/', async (req, res) => {
      const uri = req.headers.host;
      const labels = uri.split('.');
      if (labels[labels.length - 1] === '')
        labels.pop();
      if (labels.length > 2) {
        res.send(404);
        return null;
      }

      const name = labels[0];
      if (labels.length === 1) {
        const history = await this.db.getHistory();
        const index = new Index(this.domain, history);
        const data = index.render();

        res.send(200, data);
        this.logger.debug(`${req.socket.remoteAddress} req: /index`);
        return null;
      } else {
        return this.sendProfile(req, res, name);
      }
    });

    this.server.post('/register', async (req, res) => {
      if (!req.hasBody) {
        res.send(400, 'Missing body');
        return;
      }

      const body = req.body;
      if (!body.subdomain || !body.password) {
        res.send(400, 'Missing required fields');
        return;
      }

      const subdomain = body.subdomain;
      const password = body.password;
      if (!this.verifyName(subdomain)) {
        res.send(400, 'Invalid subdomain');
        return;
      }
      if (password.length < 8) {
        res.send(400, 'Bad password');
        return;
      }

      if (await this.db.exists(subdomain)) {
        const sorry =
          'Subdomain already registered!<br>' +
          'If this is your subdomain,<br>' +
          'you can update your status at:<br>' +
          `<a href="https://${subdomain}.${this.domain}/edit">` +
            `https://${subdomain}.${this.domain}/edit` +
          '</a>';
        res.send(400, sorry);
        return;
      }

      await this.db.setPW(subdomain, password);
      const hooray =
        'Welcome to Proof Of Concept!<br>' +
        'Update your status now:<br>' +
        `<a href="https://${subdomain}.${this.domain}/edit">` +
          `https://${subdomain}.${this.domain}/edit` +
        '</a>';
      res.send(200, hooray);
    });

    this.server.post('/update', async (req, res) => {
      if (!req.hasBody) {
        res.send(400, 'Missing body');
        return;
      }

      const body = req.body;
      if (!body.password) {
        res.send(400, 'Missing password');
        return;
      }

      const uri = req.headers.host;
      const labels = uri.split('.');
      const subdomain = labels[0];

      if (labels.length === 1 || labels.length > 2) {
        res.send(404);
        return;
      }

      const status = body.status;
      const password = body.password;
      if (password.length < 8) {
        res.send(400, 'Bad password');
        return;
      }

      if (!await this.db.exists(subdomain)) {
        res.send(404);
        return;
      }

      if (!await this.db.checkPW(subdomain, password)) {
        res.send(400, 'Inccorect password.');
        return;
      }

      await this.db.setStatus(subdomain, status);
      const hooray =
        'Status update success!<br>' +
        'View your subdomain now:<br>' +
        `<a href="https://${subdomain}.${this.domain}/">` +
          `https://${subdomain}.${this.domain}/` +
        '</a>';
      res.send(200, hooray);
    });

    this.server.get('/edit', (req, res) => {
      const uri = req.headers.host;
      const labels = uri.split('.');
      if (labels[labels.length - 1] === '')
        labels.pop();
      const name = labels[0];
      if (labels.length === 1 || labels.length > 2) {
        res.send(404);
        return null;
      } else {
        return this.sendEdit(req, res, name);
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
      res.redirect(`https://${this.domain}/`);
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
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(code, data);
    this.logger.debug(`${req.socket.remoteAddress} req: ${file} (${code})`);
  }

  async sendProfile(req, res, name) {
    if (!await this.db.exists(name)) {
      res.send(404);
      return;
    }

    const history = await this.db.getSubdomainHistory(name);
    const profile = new Profile(this.domain, name, history);
    const data = profile.render();

    res.send(200, data);
    this.logger.debug(`${req.socket.remoteAddress} req profile: ${name}`);
  }

  async sendEdit(req, res, name) {
    let status = await this.db.getSubdomainHistory(name);
    status = (status && status.length > 0) ? status[0].status : '';
    const profile = new Edit(this.domain, name, status);
    const data = profile.render();

    res.send(200, data);
    this.logger.debug(`${req.socket.remoteAddress} req edit: ${name}`);
  }

  verifyName(str) {
    const CHARSET = new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
      2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 4,
      0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0
    ]);

    if (typeof str !== 'string')
      return false;

    if (str.length === 0)
      return false;

    if (str.length > 63)
      return false;

    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);

      // No unicode characters.
      if (ch & 0xff80)
        return false;

      const type = CHARSET[ch];

      switch (type) {
        case 0: // non-printable
          return false;
        case 1: // 0-9
          break;
        case 2: // A-Z
          return false;
        case 3: // a-z
          break;
        case 4: // - and _
          // Do not allow at end or beginning.
          if (i === 0 || i === str.length - 1)
            return false;
          break;
      }
    }

    return true;
  }
}

/*
 * Expose
 */

module.exports = Webserver;

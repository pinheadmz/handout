'use strict';

const Path = require('path');
const Logger = require('blgr');
const Config = require('bcfg');

const Webserver = require('./webserver');
const AuthNS = require('./authserver');

const config = new Config('handout');
config.prefix = '';
config.open(Path.join(__dirname, '..', 'conf', 'handout.conf'));

const html = Path.join(__dirname, '..', 'html');
const logger = new Logger();
logger.set({
  level: 'debug',
  console: true,
  file: false
});

const webserver = new Webserver({
  host: config.str('host'),
  html,
  logger
});

const authns = new AuthNS({
  domain: config.str('domain'),
  host: config.str('host'),
  logger
});

(async () => {
  await logger.open();
  webserver.init();
  authns.init();
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});

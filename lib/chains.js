'use strict';

const hsclient = require('hs-client');
const {ChainEntry} = require('hsd');
// const bcclient = require('bcoin/lib/client');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class Chains extends EventEmitter {
  constructor(options) {
    super();

    this.logger = options.logger.context('chains');

    this.hsd = new hsclient.NodeClient({
      port: 12037
    });
    // this.bcoin = new bcclient.NodeClient({
    //   port: 8332
    // });

    this.JSONfile = path.join(__dirname, '..', 'html', 'blocks.json');
    this.blocks = {};
  }

  async init() {
    await this.hsd.open();

    this.hsd.bind('chain connect', (entry) => {
      this.addBlock(ChainEntry.decode(entry));
    });

    try {
      this.blocks = JSON.parse(fs.readFileSync(this.JSONfile));
      this.logger.info(
        'Loaded blocks.json file: found %d blocks',
        Object.keys(this.blocks).length
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.logger.info(
          'No blocks.json file found, loading last 20 blocks by timestamp...'
        );
        await this.latest();
      } else {
        throw e;
      }
    }
  }

  now() {
    return Math.floor(new Date().getTime() / 1000);
  }

  writeBlocks() {
    fs.writeFileSync(
      this.JSONfile,
      JSON.stringify(this.blocks, null, 2)
    );
  }

  checkIntegrity() {
    try {
      const file = JSON.parse(fs.readFileSync(this.JSONfile));
      assert.deepStrictEqual(this.blocks, file);
    } catch (e) {
      if (e.code !== 'ENOENT')
        throw e;
      else
        assert.deepStrictEqual(this.blocks, []);
    }
  }

  async latest() {
    const info = await this.hsd.getInfo();
    const height = info.chain.height;

    for (let i = height; i > height - 20; i--) {
      const header = await this.hsd.getBlockHeader(i);
      header.recvtime = header.time;
      this.blocks[header.height] = header;
    }

    this.writeBlocks();
  }

  addBlock(entry) {
    this.logger.info(
      'Adding block height: %d hash: %x',
      entry.height,
      entry.hash
    );
    const json = entry.getJSON();
    json.recvtime = this.now();
    this.blocks[entry.height] = json;

    this.trimBlocks();
    this.writeBlocks();

    this.emit('block', this.blocks);
  }

  trimBlocks() {
    const keys = Object.keys(this.blocks);
    const length = keys.length;
    if (length <= 20)
      return;

    const heights = keys.map(x => parseInt(x));
    const min = Math.min(...heights);
    delete this.blocks[String(min)];

    this.trimBlocks();
  }

  async test() {
    const hsdinfo = await this.hsd.getInfo();
    console.log(hsdinfo);
  }
}

module.exports = Chains;

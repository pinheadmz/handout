'use strict';

const hsclient = require('hs-client');
const {ChainEntry} = require('hsd');
// const bcclient = require('bcoin/lib/client');
const bcurl = require('bcoin/node_modules/bcurl');

class Chains {
  constructor() {
    this.hsd = new hsclient.NodeClient({
      port: 12037
    });
    // this.hsw = new hsclient.WalletClient({
    //   port: 12039
    // });
    // this.bcoin = new bcclient.NodeClient({
    //   port: 8332
    // });
    // this.bwallet = new bcclient.WalletClient({
    //   port: 8334
    // });
    this.namebase = bcurl.client('https://namebase.io');
    this.coinbase = bcurl.client('https://api.coinbase.com');
    this.btc = 10000;
    this.hns = 0.10;
  }

  async init() {
    await this.hsd.open();

    this.hsd.bind('chain connect', (entry) => {
      console.log(ChainEntry.fromRaw(entry));
    });
  }

  async latest() {
    const info = await this.hsd.getInfo();
    const height = info.chain.height;

    const ten = [];
    for (let i = height; i > height - 10; i--) {
      const header = await this.hsd.getBlockHeader(i);
      ten.push(header);
    }

    return ten;
  }

  async test() {
    const hsdinfo = await this.hsd.getInfo();
    const bcinfo = await this.bcoin.getInfo();
    const hswinfo = await this.hsw.wallet('primary').getInfo();
    const bwinfo = await this.bwallet.wallet('primary').getInfo();

    console.log(hsdinfo);
    console.log(bcinfo);
    console.log(hswinfo);
    console.log(bwinfo);
  }

  async updatePrices() {
    try {
      let hns = await this.namebase.get('/api/v0/ticker/price?symbol=HNSBTC');
      let btc = await this.coinbase.get('/v2/prices/BTC-USD/sell');

      btc = btc.data.amount;
      hns = hns.price;
      hns = hns * btc;

      this.btc = btc;
      this.hns = hns;
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Chains;

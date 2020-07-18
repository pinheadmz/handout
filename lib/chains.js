'use strict';

const hsclient = require('hsd/node_modules/hs-client');
const bcclient = require('bcoin/lib/client');
const bcurl = require('bcoin/node_modules/bcurl');

class Chains {
  constructor() {
    this.hsd = new hsclient.NodeClient({
      network: 'main',
      port: 12037
    });
    this.hsw = new hsclient.WalletClient({
      network: 'main',
      port: 12039
    });
    this.bcoin = new bcclient.NodeClient({
      network: 'main',
      port: 8332
    });
    this.bwallet = new bcclient.WalletClient({
      network: 'main',
      port: 8334
    });
    this.namebase = bcurl.client('https://namebase.io');
    this.coinbase = bcurl.client('https://api.coinbase.com');
    this.btc = 10000;
    this.hns = 0.10;
  }

  async test() {
    const hsdinfo = await this.hsd.getInfo();
    const bcinfo = await this.bcoin.getInfo();
    const hswinfo = await this.hsw.wallet('donate').getInfo();
    const bwinfo = await this.bwallet.wallet('donate').getInfo();

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

  async history() {
    await this.updatePrices();

    const bhist = await this.bwallet.wallet('donate').getHistory('default');
    const hhist = await this.hsw.wallet('donate').getHistory('default');
    const all = bhist.concat(hhist);

    all.sort((a, b) => {
      const atime = a.time > 0 ? a.time : a.mtime;
      const btime = b.time > 0 ? b.time : b.mtime;
      return btime - atime;
    });

    const list = [];

    for (const tx of all) {
      for (const out of tx.outputs) {
        const item = {};
        switch (out.address) {
          case 'bc1qq4hhuusn3m8fzd47w3tjvltvr9klv88rpt6ssq':
            item.btc = out.value / 100000000;
            item.usd = parseFloat((item.btc * this.btc).toFixed(2));
            break;
          case 'hs1qde7jaw6qgzzfu83upn3twvsyhh0zrshg76qe0x':
            item.hns = out.value / 1000000;
            item.usd = parseFloat((item.hns * this.hns).toFixed(2));
            break;
          default:
            continue;
        }

        if (out.value < 1000)
          continue;

        item.date = tx.date > 0 ? tx.date : tx.mdate;
        item.txid = tx.hash;
        list.push(item);
      }
    }

    return list;
  }
}

module.exports = Chains;

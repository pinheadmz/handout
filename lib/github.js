/* eslint max-len: off */
'use strict';

const bcurl = require('bcoin/node_modules/bcurl');
const fs = require('fs');
const Path = require('path');

class Github {
  constructor() {
    this.token = fs.readFileSync(Path.join(__dirname, 'token'), 'ascii').slice(0, 40);
    this.url = 'https://api.github.com/graphql';
    this.query = 'query {viewer {login sponsorshipsAsMaintainer(last: 100) {nodes {tier {monthlyPriceInDollars} sponsorEntity {... on User {name}}}}}}';

    this.client = bcurl.client({
      url: this.url,
      headers: {
        'Authorization': `bearer ${this.token}`
      }
    });
  }

  async getSponsors() {
    const json = await this.client.post('', {
      query: this.query
    });

    const nodes = json.data.viewer.sponsorshipsAsMaintainer.nodes;

    const list = [];

    for (const node of nodes) {
      list.push({
        name: node.sponsorEntity.name,
        amount: node.tier.monthlyPriceInDollars
      });
    }

    return list;
  }
}

module.exports = Github;

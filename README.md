### Install the necessary dependencies in addition to Node.js:

```
apt-get install build-essential python libunbound-dev
```

### Install nodejs

Instructions from: https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions

```
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install this repo

```
git clone https://github.com/pinheadmz/handout
cd handout
npm install
```



hsw-rpc sendupdate examplename '{"records":[{ "type": "GLUE4", "ns": "ns.examplename.", "address": "<YOUR IP>"}]}'
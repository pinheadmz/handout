# Handout -- Installation

These directions assume a Linux platform, particularly Ubuntu.


### 1. Install the necessary dependencies in addition to Node.js:

```
apt-get install build-essential python libunbound-dev
```

### 2. Install Node.js

Instructions from: https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions

```
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install this repo

```
git clone https://github.com/pinheadmz/handout
cd handout
npm install
```

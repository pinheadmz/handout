# Handout -- Installation

These directions assume a Linux platform, particularly Ubuntu.


### 0. On a fresh server, update apt first

```
sudo apt update
```

### 1. Install the necessary dependencies in addition to Node.js:

```
sudo apt install build-essential python libunbound-dev
```

### 2. Install Node.js

(Or follow instructions from: https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions)

```
sudo apt install nodejs
sudo apt install npm
```

### 3. Update nodejs to at least version 12 using `n` (node version manager)

```
export NODE_PATH=`npm root -g`  # you may want to also add this line to ~/.profile
sudo npm install n -g
sudo n lts  # at time of writing, LTS is version 12.18.2
```

### 3. Install this repo

```
npm install -g node-gyp -g  # one more requirement, you may already have installed

git clone https://github.com/pinheadmz/handout
cd handout
npm install
```

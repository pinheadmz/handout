# Handout

A combination authoritative nameserver and webserver for Handshake.

---

These directions assume a Linux platform, especially Ubuntu.


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

### 4. Configure the server

Edit the file at `conf/handout.conf` with your server's IP address and your handshake TLD (the trailing dot is important!)

```
host: 100.200.10.20
domain: examplename.
```

### 5. Run

```
node lib/handout.js
```

Example logging output, indicating source of each request:

```
$ node lib/handout.js 
[debug] (webserver) Webserver opened at host 100.200.10.20
[debug] (authns) Authoritative Nameserver opened for domain examplename.
[debug] (authns) 200.10.100.5 req: examplename. IN A
[debug] (webserver) 200.10.100.5 req: index.html (200)
[debug] (webserver) 200.10.100.5 req: /about.html (200)
[debug] (webserver) 200.10.100.5 req: /img/kitty.png (200)
[debug] (webserver) 200.10.100.5 req: /path/to/nowhere.html (404)
```

### 6. Update your domain on Handshake

You must add a `GLUE4` record to the resource data for your name on the blockchain:

```
hsw-rpc sendupdate examplename \
'{"records":[{ "type": "GLUE4", "ns": "ns.examplename.", "address": "<YOUR IP>"}]}'
```

### 7. Browse to your website!

From a computer configured to resolve Handshake domains, you should be able to visit your website at

[http://examplename/](http://examplename/)


### 8. Personalize

Your website's root directory is inside this repo at `html/`. Edit the files in there to build your Handshake website!
By default only static pages are supported, but the webserver at `lib/webserver.js` can be configured for more dynamic applicaitons.


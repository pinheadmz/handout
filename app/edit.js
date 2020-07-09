'use strict';

const punycode = require('punycode');

class Edit {
  constructor(domain, name, status) {
    this.domain = domain;
    this.name = name;
    this.status = status;
  }

  render() {
    return `
<HTML>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8">
  <link rel="stylesheet" href="css/normalize.css">
  <link rel="stylesheet" href="css/milligram.css">
  <link rel="apple-touch-icon" sizes="180x180" href="img/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="img/favicon-16x16.png">

<title>${punycode.toUnicode(this.name)} . Proof Of Concept</title>
</head>
<body>

  <div class="header" style="text-align:center">
    <br>
    <h1>${punycode.toUnicode(this.name)}</h1>
    <a href="https://${this.domain}/">
      <h3>. Proof Of Concept</h3>
    </a>
  </div>
  <hr>

  <div class="profile container">
    <div class="row">
      <div class="column"></div>
      <div class="column">
        <h3>Update Your Status:</h3>
          <textarea id="status" style="height:17em" maxlength="500">${this.status}</textarea>
          <label for="password">Password</label>
          <input type="password" id="password" style="width:90%;margin-right:5px">
          <span id="password-ok"></span>
          <input class="button-primary" type="submit" value="update" id="update" disabled>
          <div id="response"></div>
      </div>
      <div class="column"></div>
    </div>
    <br>
    <div style="text-align:center">
      <small>No hate speech of any kind is allowed.<br>Please be nice.</small>
    </div>
  </div>
  <hr>


  <div class="footer" style="padding:10px">
    <a href="about.html">About this website</a>
  </div>

  <script src="js/poc.js"></script>
</body>

    `;
  }
}

module.exports = Edit;

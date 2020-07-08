'use strict';

class Index {
  constructor(domain, history) {
    this.domain = domain;

    let h = '';
    for (const item of history) {
      h += `<a href="https://${item.subdomain}.${this.domain}">`;
      h +=   `<strong>${item.subdomain}.${this.domain}:</strong>`;
      h += '</a><br>';
      h += `${item.status}<p>`;
    }
    this.history = h;
  }

  render() {
    return `
<HTML>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="css/normalize.css">
  <link rel="stylesheet" href="css/milligram.css">

<title>Proof Of Concept</title>
</head>
<body>

  <div class="header" style="text-align:center">
    <h1>Proof Of Concept</h1>
    <h3>Use Handshake. &#129309; Make a friend.</h3>
  </div>
  <hr>

  <div class="register container">
    <div class="row">
      <div class="column"></div>
      <div class="column">
        <label for="subdomain">Subdomain</label>
        <input type="text" id="subdomain" style="width:90%;margin-right:5px">
        <span id="subdomain-ok"></span>
        <label for="password">Password</label>
        <input type="password" id="password" style="width:90%;margin-right:5px">
        <span id="password-ok"></span>
        <input class="button-primary" type="submit" value="register" id="register" disabled>
        <div id="response"></div>
      </div>
      <div class="column"></div>
    </div>
  </div>
  <hr>

  <div class="content container" style="text-align:center">
    <div class="row">
      <div class="column"></div>
      <div class="column">
        <h2>Latest Status Updates:</h2>
        ${this.history}
      </div>
      <div class="column"></div>
    </div>
  </div>

  <div class="footer">
    <a href="about.html">About this website</a>
  </div>

  <script src="js/poc.js"></script>
</body>

    `;
  }
}

module.exports = Index;

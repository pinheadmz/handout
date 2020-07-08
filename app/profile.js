'use strict';

class Profile {
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
  <link rel="stylesheet" href="css/normalize.css">
  <link rel="stylesheet" href="css/milligram.css">

<title>${this.name} . Proof Of Concept</title>
</head>
<body>

  <div class="header" style="text-align:center">
    <h1>${this.name}</h1>
    <a href="https://${this.domain}/">
      <h3>. Proof Of Concept</h3>
    </a>
  </div>
  <hr>

  <div class="profile container">
    <div class="row">
      <div class="column"></div>
      <div class="column">
        <h3>Status:</h3>
        <div class="status">${this.status}</div>
      </div>
      <div class="column"></div>
    </div>
  </div>
  <hr>


  <div class="footer">
    <a href="about.html">About this website</a>
  </div>

</body>

    `;
  }
}

module.exports = Profile;

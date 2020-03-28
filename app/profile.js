'use strict';

class Profile {
  constructor(name) {
    this.name = name;
  }

  render() {
    return `
<HTML>
<head>
  <title>${this.name} - Handout profile</title>
</head>
<body>
  <h1>${this.name}</h1>
  <hr>
  <a href="about.html">About this website</a>
</body>
    `;
  }
}

module.exports = Profile;

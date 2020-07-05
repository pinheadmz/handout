/* eslint-env browser */
'use strict';

if (document.getElementById('subdomain')) {
  document.getElementById('subdomain').oninput = function() {
    clearResponse();
    checkEnable();
  };
}

document.getElementById('password').oninput = function() {
  clearResponse();
  checkEnable();
};

if (document.getElementById('register')) {
  document.getElementById('register').onclick = function() {
    const subdomain = document.getElementById('subdomain').value;
    const password = document.getElementById('password').value;

    const http = new XMLHttpRequest();
    const url = 'register';
    const params = `subdomain=${subdomain}&password=${password}`;

    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    http.onreadystatechange = function() {
      document.getElementById('register').disabled = true;

      if (http.readyState === 4) {
        if (http.status === 200)
          addResponse(true, http.response);
        else
          addResponse(false, http.response);
      }
    };

    http.send(params);
  };
}

if (document.getElementById('update')) {
  document.getElementById('update').onclick = function() {
    const status = document.getElementById('status').value;
    const password = document.getElementById('password').value;

    const http = new XMLHttpRequest();
    const url = 'update';
      const params = `status=${status}&password=${password}`;

    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    http.onreadystatechange = function() {
      document.getElementById('update').disabled = true;

      if (http.readyState === 4) {
        if (http.status === 200)
          addResponse(true, http.response);
        else
          addResponse(false, http.response);
      }
    };

    http.send(params);
  };
}

function checkSubdomain() {
  if (!document.getElementById('subdomain'))
    return true;

  const subdomain = document.getElementById('subdomain').value;

  if (!verifyName(subdomain)) {
    document.getElementById('subdomain-ok').innerHTML = '&#128078;';
    return false;
  } else {
    document.getElementById('subdomain-ok').innerHTML = '&#128076';
    return true;
  }
};

function checkPassword() {
  const password = document.getElementById('password').value;

  if (password.length < 8) {
    document.getElementById('password-ok').innerHTML = '&#128078;';
    return false;
  } else {
    document.getElementById('password-ok').innerHTML = '&#128076';
    return true;
  }
};

function checkEnable() {
  const s = checkSubdomain();
  const p = checkPassword();

  if (s && p) {
    if (document.getElementById('register'))
      document.getElementById('register').disabled = false;

    if (document.getElementById('update'))
      document.getElementById('update').disabled = false;
  } else {
    if (document.getElementById('register'))
      document.getElementById('register').disabled = true;

    if (document.getElementById('update'))
      document.getElementById('update').disabled = true;
  }
}

function addResponse(success, msg) {
  const color = success ? '#8ad37e' : '#d37e8c';

  const span =
    `<div style="color:white;background-color:${color};padding:5px;border-radius:5px">` +
    msg +
    '</div>';

  document.getElementById('response').innerHTML = span;
}

function clearResponse() {
  document.getElementById('response').innerHTML = '';
}

function verifyName(str) {
  const CHARSET = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
    0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 4,
    0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0
  ]);

  if (typeof str !== 'string')
    return false;

  if (str.length === 0)
    return false;

  if (str.length > 63)
    return false;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);

    // No unicode characters.
    if (ch & 0xff80)
      return false;

    const type = CHARSET[ch];

    switch (type) {
      case 0: // non-printable
        return false;
      case 1: // 0-9
        break;
      case 2: // A-Z
        return false;
      case 3: // a-z
        break;
      case 4: // - and _
        // Do not allow at end or beginning.
        if (i === 0 || i === str.length - 1)
          return false;
        break;
    }
  }

  return true;
}

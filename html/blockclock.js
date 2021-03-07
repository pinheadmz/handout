/* eslint-env browser */
'use strict';

const canvas = document.getElementById('c1');
const ctx = canvas.getContext('2d');

// Initialize with mainnet network parameters
let params = {treeinterval: 36, halvening: 170000};
let latestBlocks = {};
const state = {};

/**
 *  DRAW ARTWORK
 */

// Draws tree branches recursively
// https://dev.to/lautarolobo/
// use-javascript-and-html5-to-code-a-fractal-tree-2n69
function drawBranches(startX, startY, len, angle, branchWidth) {
  ctx.lineWidth = branchWidth;

  ctx.beginPath();
  ctx.save();

  // Get color from last 3 bytes of current block's tree root
  const hash = state.tip.treeRoot;
  const color = '#' + hash.slice(-6);
  ctx.strokeStyle = color;

  // Draw one branch
  ctx.translate(startX, startY);
  ctx.rotate(angle * Math.PI/180);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();

  // Some finesse
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';

  // End recursion once lines get too short
  if (len < 5) {
    ctx.restore();
    return;
  }

  // Get fractal angle from first byte of current block's tree root
  const tweak = (parseInt(hash.slice(0, 2), 16) % 40) + 5;
  drawBranches(0, -len, len * 0.8, angle - tweak, branchWidth * 0.8);
  drawBranches(0, -len, len * 0.8, angle + tweak, branchWidth * 0.8);

  ctx.restore();
}

// Initiates recursive fractal branch-drawing
function drawTree() {
  // Compute percent completion of tree interval and set fractal size
  const len = 60 * (state.interval / params.treeinterval);
  drawBranches(400, 400, len, 0, 10);

  // Tree caption
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + String(64 / 4) + 'px Courier';
  ctx.fillText(
    String(state.interval) + '/' + String(params.treeinterval),
    400,
    410
  );
}

// Fills lower semicircle with halvening meter and difficulty progress
function drawHalvening() {
  const height = state.tip.height;
  const remainder = height % params.halvening;
  const percent = remainder / params.halvening;
  const radius = 250;

  ctx.beginPath();
  const grd = ctx.createRadialGradient(400, 450, 0, 400, 450, radius);

  // Create gradient color pattern out of a sequence of the
  // target bits from each of the blocks in history object
  let border = null;
  for (let i = 0; i < state.bits.length; i++) {
    const hex = state.bits[i];
    const color = '#' + hex.slice(2);
    if (!border)
      border = color;
    grd.addColorStop(i / state.bits.length, color);
  }
  ctx.fillStyle = grd;

  // Draw portion of semicircle and fill with gradient
  ctx.moveTo(400, 450);
  ctx.lineTo((400 / 2) + radius, 450);
  ctx.arc(400, 450, radius, 0, percent * Math.PI);
  ctx.lineTo(400, 450);
  ctx.fill();

  // Outline semicircle
  ctx.lineWidth = 1;
  ctx.strokeStyle = border; // first color used in gradient (oldest block)
  ctx.moveTo(400, 450);
  ctx.lineTo((400 / 2) + radius, 450);
  ctx.arc(400, 450, radius, 0, Math.PI);
  ctx.lineTo(400, 450);
  ctx.stroke();

  // Halvening caption
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + String(64 / 4) + 'px Courier';
  ctx.fillText(
    String(remainder) + '/' + String(params.halvening),
    400,
    440
  );
}

// Draw block using colors derived from its hash
// and place around the circle based on time since received
function drawBlock(block, offX, offY, size = 1, tip = false) {
  // Compute proportions of 'bit' circles and text
  const fontSize = 64 / size;
  const d = 26 / size;
  const r = d / 2;

  // Derive two colors from the last 6 bytes of the block hash
  const hash = block.hash;
  const color1 = '#' + hash.slice(-6);
  const color0 = '#' + hash.slice(-12, -6);

  // If this is the tip, we draw its hash in the favicon too :-)
  let favicon = null;
  let favctx = null;
  if (tip) {
    favicon = document.createElement('canvas');
    favicon.width = 16;
    favicon.height = 16;
    favctx = favicon.getContext('2d');
  }

  // Draw hash's bits in 32 x 32 grid with two colors
  for (let y = 0; y < 16 ; y++) {
    // Each row is 2 bytes, 16 bits
    const row = hash.slice(y * 4, (y * 4) + 4);
    const bits = parseInt(row, 16).toString(2);
    const fill = '0000000000000000';
    const pattern = fill.slice(bits.length) + bits;

    for (let x = 0; x < 16; x++) {
      const bit = pattern[x];

      // Draw bit dot with corresponding color
      ctx.beginPath();
      ctx.lineWidth = 0.2;
      ctx.fillStyle = parseInt(bit) ? color1 : color0;
      ctx.strokeStyle = 'black';
      ctx.arc(
        (x + 1) * d - r + offX,
        (y + 1) * d - r + offY,
        r,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();

      // favicon
      if (tip) {
        favctx.fillStyle = ctx.fillStyle;
        favctx.fillRect(x, y, x, y);
      }
    }
  }

  // insert favicon if this was tip
  if (tip) {
    const link = document.getElementById('favicon');
    link.href = favicon.toDataURL('image/x-icon');
  }

  // Block caption: height and time since received
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.font = 'bold ' + String(fontSize) + 'px Courier';
  if (block.minago != null) {
    ctx.fillText(
      '#' + block.height + ' 0:' + block.minago.toString().padStart(2, '0'),
      offX,
      (18 * d) + offY + 4
    );
  }
}

// Refresh the entire display
function drawClock() {
  // Blank slate
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Halvening meter is drawn first (background)
  drawHalvening();

  // Draw each block received in the last hour
  const now = new Date().getTime() / 1000;
  for (const height of Object.keys(latestBlocks)) {
    const block = latestBlocks[height];
    // Compute time since block was received
    const minago = Math.max(Math.floor((now - block.recvtime) / 60), 0);
    if (minago > 60)
      continue;

    // Draw block at its corresponding time around clock face
    block.minago = minago;
    const degrees = 360 - ((180 + minago * 6) % 360);
    const rads = degrees * (Math.PI / 180);
    const clockrad = 340;
    const x = Math.floor(clockrad * Math.sin(rads));
    const y = Math.floor(clockrad * Math.cos(rads));
    let tip = false;
    if (parseInt(height) === state.tip.height)
      tip = true;
    drawBlock(block, x + clockrad, y + clockrad, 4, tip);
  }

  // Tree fractal is drawn last (foreground)
  drawTree();
}

/**
 *  SET GLOBAL DATA
 */

// Find the chain tip in the blocks object and set global
function setTip() {
  const keys = Object.keys(latestBlocks);
  const heights = keys.map(x => parseInt(x));
  const max = Math.max(...heights);
  state.tip = latestBlocks[String(max)];
  state.interval = state.tip.height % params.treeinterval;
  if (state.interval === 0)
    state.interval = params.treeinterval;
  state.bits = [];
  const amt = Object.keys(latestBlocks).length;
  for (let i = amt - 1; i >= 0; i--) {
    const value = latestBlocks[state.tip.height - i].bits;
    state.bits.push(value.toString(16));
  }

  // Fill in explanation text with current data
  const hash = state.tip.hash;
  const first = hash.slice(0,-12);
  const second = hash.slice(-12, -6);
  const third = hash.slice(-6);
  document.getElementById('tiphash').innerHTML =
    `${first}` +
    `<span style="color:#${second}">${second}</span>` +
    `<span style="color:#${third}">${third}</span>`;

  const root = state.tip.treeRoot;
  const angle = root.slice(0, 2);
  const middle = root.slice(2, -6);
  const color = root.slice(-6);
  document.getElementById('treeroot').innerHTML =
    `<span style="color:black;background-color:white">${angle}</span>` +
    `${middle}` +
    `<span style="color:#${color}">${color}</span>`;

  let bitslist = '';
  for (const bits of state.bits) {
    bitslist += `<h2><span>${bits.slice(0, 2)}</span>`;
    bitslist += `<span style="color:#${bits.slice(2)}">`;
    bitslist += `${bits.slice(2)}</span></h2>`;
  }
  document.getElementById('bitslist').innerHTML = bitslist;
}

/**
 *  NETWORK UTILS
 */

// Make an async http request
function get(endpoint, callback = () => {}) {
  const http = new XMLHttpRequest();
  http.open('GET', endpoint, true);
  http.onreadystatechange = function() {
    if (http.readyState === 4) {
      if (http.status === 200) {
        callback(http.response);
      } else {
        console.error(`Failed to load "${endpoint}": ` + http.statusText);
      }
    }
  };
  http.send(null);
}

/**
 *  RUN APPLICATION
 */

// Initialize socket to server to recieve real-time updates
function openSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(protocol + '//' + window.location.hostname);
  socket.addEventListener('message', (event) => {
    const data = event.data;
    // event type = MESSAGE
    if (data[0] !== '4')
      return;
    // packet type = EVENT
    if (data[1] !== '2')
      return;

    // We always expect JSON, and it starts after the first two metadata btyes
    const json = JSON.parse(data.slice(2));

    // Message is a new block!
    if (json[0] === 'blocks') {
      latestBlocks = json[1];
      setTip();
      drawClock();
    }
  });
}

// Download network parameters and initial block state
get('params', (res) => {
  params = JSON.parse(res);
  get('blocks.json', (res) => {
    latestBlocks = JSON.parse(res);
    setTip();
    drawClock();
    openSocket();
  });
});

// Warn users of inecure conenction
if (window.location.protocol === 'http:') {
  const modal = document.getElementById('securityWarning');
  modal.style.display = 'block';
  document.onclick = () => {
    modal.style.display = 'none';
  };
}

// TICK TOCK!
setInterval(drawClock, 1000);

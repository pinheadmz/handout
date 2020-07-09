'use strict';

const POCDB = require('../app/db');
const db = new POCDB();

(async () => {
  await db.open();
  const statuses = await db.db.range({
  	gte: db.layout.S.min(),
  	lte: db.layout.S.max(),
  	values: true
  });

  for (const s of statuses) {
  	const subdomain = db.layout.S.decode(s.key)[0];
  	const status = s.value;
  	console.log(subdomain, status)
    const timestamp = parseInt(Date.now() / 1000);

    await db.db.put(
      db.layout.T.encode(subdomain, timestamp),
      status
    );
  }
})();
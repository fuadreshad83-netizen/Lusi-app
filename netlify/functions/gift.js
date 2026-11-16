/* Lusi server: coins, points, gifts and withdrawals. Only this file changes balances. */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj)
});

const MIN_WITHDRAW = 10000;
const ADMIN_SHARE = 0.3;

/* all reads first, then all writes, inside one transaction.
   changes: [{ uid, field: 'coins' | 'points', delta }]
   extra(tx): optional extra writes in the same transaction; it may return a value */
async function apply(changes, entry, extra) {
  return db.runTransaction(async tx => {
    const uids = [...new Set(changes.map(c => c.uid))];
    const refs = uids.map(u => db.doc(`wallets/${u}`));
    const snaps = await Promise.all(refs.map(r => tx.get(r)));
    const w = {};
    snaps.forEach((s, i) => {
      const d = s.exists ? s.data() : {};
      w[uids[i]] = { coins: d.coins || 0, points: d.points || 0 };
    });
    changes.forEach(c => { w[c.uid][c.field] += c.delta; });
    for (const u of uids) {
      if (w[u].coins < 0) throw new Error('not enough coins');
      if (w[u].points < 0) throw new Error('not enough points');
    }
    uids.forEach((u, i) => tx.set(refs[i], w[u], { merge: true }));
    if (entry) tx.set(db.collection('ledger').doc(), { ...entry, time: FieldValue.serverTimestamp() });
    const result = extra ? await extra(tx) : null;
    return { w, result };
  });
}

/* admin: gives coins or points to a user by numeric ID */
async function mint(uid, body, amount) {
  if (uid !== process.env.ADMIN_UID) return reply(403, { error: 'admin only' });
  const currency = body.currency === 'points' ? 'points' : 'coins';
  const q = await db.collection('users').where('numId', '==', Number(body.numId)).limit(1).get();
  if (q.empty) return reply(404, { error: 'ID not found' });
  const to = q.docs[0].id;
  const { w } = await apply(
    [{ uid: to, field: currency, delta: amount }],
    { type: 'mint', currency, from: 'admin', to, amount }
  );
  return reply(200, { ok: true, balance: w[to][currency] });
}

/* user spends coins; the post owner gets 70% in points, admin gets 30% in points */
async function gift(uid, body, amount) {
  if (!body.postId) return reply(400, { error: 'missing post' });
  const post = await db.doc(`posts/${body.postId}`).get();
  if (!post.exists) return reply(404, { error: 'post not found' });
  const owner = post.data().owner;
  if (owner === uid) return reply(400, { error: 'cannot gift yourself' });

  const adminPart = Math.floor(amount * ADMIN_SHARE);
  const ownerPart = amount - adminPart;
  const { w } = await apply([
    { uid, field: 'coins', delta: -amount },
    { uid: owner, field: 'points', delta: ownerPart },
    { uid: process.env.ADMIN_UID, field: 'points', delta: adminPart }
  ], { type: 'gift', from: uid, to: owner, amount, ownerPart, adminPart, postId: body.postId });
  return reply(200, { ok: true, coins: w[uid].coins });
}

/* user cashes out points; a withdrawal request is created and points are held */
async function withdraw(uid, body, amount) {
  if (amount < MIN_WITHDRAW) return reply(400, { error: 'minimum is ' + MIN_WITHDRAW + ' points' });
  const method = String(body.method || '').slice(0, 40);
  const accountName = String(body.accountName || '').trim().slice(0, 80);
  const accountNumber = String(body.accountNumber || '').trim().slice(0, 40);
  if (!method || !accountName || !accountNumber) return reply(400, { error: 'fill all payment details' });

  const { result } = await apply(
    [{ uid, field: 'points', delta: -amount }],
    { type: 'withdraw', from: uid, amount },
    tx => {
      const ref = db.collection('withdrawals').doc();
      tx.set(ref, {
        uid, amount, method, accountName, accountNumber,
        status: 'pending', createdAt: FieldValue.serverTimestamp()
      });
      return ref.id;
    }
  );
  return reply(200, { ok: true, id: result });
}

/* admin: list pending withdrawals */
async function listWithdrawals(uid) {
  if (uid !== process.env.ADMIN_UID) return reply(403, { error: 'admin only' });
  const q = await db.collection('withdrawals').where('status', '==', 'pending').get();
  const rows = q.docs.map(d => {
    const x = d.data();
    return {
      id: d.id, uid: x.uid, amount: x.amount, method: x.method,
      accountName: x.accountName, accountNumber: x.accountNumber,
      time: x.createdAt ? x.createdAt.toMillis() : 0
    };
  }).sort((a, b) => a.time - b.time);
  return reply(200, { ok: true, rows });
}

/* admin: marks a withdrawal as paid, or rejects it and returns the points */
async function resolveWithdrawal(uid, body, paid) {
  if (uid !== process.env.ADMIN_UID) return reply(403, { error: 'admin only' });
  if (!body.id) return reply(400, { error: 'missing id' });
  const ref = db.doc(`withdrawals/${body.id}`);
  await db.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) throw new Error('not found');
    const d = s.data();
    if (d.status !== 'pending') throw new Error('already handled');
    if (!paid) {
      const wRef = db.doc(`wallets/${d.uid}`);
      const ws = await tx.get(wRef);
      const pts = ws.exists ? (ws.data().points || 0) : 0;
      tx.set(wRef, { points: pts + d.amount }, { merge: true });
    }
    tx.update(ref, { status: paid ? 'paid' : 'rejected', handledAt: FieldValue.serverTimestamp() });
  });
  return reply(200, { ok: true });
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });

  try {
    const token = (event.headers.authorization || event.headers.Authorization || '').replace('Bearer ', '');
    if (!token) return reply(401, { error: 'not signed in' });
    const { uid } = await admin.auth().verifyIdToken(token);

    const body = JSON.parse(event.body || '{}');
    const amount = Math.floor(Number(body.amount));

    switch (body.action) {
      case 'mint':
        if (!(amount > 0)) return reply(400, { error: 'bad amount' });
        return mint(uid, body, amount);
      case 'gift':
        if (!(amount > 0)) return reply(400, { error: 'bad amount' });
        return gift(uid, body, amount);
      case 'withdraw':
        if (!(amount > 0)) return reply(400, { error: 'bad amount' });
        return withdraw(uid, body, amount);
      case 'listWithdrawals':
        return listWithdrawals(uid);
      case 'payout':
        return resolveWithdrawal(uid, body, true);
      case 'reject':
        return resolveWithdrawal(uid, body, false);
      default:
        return reply(400, { error: 'unknown action' });
    }
  } catch (e) {
    return reply(400, { error: e.message });
  }
};

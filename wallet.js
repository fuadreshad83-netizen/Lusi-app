/* Wallet, gift, withdraw and admin panel. Balances are changed only by netlify/functions/gift.js */
import { getAuth } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

export const ADMIN_UID = 'P0JdcI4im6UgU0BD7vGpw8XDR4G2';
const API = 'https://lusiapp.netlify.app/.netlify/functions/gift';
const POINTS_PER_USD = 10000;
const ETB_PER_USD = 173;
const MIN_WITHDRAW = 10000;
const GIFT_AMOUNTS = [100, 500, 1000, 5000, 10000];
const METHODS = ['CBE', 'Telebirr', 'Awash Bank', 'Abyssinia Bank', 'Cooperative Bank', 'Dashen Bank', 'Ebirr'];
const RATES = [[1000, 25], [2000, 50], [5000, 100], [10000, 200], [20000, 400], [30000, 600], [50000, 1000], [100000, 2000]];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString();

function panel(html) {
  const m = document.createElement('div');
  m.className = 'modal show';
  m.innerHTML = `<div class="sheet">${html}<button class="btn ghost" data-wclose>✕</button></div>`;
  m.addEventListener('click', e => {
    if (e.target === m || e.target.closest('[data-wclose]')) m.remove();
  });
  document.body.appendChild(m);
  return m;
}

async function call(body) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('not signed in');
  const token = await user.getIdToken();
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

/* wallet: shows coins and points, withdraw form, and how to buy coins */
export function openWallet(uid, toast) {
  const rates = RATES.map(([c, b]) => `<tr><td>${fmt(c)}</td><td>${fmt(b)} ብር</td></tr>`).join('');
  const m = panel(`
    <h3>💰 ዋሌት</h3>
    <div class="row" style="justify-content:space-around">
      <div><small class="hint2">🪙 ኮይን</small><div class="bigid" id="wCoins">…</div></div>
      <div><small class="hint2">💎 ነጥብ</small><div class="bigid" id="wPts">…</div></div>
    </div>
    <p class="hint2" id="wUsd"></p>
    <p class="hint2">ተመን: ${fmt(POINTS_PER_USD)} ነጥብ = $1 = ${ETB_PER_USD} ብር</p>

    <div class="contact">
      <h4>ኮይን ግዛ</h4>
      <table style="width:100%;font-size:14px">${rates}</table>
      <p class="hint2">ብሩን ከላይ ካሉት የክፍያ መንገዶች ወደ ሂሳቡ ላክ፣ የስክሪን ሾቱን እና ስምህን ለአድሚኑ (Lusi Online) ላክ። ከተረጋገጠ ኮይኑ ይገባልሃል።</p>
    </div>

    <div class="contact">
      <h4>ዊዝድሮ (ነጥብ → ብር)</h4>
      <p class="hint2">ዝቅተኛ ${fmt(MIN_WITHDRAW)} ነጥብ። ጥያቄው ሲላክ ነጥቡ ይያዛል፣ አድሚኑ ይከፍላል።</p>
      <input id="wAmt" type="number" inputmode="numeric" placeholder="ነጥብ (ቢያንስ ${fmt(MIN_WITHDRAW)})">
      <select id="wMethod">${METHODS.map(x => `<option>${x}</option>`).join('')}</select>
      <input id="wName" placeholder="ሙሉ ስም">
      <input id="wNum" placeholder="የሂሳብ ቁጥር / ስልክ">
      <button class="btn" id="wGo">ዊዝድሮ ጠይቅ</button>
      <small class="err" id="wErr"></small>
    </div>
  `);
  getDoc(doc(getFirestore(), 'wallets', uid)).then(s => {
    const d = s.exists() ? s.data() : {};
    const pts = d.points || 0;
    m.querySelector('#wCoins').textContent = fmt(d.coins || 0);
    m.querySelector('#wPts').textContent = fmt(pts);
    m.querySelector('#wUsd').textContent = `≈ $${(pts / POINTS_PER_USD).toFixed(2)} · ≈ ${fmt(Math.round(pts / POINTS_PER_USD * ETB_PER_USD))} ብር`;
  }).catch(() => {
    m.querySelector('#wCoins').textContent = '0';
    m.querySelector('#wPts').textContent = '0';
  });
  m.querySelector('#wGo').onclick = async () => {
    m.querySelector('#wErr').textContent = '';
    try {
      await call({
        action: 'withdraw',
        amount: Number(m.querySelector('#wAmt').value),
        method: m.querySelector('#wMethod').value,
        accountName: m.querySelector('#wName').value,
        accountNumber: m.querySelector('#wNum').value
      });
      toast('ዊዝድሮ ተጠይቋል ✓');
      m.remove();
    } catch (err) {
      m.querySelector('#wErr').textContent = err.message;
    }
  };
}

/* gift: spends coins; 70% of it becomes points for the owner, 30% for admin */
export function openGift(p, toast) {
  const me = getAuth().currentUser;
  if (me && p.owner === me.uid) { toast('ለራስህ ጊፍት መላክ አይቻልም'); return; }
  const m = panel(`
    <h3>🎁 ጊፍት ላክ</h3>
    <p class="hint2">በኮይን ትከፍላለህ። ባለቤቱ 70% በነጥብ ያገኛል፣ 30% ለአድሚን ይሄዳል።</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${GIFT_AMOUNTS.map(a => `<button class="btn ghost" data-amt="${a}">🪙 ${fmt(a)}</button>`).join('')}
    </div>
    <small class="err" id="gErr"></small>
  `);
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-amt]');
    if (!b) return;
    b.disabled = true;
    try {
      await call({ action: 'gift', postId: p.id, amount: Number(b.dataset.amt) });
      toast('ተልኳል ✓');
      m.remove();
    } catch (err) {
      m.querySelector('#gErr').textContent = err.message;
      b.disabled = false;
    }
  });
}

/* admin only: mint coins or points, and handle pending withdrawals */
export function openAdmin(toast) {
  const u = getAuth().currentUser;
  if (!u || u.uid !== ADMIN_UID) { toast('ለአድሚን ብቻ'); return; }
  const m = panel(`
    <h3>🛠 አድሚን</h3>
    <div class="contact">
      <h4>ኮይን/ነጥብ ስጥ</h4>
      <input id="aId" inputmode="numeric" placeholder="ID (ለምሳሌ 1000004)">
      <select id="aCur"><option value="coins">🪙 ኮይን</option><option value="points">💎 ነጥብ</option></select>
      <input id="aAmt" type="number" inputmode="numeric" placeholder="መጠን">
      <button class="btn" id="aGo">ስጥ</button>
      <small class="err" id="aErr"></small>
    </div>
    <div class="contact">
      <h4>በመጠባበቅ ላይ ያሉ ዊዝድሮዎች</h4>
      <div id="aList"><p class="hint2">በመጫን ላይ…</p></div>
      <button class="btn small" id="aRef">አድስ</button>
    </div>
  `);

  const loadList = async () => {
    const box = m.querySelector('#aList');
    try {
      const { rows } = await call({ action: 'listWithdrawals' });
      box.innerHTML = rows.length ? rows.map(r => `
        <div class="trd" style="flex-direction:column;align-items:flex-start">
          <b>${fmt(r.amount)} ነጥብ · ${esc(r.method)}</b>
          <small>${esc(r.accountName)} · ${esc(r.accountNumber)}</small>
          <small>UID: ${esc(r.uid)}</small>
          <div class="row">
            <button class="btn small" data-pay="${r.id}">ተከፍሏል</button>
            <button class="btn ghost small" data-rej="${r.id}">ውድቅ</button>
          </div>
        </div>`).join('') : '<p class="hint2">ምንም ጥያቄ የለም</p>';
    } catch (err) {
      box.innerHTML = `<small class="err">${esc(err.message)}</small>`;
    }
  };
  loadList();

  m.querySelector('#aRef').onclick = loadList;
  m.querySelector('#aGo').onclick = async () => {
    m.querySelector('#aErr').textContent = '';
    try {
      const j = await call({
        action: 'mint',
        numId: Number(m.querySelector('#aId').value),
        currency: m.querySelector('#aCur').value,
        amount: Number(m.querySelector('#aAmt').value)
      });
      toast(`ተሰጥቷል ✓ ቀሪ: ${fmt(j.balance)}`);
      m.querySelector('#aAmt').value = '';
    } catch (err) {
      m.querySelector('#aErr').textContent = err.message;
    }
  };
  m.querySelector('#aList').addEventListener('click', async e => {
    const pay = e.target.closest('[data-pay]');
    const rej = e.target.closest('[data-rej]');
    if (!pay && !rej) return;
    const id = (pay || rej).dataset[pay ? 'pay' : 'rej'];
    try {
      await call({ action: pay ? 'payout' : 'reject', id });
      toast(pay ? 'ተከፍሏል ✓' : 'ውድቅ ተደርጓል (ነጥቡ ተመልሷል)');
      loadList();
    } catch (err) {
      toast(err.message);
    }
  });
}
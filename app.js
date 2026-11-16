'use strict';
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, signOut, onAuthStateChanged, deleteUser, updatePassword, linkWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, limit,
  onSnapshot, getDocs, arrayUnion, arrayRemove, deleteField, increment, runTransaction
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

/* ---------- Firebase and Cloudinary ---------- */
const fbApp = initializeApp({
  apiKey: "AIzaSyAZsImgfWx5l67UcoIcFCf_6dQswGiRLhw",
  authDomain: "lusi-app.firebaseapp.com",
  projectId: "lusi-app",
  storageBucket: "lusi-app.firebasestorage.app",
  messagingSenderId: "13239213271",
  appId: "1:13239213271:web:99d4b52948de62c5ab6492"
});
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const gProvider = new GoogleAuthProvider();
gProvider.setCustomParameters({ prompt: 'select_account' });

const CLOUD = 'ticeqh1h';
const PRESET = 'Lusi preset';
const APP = 'Lusi';
const DOMAIN = 'lusi.app';
const LOGO_URL = 'https://res.cloudinary.com/ticeqh1h/image/upload/1794724944223.jpg';
const ADMIN = { name: 'ADMIN MAX 🎩', uname: 'maxvip78', tg: 'https://t.me/maxvip78', wa: 'https://wa.me/251977006155?s=t' };
const COVER_RATIO = 0.42;
const MAX_VOICE_SEC = 60;
const EMOJIS = ['😂', '😍', '😮', '😢', '🔥', '👍', '❤️', '🙏'];

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTxt = s => esc(s).replace(/(^|\s)(#[\p{L}\d_]+)/gu, (m, a, tg) => `${a}<span class="tag" data-act="tag" data-tag="${tg}">${tg}</span>`);
const ago = ts => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
};
const clock = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const withTr = (url, x) => url ? url.replace('/upload/', `/upload/${x}/`) : '';
const avUrl = u => withTr(u, 'c_fill,g_face,w_200,h_200');
const banUrl = u => withTr(u, 'c_fill,w_900,h_400');
const av = (url, name, cls = '') => url
  ? `<div class="av ${cls}" style="background-image:url('${avUrl(url)}')"></div>`
  : `<div class="av ${cls}">${esc(((name || '?')[0] || '?').toUpperCase())}</div>`;
const thumb = p => `<span class="th">${p.type === 'video'
  ? `<video src="${p.url}#t=0.1" muted playsinline preload="metadata"></video>`
  : `<img src="${p.url}" alt="">`}</span>`;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}
const openM = id => $('#' + id).classList.add('show');
function closeM(id) {
  $('#' + id).classList.remove('show');
  if (id === 'chatModal') closeChat();
  if (id === 'camModal') stopCam();
  if (id === 'cropModal') endCrop();
  if (id === 'viewModal') $('#viewBody').innerHTML = '';
}
function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
const isOnline = u => !!(u && u.online && Date.now() - (u.lastSeen || 0) < 150000);
const statusHTML = u => isOnline(u)
  ? `<span class="dot-on"></span>${t('online')}`
  : `<span class="dot-off"></span>${t('offline')}${u && u.lastSeen ? ' · ' + ago(u.lastSeen) : ''}`;
const pwOK = p => p.length >= 6 && /[a-zA-Z]/.test(p) && /\d/.test(p);
const normPhone = s => {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '251' + d.slice(1);
  if (d.length === 9) d = '251' + d;
  return d;
};
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- i18n ---------- */
const I = {
  en: {
    welcome: 'Welcome', loginSub: 'Share your moments with the world', signGoogle: 'Sign in with Google',
    createAcc: 'Create account', loginId: 'Log in with ID', terms: 'By continuing you agree to our terms',
    login: 'Log in', register: 'Create account', name: 'Name', email: 'Email', phoneOpt: 'Phone (optional)',
    userId: 'ID', password: 'Password', pwRule: 'At least 6 characters, with letters and numbers',
    gender: 'Gender', male: 'Male', female: 'Female', age: 'Age', theme: 'Theme', light: 'Light', dark: 'Dark',
    haveAcc: 'Already have an account? Log in with ID', noAcc: 'New here? Create account',
    needName: 'Enter your name', badEmail: 'Enter a valid email', badPhone: 'Enter a valid phone number',
    badAge: 'Enter a valid age (5–120)', badPw: 'Password must be at least 6 characters, with letters and numbers',
    badLogin: 'Wrong ID or password', badId: 'Enter a valid ID', emailTaken: 'This email is already registered',
    phoneTaken: 'This phone is already registered', tooMany: 'Too many attempts. Wait a few minutes and try again.',
    setupTitle: 'Complete your profile', saveBtn: 'Save', created: 'Account created! Your ID is', keepId: 'Keep this ID and your password.',
    yourNewId: 'Your new ID', done: 'Done', searchPh: 'Name or ID', shortVideo: 'Short Video', photoM: 'Photo', videoM: 'Video',
    photo: 'Photo', video: 'Video', camera: 'Camera', cancel: 'Cancel', post: 'Post', preview: 'Preview',
    caption: 'Write a caption...', comments: 'Comments', writeComment: 'Add comment...', back: 'Back', home: 'Home',
    friends: 'Friends', inbox: 'Inbox', profile: 'Profile', recentS: 'Recent searches', youMayLike: 'You may like',
    noResults: 'No results', people: 'People', postsT: 'Posts', empty: 'Nothing here yet',
    noFriends: 'Follow people to see their posts here', lusiOnline: 'Lusi Online',
    lusiHi: 'Hi! To talk to our admin ADMIN MAX 🎩, tap a button below.', contactT: 'Contact customer',
    tgBtn: 'Telegram', waBtn: 'WhatsApp', chatsT: 'Chats', tabFollowers: 'Followers', tabLikes: 'Likes', tabChats: 'Chats',
    noFollowers: 'No followers yet', noLikes: 'No likes yet', noMsgs: 'No messages yet', nLike: 'liked your post',
    nCmt: 'commented on your post', nFol: 'started following you', nSend: 'sent you a post', posting: 'Posting',
    posted: 'Posted ✓', failed: 'Failed', canceled: 'Post canceled', finishing: 'Finishing…', follow: 'Follow',
    following: 'Following', msg: 'Message', share: 'Share', download: 'Download', downloading: 'Downloading…',
    downloaded: 'Downloaded ✓', copied: 'Copied', editT: 'Edit profile', banner: 'Change banner', avatarT: 'Change photo',
    bio: 'Bio', confDel: 'Delete this post?', savedT: 'Saved', liked: 'Liked', settings: 'Settings', language: 'Language',
    logout: 'Log out', sent: 'Sent!', online: 'Online', offline: 'Offline', reply: 'Reply', shareTo: 'Share to',
    voice: 'Voice message', image: 'Photo', uploadErr: 'Upload failed, try again', signedOut: 'Logged out',
    postsCount: 'Posts', followersCount: 'Followers', followingCount: 'Following', likesCount: 'Likes', viewsCount: 'Views',
    cropT: 'Crop', cropHint: 'Drag to move, use the slider to zoom', cropSave: 'Save', typeMsg: 'Type a message...',
    emptyPosts: 'No posts yet', newChat: 'New chat', yourId: 'Your ID', setPw: 'Set / change password', newPw: 'New password',
    pwSaved: 'Password saved ✓', pwChanged: 'Password changed ✓', copyId: 'Copy ID', idCopied: 'ID copied',
    tooLong: 'Voice message is limited to 60 seconds', seenT: 'Seen', deliveredT: 'Delivered', pendingT: 'Sending',
    failT: 'Not sent', shareProfile: 'Share profile', refreshed: 'Refreshed ✓'
  },
  am: {
    welcome: 'እንኳን ደህና መጡ', loginSub: 'ጊዜያችሁን ለዓለም አካፍሉ', signGoogle: 'በ Google ግባ',
    createAcc: 'አካውንት ፍጠር', loginId: 'በ ID ግባ', terms: 'ከቀጠልክ የአገልግሎት ውሉን ተስማምተሃል',
    login: 'ግባ', register: 'አካውንት ፍጠር', name: 'ስም', email: 'ኢሜል', phoneOpt: 'ስልክ (አማራጭ)',
    userId: 'ID', password: 'ይለፍ ቃል', pwRule: 'ቢያንስ 6 ቁምፊ፣ ፊደልና ቁጥር',
    gender: 'ጾታ', male: 'ወንድ', female: 'ሴት', age: 'እድሜ', theme: 'ገጽታ', light: 'ብርሃን', dark: 'ጨለማ',
    haveAcc: 'አካውንት አለህ? በ ID ግባ', noAcc: 'አዲስ ነህ? አካውንት ፍጠር',
    needName: 'ስምህን አስገባ', badEmail: 'ትክክለኛ ኢሜል አስገባ', badPhone: 'ትክክለኛ ስልክ ቁጥር አስገባ',
    badAge: 'ትክክለኛ እድሜ አስገባ (5–120)', badPw: 'ይለፍ ቃል ቢያንስ 6 ቁምፊ፣ ፊደልና ቁጥር መሆን አለበት',
    badLogin: 'ID ወይም ይለፍ ቃል ተሳስቷል', badId: 'ትክክለኛ ID አስገባ', emailTaken: 'ይህ ኢሜል ቀደም ብሎ ተመዝግቧል',
    phoneTaken: 'ይህ ስልክ ቀደም ብሎ ተመዝግቧል', tooMany: 'ብዙ ሙከራ ተደርጓል። ጥቂት ደቂቃ ቆይተህ ሞክር።',
    setupTitle: 'ፕሮፋይልህን አጠናቅቅ', saveBtn: 'አስቀምጥ', created: 'አካውንቱ ተፈጥሯል! ID ህ', keepId: 'ID ህንና ይለፍ ቃልህን አስቀምጥ።',
    yourNewId: 'አዲሱ ID ህ', done: 'ጨርስ', searchPh: 'ስም ወይም ID', shortVideo: 'ሾርት ቪዲዮ', photoM: 'ፎቶ', videoM: 'ቪዲዮ',
    photo: 'ፎቶ', video: 'ቪዲዮ', camera: 'ካሜራ', cancel: 'ሰርዝ', post: 'ለጥፍ', preview: 'ቅድመ እይታ',
    caption: 'መግለጫ ጻፍ...', comments: 'አስተያየቶች', writeComment: 'አስተያየት ጨምር...', back: 'ተመለስ', home: 'ዋና',
    friends: 'ጓደኞች', inbox: 'ኢንቦክስ', profile: 'ፕሮፋይል', recentS: 'የቅርብ ጊዜ ፍለጋዎች', youMayLike: 'ሊወዱ ይችላሉ',
    noResults: 'ምንም ውጤት የለም', people: 'ሰዎች', postsT: 'ልጥፎች', empty: 'እስካሁን ምንም የለም',
    noFriends: 'ልጥፎቻቸውን ለማየት ሰዎችን ተከተል', lusiOnline: 'Lusi Online',
    lusiHi: 'ሰላም! ከአድሚናችን ADMIN MAX 🎩 ጋር ለመነጋገር ከታች ያሉትን ቁልፎች ንካ።', contactT: 'ደንበኞች ያነጋግሩ',
    tgBtn: 'ቴሌግራም', waBtn: 'ዋትስአፕ', chatsT: 'ውይይቶች', tabFollowers: 'ተከታዮች', tabLikes: 'ላይኮች', tabChats: 'ውይይቶች',
    noFollowers: 'እስካሁን ተከታይ የለም', noLikes: 'እስካሁን ላይክ የለም', noMsgs: 'እስካሁን ውይይት የለም',
    nLike: 'ልጥፍህን ወደዱት', nCmt: 'በልጥፍህ ላይ አስተያየት ሰጡ', nFol: 'መከተል ጀመሩ', nSend: 'ልጥፍ ላከልህ',
    posting: 'በመለጠፍ ላይ', posted: 'ተለጥፏል ✓', failed: 'አልተሳካም', canceled: 'ልጥፉ ተሰርዟል', finishing: 'በመጨረስ ላይ…',
    follow: 'ተከተል', following: 'እከተላለሁ', msg: 'መልዕክት', share: 'አጋራ', download: 'ዳውንሎድ',
    downloading: 'በማውረድ ላይ…', downloaded: 'ተወርዷል ✓', copied: 'ተቀድቷል', editT: 'ፕሮፋይል አስተካክል',
    banner: 'ባነር ቀይር', avatarT: 'ፎቶ ቀይር', bio: 'ስለ እኔ', confDel: 'ይህ ልጥፍ ይሰረዝ?', savedT: 'የተቀመጡ',
    liked: 'የወደድኳቸው', settings: 'ቅንብሮች', language: 'ቋንቋ', logout: 'ውጣ', sent: 'ተልኳል!', online: 'መስመር ላይ',
    offline: 'መስመር ላይ አይደለም', reply: 'መልስ ስጥ', shareTo: 'ለጓደኞች ላክ', voice: 'የድምጽ መልዕክት', image: 'ፎቶ',
    uploadErr: 'ሰቀላው አልተሳካም፣ እንደገና ሞክር', signedOut: 'ወጥተሃል', postsCount: 'ልጥፎች', followersCount: 'ተከታዮች',
    followingCount: 'ተከታይ', likesCount: 'ላይክ', viewsCount: 'እይታ', cropT: 'ቁረጥ',
    cropHint: 'ለማንቀሳቀስ ጎትት፣ ለማስጠጋት ስላይደሩን ተጠቀም', cropSave: 'አስቀምጥ', typeMsg: 'መልዕክት ጻፍ...',
    emptyPosts: 'እስካሁን ልጥፍ የለም', newChat: 'አዲስ ውይይት', yourId: 'የአንተ ID', setPw: 'ይለፍ ቃል አስቀምጥ / ቀይር',
    newPw: 'አዲስ ይለፍ ቃል', pwSaved: 'ይለፍ ቃል ተቀምጧል ✓', pwChanged: 'ይለፍ ቃል ተቀይሯል ✓', copyId: 'ID ቅዳ',
    idCopied: 'ID ተቀድቷል', tooLong: 'የድምጽ መልዕክት ከ60 ሰከንድ መብለጥ አይችልም', seenT: 'ታይቷል', deliveredT: 'ደርሷል',
    pendingT: 'በመላክ ላይ', failT: 'አልተላከም', shareProfile: 'ፕሮፋይል አጋራ', refreshed: 'ታድሷል ✓'
  }
};
let lang = localStorage.getItem('tf_lang') || 'en';
const t = k => (I[lang] && I[lang][k]) || I.en[k] || k;
function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-i]').forEach(e => e.textContent = t(e.dataset.i));
  $$('[data-p]').forEach(e => e.placeholder = t(e.dataset.p));
}

/* ---------- state ---------- */
let me = null, U = null, busyAuth = false, splashDone = false, pendingScreen = null, authMode = 'id', pendingUser = null;
let posts = [], following = new Set(), followers = new Set(), notifs = [], chats = [];
let view = 'home', prevView = 'home', htab = localStorage.getItem('tf_htab') || 'short', inTab = 'followers';
let viewUid = null, viewU = null, viewFollowingCount = 0, viewFollowersCount = 0;
let pTab = 'mine', chatWith = null, chatUnsub = null, chatTitle = '';
let chatDocs = [], chatPending = [];
let chatRec = null, recStart = 0, recTimer = null, recCancel = false, recAuto = null;
let unsubs = [], deliverUnsubs = new Map(), userWatch = new Map();
const userCache = new Map(), viewedSet = new Set(), missingUsers = new Set(), fetchingUsers = new Set();
let curP = null, replyTo = '', shareP = null, presenceTimer = null, sTimer = null;

let feedState = { short: null, photo: null, friends: null };
let renderedFeed = false, curReelId = null, lastView = 'home', feedShown = null, feedScroll = 0;
let seenSet = new Set(JSON.parse(localStorage.getItem('tf_seen') || '[]'));
let logoImg = null;
const isFeed = (v = view) => v === 'home' || v === 'friends';
const kindNow = () => view === 'friends' ? 'friends' : (htab === 'short' ? 'short' : 'photo');

/* ---------- errors ---------- */
const coded = msg => Object.assign(new Error(msg), { code: 'custom' });
function friendly(e) {
  const c = e.code || '';
  if (e.code === 'custom') return e.message;
  if (c.includes('unauthorized-domain')) return 'This domain is not authorized in Firebase (Authentication → Settings → Authorized domains).';
  if (c.includes('too-many-requests')) return t('tooMany');
  if (c.includes('email-already-in-use')) return t('emailTaken');
  if (c.includes('invalid-email')) return t('badEmail');
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return t('badLogin');
  if (c.includes('weak-password')) return t('badPw');
  if (c.includes('popup-closed') || c.includes('cancelled')) return '';
  return e.message || 'Error';
}

/* ---------- accounts ---------- */
function profileDoc(p) {
  return {
    numId: p.numId, name: p.name, name_lower: p.name.toLowerCase(), bio: '',
    gender: p.gender || 'm', age: p.age || 0, theme: p.theme || 'light',
    avatarUrl: p.avatarUrl || '', coverUrl: '', online: true, lastSeen: Date.now(), createdAt: Date.now()
  };
}
async function nextId() {
  return runTransaction(db, async tx => {
    const ref = doc(db, 'counters', 'users');
    const s = await tx.get(ref);
    if (!s.exists()) { tx.set(ref, { next: 1000001 }); return 1000000; }
    const n = s.data().next;
    tx.update(ref, { next: n + 1 });
    return n;
  });
}
async function ensureId(uid, data) {
  if (data.numId) return data.numId;
  const id = await nextId();
  await updateDoc(doc(db, 'users', uid), { numId: id });
  return id;
}
/* ID or phone or email -> the email Firebase signs in with */
async function resolveEmail(input) {
  const v = String(input || '').trim().toLowerCase();
  if (v.includes('@')) return v;
  if (/^\d{7}$/.test(v)) {
    const s = await getDoc(doc(db, 'lookup', 'id_' + v));
    if (s.exists()) return s.data().email;
    throw coded(t('badLogin'));
  }
  const ph = normPhone(v);
  if (ph.length >= 12) {
    const s = await getDoc(doc(db, 'lookup', 'phone_' + ph));
    if (s.exists()) return s.data().email;
  }
  throw coded(t('badLogin'));
}

function renderAuthMode() {
  const reg = authMode === 'register';
  $('#authTitle').textContent = reg ? t('register') : t('loginId');
  $('#regOnly').hidden = !reg;
  $('#fId').hidden = reg;
  $('#authBtn').textContent = reg ? t('register') : t('login');
  $('#authSwitch').textContent = reg ? t('haveAcc') : t('noAcc');
  $('#pwHint').textContent = reg ? t('pwRule') : '';
  $('#pass').autocomplete = reg ? 'new-password' : 'current-password';
  $('#rTheme').value = localStorage.getItem('tf_theme') || 'light';
  $('#authErr').textContent = '';
}
function openAuth(mode) { authMode = mode; renderAuthMode(); show('authScreen'); }
document.querySelector('[data-act="goRegister"]').onclick = () => openAuth('register');
document.querySelector('[data-act="goLogin"]').onclick = () => openAuth('id');
document.querySelector('[data-act="backLogin"]').onclick = () => show('login');
$('#authSwitch').onclick = () => { authMode = authMode === 'register' ? 'id' : 'register'; renderAuthMode(); };

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#authErr').textContent = '';
  const btn = $('#authBtn');
  btn.disabled = true;
  try {
    const pw = $('#pass').value;
    if (authMode === 'id') {
      if (pw.length < 6) throw coded(t('badPw'));
      const email = await resolveEmail($('#fId').value);
      await signInWithEmailAndPassword(auth, email, pw);
    } else {
      const name = $('#fName').value.trim();
      const email = $('#rEmail').value.trim().toLowerCase();
      const rawPhone = $('#rPhone').value.trim();
      const phone = rawPhone ? normPhone(rawPhone) : '';
      if (!name) throw coded(t('needName'));
      if (!/^\S+@\S+\.\S+$/.test(email)) throw coded(t('badEmail'));
      if (rawPhone && phone.length < 12) throw coded(t('badPhone'));
      if (!pwOK(pw)) throw coded(t('badPw'));
      await registerAccount({ name, email, phone, gender: $('#rGender').value, theme: $('#rTheme').value, pw });
    }
  } catch (err) {
    busyAuth = false;
    $('#authErr').textContent = friendly(err);
  } finally { btn.disabled = false; }
});

async function registerAccount({ name, email, phone, gender, theme, pw }) {
  if (phone && (await getDoc(doc(db, 'lookup', 'phone_' + phone))).exists()) throw coded(t('phoneTaken'));
  busyAuth = true;
  const cred = await createUserWithEmailAndPassword(auth, email, pw);
  let id;
  try {
    id = await nextId();
    await setDoc(doc(db, 'users', cred.user.uid), profileDoc({ numId: id, name, gender, theme }));
    await setDoc(doc(db, 'lookup', 'id_' + id), { email, uid: cred.user.uid });
    if (phone) await setDoc(doc(db, 'lookup', 'phone_' + phone), { email, uid: cred.user.uid });
  } catch (err) {
    busyAuth = false;
    await deleteUser(cred.user).catch(() => {});
    throw err;
  }
  busyAuth = false;
  await loadAndEnter(cred.user.uid);
  $('#bigId').textContent = id;
  openM('idModal');
}

/* Google: chooses an email from the phone's accounts; new users complete the profile */
document.querySelector('[data-act="google"]').onclick = async () => {
  try {
    await signInWithPopup(auth, gProvider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
      try { await signInWithRedirect(auth, gProvider); return; } catch (e2) { toast(friendly(e2)); return; }
    }
    const m = friendly(err);
    if (m) toast(m);
  }
};

$('#setupForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#setupErr').textContent = '';
  const u = pendingUser;
  try {
    if (!u) throw coded(t('badLogin'));
    const name = $('#sName').value.trim();
    const age = Number($('#sAge').value);
    const pw = $('#sPass').value;
    if (!name) throw coded(t('needName'));
    if (!(age >= 5 && age <= 120)) throw coded(t('badAge'));
    if (!pwOK(pw)) throw coded(t('badPw'));
    if (!u.email) throw coded(t('badEmail'));
    busyAuth = true;
    await linkWithCredential(u, EmailAuthProvider.credential(u.email, pw));
    const id = await nextId();
    await setDoc(doc(db, 'users', u.uid), profileDoc({
      numId: id, name, gender: $('#sGender').value, age, theme: localStorage.getItem('tf_theme') || 'light',
      avatarUrl: u.photoURL || ''
    }));
    await setDoc(doc(db, 'lookup', 'id_' + id), { email: u.email, uid: u.uid });
    busyAuth = false;
    pendingUser = null;
    await loadAndEnter(u.uid);
    $('#bigId').textContent = id;
    openM('idModal');
  } catch (err) {
    busyAuth = false;
    $('#setupErr').textContent = friendly(err);
  }
});

/* loads the profile; creates the ID -> email lookup for older accounts that do not have one */
async function loadAndEnter(uid) {
  me = uid;
  const s = await getDoc(doc(db, 'users', uid));
  if (!s.exists()) { await signOut(auth); go('login'); return; }
  const data = s.data();
  const numId = await ensureId(uid, data);
  await repairLookup(uid, numId, auth.currentUser && auth.currentUser.email);
  U = { uid, ...data, numId };
  userCache.set(uid, U);
  if (data.theme) { localStorage.setItem('tf_theme', data.theme); document.body.dataset.theme = data.theme; }
  enterApp();
}
async function repairLookup(uid, numId, email) {
  if (!email || !numId) return;
  try {
    const l = await getDoc(doc(db, 'lookup', 'id_' + numId));
    if (!l.exists()) await setDoc(doc(db, 'lookup', 'id_' + numId), { email, uid });
  } catch (_) {}
}
function go(id) { if (splashDone) show(id); else pendingScreen = id; }
onAuthStateChanged(auth, async user => {
  if (busyAuth) return;
  if (!user) { stopListeners(); me = null; U = null; go('login'); return; }
  const s = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
  if (!s || !s.exists()) { pendingUser = user; go('setupScreen'); return; }
  await loadAndEnter(user.uid);
});

/* ---------- presence ---------- */
async function setPresence(on) {
  if (!me) return;
  try { await updateDoc(doc(db, 'users', me), { online: on, lastSeen: Date.now() }); } catch (_) {}
}
function startPresence() {
  setPresence(true);
  clearInterval(presenceTimer);
  presenceTimer = setInterval(() => setPresence(true), 60000);
}
document.addEventListener('visibilitychange', () => { if (me) { if (document.hidden) setPresence(false); else startPresence(); } });
window.addEventListener('pagehide', () => setPresence(false));

function watchUser(uid) {
  if (!uid || userWatch.has(uid)) return;
  const unsub = onSnapshot(doc(db, 'users', uid), s => {
    if (!s.exists()) return;
    userCache.set(uid, { uid, ...s.data() });
    if (chatWith === uid) { const h = $('#chatStatus'); if (h) h.innerHTML = statusHTML(userCache.get(uid)); }
    if (view === 'user' && viewUid === uid) { const h = $('#viewStatus'); if (h) h.innerHTML = statusHTML(userCache.get(uid)); }
    $$(`[data-status="${uid}"]`).forEach(el => el.innerHTML = statusHTML(userCache.get(uid)));
  }, () => {});
  userWatch.set(uid, unsub);
}
async function ensureUser(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  if (missingUsers.has(uid)) return null;
  const s = await getDoc(doc(db, 'users', uid));
  if (s.exists()) { const d = { uid, ...s.data() }; userCache.set(uid, d); return d; }
  missingUsers.add(uid);
  return null;
}
function userRows(ids) {
  ids.forEach(id => {
    if (userCache.has(id) || missingUsers.has(id) || fetchingUsers.has(id)) return;
    fetchingUsers.add(id);
    ensureUser(id).finally(() => { fetchingUsers.delete(id); if (view === 'inbox' || view === 'user' || view === 'profile') render(); });
  });
  return ids.map(id => {
    const u = userCache.get(id) || {};
    return `<button class="trd" data-act="user" data-uid="${id}">${av(u.avatarUrl, u.name)}
      <div class="tx"><b>${esc(u.name || '…')}</b><small>ID ${u.numId || ''}</small></div></button>`;
  }).join('');
}

/* ---------- listeners ---------- */
function startListeners() {
  stopListeners();
  unsubs.push(onSnapshot(query(collection(db, 'posts'), orderBy('time', 'desc'), limit(200)),
    snap => { posts = snap.docs.map(d => ({ id: d.id, ...d.data() })); onDataChanged(); },
    err => console.warn('posts', err)));
  unsubs.push(onSnapshot(collection(db, 'users', me, 'following'),
    snap => { following = new Set(snap.docs.map(d => d.id)); onDataChanged(); }));
  unsubs.push(onSnapshot(collection(db, 'users', me, 'followers'),
    snap => { followers = new Set(snap.docs.map(d => d.id)); onDataChanged(); }));
  unsubs.push(onSnapshot(query(collection(db, 'notifications'), where('to', '==', me), limit(150)),
    snap => { notifs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.time - a.time); onDataChanged(); }));
  unsubs.push(onSnapshot(query(collection(db, 'chats'), where('members', 'array-contains', me)),
    snap => {
      chats = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      chats.forEach(c => { watchUser(c.members.find(x => x !== me)); watchDelivery(c.id); });
      onDataChanged();
    }, err => console.warn('chats', err)));
}
function stopListeners() {
  unsubs.forEach(f => f()); unsubs = [];
  deliverUnsubs.forEach(f => f()); deliverUnsubs.clear();
  userWatch.forEach(f => f()); userWatch.clear();
}
function watchDelivery(cid) {
  if (deliverUnsubs.has(cid)) return;
  const unsub = onSnapshot(query(collection(db, 'chats', cid, 'messages'), where('to', '==', me), where('delivered', '==', false)),
    snap => snap.docs.forEach(d => updateDoc(d.ref, { delivered: true }).catch(() => {})),
    () => {});
  deliverUnsubs.set(cid, unsub);
}
/* feeds do not re-render on new data (that would restart videos); new posts appear on refresh */
function onDataChanged() {
  if (!U) return;
  if (isFeed()) { updateBadge(); return; }
  render();
  if ($('#cmtModal').classList.contains('show')) renderComments();
}
function enterApp() {
  applyLang();
  startListeners();
  startPresence();
  view = 'home';
  show('app');
  render();
}

/* ---------- Cloudinary upload with real progress ---------- */
function uploadFile(file, onProgress) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let j = {};
      try { j = JSON.parse(xhr.responseText); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && j.secure_url) resolve(j);
      else reject(new Error(j.error?.message || 'upload failed'));
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.onabort = () => reject(new Error('aborted'));
    xhr.send(fd);
  });
  return { promise, abort: () => xhr.abort() };
}

/* ---------- posting queue (1..100 pill) ---------- */
let upQueue = Promise.resolve(), upGen = 0, currentAbort = null;
function enqueueUpload(job) {
  const gen = upGen;
  upQueue = upQueue.then(() => runUpload(job, gen)).catch(() => {});
}
function setPill(p) {
  $('#upNum').textContent = Math.round(p * 100) + '%';
  $('#upArc').style.strokeDashoffset = 94.25 * (1 - p);
}
async function runUpload(job, gen) {
  if (gen !== upGen) return;
  const pill = $('#upPill');
  pill.hidden = false;
  $('#upTxt').textContent = t('posting');
  setPill(0);
  const up = uploadFile(job.file, p => { if (gen === upGen) setPill(p); });
  currentAbort = up.abort;
  try {
    const r = await up.promise;
    if (gen !== upGen) return;
    $('#upTxt').textContent = t('finishing');
    await addDoc(collection(db, 'posts'), {
      owner: me, name: U.name, numId: U.numId, avatar: U.avatarUrl || '',
      type: job.type, url: r.secure_url, caption: job.caption, time: Date.now(),
      reactions: {}, saves: [], comments: [], views: 0
    });
    $('#upTxt').textContent = t('posted');
    setPill(1);
    setTimeout(() => { if (gen === upGen) pill.hidden = true; }, 1400);
  } catch (e) {
    if (gen !== upGen) return;
    $('#upTxt').textContent = t('failed');
    setTimeout(() => { if (gen === upGen) pill.hidden = true; }, 1600);
  } finally { currentAbort = null; }
}
$('#upX').onclick = () => {
  upGen++;
  if (currentAbort) currentAbort();
  $('#upPill').hidden = true;
  toast(t('canceled'));
};

/* ---------- post actions ---------- */
async function toggleLike(p, forceOn) {
  const liked = !!(p.reactions && p.reactions[me]);
  if (forceOn && liked) return;
  const now = !liked;
  p.reactions = { ...(p.reactions || {}) };
  if (now) p.reactions[me] = '❤️'; else delete p.reactions[me];
  refreshPost(p);
  try {
    await updateDoc(doc(db, 'posts', p.id), { [`reactions.${me}`]: now ? '❤️' : deleteField() });
    if (now && p.owner !== me) notify(p.owner, 'like', p.id);
  } catch (e) { toast(t('failed')); }
}
async function toggleSave(p) {
  const saved = (p.saves || []).includes(me);
  p.saves = saved ? p.saves.filter(x => x !== me) : [...(p.saves || []), me];
  refreshPost(p);
  await updateDoc(doc(db, 'posts', p.id), { saves: saved ? arrayRemove(me) : arrayUnion(me) });
}
async function toggleFollow(uid) {
  if (!uid || uid === me) return;
  try {
    if (following.has(uid)) {
      await Promise.all([deleteDoc(doc(db, 'users', me, 'following', uid)), deleteDoc(doc(db, 'users', uid, 'followers', me))]);
    } else {
      await Promise.all([
        setDoc(doc(db, 'users', me, 'following', uid), { time: Date.now() }),
        setDoc(doc(db, 'users', uid, 'followers', me), { time: Date.now() })
      ]);
      notify(uid, 'follow', '');
    }
  } catch (e) { toast(t('failed')); }
}
function notify(to, type, pid) {
  if (!to || to === me) return;
  addDoc(collection(db, 'notifications'), {
    to, from: me, fromName: U.name, fromNum: U.numId, fromAvatar: U.avatarUrl || '', type, pid: pid || '', time: Date.now()
  }).catch(() => {});
}
async function deletePost(p) {
  if (!confirm(t('confDel'))) return;
  await deleteDoc(doc(db, 'posts', p.id));
  $$(`.reel[data-id="${p.id}"]`).forEach(el => el.remove());
  closeM('viewModal');
}

/* ---------- watermark and download ---------- */
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
loadImg(LOGO_URL).then(i => { logoImg = i; }).catch(() => {});
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawWatermark(ctx, w, h, time, name) {
  const s = Math.max(w, h) / 720;
  const pad = 12 * s, bh = 46 * s, lh = 30 * s;
  ctx.font = `700 ${18 * s}px system-ui, sans-serif`;
  const lw = logoImg ? lh * (logoImg.naturalWidth / logoImg.naturalHeight) : 0;
  const gap = lw ? 10 * s : 0;
  const tw = ctx.measureText(name).width;
  const bw = pad + lw + gap + tw + pad;
  const left = Math.floor(time / 3) % 2 === 0;
  const x = left ? 16 * s : w - bw - 16 * s;
  const y = h - bh - 16 * s;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  rr(ctx, x, y, bw, bh, 14 * s);
  ctx.fill();
  if (logoImg) ctx.drawImage(logoImg, x + pad, y + (bh - lh) / 2, lw, lh);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x + pad + lw + gap, y + bh / 2);
}
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function recordWatermarkedVideo(p, onPct) {
  return new Promise(async (resolve, reject) => {
    try {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.playsInline = true;
      v.preload = 'auto';
      v.src = p.url;
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('load')); });
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      const out = c.captureStream(30);
      try {
        const cap = v.captureStream ? v.captureStream() : v.mozCaptureStream();
        cap.getAudioTracks().forEach(tr => out.addTrack(tr));
      } catch (_) {}
      const mt = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(out, mt ? { mimeType: mt } : undefined);
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
      let raf = 0;
      const frame = () => {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        drawWatermark(ctx, c.width, c.height, v.currentTime, p.name || 'Lusi');
        if (v.duration) onPct(Math.round(v.currentTime / v.duration * 100));
        raf = requestAnimationFrame(frame);
      };
      v.onended = () => { cancelAnimationFrame(raf); rec.stop(); };
      rec.start(500);
      await v.play();
      frame();
    } catch (e) { reject(e); }
  });
}
async function downloadPost(p) {
  const b = $('#dlBadge');
  const setB = html => { b.hidden = false; b.innerHTML = html; };
  setB(`<span class="dlspin"></span><span>${t('downloading')}</span>`);
  try {
    if (p.type === 'photo') {
      const img = await loadImg(p.url);
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      drawWatermark(x, c.width, c.height, 0, p.name || 'Lusi');
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
      saveBlob(blob, `lusi-${p.id}.jpg`);
    } else {
      const blob = await recordWatermarkedVideo(p, pct => setB(`<span class="dlspin"></span><span>${t('downloading')} ${pct}%</span>`));
      saveBlob(blob, `lusi-${p.id}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
    }
    setB(`<span class="dlok">✓</span><span>${t('downloaded')}</span>`);
    setTimeout(() => { b.hidden = true; }, 1400);
  } catch (e) {
    console.warn(e);
    b.hidden = true;
    toast(t('failed'));
  }
}
function burst(box) {
  const b = document.createElement('div');
  b.className = 'burst';
  b.textContent = '❤️';
  b.style.left = '50%'; b.style.top = '50%';
  box.appendChild(b);
  setTimeout(() => b.remove(), 800);
}

/* ---------- comments ---------- */
function openCmt(p) {
  curP = p.id;
  replyTo = '';
  $('#replyBar').hidden = true;
  $('#cmtInput').value = '';
  $('#emoBar').innerHTML = EMOJIS.map(e => `<button data-act="emo" data-e="${e}">${e}</button>`).join('');
  renderComments();
  openM('cmtModal');
}
function renderComments() {
  const p = posts.find(x => x.id === curP);
  if (!p) return;
  const list = (p.comments || []).slice().sort((a, b) => a.time - b.time);
  $('#cmtCount').textContent = `${list.length} ${t('comments')}`;
  $('#cmtList').innerHTML = list.length
    ? list.map(c => {
        const L = c.likes || [], D = c.dislikes || [];
        return `<div class="cmt">${av(c.avatar, c.name)}
        <div class="cbody2">
          <b>${esc(c.name)}</b> <small>ID ${esc(c.num)}</small>
          <p>${c.replyTo ? `<span class="rto">${esc(c.replyTo)}</span> ` : ''}${esc(c.t)}</p>
          <div class="cmeta"><span>${ago(c.time)}</span>
            <button class="${L.includes(me) ? 'on' : ''}" data-act="clike" data-cid="${c.id}">👍 ${L.length}</button>
            <button class="${D.includes(me) ? 'on' : ''}" data-act="cdis" data-cid="${c.id}">👎 ${D.length}</button>
            <button data-act="reply" data-n="${esc(c.name)}">${t('reply')}</button>
          </div></div></div>`;
      }).join('')
    : `<p class="empty">${t('empty')}</p>`;
}
async function sendComment() {
  const v = $('#cmtInput').value.trim();
  const p = posts.find(x => x.id === curP);
  if (!v || !p) return;
  $('#cmtInput').value = '';
  const c = {
    id: Math.random().toString(36).slice(2, 10), uid: me, num: U.numId, name: U.name, avatar: U.avatarUrl || '',
    t: v, time: Date.now(), replyTo: replyTo || '', likes: [], dislikes: []
  };
  replyTo = ''; $('#replyBar').hidden = true;
  p.comments = [...(p.comments || []), c];
  renderComments();
  try {
    await updateDoc(doc(db, 'posts', p.id), { comments: arrayUnion(c) });
    if (p.owner !== me) notify(p.owner, 'comment', p.id);
  } catch (e) { toast(t('failed')); }
}
async function reactComment(cid, kind) {
  const p = posts.find(x => x.id === curP);
  if (!p) return;
  const local = (p.comments || []).find(x => x.id === cid);
  if (local) {
    local.likes = [...(local.likes || [])];
    local.dislikes = [...(local.dislikes || [])];
    const mine = kind === 'like' ? local.likes : local.dislikes;
    const other = kind === 'like' ? local.dislikes : local.likes;
    const i = mine.indexOf(me);
    if (i >= 0) mine.splice(i, 1);
    else { mine.push(me); const j = other.indexOf(me); if (j >= 0) other.splice(j, 1); }
    renderComments();
  }
  try {
    await runTransaction(db, async tx => {
      const ref = doc(db, 'posts', p.id);
      const s = await tx.get(ref);
      const arr = (s.data().comments || []).map(c => ({ ...c, likes: [...(c.likes || [])], dislikes: [...(c.dislikes || [])] }));
      const c = arr.find(x => x.id === cid);
      if (!c) return;
      const mine = kind === 'like' ? c.likes : c.dislikes;
      const other = kind === 'like' ? c.dislikes : c.likes;
      const i = mine.indexOf(me);
      if (i >= 0) mine.splice(i, 1);
      else { mine.push(me); const j = other.indexOf(me); if (j >= 0) other.splice(j, 1); }
      tx.update(ref, { comments: arr });
    });
  } catch (e) { toast(t('failed')); }
}

/* ---------- share ---------- */
async function openShare(p) {
  shareP = p;
  const ids = [...new Set([...following, ...followers])].filter(x => x !== me);
  await Promise.all(ids.map(ensureUser));
  $('#sendList').innerHTML = ids.length
    ? ids.map(uid => {
        const u = userCache.get(uid) || {};
        return `<button class="shp" data-act="shareTo" data-uid="${uid}">${av(u.avatarUrl, u.name)}<span>${esc(u.name || '?')}</span></button>`;
      }).join('')
    : `<p class="empty">${t('noFriends')}</p>`;
  openM('sendModal');
}

/* ---------- rendering: posts ---------- */
function followBtnHTML(uid) {
  if (!uid || uid === me) return '';
  const f = following.has(uid);
  return `<button class="mini ${f ? 'on' : ''}" data-act="follow" data-uid="${uid}">${f ? t('following') : t('follow')}</button>`;
}
function cardHTML(p) {
  return `<article class="post" data-id="${p.id}">
    <div class="ph">
      <div class="who" data-act="user" data-uid="${p.owner}">${av(p.avatar, p.name)}
        <div><b>${esc(p.name)}</b><small>ID ${esc(p.numId || '')} · ${ago(p.time)}</small></div></div>
      ${p.owner === me ? '' : followBtnHTML(p.owner)}
    </div>
    <div class="media" data-id="${p.id}">${p.type === 'video'
      ? `<video src="${p.url}" loop muted playsinline controls preload="metadata"></video>`
      : `<img src="${p.url}" alt="">`}</div>
    ${p.caption ? `<p class="cap">${fmtTxt(p.caption)}</p>` : ''}
    <div class="acts" data-acts="${p.id}">${cardActs(p)}</div>
  </article>`;
}
function railHTML(p) {
  const liked = !!(p.reactions && p.reactions[me]);
  const n = Object.keys(p.reactions || {}).length;
  const saved = (p.saves || []).includes(me);
  return `<button data-act="user" data-uid="${p.owner}" style="background:none">${av(p.avatar, p.name)}</button>
    <button class="${liked ? 'on' : ''}" data-act="like" data-id="${p.id}">${liked ? '❤️' : '🤍'}<small>${n}</small></button>
    <button data-act="cmt" data-id="${p.id}">💬<small>${(p.comments || []).length}</small></button>
    <button class="${saved ? 'on' : ''}" data-act="save" data-id="${p.id}">${saved ? '🔖' : '📑'}</button>
    <button data-act="share" data-id="${p.id}">↗️</button>
    <button data-act="dl" data-id="${p.id}">⬇️</button>`;
}
function cardActs(p) {
  const liked = !!(p.reactions && p.reactions[me]);
  const n = Object.keys(p.reactions || {}).length;
  const saved = (p.saves || []).includes(me);
  return `<button class="${liked ? 'on' : ''}" data-act="like" data-id="${p.id}">${liked ? '❤️' : '🤍'} ${n}</button>
      <button data-act="cmt" data-id="${p.id}">💬 ${(p.comments || []).length}</button>
      <button class="${saved ? 'on' : ''}" data-act="save" data-id="${p.id}">${saved ? '🔖' : '📑'}</button>
      <button data-act="share" data-id="${p.id}">↗️</button>
      <button data-act="dl" data-id="${p.id}">⬇️</button>`;
}
function refreshPost(p) {
  $$(`[data-acts="${p.id}"]`).forEach(el => el.innerHTML = cardActs(p));
  $$(`.reel[data-id="${p.id}"] .rail`).forEach(el => el.innerHTML = railHTML(p));
}

/* ---------- feeds: full-screen, ranked, refreshable ---------- */
function score(p) {
  return Object.keys(p.reactions || {}).length + 2 * (p.comments || []).length + 2 * (p.saves || []).length;
}
/* a post is public once it has 3+ points (likes + 2×comments + 2×saves); until then only the owner and followers see it */
function eligible(p, kind) {
  if (kind === 'friends') return following.has(p.owner) || p.owner === me;
  if (kind === 'short' ? p.type !== 'video' : p.type !== 'photo') return false;
  return p.owner === me || following.has(p.owner) || score(p) >= 3;
}
function buildFeed(kind) {
  const list = posts.filter(p => eligible(p, kind));
  const fresh = list.filter(p => !seenSet.has(p.id)).sort((a, b) => b.time - a.time);
  const old = shuffle(list.filter(p => seenSet.has(p.id)));
  feedState[kind] = [...fresh, ...old].map(p => p.id);
  return feedState[kind];
}
/* original files, no transformations; a video's first frame is the poster that shows instantly */
const feedPoster = url => url.replace(/\.[a-z0-9]+$/i, '.jpg');

function feedItemHTML(p) {
  const media = p.type === 'video'
    ? `<video src="${p.url}" poster="${feedPoster(p.url)}" loop playsinline preload="metadata"></video><div class="buf"></div><div class="pauseIco">▶</div>`
    : `<img src="${p.url}" alt="">`;
  return `<section class="reel" data-id="${p.id}"><div class="rin">
    ${media}
    <div class="rail">${railHTML(p)}</div>
    <div class="rinfo">
      <div class="ownerRow" data-act="user" data-uid="${p.owner}"><b>${esc(p.name)}</b><span>ID ${esc(p.numId || '')}</span></div>
      ${p.owner === me ? '' : followBtnHTML(p.owner)}
      ${p.caption ? `<p>${fmtTxt(p.caption)}</p>` : ''}
    </div>
    ${p.type === 'video' ? '<div class="prog"><i></i></div>' : ''}
  </div></section>`;
}
function feedHTML(kind) {
  let ids = feedState[kind];
  if (!ids || !ids.length) ids = buildFeed(kind);
  const byId = new Map(posts.map(p => [p.id, p]));
  const items = ids.map(id => byId.get(id)).filter(p => p && eligible(p, kind));
  if (!items.length) return `<p class="empty">${t(kind === 'friends' ? 'noFriends' : 'empty')}</p>`;
  return items.map(feedItemHTML).join('');
}
function wireVideos(root) {
  root.querySelectorAll('.rin').forEach(rin => {
    const v = rin.querySelector('video');
    if (!v) return;
    v.addEventListener('waiting', () => rin.classList.add('loading'));
    v.addEventListener('stalled', () => rin.classList.add('loading'));
    v.addEventListener('playing', () => rin.classList.remove('loading', 'paused'));
    v.addEventListener('canplay', () => rin.classList.remove('loading'));
    v.addEventListener('pause', () => rin.classList.toggle('paused', v.dataset.user === 'pause'));
  });
}
function playSound(v) {
  if (!v || v.dataset.user === 'pause') return;
  const rin = v.closest('.rin');
  if (rin && v.readyState < 3) rin.classList.add('loading');
  v.muted = false;
  v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
}
function toggleVideo(v) {
  if (!v) return;
  if (v.paused) { v.dataset.user = ''; playSound(v); }
  else { v.dataset.user = 'pause'; v.pause(); }
}
function markSeen(id) {
  if (!id || seenSet.has(id)) return;
  seenSet.add(id);
  localStorage.setItem('tf_seen', JSON.stringify([...seenSet].slice(-600)));
}
function countView(id) {
  if (viewedSet.has(id)) return;
  viewedSet.add(id);
  const p = posts.find(x => x.id === id);
  if (p && p.owner !== me) updateDoc(doc(db, 'posts', id), { views: increment(1) }).catch(() => {});
}

function isChatUnread(c) {
  const seen = JSON.parse(localStorage.getItem('tf_chatseen') || '{}');
  return c.lastFrom && c.lastFrom !== me && (c.lastTime || 0) > (seen[c.id] || 0);
}
function inboxHTML() {
  const lusiRow = `<button class="trd" data-act="lusi"><div class="avw">${av('', 'L')}</div>
    <div class="tx"><b>${esc(t('lusiOnline'))}</b><small>${esc(t('lusiHi'))}</small></div></button>`;
  const tabs = `<div class="intabs seg">${['followers', 'likes', 'chats'].map(k =>
    `<button class="${inTab === k ? 'on' : ''}" data-act="intab" data-k="${k}">${t('tab' + k[0].toUpperCase() + k.slice(1))}</button>`).join('')}</div>`;
  let body = '';
  if (inTab === 'followers') {
    const ids = [...followers];
    body = ids.length ? userRows(ids) : `<p class="empty">${t('noFollowers')}</p>`;
  } else if (inTab === 'likes') {
    const rows = notifs.filter(n => n.type === 'like').slice(0, 80).map(n => {
      const p = posts.find(x => x.id === n.pid);
      return `<button class="trd" data-act="open" data-id="${n.pid}">${p ? thumb(p) : ''}
        <div class="tx"><b>${esc(n.fromName)}</b> <small>ID ${esc(n.fromNum || '')}</small> ${t('nLike')}<small>${ago(n.time)}</small></div></button>`;
    }).join('');
    body = rows || `<p class="empty">${t('noLikes')}</p>`;
  } else {
    const rows = chats.map(c => {
      const other = c.members.find(x => x !== me);
      const u = userCache.get(other) || {};
      if (!u.uid) watchUser(other);
      const name = u.name || (c.names && c.names[other]) || '?';
      return `<button class="trd ${isChatUnread(c) ? 'new' : ''}" data-act="chat" data-uid="${other}" data-name="${esc(name)}">
        <div class="avw">${av(u.avatarUrl, name)}</div>
        <div class="tx"><b>${esc(name)}</b><small data-status="${other}">${statusHTML(u)}</small>
          <small>${c.lastFrom === me ? '✓ ' : ''}${esc(c.last || '')}</small></div>
        ${isChatUnread(c) ? '<u>•</u>' : ''}</button>`;
    }).join('');
    body = rows || `<p class="empty">${t('noMsgs')}</p>`;
  }
  return `<div class="inboxtop"><b>${t('inbox')}</b><button class="btn small" data-act="newChat">✎ ${t('newChat')}</button></div>` +
    lusiRow + tabs + body;
}
function unreadCount() {
  const seenA = Number(localStorage.getItem('tf_actseen') || 0);
  return notifs.filter(n => n.time > seenA).length + chats.filter(isChatUnread).length;
}
function updateBadge() {
  const n = unreadCount();
  const b = $('#badge');
  b.hidden = !n;
  b.textContent = n > 9 ? '9+' : n;
}

function profileHTML(uid) {
  const isMe = uid === me;
  const P = isMe ? U : viewU;
  if (!P || P.uid !== uid) return `<p class="empty">${t('empty')}</p>`;
  const mine = posts.filter(p => p.owner === uid);
  const likes = mine.reduce((n, p) => n + Object.keys(p.reactions || {}).length, 0);
  const views = mine.reduce((n, p) => n + (p.views || 0), 0);
  const fol = isMe ? followers.size : viewFollowersCount;
  const fing = isMe ? following.size : viewFollowingCount;
  let list = mine;
  if (isMe && pTab === 'saved') list = posts.filter(p => (p.saves || []).includes(me));
  if (isMe && pTab === 'liked') list = posts.filter(p => p.reactions && p.reactions[me]);
  const cover = P.coverUrl ? `style="background-image:url('${banUrl(P.coverUrl)}')"` : '';
  return `<div class="pf">
    <div class="pcover" ${cover}>
      <div class="ptop">
        ${isMe
          ? `<button class="pbtn" data-act="edit" aria-label="${t('editT')}">✎</button>`
          : `<button class="pbtn" data-act="back" aria-label="${t('back')}">‹</button>`}
        <button class="pbtn" data-act="menu" aria-label="menu">☰</button>
      </div>
    </div>
    <div class="pid">
      <div class="pav">${av(P.avatarUrl, P.name, 'lg')}</div>
      <div class="pname">${esc(P.name)}</div>
      <div class="puid">ID ${esc(P.numId || '')} ${isMe ? '' : `· <span id="viewStatus">${statusHTML(P)}</span>`}</div>
      ${P.bio ? `<p class="pbio">${esc(P.bio)}</p>` : ''}
    </div>
    <div class="pstats">
      <div><b>${mine.length}</b><small>${t('postsCount')}</small></div>
      <button data-act="list" data-k="followers" data-uid="${uid}"><b>${fol}</b><small>${t('followersCount')}</small></button>
      <button data-act="list" data-k="following" data-uid="${uid}"><b>${fing}</b><small>${t('followingCount')}</small></button>
      <div><b>${likes}</b><small>${t('likesCount')}</small></div>
      <div><b>${views}</b><small>${t('viewsCount')}</small></div>
    </div>
    <div class="pbtns">
      ${isMe
        ? `<button data-act="edit">${t('editT')}</button><button data-act="shareProfile">${t('shareProfile')}</button>`
        : `<button class="btn" data-act="follow" data-uid="${uid}">${following.has(uid) ? t('following') : t('follow')}</button>
           <button data-act="chat" data-uid="${uid}" data-name="${esc(P.name)}">${t('msg')}</button>`}
    </div>
    ${isMe ? `<div class="ptabs2">
      <button class="${pTab === 'mine' ? 'on' : ''}" data-act="ptab" data-pt="mine" aria-label="posts">▦</button>
      <button class="${pTab === 'saved' ? 'on' : ''}" data-act="ptab" data-pt="saved" aria-label="${t('savedT')}">🔖</button>
      <button class="${pTab === 'liked' ? 'on' : ''}" data-act="ptab" data-pt="liked" aria-label="${t('liked')}">❤️</button>
    </div>` : ''}
    <div class="grid">${list.length
      ? list.map(p => `<button class="gi" data-act="open" data-id="${p.id}">${p.type === 'video'
          ? `<video src="${p.url}#t=0.1" muted playsinline preload="metadata"></video>`
          : `<img src="${p.url}" alt="">`}
          <span class="pc">❤ ${Object.keys(p.reactions || {}).length} · 👁 ${p.views || 0}</span></button>`).join('')
      : `<p class="empty" style="grid-column:1/-1">${t('emptyPosts')}</p>`}</div>
  </div>`;
}

/* the feed DOM stays alive when you leave it; videos pause when hidden and resume where they stopped */
function render() {
  if (!U) return;
  const feedNow = isFeed();
  const home = view === 'home';
  const cur = view === 'user' ? 'profile' : view;
  const main = $('#main'), fb = $('#feedBox'), pb = $('#pageBox');
  const wasFeed = renderedFeed;
  const sameView = view === lastView;
  const st = main.scrollTop;
  if (wasFeed && !feedNow) feedScroll = st;

  $$('.bottom [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === cur));
  $('#app').classList.toggle('feed', feedNow);
  $('#app').classList.toggle('vmode', feedNow);
  $('#app').classList.toggle('nohead', !home);
  $('#app').classList.toggle('pfull', view === 'profile' || view === 'user');
  $('#seg').style.display = home ? 'flex' : 'none';
  $('#sbtn').style.display = home ? 'grid' : 'none';
  $('#rbtn').style.display = home ? 'grid' : 'none';
  $$('#seg button').forEach(b => b.classList.toggle('on', b.dataset.h === htab));

  if (feedNow) {
    const kind = kindNow();
    const changed = feedShown !== kind;
    if (changed) {
      fb.innerHTML = feedHTML(kind);
      wireVideos(fb);
      feedShown = kind;
    }
    fb.style.display = 'block';
    pb.style.display = 'none';
    pb.innerHTML = '';
    main.scrollTop = changed ? 0 : (wasFeed ? st : feedScroll);
  } else {
    fb.querySelectorAll('video').forEach(v => v.pause());
    fb.style.display = 'none';
    pb.style.display = 'block';
    pb.innerHTML = view === 'inbox' ? inboxHTML()
      : view === 'profile' ? profileHTML(me)
      : view === 'user' ? profileHTML(viewUid) : '';
    main.scrollTop = sameView ? st : 0;
  }
  renderedFeed = feedNow;
  lastView = view;
  bindMedia();
  updateBadge();
}

let reelIO = null, viewIO = null;
function bindMedia() {
  if (reelIO) reelIO.disconnect();
  if (viewIO) viewIO.disconnect();
  if (!renderedFeed) return;
  reelIO = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target.querySelector('video');
    if (e.isIntersecting && e.intersectionRatio > .6) {
      curReelId = e.target.dataset.id;
      const nx = e.target.nextElementSibling;
      const nv = nx && nx.querySelector('video');
      if (nv) nv.preload = 'auto';
      if (v) playSound(v);
    } else if (v) {
      v.pause();
      v.dataset.user = '';
    }
  }), { threshold: [0, .6] });
  viewIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || e.intersectionRatio < .5) return;
    markSeen(e.target.dataset.id);
    countView(e.target.dataset.id);
  }), { threshold: [.5] });
  $$('#feedBox .reel').forEach(r => { reelIO.observe(r); viewIO.observe(r); });
}

/* refresh: new posts first, then seen posts shuffled */
$('#rbtn').onclick = () => {
  if (!isFeed()) return;
  feedState[kindNow()] = null;
  feedShown = null;
  render();
  toast(t('refreshed'));
};

/* ---------- another person's profile ---------- */
async function openUser(uid) {
  if (!uid) return;
  if (uid === me) { view = 'profile'; render(); $('#main').scrollTop = 0; return; }
  if (view !== 'user') prevView = view;
  const u = await ensureUser(uid);
  if (!u) { toast(t('empty')); return; }
  watchUser(uid);
  viewU = u;
  viewUid = uid;
  const [f1, f2] = await Promise.all([getDocs(collection(db, 'users', uid, 'following')), getDocs(collection(db, 'users', uid, 'followers'))]);
  viewFollowingCount = f1.size;
  viewFollowersCount = f2.size;
  view = 'user';
  render();
  $('#main').scrollTop = 0;
}
async function openList(kind, uid) {
  const snap = await getDocs(collection(db, 'users', uid, kind));
  const ids = snap.docs.map(d => d.id);
  $('#listTitle').textContent = `${t(kind === 'followers' ? 'followersCount' : 'followingCount')} · ${ids.length}`;
  $('#listBody').innerHTML = ids.length ? userRows(ids) : `<p class="empty">${t('empty')}</p>`;
  openM('listModal');
}

/* ---------- Lusi Online ---------- */
function openLusi() {
  $('#lusiBox').innerHTML = `
    <h3>${esc(t('lusiOnline'))}</h3>
    <div class="contact">
      <h4>${esc(t('contactT'))}</h4>
      <div class="row"><div class="av">M</div><div><b>${esc(ADMIN.name)}</b></div></div>
      <p class="hint2">${esc(t('lusiHi'))}</p>
      <div class="cbtns">
        <a class="tg" href="${ADMIN.tg}" target="_blank" rel="noopener">✈️ ${t('tgBtn')}</a>
        <a class="wa" href="${ADMIN.wa}" target="_blank" rel="noopener">💬 ${t('waBtn')}</a>
      </div>
    </div>
    <button class="btn ghost" data-close="lusiModal">${t('done')}</button>`;
  openM('lusiModal');
}

/* ---------- menu, settings, password ---------- */
function openMenu() {
  $('#menuBox').innerHTML = `
    <div class="mhd">${t('profile')}</div>
    <button class="mi" data-act="edit">✎ <span>${t('editT')}</span></button>
    <button class="mi" data-act="ptab" data-pt="saved">🔖 <span>${t('savedT')}</span></button>
    <button class="mi" data-act="ptab" data-pt="liked">❤️ <span>${t('liked')}</span></button>
    <div class="mhd">${t('settings')}</div>
    <button class="mi" data-act="settings">⚙️ <span>${t('settings')}</span></button>
    <button class="mi" data-act="lusi">💬 <span>${t('lusiOnline')}</span></button>
    <button class="btn ghost" data-close="menuModal">${t('cancel')}</button>`;
  openM('menuModal');
}
function hasPasswordLogin() {
  const u = auth.currentUser;
  return !!(u && u.providerData.some(p => p.providerId === 'password'));
}
function openSettings() {
  const dark = document.body.dataset.theme === 'dark';
  $('#settingsBox').innerHTML = `
    <h3>${t('settings')}</h3>
    <div class="lab">${t('yourId')}</div>
    <div class="row"><b style="font-size:22px">${U.numId}</b><button class="btn small" data-act="copyId">${t('copyId')}</button></div>
    <div class="lab">${t('setPw')}</div>
    <input id="newPw" type="password" maxlength="64" placeholder="${t('newPw')}" autocomplete="new-password">
    <small id="pwErr" class="err"></small>
    <button class="btn" data-act="savePw">${t('setPw')}</button>
    <label>${t('language')}
      <select id="setLang">
        <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
        <option value="am" ${lang === 'am' ? 'selected' : ''}>አማርኛ</option>
      </select></label>
    <label>${t('theme')}
      <select id="setTheme">
        <option value="light" ${!dark ? 'selected' : ''}>${t('light')}</option>
        <option value="dark" ${dark ? 'selected' : ''}>${t('dark')}</option>
      </select></label>
    <div class="contact">
      <h4>${t('contactT')}</h4>
      <div class="cbtns">
        <a class="tg" href="${ADMIN.tg}" target="_blank" rel="noopener">✈️ ${t('tgBtn')}</a>
        <a class="wa" href="${ADMIN.wa}" target="_blank" rel="noopener">💬 ${t('waBtn')}</a>
      </div>
    </div>
    <button class="btn ghost" data-act="logout">${t('logout')}</button>
    <button class="btn ghost" data-close="settingsModal">${t('cancel')}</button>`;
  $('#setLang').onchange = e => { lang = e.target.value; localStorage.setItem('tf_lang', lang); applyLang(); openSettings(); };
  $('#setTheme').onchange = e => {
    document.body.dataset.theme = e.target.value;
    localStorage.setItem('tf_theme', e.target.value);
    if (me) updateDoc(doc(db, 'users', me), { theme: e.target.value }).catch(() => {});
  };
  openM('settingsModal');
}
async function savePassword() {
  const pw = $('#newPw').value;
  $('#pwErr').textContent = '';
  if (!pwOK(pw)) { $('#pwErr').textContent = t('badPw'); return; }
  const u = auth.currentUser;
  if (!u) return;
  try {
    if (hasPasswordLogin()) {
      await updatePassword(u, pw);
      toast(t('pwChanged'));
    } else {
      await linkWithCredential(u, EmailAuthProvider.credential(u.email, pw));
      await setDoc(doc(db, 'lookup', 'id_' + U.numId), { email: u.email, uid: me }).catch(() => {});
      toast(t('pwSaved'));
    }
    $('#newPw').value = '';
  } catch (e) {
    $('#pwErr').textContent = e.code === 'auth/requires-recent-login' ? t('badLogin') : friendly(e);
  }
}

/* ---------- edit profile ---------- */
let edit = null;
function openEdit() {
  edit = { avatarUrl: U.avatarUrl || '', coverUrl: U.coverUrl || '' };
  $('#editBox').innerHTML = `
    <h3>${t('editT')}</h3>
    <div class="edit-prev" id="edBan"></div>
    <div class="edit-row"><button data-act="pickBan">🖼 ${t('banner')}</button><button data-act="pickAv">${t('avatarT')}</button></div>
    <div style="display:flex;justify-content:center" id="edAvWrap">${av(edit.avatarUrl, U.name, 'lg')}</div>
    <label>${t('name')}<input id="eName" maxlength="30" value="${esc(U.name)}"></label>
    <label>${t('bio')}<textarea id="eBio" rows="3" maxlength="120">${esc(U.bio || '')}</textarea></label>
    <small id="eErr" class="err"></small>
    <button class="btn" data-act="saveProfile">${t('saveBtn')}</button>
    <button class="btn ghost" data-close="editModal">${t('cancel')}</button>`;
  updateEditPreview();
  openM('editModal');
}
function updateEditPreview() {
  const b = $('#edBan');
  if (b) b.style.backgroundImage = edit.coverUrl ? `url('${banUrl(edit.coverUrl)}')` : '';
  const w = $('#edAvWrap');
  if (w && edit) w.innerHTML = av(edit.avatarUrl, U.name, 'lg');
}
async function saveProfile() {
  const name = $('#eName').value.trim();
  const bio = $('#eBio').value.trim();
  if (!name) { $('#eErr').textContent = t('needName'); return; }
  const data = { name, name_lower: name.toLowerCase(), bio, avatarUrl: edit.avatarUrl, coverUrl: edit.coverUrl };
  try {
    await updateDoc(doc(db, 'users', me), data);
    U = { ...U, ...data };
    userCache.set(me, U);
    closeM('editModal');
    render();
    toast(t('posted'));
  } catch (e) { $('#eErr').textContent = t('failed'); }
}

/* ---------- crop ---------- */
let crop = null;
function openCrop(file, kind) {
  const W = Math.min(window.innerWidth - 40, 360);
  const H = kind === 'av' ? W : Math.round(W * COVER_RATIO);
  const st = $('#cropStage');
  st.style.width = W + 'px';
  st.style.height = H + 'px';
  $('#cropFrame').classList.toggle('round', kind === 'av');
  const img = $('#cropImg');
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const minS = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    crop = { kind, W, H, img, url, minS, s: minS, x: 0, y: 0 };
    $('#cropZoom').value = 1;
    placeCrop();
    openM('cropModal');
  };
  img.src = url;
}
function clampCrop() {
  const c = crop;
  const iw = c.img.naturalWidth * c.s, ih = c.img.naturalHeight * c.s;
  const mx = Math.max(0, (iw - c.W) / 2), my = Math.max(0, (ih - c.H) / 2);
  c.x = Math.min(mx, Math.max(-mx, c.x));
  c.y = Math.min(my, Math.max(-my, c.y));
}
function placeCrop() {
  if (!crop) return;
  clampCrop();
  const c = crop;
  const iw = c.img.naturalWidth * c.s, ih = c.img.naturalHeight * c.s;
  c.img.style.width = iw + 'px';
  c.img.style.height = ih + 'px';
  c.img.style.left = (c.W / 2 + c.x - iw / 2) + 'px';
  c.img.style.top = (c.H / 2 + c.y - ih / 2) + 'px';
}
function endCrop() {
  if (crop) URL.revokeObjectURL(crop.url);
  crop = null;
}
$('#cropZoom').addEventListener('input', e => {
  if (!crop) return;
  const old = crop.s;
  crop.s = crop.minS * (+e.target.value);
  const r = crop.s / old;
  crop.x *= r; crop.y *= r;
  placeCrop();
});
(() => {
  const cst = $('#cropStage');
  let drag = null;
  cst.addEventListener('pointerdown', e => {
    if (!crop) return;
    drag = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
    cst.setPointerCapture(e.pointerId);
  });
  cst.addEventListener('pointermove', e => {
    if (!drag || !crop) return;
    crop.x = drag.cx + (e.clientX - drag.x);
    crop.y = drag.cy + (e.clientY - drag.y);
    placeCrop();
  });
  const end = () => { drag = null; };
  cst.addEventListener('pointerup', end);
  cst.addEventListener('pointercancel', end);
})();
$('#cropOk').onclick = () => {
  if (!crop) return;
  const c = crop;
  const outW = c.kind === 'av' ? 480 : 1200;
  const outH = c.kind === 'av' ? 480 : Math.round(1200 * COVER_RATIO);
  const iw = c.img.naturalWidth * c.s, ih = c.img.naturalHeight * c.s;
  const left = c.W / 2 + c.x - iw / 2, top = c.H / 2 + c.y - ih / 2;
  const cv = document.createElement('canvas');
  cv.width = outW; cv.height = outH;
  cv.getContext('2d').drawImage(c.img, -left / c.s, -top / c.s, c.W / c.s, c.H / c.s, 0, 0, outW, outH);
  const kind = c.kind;
  closeM('cropModal');
  toast(t('posting'));
  cv.toBlob(async blob => {
    if (!blob) return;
    try {
      const r = await uploadFile(new File([blob], 'crop.jpg', { type: 'image/jpeg' })).promise;
      if (kind === 'av') edit.avatarUrl = r.secure_url; else edit.coverUrl = r.secure_url;
      updateEditPreview();
    } catch (_) { toast(t('uploadErr')); }
  }, 'image/jpeg', .9);
};
$('#fileAv').onchange = e => { const f = e.target.files[0]; if (f) openCrop(f, 'av'); e.target.value = ''; };
$('#fileBan').onchange = e => { const f = e.target.files[0]; if (f) openCrop(f, 'ban'); e.target.value = ''; };

/* ---------- search ---------- */
let sQ = '';
const getHist = () => JSON.parse(localStorage.getItem('tf_hist') || '[]');
function addHist(s) { localStorage.setItem('tf_hist', JSON.stringify([s, ...getHist().filter(x => x !== s)].slice(0, 10))); }
function openSearch(term) {
  $('#searchView').classList.add('show');
  $('#sInput').value = term || '';
  sQ = (term || '').trim();
  if (sQ) addHist(sQ);
  renderSearch();
  setTimeout(() => $('#sInput').focus(), 50);
}
function suggestions() {
  const c = {};
  posts.forEach(p => (p.caption || '').match(/#[\p{L}\d_]+/gu)?.forEach(x => { c[x] = (c[x] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
}
function renderSearch() {
  const b = $('#sBody');
  if (!sQ) {
    const hist = getHist().map(h => `<div class="hrow">
      <button class="hs" data-act="sq" data-q="${esc(h)}"><span>🕘 ${esc(h)}</span></button>
      <button class="hx" data-act="shist" data-q="${esc(h)}">✕</button></div>`).join('');
    const sug = suggestions().map(s => `<button class="sug" data-act="sq" data-q="${esc(s)}"><b>${esc(s)}</b></button>`).join('');
    b.innerHTML = (hist ? `<div class="grp">${t('recentS')}</div>${hist}` : '') + `<div class="grp">${t('youMayLike')}</div>${sug}`;
    return;
  }
  const s = sQ.toLowerCase();
  const local = posts.filter(p => (p.caption || '').toLowerCase().includes(s) || (p.name || '').toLowerCase().includes(s));
  b.innerHTML = `<div class="grp">${t('people')}</div><div id="peopleRes"></div>
    ${local.length ? `<div class="grp">${t('postsT')}</div><div class="sg">${local.map(p => `<button class="gi" data-act="open" data-id="${p.id}">${p.type === 'video' ? `<video src="${p.url}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${p.url}" alt="">`}</button>`).join('')}</div>` : `<p class="empty">${t('noResults')}</p>`}`;
  clearTimeout(sTimer);
  sTimer = setTimeout(() => findPeopleInto(s, '#peopleRes', 'follow'), 250);
}
async function findPeopleInto(s, target, mode) {
  const box = $(target);
  if (!box) return;
  const found = new Map();
  if (/^\d+$/.test(s)) {
    const r = await getDocs(query(collection(db, 'users'), where('numId', '==', Number(s)), limit(5)));
    r.docs.forEach(d => found.set(d.id, d.data()));
  } else {
    const r = await getDocs(query(collection(db, 'users'), where('name_lower', '>=', s), where('name_lower', '<=', s + '\uf8ff'), limit(15)));
    r.docs.forEach(d => found.set(d.id, d.data()));
  }
  box.innerHTML = [...found.entries()].filter(([id]) => id !== me).map(([id, d]) => {
    const action = mode === 'chat'
      ? `<button class="btn small" data-act="chat" data-uid="${id}" data-name="${esc(d.name)}">${t('msg')}</button>`
      : followBtnHTML(id);
    return `<div class="trd">
      <div data-act="user" data-uid="${id}" style="display:flex;gap:12px;align-items:center;flex:1;cursor:pointer">${av(d.avatarUrl, d.name)}
        <div class="tx"><b>${esc(d.name)}</b><small>ID ${d.numId || ''}</small></div></div>
      ${action}</div>`;
  }).join('') || `<p class="empty" style="margin:10px 0">${t('noResults')}</p>`;
}
$('#sInput').addEventListener('input', e => { sQ = e.target.value.trim(); renderSearch(); });
$('#sInput').addEventListener('keydown', e => { if (e.key === 'Enter') { sQ = e.target.value.trim(); if (sQ) addHist(sQ); renderSearch(); } });
$('#ncInput').addEventListener('input', e => {
  const s = e.target.value.trim().toLowerCase();
  if (!s) { $('#ncList').innerHTML = ''; return; }
  clearTimeout(sTimer);
  sTimer = setTimeout(() => findPeopleInto(s, '#ncList', 'chat'), 250);
});
function openNewChat() {
  $('#ncInput').value = '';
  $('#ncList').innerHTML = '';
  openM('newChatModal');
  setTimeout(() => $('#ncInput').focus(), 50);
}

/* ---------- chat ---------- */
const chatId = (a, b) => [a, b].sort().join('_');
function markChatSeen(id) {
  const seen = JSON.parse(localStorage.getItem('tf_chatseen') || '{}');
  seen[id] = Date.now();
  localStorage.setItem('tf_chatseen', JSON.stringify(seen));
  updateBadge();
}
async function openChat(uid, name) {
  if (!uid || uid === me) return;
  const u = await ensureUser(uid);
  watchUser(uid);
  chatWith = uid;
  chatTitle = (u && u.name) || name || '?';
  $('#chatHead').innerHTML = `${av(u && u.avatarUrl, chatTitle, 'sm')}<div><b>${esc(chatTitle)}</b><small id="chatStatus">${statusHTML(u)}</small></div>`;
  $('#chatInput').value = '';
  chatDocs = []; chatPending = [];
  const cid = chatId(me, uid);
  if (chatUnsub) chatUnsub();
  chatUnsub = onSnapshot(query(collection(db, 'chats', cid, 'messages'), orderBy('time')), snap => {
    chatDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chatPending = chatPending.filter(p => !chatDocs.some(d => d.cid === p.cid));
    chatDocs.forEach(m => {
      if (m.from !== me && (!m.seen || !m.delivered)) updateDoc(doc(db, 'chats', cid, 'messages', m.id), { seen: true, delivered: true }).catch(() => {});
    });
    markChatSeen(cid);
    renderChat();
  }, err => { console.warn('msgs', err); toast(t('failed') + ' (' + (err.code || '') + ')'); });
  markChatSeen(cid);
  openM('chatModal');
  renderChat();
}
function renderChat() {
  const all = [...chatDocs, ...chatPending];
  $('#chatList').innerHTML = all.length
    ? all.map(msgHTML).join('')
    : `<p class="empty" style="margin:20px 0">${t('noMsgs')}</p>`;
  $('#chatList').scrollTop = 1e9;
}
function closeChat() {
  if (chatUnsub) chatUnsub();
  chatUnsub = null;
  chatWith = null;
  chatDocs = []; chatPending = [];
  stopRecording(true);
  updateBadge();
}
function ticksHTML(m) {
  if (m.from !== me) return '';
  if (m.st === 'pending') return `<span class="tk" title="${t('pendingT')}">🕒</span>`;
  if (m.st === 'fail') return `<span class="tk" title="${t('failT')}" style="color:#e11d48">!</span>`;
  if (m.seen) return `<span class="tk seen" title="${t('seenT')}">✓✓</span>`;
  if (m.delivered) return `<span class="tk" title="${t('deliveredT')}">✓✓</span>`;
  return `<span class="tk">✓</span>`;
}
function msgHTML(m) {
  let body = '';
  if (m.type === 'image') body = `<img class="mimg" src="${m.url}" alt="">`;
  else if (m.type === 'audio') body = `<audio controls preload="metadata" src="${m.url}"></audio>`;
  else if (m.type === 'post') {
    body = `<button class="mpost" data-act="openPostId" data-id="${m.postId}">
      ${m.ptype === 'video' ? `<video src="${m.url}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${m.url}" alt="">`}
      <span>${esc(m.caption || '')}</span></button>`;
  } else body = esc(m.text || '');
  return `<div class="bub ${m.from === me ? 'me' : ''}">${body}<small>${clock(m.time)} ${ticksHTML(m)}</small></div>`;
}
async function sendChatMsg(uid, name, d) {
  const cid = chatId(me, uid);
  const pend = {
    cid: Math.random().toString(36).slice(2) + Date.now().toString(36), from: me, to: uid, type: d.type,
    text: d.text || '', url: d.url || '', postId: d.postId || '', caption: d.caption || '', ptype: d.ptype || '',
    dur: d.dur || 0, time: Date.now(), st: 'pending'
  };
  if (chatWith === uid) { chatPending.push(pend); renderChat(); }
  const last = d.type === 'text' ? d.text
    : d.type === 'image' ? '🖼 ' + t('image')
    : d.type === 'audio' ? '🎤 ' + t('voice')
    : '📨 ' + (d.caption || 'Post');
  try {
    await setDoc(doc(db, 'chats', cid), {
      members: [me, uid], names: { [me]: U.name, [uid]: name || '?' }, last, lastTime: pend.time, lastFrom: me
    }, { merge: true });
    const { st, ...rest } = pend;
    await addDoc(collection(db, 'chats', cid, 'messages'), { ...rest, seen: false, delivered: false });
    markChatSeen(cid);
  } catch (e) {
    pend.st = 'fail';
    if (chatWith === uid) renderChat();
    throw e;
  }
}
function sendChatText() {
  const v = $('#chatInput').value.trim();
  if (!v || !chatWith) return;
  $('#chatInput').value = '';
  sendChatMsg(chatWith, chatTitle, { type: 'text', text: v }).catch(e => toast(t('failed') + ' (' + (e.code || e.message) + ')'));
}
async function sendChatImage(file) {
  toast(t('posting'));
  try {
    const r = await uploadFile(file).promise;
    await sendChatMsg(chatWith, chatTitle, { type: 'image', url: r.secure_url });
  } catch (e) { toast(t('uploadErr')); }
}
$('#fileChat').onchange = e => { const f = e.target.files[0]; if (f && chatWith) sendChatImage(f); e.target.value = ''; };
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatText(); });

async function toggleMic() {
  if (chatRec && chatRec.state === 'recording') { stopRecording(false); return; }
  if (!chatWith) return;
  let s;
  try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { toast(t('camera')); return; }
  const rec = new MediaRecorder(s);
  const parts = [];
  recCancel = false;
  recStart = Date.now();
  const target = chatWith, targetName = chatTitle;
  rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
  rec.onstop = async () => {
    s.getTracks().forEach(x => x.stop());
    clearInterval(recTimer); clearTimeout(recAuto);
    $('#recBar').hidden = true;
    $('#micBtn').classList.remove('rec');
    chatRec = null;
    const dur = Math.max(1, Math.round((Date.now() - recStart) / 1000));
    if (recCancel || dur < 1) return;
    const blob = new Blob(parts, { type: rec.mimeType || 'audio/webm' });
    toast(t('posting'));
    try {
      const r = await uploadFile(new File([blob], 'voice.webm', { type: blob.type })).promise;
      await sendChatMsg(target, targetName, { type: 'audio', url: r.secure_url, dur: Math.min(dur, MAX_VOICE_SEC) });
    } catch (e) { toast(t('uploadErr')); }
  };
  rec.start();
  chatRec = rec;
  $('#recBar').hidden = false;
  $('#micBtn').classList.add('rec');
  recTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - recStart) / 1000);
    $('#recTime').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }, 250);
  recAuto = setTimeout(() => { toast(t('tooLong')); stopRecording(false); }, MAX_VOICE_SEC * 1000);
}
function stopRecording(cancel) {
  recCancel = !!cancel;
  if (chatRec && chatRec.state === 'recording') chatRec.stop();
}

/* ---------- camera ---------- */
let stream = null, rec = null, chunks = [], camMode = 'photo', facing = 'environment';
async function startStream() {
  if (stream) stream.getTracks().forEach(tr => tr.stop());
  stream = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true }); }
  catch (_) {
    try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
    catch (e) { toast(t('camera')); return false; }
  }
  $('#camVid').srcObject = stream;
  return true;
}
async function openCam() {
  closeM('addSheet');
  if (!await startStream()) return;
  setMode('photo');
  openM('camModal');
}
function stopCam() {
  if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); }
  if (stream) stream.getTracks().forEach(tr => tr.stop());
  stream = null;
  $('#shutter').classList.remove('recording');
  $('#recDot').hidden = true;
}
function setMode(m) {
  camMode = m;
  $('#mPhoto').classList.toggle('on', m === 'photo');
  $('#mVideo').classList.toggle('on', m === 'video');
}
$('#flip').onclick = async () => {
  if (rec && rec.state === 'recording') return;
  facing = facing === 'environment' ? 'user' : 'environment';
  await startStream();
};
$('#shutter').onclick = () => {
  if (!stream) return;
  if (camMode === 'photo') {
    const v = $('#camVid');
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(b => { closeM('camModal'); compose(new File([b], 'camera.jpg', { type: 'image/jpeg' }), 'photo'); }, 'image/jpeg', .92);
    return;
  }
  if (rec && rec.state === 'recording') { rec.stop(); return; }
  const mt = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  chunks = [];
  rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const type = rec.mimeType || 'video/webm';
    const file = new File([new Blob(chunks, { type })], 'camera.' + (type.includes('mp4') ? 'mp4' : 'webm'), { type });
    closeM('camModal');
    compose(file, 'video');
  };
  rec.start();
  $('#shutter').classList.add('recording');
  $('#recDot').hidden = false;
};
$('#mPhoto').onclick = () => setMode('photo');
$('#mVideo').onclick = () => setMode('video');

/* ---------- compose ---------- */
let pending = null;
function compose(file, type) {
  pending = { file, type };
  const u = URL.createObjectURL(file);
  $('#compPrev').innerHTML = type === 'video' ? `<video src="${u}" controls playsinline></video>` : `<img src="${u}" alt="">`;
  $('#compCap').value = '';
  openM('compModal');
}
$('#compPost').onclick = () => {
  if (!pending) return;
  const job = { ...pending, caption: $('#compCap').value.trim() };
  pending = null;
  closeM('compModal');
  enqueueUpload(job);
  feedState.short = null; feedState.photo = null; feedState.friends = null; feedShown = null;
  view = 'home';
  htab = job.type === 'video' ? 'short' : 'photo';
  localStorage.setItem('tf_htab', htab);
  render();
};
$('#fileV').onchange = e => { const f = e.target.files[0]; if (f) compose(f, 'video'); };
$('#fileP').onchange = e => { const f = e.target.files[0]; if (f) compose(f, 'photo'); };

/* ---------- click handling ---------- */
document.addEventListener('click', async e => {
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) { closeM(closeBtn.dataset.close); return; }
  const v = e.target.closest('[data-v]');
  if (v) { view = v.dataset.v; render(); $('#main').scrollTop = 0; return; }
  const h = e.target.closest('#seg [data-h]');
  if (h) { htab = h.dataset.h; localStorage.setItem('tf_htab', htab); render(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act;
  const id = el.dataset.id;
  const p = id ? posts.find(x => x.id === id) : null;
  if (el.closest('#menuModal')) closeM('menuModal');
  switch (a) {
    case 'like': if (p) toggleLike(p); break;
    case 'save': if (p) toggleSave(p); break;
    case 'cmt': if (p) openCmt(p); break;
    case 'clike': reactComment(el.dataset.cid, 'like'); break;
    case 'cdis': reactComment(el.dataset.cid, 'dislike'); break;
    case 'share': if (p) openShare(p); break;
    case 'dl': if (p) downloadPost(p); break;
    case 'open': if (p) { $('#viewBody').innerHTML = cardHTML(p); openM('viewModal'); } break;
    case 'openPostId': if (p) { $('#viewBody').innerHTML = cardHTML(p); openM('viewModal'); } else toast(t('empty')); break;
    case 'del': if (p) deletePost(p); break;
    case 'follow': toggleFollow(el.dataset.uid); break;
    case 'list': openList(el.dataset.k, el.dataset.uid); break;
    case 'intab': inTab = el.dataset.k; render(); break;
    case 'user':
      $('#searchView').classList.remove('show');
      closeM('viewModal'); closeM('newChatModal'); closeM('listModal');
      openUser(el.dataset.uid);
      break;
    case 'back': view = prevView === 'user' ? 'home' : (prevView || 'home'); render(); break;
    case 'chat': closeM('viewModal'); closeM('newChatModal'); openChat(el.dataset.uid, el.dataset.name); break;
    case 'newChat': openNewChat(); break;
    case 'sendCmt': sendComment(); break;
    case 'emo': { const i = $('#cmtInput'); i.value += el.dataset.e; i.focus(); break; }
    case 'reply': replyTo = el.dataset.n; $('#replyTxt').textContent = `${t('reply')} ${replyTo}`; $('#replyBar').hidden = false; $('#cmtInput').focus(); break;
    case 'cancelReply': replyTo = ''; $('#replyBar').hidden = true; break;
    case 'shareTo': {
      closeM('sendModal');
      if (!shareP) break;
      const u = userCache.get(el.dataset.uid) || {};
      sendChatMsg(el.dataset.uid, u.name || '?', { type: 'post', postId: shareP.id, url: shareP.url, ptype: shareP.type, caption: shareP.caption || shareP.name })
        .then(() => toast(t('sent')))
        .catch(err => toast(t('failed') + ' (' + (err.code || '') + ')'));
      break;
    }
    case 'sendChat': sendChatText(); break;
    case 'attachChat': $('#fileChat').click(); break;
    case 'mic': toggleMic(); break;
    case 'cancelRec': stopRecording(true); break;
    case 'tag': openSearch(el.dataset.tag); break;
    case 'menu': openMenu(); break;
    case 'settings': openSettings(); break;
    case 'savePw': savePassword(); break;
    case 'copyId': await navigator.clipboard.writeText(String(U.numId)).catch(() => {}); toast(t('idCopied')); break;
    case 'lusi': openLusi(); break;
    case 'edit': openEdit(); break;
    case 'saveProfile': saveProfile(); break;
    case 'pickAv': $('#fileAv').click(); break;
    case 'pickBan': $('#fileBan').click(); break;
    case 'ptab': pTab = el.dataset.pt; if (view !== 'profile') view = 'profile'; render(); break;
    case 'shareProfile':
      if (navigator.share) navigator.share({ title: APP, text: `${U.name} · ID ${U.numId} · ${APP}` }).catch(() => {});
      else { await navigator.clipboard.writeText(String(U.numId)).catch(() => {}); toast(t('idCopied')); }
      break;
    case 'sq': openSearch(el.dataset.q); break;
    case 'shist': localStorage.setItem('tf_hist', JSON.stringify(getHist().filter(x => x !== el.dataset.q))); renderSearch(); break;
    case 'sclose': $('#searchView').classList.remove('show'); break;
    case 'logout': await signOut(auth); closeM('settingsModal'); toast(t('signedOut')); break;
    case 'pickV': closeM('addSheet'); $('#fileV').value = ''; $('#fileV').click(); break;
    case 'pickP': closeM('addSheet'); $('#fileP').value = ''; $('#fileP').click(); break;
    case 'cam': openCam(); break;
  }
});
$('#plus').onclick = () => openM('addSheet');
$('#sbtn').onclick = () => openSearch('');

/* long press a reel = download hint */
let lastTapAt = 0, pressTimer = null, tapTimer = null;
$('#main').addEventListener('pointerdown', e => {
  const rin = e.target.closest('.rin');
  if (!rin || e.target.closest('button, a')) return;
  pressTimer = setTimeout(() => {
    const reel = rin.closest('[data-id]');
    if (!reel) return;
    const b = document.createElement('button');
    b.className = 'dlhint';
    b.dataset.act = 'dl';
    b.dataset.id = reel.dataset.id;
    b.textContent = '⬇ ' + t('download');
    rin.appendChild(b);
    setTimeout(() => b.remove(), 3500);
  }, 500);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(ev => $('#main').addEventListener(ev, () => clearTimeout(pressTimer)));

/* one tap = pause or play; two taps = like */
document.addEventListener('click', e => {
  const m = e.target.closest('.media, .rin');
  if (!m || e.target.closest('button, a, .dlhint')) return;
  const holder = m.closest('[data-id]');
  const p = holder && posts.find(x => x.id === holder.dataset.id);
  const now = Date.now();
  if (now - lastTapAt < 300) {
    clearTimeout(tapTimer);
    lastTapAt = 0;
    if (p && !(p.reactions && p.reactions[me])) toggleLike(p, true);
    burst(m);
    return;
  }
  lastTapAt = now;
  const v = m.querySelector('video');
  if (v) tapTimer = setTimeout(() => toggleVideo(v), 260);
});

/* ---------- service worker update: reload when a new version takes over ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!window.__lusiReloaded) { window.__lusiReloaded = true; location.reload(); }
  });
}

/* ---------- boot ---------- */
(() => {
  document.body.dataset.theme = localStorage.getItem('tf_theme') || 'light';
  applyLang();
  renderAuthMode();
  setTimeout(() => {
    splashDone = true;
    show(pendingScreen || 'login');
  }, 2200);
})();
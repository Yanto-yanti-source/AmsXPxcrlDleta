// ═══════════════════════════════════════════════════════════════════
//  DELTA TOOLS · ADMIN CONSOLE
//  app.js — Firebase logic, navigation, vouchers, users, credits
// ═══════════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, collection, getDocs, doc, updateDoc, deleteDoc,
  increment, getDoc, setDoc, query, orderBy, limit, where,
  writeBatch, Timestamp, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

// ─── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCZQ_TuNdD0u6Yk9PNNBUNJvW5EZ-rDTKo",
  authDomain:        "rorororrortoolsxrheadrtrick.firebaseapp.com",
  projectId:         "rorororrortoolsxrheadrtrick",
  storageBucket:     "rorororrortoolsxrheadrtrick.appspot.com",
  messagingSenderId: "872606748189",
  appId:             "1:872606748189:android:bfc6694482b6c9dc3a80f4"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Utils ─────────────────────────────────────────────────────
const qs  = s => document.querySelector(s);
const esc = s => s == null ? '' : String(s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', { year:'numeric', month:'short', day:'numeric' });
  } catch { return '—'; }
}

function fmtDateTime(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('id-ID', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return '—'; }
}

function fmtNum(n) {
  return (n == null ? 0 : Number(n)).toLocaleString('id-ID');
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  qs('#toastStack').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function openModal(html) {
  qs('#modalBox').innerHTML = html;
  qs('#modalOverlay').classList.add('open');
}
function closeModal() {
  qs('#modalOverlay').classList.remove('open');
  qs('#modalBox').innerHTML = '';
}
qs('#modalOverlay').addEventListener('click', e => {
  if (e.target === qs('#modalOverlay')) closeModal();
});

function setPage(html) { qs('#pageContent').innerHTML = html; }

// ─── Auth ──────────────────────────────────────────────────────
qs('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = qs('#loginBtn');
  const errEl = qs('#loginErr');
  errEl.classList.remove('visible');
  btn.disabled = true;
  qs('#loginBtnText').textContent = 'WAIT...';
  try {
    await signInWithEmailAndPassword(auth, qs('#loginEmail').value.trim(), qs('#loginPassword').value);
  } catch (err) {
    const map = {
      'auth/invalid-email':          'Email tidak valid.',
      'auth/user-not-found':         'Akun tidak ditemukan.',
      'auth/wrong-password':         'Password salah.',
      'auth/invalid-credential':     'Email atau password salah.',
      'auth/too-many-requests':      'Terlalu banyak percobaan.',
      'auth/network-request-failed': 'Koneksi gagal.',
    };
    errEl.textContent = map[err.code] || 'Login gagal: ' + (err.code || err.message);
    errEl.classList.add('visible');
    btn.disabled = false;
    qs('#loginBtnText').textContent = 'ENTER';
  }
});

qs('#logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if(user){ alert('UID LU ADALAH: ' + user.uid); }
  if (user) {
    try {
      const token = await user.getIdTokenResult(true);
      if (!token.claims.admin) {
        toast('Akun ini bukan admin.', true);
        await signOut(auth);
        return;
      }
    } catch (err) {
      toast('Verifikasi gagal: ' + err.message, true);
      await signOut(auth);
      return;
    }
    qs('#loginView').style.display = 'none';
    qs('#appView').style.display   = 'grid';
    loadDashboard();
  } else {
    qs('#loginView').style.display = '';
    qs('#appView').style.display   = 'none';
    const btn = qs('#loginBtn');
    if (btn) { btn.disabled = false; qs('#loginBtnText').textContent = 'ENTER'; }
  }
});

// ─── Navigation ────────────────────────────────────────────────
qs('.sidebar').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-view]');
  if (!item) return;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  const view = item.dataset.view;
  if (view === 'dashboard') loadDashboard();
  else if (view === 'vouchers') loadVouchers();
  else if (view === 'users') loadUsers();
  else if (view === 'credits') loadCredits();
  else if (view === 'settings') loadSettings();
});

// ─── DASHBOARD ─────────────────────────────────────────────────
async function loadDashboard() {
  setPage(`
    <div class="page-head">
      <div><div class="page-title">Dashboard</div><div class="page-meta">Ringkasan data pengguna</div></div>
    </div>
    <div class="stat-grid">
      <div class="stat-cell"><div class="stat-label">Total Users</div><div class="stat-num c-blue">—</div></div>
      <div class="stat-cell"><div class="stat-label">Premium Aktif</div><div class="stat-num c-green">—</div></div>
      <div class="stat-cell"><div class="stat-label">Total Credit</div><div class="stat-num c-amber">—</div></div>
      <div class="stat-cell"><div class="stat-label">Voucher Aktif</div><div class="stat-num c-purple">—</div></div>
    </div>
  `);
  try {
    const snap = await getDocs(collection(db, 'users'));
    let premiumActive = 0, totalCredit = 0, banned = 0;
    const now = new Date();
    snap.forEach(d => {
      const data = d.data();
      totalCredit += Number(data.creditBalance || 0);
      if (data.blocked === true) banned++;
      const p = data.premium || {};
      if (p.isActive === true) {
        try {
          const exp = p.expirationDate?.toDate ? p.expirationDate.toDate() : new Date(p.expirationDate);
          if (exp > now) premiumActive++;
        } catch {}
      }
    });
    let voucherActive = 0;
    try {
      const vSnap = await getDocs(collection(db, 'vouchers'));
      vSnap.forEach(d => {
        const v = d.data();
        if (v.active === true) {
          const used = Number(v.usedCount || 0);
          const max = Number(v.maxUses || 0);
          if (!max || used < max) voucherActive++;
        }
      });
    } catch {}
    setPage(`
      <div class="page-head">
        <div><div class="page-title">Dashboard</div><div class="page-meta">Ringkasan data pengguna</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-label">Total Users</div><div class="stat-num c-blue">${fmtNum(snap.size)}</div></div>
        <div class="stat-cell"><div class="stat-label">Premium Aktif</div><div class="stat-num c-green">${fmtNum(premiumActive)}</div></div>
        <div class="stat-cell"><div class="stat-label">Total Credit</div><div class="stat-num c-amber">${fmtNum(totalCredit)}</div></div>
        <div class="stat-cell"><div class="stat-label">Voucher Aktif</div><div class="stat-num c-purple">${fmtNum(voucherActive)}</div></div>
      </div>
    `);
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat: ${esc(err.message)}</div>`);
  }
}

// ─── VOUCHERS ──────────────────────────────────────────────────
let allVouchers = [];

async function loadVouchers() {
  setPage(`<div class="page-head"><div><div class="page-title">Vouchers</div><div class="page-meta">Memuat...</div></div></div><div class="empty-state">Memuat data...</div>`);
  try {
    const snap = await getDocs(collection(db, 'vouchers'));
    allVouchers = [];
    snap.forEach(d => allVouchers.push({ id: d.id, ...d.data() }));
    allVouchers.sort((a, b) => {
      const at = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bt - at;
    });
    renderVouchersPage();
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat: ${esc(err.message)}</div>`);
  }
}

function voucherStatus(v) {
  const now = new Date();
  if (v.active === false) return { label: 'INACTIVE', cls: 'badge-gray' };
  if (v.expiresAt) {
    try {
      const d = v.expiresAt.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt);
      if (d < now) return { label: 'EXPIRED', cls: 'badge-expired' };
    } catch {}
  }
  const used = Number(v.usedCount || 0);
  const max = Number(v.maxUses || 0);
  if (max && used >= max) return { label: 'HABIS', cls: 'badge-expired' };
  return { label: 'ACTIVE', cls: 'badge-premium' };
}

function renderVouchersPage() {
  const rows = allVouchers.map(v => {
    const st = voucherStatus(v);
    const used = Number(v.usedCount || 0);
    const max = Number(v.maxUses || 0);
    const usage = max ? `${used}/${max}` : `${used}/∞`;
    return `<tr>
      <td><span class="uid-cell" data-action="copy-code" data-code="${esc(v.id)}" title="Klik untuk salin">${esc(v.id)}</span></td>
      <td>${v.premiumDays || 30} hari</td>
      <td>${usage}</td>
      <td>${fmtDate(v.expiresAt)}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>
        <div class="action-row">
          <button class="act act-green" data-action="edit-voucher" data-vid="${esc(v.id)}">EDIT</button>
          <button class="act ${v.active ? 'act-ban' : 'act-unban'}" data-action="toggle-voucher" data-vid="${esc(v.id)}" data-active="${v.active}">${v.active ? 'DISABLE' : 'ENABLE'}</button>
          <button class="act act-del" data-action="delete-voucher" data-vid="${esc(v.id)}">DEL</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  setPage(`
    <div class="page-head">
      <div><div class="page-title">Vouchers</div><div class="page-meta">${allVouchers.length} voucher · kelola kode redeem premium</div></div>
    </div>
    <div class="table-toolbar">
      <div class="search-wrap"><input type="text" id="searchVoucher" placeholder="cari kode voucher..." autocomplete="off" spellcheck="false"></div>
      <div class="toolbar-right">
        <button class="btn-sm" data-action="refresh-vouchers">↻ Refresh</button>
        <button class="btn-sm btn-primary" data-action="create-voucher">+ Voucher Baru</button>
      </div>
    </div>
    <div class="table-container">
      ${allVouchers.length === 0 ? `<div class="empty-state">Belum ada voucher. Klik "+ Voucher Baru".</div>` : `
      <table>
        <thead><tr><th>Kode</th><th>Premium</th><th>Pemakaian</th><th>Expired</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `);

  const si = qs('#searchVoucher');
  if (si) {
    si.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      const rows2 = allVouchers.filter(v => !q || v.id.toLowerCase().includes(q));
      if (rows2.length === 0) {
        qs('.table-container').innerHTML = `<div class="empty-state">Tidak ada voucher cocok.</div>`;
      } else {
        qs('.table-container').innerHTML = `
          <table>
            <thead><tr><th>Kode</th><th>Premium</th><th>Pemakaian</th><th>Expired</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows2.map(v => {
              const st = voucherStatus(v);
              const used = Number(v.usedCount || 0);
              const max = Number(v.maxUses || 0);
              const usage = max ? `${used}/${max}` : `${used}/∞`;
              return `<tr>
                <td><span class="uid-cell" data-action="copy-code" data-code="${esc(v.id)}">${esc(v.id)}</span></td>
                <td>${v.premiumDays || 30} hari</td>
                <td>${usage}</td>
                <td>${fmtDate(v.expiresAt)}</td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                <td>
                  <div class="action-row">
                    <button class="act act-green" data-action="edit-voucher" data-vid="${esc(v.id)}">EDIT</button>
                    <button class="act ${v.active ? 'act-ban' : 'act-unban'}" data-action="toggle-voucher" data-vid="${esc(v.id)}" data-active="${v.active}">${v.active ? 'DISABLE' : 'ENABLE'}</button>
                    <button class="act act-del" data-action="delete-voucher" data-vid="${esc(v.id)}">DEL</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}</tbody>
          </table>`;
      }
    });
  }
}

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'DELTA-';
  for (let i = 0; i < 6; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function openCreateVoucherModal() {
  const defaultCode = generateVoucherCode();
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);
  const expStr = defaultExpiry.toISOString().slice(0, 10);

  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">Buat Voucher Baru</div>
    <div class="modal-uid">Voucher untuk redeem premium</div>
    <div class="modal-body">
      <div class="field">
        <label>Kode Voucher</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="mVCode" value="${esc(defaultCode)}" style="flex:1;text-transform:uppercase;letter-spacing:0.05em;" autocomplete="off">
          <button class="btn-sm" id="mVGen" type="button">↻ Acak</button>
        </div>
      </div>
      <div class="field">
        <label>Durasi Premium (hari)</label>
        <input type="number" id="mVDays" value="30" min="1" max="3650" autocomplete="off">
      </div>
      <div class="field">
        <label>Maks Pemakaian (kosongkan = unlimited)</label>
        <input type="number" id="mVMax" value="100" min="0" placeholder="kosong = unlimited" autocomplete="off">
      </div>
      <div class="field">
        <label>Voucher Kadaluarsa Pada</label>
        <input type="date" id="mVExp" value="${expStr}" autocomplete="off">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-ghost" id="mCancel">Batal</button>
      <button class="btn-modal btn-modal-confirm" id="mConfirm">Buat Voucher</button>
    </div>
  `);

  qs('#mCancel').addEventListener('click', closeModal);
  qs('#mVGen').addEventListener('click', () => {
    qs('#mVCode').value = generateVoucherCode();
  });
  qs('#mConfirm').addEventListener('click', async () => {
    const code = qs('#mVCode').value.trim().toUpperCase();
    const days = parseInt(qs('#mVDays').value) || 30;
    const maxStr = qs('#mVMax').value.trim();
    const maxUses = maxStr === '' ? 0 : parseInt(maxStr);
    const expStr = qs('#mVExp').value;

    if (!code) { toast('Kode wajib diisi', true); return; }
    if (!/^[A-Z0-9\-_]{4,64}$/.test(code)) {
      toast('Kode hanya huruf/angka/-/_ (4-64 char)', true); return;
    }
    if (!expStr) { toast('Tanggal expired wajib diisi', true); return; }

    const btn = qs('#mConfirm');
    btn.disabled = true;
    btn.textContent = 'MEMBUAT...';

    try {
      // Cek duplikat
      const check = await getDoc(doc(db, 'vouchers', code));
      if (check.exists()) {
        toast('Kode voucher sudah ada, gunakan kode lain', true);
        btn.disabled = false;
        btn.textContent = 'Buat Voucher';
        return;
      }

      const expDate = new Date(expStr + 'T23:59:59');
      await setDoc(doc(db, 'vouchers', code), {
        code: code,
        active: true,
        premiumDays: days,
        maxUses: maxUses,
        usedCount: 0,
        expiresAt: Timestamp.fromDate(expDate),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.email : 'admin'
      });
      toast('✅ Voucher "' + code + '" dibuat');
      closeModal();
      await loadVouchers();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
      btn.disabled = false;
      btn.textContent = 'Buat Voucher';
    }
  });
}

async function openEditVoucherModal(vid) {
  const v = allVouchers.find(x => x.id === vid);
  if (!v) return;
  const expDate = v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt || Date.now());
  const expStr = expDate.toISOString().slice(0, 10);

  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">Edit Voucher</div>
    <div class="modal-uid">Kode: ${esc(vid)}</div>
    <div class="modal-body">
      <div class="field">
        <label>Durasi Premium (hari)</label>
        <input type="number" id="mVDays" value="${v.premiumDays || 30}" min="1" max="3650">
      </div>
      <div class="field">
        <label>Maks Pemakaian (0 = unlimited)</label>
        <input type="number" id="mVMax" value="${v.maxUses || 0}" min="0">
      </div>
      <div class="field">
        <label>Kadaluarsa Pada</label>
        <input type="date" id="mVExp" value="${expStr}">
      </div>
      <div class="modal-warn">Digunakan: ${v.usedCount || 0}x</div>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-ghost" id="mCancel">Batal</button>
      <button class="btn-modal btn-modal-confirm" id="mConfirm">Simpan</button>
    </div>
  `);

  qs('#mCancel').addEventListener('click', closeModal);
  qs('#mConfirm').addEventListener('click', async () => {
    const days = parseInt(qs('#mVDays').value) || 30;
    const maxUses = parseInt(qs('#mVMax').value) || 0;
    const expStr = qs('#mVExp').value;
    if (!expStr) { toast('Tanggal wajib diisi', true); return; }

    const btn = qs('#mConfirm');
    btn.disabled = true;
    btn.textContent = 'MENYIMPAN...';
    try {
      const expDate = new Date(expStr + 'T23:59:59');
      await updateDoc(doc(db, 'vouchers', vid), {
        premiumDays: days,
        maxUses: maxUses,
        expiresAt: Timestamp.fromDate(expDate)
      });
      toast('✅ Voucher diupdate');
      closeModal();
      await loadVouchers();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });
}

async function toggleVoucher(vid, currentActive) {
  try {
    await updateDoc(doc(db, 'vouchers', vid), { active: !currentActive });
    toast('Voucher ' + (!currentActive ? 'diaktifkan' : 'dinonaktifkan'));
    await loadVouchers();
  } catch (err) {
    toast('Gagal: ' + err.message, true);
  }
}

function openDeleteVoucherModal(vid) {
  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">Hapus Voucher</div>
    <div class="modal-uid">Kode: ${esc(vid)}</div>
    <div class="modal-body">
      <div class="modal-warn danger">Voucher akan dihapus permanen. User yang sudah redeem TIDAK terpengaruh.</div>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-ghost" id="mCancel">Batal</button>
      <button class="btn-modal btn-modal-confirm" id="mConfirm" style="background:#FF3B2F;">Hapus</button>
    </div>
  `);
  qs('#mCancel').addEventListener('click', closeModal);
  qs('#mConfirm').addEventListener('click', async () => {
    const btn = qs('#mConfirm');
    btn.disabled = true;
    btn.textContent = 'MENGHAPUS...';
    try {
      await deleteDoc(doc(db, 'vouchers', vid));
      toast('✅ Voucher dihapus');
      closeModal();
      await loadVouchers();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
      btn.disabled = false;
      btn.textContent = 'Hapus';
    }
  });
}

// ─── USERS (dari versi lama, fix bug revoke) ───────────────────
let allUsers = [];
let filteredUsers = [];
let currentSearch = '';

async function loadUsers() {
  setPage(`<div class="page-head"><div><div class="page-title">Users</div><div class="page-meta">Memuat...</div></div></div><div class="empty-state">Memuat data...</div>`);
  try {
    const snap = await getDocs(collection(db, 'users'));
    allUsers = [];
    snap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));
    allUsers.sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0));
    filteredUsers = [...allUsers];
    renderUsersPage();
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat: ${esc(err.message)}</div>`);
  }
}

function renderUsersPage() {
  const rows = filteredUsers.map(u => {
    const p = u.premium || {};
    let badge = `<span class="badge badge-free">FREE</span>`;
    if (u.blocked === true) {
      badge = `<span class="badge badge-banned">BANNED</span>`;
    } else if (p.isActive === true) {
      let expired = false;
      try {
        const d = p.expirationDate?.toDate ? p.expirationDate.toDate() : new Date(p.expirationDate);
        expired = d <= new Date();
      } catch { expired = true; }
      badge = expired ? `<span class="badge badge-expired">EXPIRED</span>` : `<span class="badge badge-premium">PREMIUM</span>`;
    }
    const isBanned = u.blocked === true;
    return `<tr>
      <td><span class="uid-cell" data-action="copy-uid" data-uid="${esc(u.id)}" title="Klik untuk salin UID">${esc(u.id)}</span></td>
      <td>${esc(u.deviceId || '—')}</td>
      <td>${badge}</td>
      <td><span class="credit-num">${fmtNum(u.creditBalance || 0)}</span></td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>
        <div class="action-row">
          <button class="act act-green" data-action="credit" data-uid="${esc(u.id)}">+CR</button>
          <button class="act" data-action="activate" data-uid="${esc(u.id)}">+PRM</button>
          <button class="act" data-action="revoke" data-uid="${esc(u.id)}">-PRM</button>
          <button class="act ${isBanned ? 'act-unban' : 'act-ban'}" data-action="ban" data-uid="${esc(u.id)}" data-banned="${isBanned}">${isBanned ? 'UNBAN' : 'BAN'}</button>
          <button class="act act-del" data-action="delete" data-uid="${esc(u.id)}">DEL</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  setPage(`
    <div class="page-head">
      <div><div class="page-title">Users</div><div class="page-meta">${allUsers.length} total · ${filteredUsers.length} ditampilkan</div></div>
    </div>
    <div class="table-toolbar">
      <div class="search-wrap"><input type="text" id="searchInput" placeholder="cari uid atau device id..." value="${esc(currentSearch)}" autocomplete="off" spellcheck="false"></div>
      <div class="toolbar-right">
        <span class="user-count">${filteredUsers.length} user</span>
        <button class="btn-sm" data-action="refresh">↻ Refresh</button>
      </div>
    </div>
    <div class="table-container">
      ${filteredUsers.length === 0 ? `<div class="empty-state">Tidak ada user yang cocok.</div>` : `
      <table>
        <thead><tr><th>UID</th><th>Device ID</th><th>Status</th><th>Credit</th><th>Bergabung</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `);

  const si = qs('#searchInput');
  if (si) {
    si.addEventListener('input', e => { currentSearch = e.target.value; applySearch(currentSearch); });
    if (currentSearch) { si.focus(); si.setSelectionRange(currentSearch.length, currentSearch.length); }
  }
}

function applySearch(q) {
  const qLow = q.toLowerCase().trim();
  if (!qLow) filteredUsers = [...allUsers];
  else filteredUsers = allUsers.filter(u =>
    u.id.toLowerCase().includes(qLow) || (u.deviceId && String(u.deviceId).toLowerCase().includes(qLow))
  );
  renderUsersPage();
}

// ─── CREDITS ───────────────────────────────────────────────────
async function loadCredits() {
  setPage(`<div class="page-head"><div><div class="page-title">Credits</div><div class="page-meta">Memuat...</div></div></div><div class="empty-state">Memuat data...</div>`);
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    let total = 0, highBal = 0;
    snap.forEach(d => {
      const u = { id: d.id, ...d.data() };
      users.push(u);
      total += Number(u.creditBalance || 0);
      if (Number(u.creditBalance || 0) >= 1000) highBal++;
    });
    users.sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0));

    const rows = users.slice(0, 200).map(u => `<tr>
      <td><span class="uid-cell" data-action="copy-uid" data-uid="${esc(u.id)}">${esc(u.id)}</span></td>
      <td><span class="credit-num">${fmtNum(u.creditBalance || 0)}</span></td>
      <td>
        <div class="action-row">
          <button class="act act-green" data-action="credit" data-uid="${esc(u.id)}">ADJUST</button>
        </div>
      </td>
    </tr>`).join('');

    setPage(`
      <div class="page-head">
        <div><div class="page-title">Credits</div><div class="page-meta">Total: ${fmtNum(total)} CR · ${highBal} user high balance</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-label">Total Credit</div><div class="stat-num c-amber">${fmtNum(total)}</div></div>
        <div class="stat-cell"><div class="stat-label">Users</div><div class="stat-num c-blue">${users.length}</div></div>
        <div class="stat-cell"><div class="stat-label">High Balance (≥1000)</div><div class="stat-num c-green">${highBal}</div></div>
      </div>
      <div class="table-container" style="margin-top:16px;">
        <table>
          <thead><tr><th>UID</th><th>Balance</th><th>Aksi</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat: ${esc(err.message)}</div>`);
  }
}

// ─── SETTINGS (sama seperti versi lama) ───────────────────────
async function loadSettings() {
  setPage(`<div class="page-head"><div><div class="page-title">System Settings</div><div class="page-meta">Memuat...</div></div></div><div class="empty-state">Memuat...</div>`);
  try {
    const docRef = doc(db, 'config', 'app_config');
    let data = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) data = snap.data();
    } catch (e) { console.warn('Gagal baca config:', e); }

    setPage(`
      <div class="page-head">
        <div><div class="page-title">System Settings</div><div class="page-meta">Atur maintenance, versi, update</div></div>
      </div>
      <div class="settings-wrap">
        <div class="settings-section">
          <div class="section-title">MAINTENANCE MODE</div>
          <div class="field">
            <label>Status</label>
            <select id="cfgMaintenance" class="field-input">
              <option value="false" ${!data.maintenance ? 'selected' : ''}>OFF — Aplikasi Normal</option>
              <option value="true" ${data.maintenance ? 'selected' : ''}>ON — Maintenance</option>
            </select>
          </div>
          <div class="field">
            <label>Pesan Maintenance</label>
            <textarea id="cfgMessage" class="field-input" rows="3">${esc(data.maintenance_message || '')}</textarea>
          </div>
        </div>
        <div class="settings-section">
          <div class="section-title">UPDATE APLIKASI</div>
          <div class="field">
            <label>Minimal Versi</label>
            <input type="text" id="cfgMinVersion" class="field-input" value="${esc(data.min_version || '1.1')}">
          </div>
          <div class="field">
            <label>Versi Terbaru</label>
            <input type="text" id="cfgLatestVersion" class="field-input" value="${esc(data.latest_version || '1.1')}">
          </div>
          <div class="field">
            <label>URL Download</label>
            <input type="text" id="cfgUpdateUrl" class="field-input" value="${esc(data.update_url || '')}">
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn-modal btn-modal-confirm" id="saveConfigBtn">SIMPAN KONFIGURASI</button>
        </div>
      </div>
    `);

    qs('#saveConfigBtn').addEventListener('click', async () => {
      const btn = qs('#saveConfigBtn');
      btn.disabled = true;
      btn.textContent = 'MENYIMPAN...';
      try {
        await setDoc(doc(db, 'config', 'app_config'), {
          maintenance: qs('#cfgMaintenance').value === 'true',
          maintenance_message: qs('#cfgMessage').value,
          min_version: qs('#cfgMinVersion').value,
          latest_version: qs('#cfgLatestVersion').value,
          update_url: qs('#cfgUpdateUrl').value,
          updated_at: new Date(),
          updated_by: auth.currentUser ? auth.currentUser.email : 'admin'
        }, { merge: true });
        toast('Konfigurasi disimpan');
        btn.disabled = false;
        btn.textContent = 'SIMPAN KONFIGURASI';
      } catch (err) {
        toast('Gagal: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = 'SIMPAN KONFIGURASI';
      }
    });
  } catch (err) {
    setPage(`<div class="empty-state">Gagal: ${esc(err.message)}</div>`);
  }
}

// ─── Event delegation ──────────────────────────────────────────
qs('#pageContent').addEventListener('click', e => {
  const copyUid = e.target.closest('[data-action="copy-uid"]');
  if (copyUid) {
    navigator.clipboard.writeText(copyUid.dataset.uid).then(() => toast('UID disalin')).catch(() => toast('Gagal salin', true));
    return;
  }
  const copyCode = e.target.closest('[data-action="copy-code"]');
  if (copyCode) {
    navigator.clipboard.writeText(copyCode.dataset.code).then(() => toast('Kode disalin')).catch(() => toast('Gagal salin', true));
    return;
  }
  if (e.target.closest('[data-action="refresh"]')) { currentSearch = ''; loadUsers(); return; }
  if (e.target.closest('[data-action="refresh-vouchers"]')) { loadVouchers(); return; }
  if (e.target.closest('[data-action="create-voucher"]')) { openCreateVoucherModal(); return; }
  const editV = e.target.closest('[data-action="edit-voucher"]');
  if (editV) { openEditVoucherModal(editV.dataset.vid); return; }
  const toggleV = e.target.closest('[data-action="toggle-voucher"]');
  if (toggleV) { toggleVoucher(toggleV.dataset.vid, toggleV.dataset.active === 'true'); return; }
  const delV = e.target.closest('[data-action="delete-voucher"]');
  if (delV) { openDeleteVoucherModal(delV.dataset.vid); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, uid: btnUid, banned } = btn.dataset;
  if (action === 'credit')   openCreditModal(btnUid);
  if (action === 'activate') openActivateModal(btnUid);
  if (action === 'revoke')   openRevokeModal(btnUid);
  if (action === 'ban')      openBanModal(btnUid, banned === 'true');
  if (action === 'delete')   openDeleteModal(btnUid);
});

// ─── User Modals (fix revoke bug) ─────────────────────────────
function modalShell(title, uid, bodyHtml, confirmLabel, confirmHandler) {
  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">${title}</div>
    <div class="modal-uid">uid: ${esc(uid)}</div>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-ghost" id="mCancel">Batal</button>
      <button class="btn-modal btn-modal-confirm" id="mConfirm">${confirmLabel}</button>
    </div>
  `);
  qs('#mCancel').addEventListener('click', closeModal);
  qs('#mConfirm').addEventListener('click', confirmHandler);
}

function openCreditModal(uid) {
  modalShell('Tambah / Kurangi Credit', uid,
    `<div class="field"><label>Jumlah (+ tambah, – kurangi)</label><input type="number" id="mCreditAmt" placeholder="100" autocomplete="off"></div>`,
    'Simpan',
    async () => {
      const amt = parseInt(qs('#mCreditAmt').value);
      if (!amt || isNaN(amt)) { toast('Jumlah tidak valid', true); return; }
      await runAction(uid, async () => {
        await updateDoc(doc(db, 'users', uid), { creditBalance: increment(amt) });
        return `Credit ${amt > 0 ? '+' + amt : amt}`;
      });
    });
}

function openActivateModal(uid) {
  modalShell('Aktifkan Premium', uid,
    `<div class="field"><label>Durasi (hari)</label><input type="number" id="mPremDays" value="30" min="1"></div>`,
    'Aktifkan',
    async () => {
      const days = parseInt(qs('#mPremDays').value) || 30;
      await runAction(uid, async () => {
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        await updateDoc(doc(db, 'users', uid), {
          membership: 'premium',
          premium: { isActive: true, expirationDate: exp, unlimitedCredit: true }
        });
        return `Premium aktif ${days} hari`;
      });
    });
}

function openRevokeModal(uid) {
  modalShell('Cabut Premium', uid,
    `<div class="modal-warn">Status premium akan dicabut.</div>`,
    'Cabut',
    async () => {
      await runAction(uid, async () => {
        // FIX: set membership free juga
        await updateDoc(doc(db, 'users', uid), {
          membership: 'free',
          'premium.isActive': false,
          'premium.unlimitedCredit': false
        });
        return 'Premium dicabut';
      });
    });
}

function openBanModal(uid, isBanned) {
  modalShell(isBanned ? 'Unban User' : 'Ban User', uid,
    `<div class="modal-warn ${isBanned ? '' : 'danger'}">${isBanned ? 'Buka blokir?' : 'Blokir akses?'}</div>`,
    isBanned ? 'Unban' : 'Ban',
    async () => {
      await runAction(uid, async () => {
        await updateDoc(doc(db, 'users', uid), { blocked: !isBanned });
        return `User ${isBanned ? 'di-unban' : 'di-ban'}`;
      });
    });
}

function openDeleteModal(uid) {
  modalShell('Hapus User', uid,
    `<div class="modal-warn danger">Akun akan dihapus permanen. Data voucher_redemptions juga dihapus.</div>`,
    'Hapus',
    async () => {
      await runAction(uid, async () => {
        // Hapus user doc
        await deleteDoc(doc(db, 'users', uid));
        // Hapus semua voucher_redemptions user ini
        try {
          const redSnap = await getDocs(collection(db, 'voucher_redemptions'));
          const batch = writeBatch(db);
          redSnap.forEach(d => {
            const data = d.data();
            if (data.deviceId === uid || d.id.startsWith(uid + '_')) {
              batch.delete(d.ref);
            }
          });
          await batch.commit();
        } catch (e) { console.warn('Gagal hapus redemptions:', e); }
        return 'User dihapus';
      }, true);
    });
}

async function runAction(uid, fn, fullReload = false) {
  const confirmBtn = qs('#mConfirm');
  if (!confirmBtn) return;
  confirmBtn.disabled = true;
  confirmBtn.textContent = '...';
  try {
    const msg = await fn();
    toast(msg);
    closeModal();
    await loadUsers();
  } catch (err) {
    toast('Gagal: ' + err.message, true);
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Coba lagi'; }
  }
}


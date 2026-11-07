// ═══════════════════════════════════════════════════════════════════
//  DELTA TOOLS · ADMIN CONSOLE
//  app.js — Firebase logic, navigation, all features
// ═══════════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs,
  query, orderBy, limit, where
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  getFunctions, httpsCallable
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js';

// ─── FIREBASE CONFIG ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCZQ_TuNdD0u6Yk9PNNBUNJvW5EZ-rDTKo",
  authDomain: "rorororrortoolsxrheadrtrick.firebaseapp.com",
  projectId: "rorororrortoolsxrheadrtrick",
  storageBucket: "rorororrortoolsxrheadrtrick.appspot.com",
  messagingSenderId: "872606748189",
  appId: "1:872606748189:android:bfc6694482b6c9dc3a80f4"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const functions = getFunctions(app);

// ─── HELPERS ──────────────────────────────────────────────────────
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function toast(msg, isErr = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  $('#toastWrap').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function setPage(html) {
  $('#pageContent').innerHTML = html;
}

function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modalBg').classList.add('show');
}

function closeModal() {
  $('#modalBg').classList.remove('show');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return '—'; }
}

function fmtNum(n) {
  return (n == null ? 0 : n).toLocaleString('id-ID');
}

// ─── AUTH ─────────────────────────────────────────────────────────
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  const err = $('#loginErr');
  err.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Memuat...';

  try {
    await signInWithEmailAndPassword(
      auth,
      $('#loginEmail').value,
      $('#loginPassword').value
    );
    // onAuthStateChanged handles the view switch
  } catch (e) {
    err.textContent = 'Login gagal: ' + (e.code || e.message);
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

$('#logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const token = await user.getIdTokenResult(true);
      if (!token.claims.admin) {
        toast('Akun ini bukan admin. Hubungi super admin.', true);
        await signOut(auth);
        return;
      }
    } catch (e) {
      toast('Gagal verifikasi admin: ' + e.message, true);
      await signOut(auth);
      return;
    }
    $('#loginView').style.display   = 'none';
    $('#appView').style.display     = 'grid';
    loadDashboard();
  } else {
    $('#loginView').style.display   = 'flex';
    $('#appView').style.display     = 'none';
    $('#loginBtn').disabled         = false;
    $('#loginBtn').textContent      = 'Masuk';
  }
});

// ─── NAVIGATION ───────────────────────────────────────────────────
$$('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    if (el.id === 'logoutBtn') return;
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const view = el.dataset.view;
    if      (view === 'dashboard')    loadDashboard();
    else if (view === 'users')        loadUsers();
    else if (view === 'transactions') loadTransactions();
    else if (view === 'logs')         loadLogs();
  });
});

// ─── DASHBOARD ────────────────────────────────────────────────────
async function loadDashboard() {
  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">Ringkasan data user &amp; aktivitas</div>
      </div>
    </div>
    <div class="empty">Memuat data...</div>
  `);

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalUsers    = usersSnap.size;
    let premiumActive = 0;
    let premiumExpired = 0;
    let totalCredit   = 0;
    let freeUsers     = 0;
    const now = new Date();

    usersSnap.forEach(d => {
      const data   = d.data();
      const credit = Number(data.creditBalance || 0);
      totalCredit += credit;

      const prem = data.premium || {};
      if (prem.isActive === true && prem.expirationDate) {
        try {
          const exp = prem.expirationDate.toDate
            ? prem.expirationDate.toDate()
            : new Date(prem.expirationDate);
          if (exp > now) premiumActive++;
          else           premiumExpired++;
        } catch { freeUsers++; }
      } else if (prem.isActive === true) {
        premiumExpired++;
      } else {
        freeUsers++;
      }
    });

    setPage(`
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-sub">Ringkasan data user &amp; aktivitas</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat" style="color:var(--blue)">
          <div class="stat-label">Total Users</div>
          <div class="stat-value blue">${fmtNum(totalUsers)}</div>
          <div class="stat-sub">Terdaftar di sistem</div>
        </div>
        <div class="stat" style="color:var(--green)">
          <div class="stat-label">Premium Aktif</div>
          <div class="stat-value green">${fmtNum(premiumActive)}</div>
          <div class="stat-sub">${fmtNum(premiumExpired)} expired</div>
        </div>
        <div class="stat" style="color:var(--orange)">
          <div class="stat-label">Total Credit</div>
          <div class="stat-value amber">${fmtNum(totalCredit)}</div>
          <div class="stat-sub">Beredar di semua user</div>
        </div>
        <div class="stat" style="color:var(--red)">
          <div class="stat-label">Free Users</div>
          <div class="stat-value red">${fmtNum(freeUsers)}</div>
          <div class="stat-sub">Belum premium</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title">Quick Actions</div>
        </div>
        <div class="quick-actions">
          <button class="btn red" onclick="document.querySelector('[data-view=users]').click()">
            → Kelola Users
          </button>
          <button class="btn" onclick="document.querySelector('[data-view=transactions]').click()">
            → Lihat Transaksi
          </button>
          <button class="btn" onclick="document.querySelector('[data-view=logs]').click()">
            → Admin Logs
          </button>
        </div>
      </div>
    `);
  } catch (e) {
    setPage(`<div class="empty">Error: ${escapeHtml(e.message)}</div>`);
  }
}

// ─── USERS ────────────────────────────────────────────────────────
let allUsers = [];

async function loadUsers() {
  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Users</div>
        <div class="page-sub">Kelola credit &amp; premium user</div>
      </div>
    </div>
    <div class="empty">Memuat users...</div>
  `);

  try {
    const snap = await getDocs(collection(db, 'users'));
    allUsers = [];
    snap.forEach(d => {
      allUsers.push({ id: d.id, ...d.data() });
    });
    allUsers.sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0));
    renderUsersTable(allUsers);
  } catch (e) {
    setPage(`<div class="empty">Error: ${escapeHtml(e.message)}</div>`);
  }
}

function renderUsersTable(users) {
  const rows = users.map(u => {
    const prem = u.premium || {};
    let badge  = '<span class="badge free">FREE</span>';

    if (prem.isActive === true) {
      let isExp = false;
      try {
        const exp = prem.expirationDate?.toDate
          ? prem.expirationDate.toDate()
          : new Date(prem.expirationDate);
        if (exp <= new Date()) isExp = true;
      } catch {}
      badge = isExp
        ? '<span class="badge expired">EXPIRED</span>'
        : '<span class="badge premium">PREMIUM</span>';
    }

    return `
      <tr>
        <td>
          <div class="uid" onclick="navigator.clipboard.writeText('${escapeHtml(u.id)}');toast('UID disalin')">
            ${escapeHtml(u.id.slice(0, 16))}…
          </div>
        </td>
        <td>${escapeHtml(u.deviceId || '—')}</td>
        <td>${badge}</td>
        <td><span class="credit-val">${fmtNum(u.creditBalance || 0)}</span></td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon green" onclick="openAddCredit('${escapeHtml(u.id)}')">+CR</button>
            <button class="btn-icon" onclick="openActivatePremium('${escapeHtml(u.id)}')">+PRM</button>
            <button class="btn-icon" onclick="openRevokePremium('${escapeHtml(u.id)}')">−PRM</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Users</div>
        <div class="page-sub">${users.length} user terdaftar · klik UID untuk salin</div>
      </div>
    </div>

    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Cari UID atau Device ID...">
      <button class="btn" onclick="loadUsers()">↻ Refresh</button>
    </div>

    <div class="table-wrap">
      ${users.length === 0
        ? '<div class="empty">Belum ada user.</div>'
        : `<table>
            <thead>
              <tr>
                <th>UID</th>
                <th>Device ID</th>
                <th>Status</th>
                <th>Credit</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`}
    </div>
  `);

  const searchInput = $('#searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) { renderUsersTable(allUsers); return; }
      const filtered = allUsers.filter(u =>
        u.id.toLowerCase().includes(q) ||
        (u.deviceId && String(u.deviceId).toLowerCase().includes(q))
      );
      renderUsersTable(filtered);
    });
  }
}

// ─── ACTIONS ──────────────────────────────────────────────────────
window.openAddCredit = (uid) => {
  openModal(`
    <div class="modal-title">Tambah / Kurangi Credit</div>
    <div class="modal-sub">UID: ${escapeHtml(uid)}</div>
    <div class="field">
      <label>Jumlah Credit</label>
      <input type="number" id="mCreditAmount" placeholder="Positif (+100) atau negatif (-50)">
    </div>
    <div class="field">
      <label>Alasan</label>
      <input type="text" id="mCreditReason" placeholder="Alasan penyesuaian">
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" onclick="submitAddCredit('${escapeHtml(uid)}')">Simpan</button>
    </div>
  `);
};

window.submitAddCredit = async (uid) => {
  const amount = parseInt($('#mCreditAmount').value);
  const reason = $('#mCreditReason').value || 'Admin adjustment';
  if (!amount || isNaN(amount)) { toast('Jumlah tidak valid', true); return; }

  try {
    const fn  = httpsCallable(functions, 'adminAddCredits');
    const res = await fn({ uid, amount, reason });
    toast(`Credit diperbarui. Saldo baru: ${res.data.balance}`);
    closeModal();
    loadUsers();
  } catch (e) {
    toast('Gagal: ' + e.message, true);
  }
};

window.openActivatePremium = (uid) => {
  openModal(`
    <div class="modal-title">Aktifkan Premium</div>
    <div class="modal-sub">UID: ${escapeHtml(uid)}</div>
    <div class="field">
      <label>Durasi (hari)</label>
      <input type="number" id="mPremDays" value="30" placeholder="30">
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" onclick="submitActivatePremium('${escapeHtml(uid)}')">Aktifkan</button>
    </div>
  `);
};

window.submitActivatePremium = async (uid) => {
  const days = parseInt($('#mPremDays').value) || 30;
  try {
    const fn  = httpsCallable(functions, 'activatePremium');
    const res = await fn({ uid, durationDays: days, unlimitedCredit: true });
    toast(`Premium aktif. Expired: ${res.data.expirationDate}`);
    closeModal();
    loadUsers();
  } catch (e) {
    toast('Gagal: ' + e.message, true);
  }
};

window.openRevokePremium = (uid) => {
  openModal(`
    <div class="modal-title">Cabut Premium</div>
    <div class="modal-sub">UID: ${escapeHtml(uid)}</div>
    <div style="color:var(--text-mid);font-size:13px;margin:16px 0;line-height:1.6;">
      Yakin ingin mencabut status premium user ini? Aksi ini tidak dapat dibatalkan.
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" onclick="submitRevokePremium('${escapeHtml(uid)}')">Cabut Premium</button>
    </div>
  `);
};

window.submitRevokePremium = async (uid) => {
  try {
    const fn = httpsCallable(functions, 'revokePremium');
    await fn({ uid });
    toast('Premium berhasil dicabut');
    closeModal();
    loadUsers();
  } catch (e) {
    toast('Gagal: ' + e.message, true);
  }
};

window.closeModal = closeModal;

// ─── TRANSACTIONS ─────────────────────────────────────────────────
async function loadTransactions() {
  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Transactions</div>
        <div class="page-sub">Riwayat transaksi user (20 user terakhir)</div>
      </div>
    </div>
    <div class="empty">Memuat data...</div>
  `);

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const allTx = [];

    for (const userDoc of usersSnap.docs.slice(0, 20)) {
      const uid    = userDoc.id;
      const txSnap = await getDocs(
        query(
          collection(db, 'users', uid, 'transactions'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
      );
      txSnap.forEach(t => {
        allTx.push({ uid, id: t.id, ...t.data() });
      });
    }

    allTx.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(0);
      const tb = b.createdAt?.toDate?.() || new Date(0);
      return tb - ta;
    });

    const rows = allTx.slice(0, 100).map(tx => `
      <tr>
        <td>${escapeHtml(tx.uid.slice(0, 12))}…</td>
        <td>${escapeHtml(tx.type || '—')}</td>
        <td>${escapeHtml(tx.feature || '—')}</td>
        <td style="color:${(tx.amount || 0) > 0 ? 'var(--green)' : 'var(--red)'}">
          ${(tx.amount || 0) > 0 ? '+' : ''}${fmtNum(tx.amount)}
        </td>
        <td>${fmtNum(tx.balanceAfter)}</td>
        <td>${fmtDate(tx.createdAt)}</td>
      </tr>
    `).join('');

    setPage(`
      <div class="page-header">
        <div>
          <div class="page-title">Transactions</div>
          <div class="page-sub">${allTx.length} transaksi ditemukan</div>
        </div>
      </div>
      <div class="table-wrap">
        ${allTx.length === 0
          ? '<div class="empty">Belum ada transaksi.</div>'
          : `<table>
              <thead>
                <tr>
                  <th>User UID</th>
                  <th>Tipe</th>
                  <th>Fitur</th>
                  <th>Amount</th>
                  <th>Saldo</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`}
      </div>
    `);
  } catch (e) {
    setPage(`<div class="empty">Error: ${escapeHtml(e.message)}</div>`);
  }
}

// ─── ADMIN LOGS ───────────────────────────────────────────────────
async function loadLogs() {
  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Admin Logs</div>
        <div class="page-sub">Riwayat aksi admin</div>
      </div>
    </div>
    <div class="empty">Memuat logs...</div>
  `);

  try {
    const snap = await getDocs(
      query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(50))
    );

    const rows = [];
    snap.forEach(d => {
      const log = d.data();
      rows.push(`
        <tr>
          <td>${escapeHtml(log.action || '—')}</td>
          <td>${escapeHtml(log.targetUid ? log.targetUid.slice(0, 12) + '…' : '—')}</td>
          <td>${escapeHtml(log.adminUid  ? log.adminUid.slice(0, 12) + '…' : '—')}</td>
          <td>${fmtDate(log.timestamp)}</td>
        </tr>
      `);
    });

    setPage(`
      <div class="page-header">
        <div>
          <div class="page-title">Admin Logs</div>
          <div class="page-sub">${snap.size} log terakhir</div>
        </div>
      </div>
      <div class="table-wrap">
        ${snap.size === 0
          ? '<div class="empty">Belum ada log.</div>'
          : `<table>
              <thead>
                <tr>
                  <th>Aksi</th>
                  <th>Target</th>
                  <th>Admin</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>${rows.join('')}</tbody>
            </table>`}
      </div>
    `);
  } catch (e) {
    setPage(`<div class="empty">Error: ${escapeHtml(e.message)}</div>`);
  }
}

// ─── MODAL CLOSE ON BG CLICK ──────────────────────────────────────
$('#modalBg').addEventListener('click', (e) => {
  if (e.target.id === 'modalBg') closeModal();
});

// ─── GLOBAL EXPOSE ────────────────────────────────────────────────
window.toast     = toast;
window.loadUsers = loadUsers;

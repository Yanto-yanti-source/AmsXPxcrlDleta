import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, increment,
  getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

/* ── Firebase ───────────────────────────────────────────────── */
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

/* ── Utilities ──────────────────────────────────────────────── */
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

function fmtNum(n) {
  return (n == null ? 0 : Number(n)).toLocaleString('id-ID');
}

/* ── Toast ──────────────────────────────────────────────────── */
function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  qs('#toastStack').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ── Modal ──────────────────────────────────────────────────── */
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

/* ── Auth ───────────────────────────────────────────────────── */
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
      'auth/too-many-requests':      'Terlalu banyak percobaan. Coba lagi nanti.',
      'auth/network-request-failed': 'Koneksi gagal. Periksa internet.',
    };
    errEl.textContent = map[err.code] || 'Login gagal: ' + (err.code || err.message);
    errEl.classList.add('visible');
    btn.disabled = false;
    qs('#loginBtnText').textContent = 'ENTER';
  }
});

qs('#logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
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

/* ── Navigation ─────────────────────────────────────────────── */
qs('.sidebar').addEventListener('click', e => {
  const item = e.target.closest('.nav-item[data-view]');
  if (!item) return;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  if (item.dataset.view === 'dashboard') loadDashboard();
  else if (item.dataset.view === 'users') loadUsers();
  else if (item.dataset.view === 'settings') loadSettings();
});

/* ── Dashboard ──────────────────────────────────────────────── */
async function loadDashboard() {
  setPage(`
    <div class="page-head">
      <div><div class="page-title">Dashboard</div><div class="page-meta">Ringkasan data pengguna</div></div>
    </div>
    <div class="stat-grid">
      <div class="stat-cell"><div class="stat-label">Total Users</div><div class="stat-num c-blue">—</div></div>
      <div class="stat-cell"><div class="stat-label">Premium Aktif</div><div class="stat-num c-green">—</div></div>
      <div class="stat-cell"><div class="stat-label">Total Credit</div><div class="stat-num c-amber">—</div></div>
      <div class="stat-cell"><div class="stat-label">Banned</div><div class="stat-num c-red">—</div></div>
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
    setPage(`
      <div class="page-head">
        <div><div class="page-title">Dashboard</div><div class="page-meta">Ringkasan data pengguna</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-label">Total Users</div><div class="stat-num c-blue">${fmtNum(snap.size)}</div></div>
        <div class="stat-cell"><div class="stat-label">Premium Aktif</div><div class="stat-num c-green">${fmtNum(premiumActive)}</div></div>
        <div class="stat-cell"><div class="stat-label">Total Credit</div><div class="stat-num c-amber">${fmtNum(totalCredit)}</div></div>
        <div class="stat-cell"><div class="stat-label">Banned</div><div class="stat-num c-red">${fmtNum(banned)}</div></div>
      </div>
    `);
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat data: ${esc(err.message)}</div>`);
  }
}

/* ── Users ──────────────────────────────────────────────────── */
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
          <button class="act" data-action="hwid" data-uid="${esc(u.id)}">HWID</button>
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
        <button class="btn-sm" data-action="delete-all" style="color:#FF3B2F;border-color:#FF3B2F;">🗑 HAPUS SEMUA</button>
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

/* ── SETTINGS / SYSTEM CONFIG ───────────────────────────────── */
async function loadSettings() {
  setPage(`
    <div class="page-head">
      <div><div class="page-title">System Settings</div><div class="page-meta">Atur maintenance, versi, dan update aplikasi</div></div>
    </div>
    <div class="empty-state">Memuat konfigurasi...</div>
  `);

  try {
    const docRef = doc(db, 'config', 'app_config');
    let data = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) data = snap.data();
    } catch (e) {
      console.warn('Gagal baca config:', e);
    }

    setPage(`
      <div class="page-head">
        <div><div class="page-title">System Settings</div><div class="page-meta">Atur maintenance, versi, dan update aplikasi</div></div>
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
            <textarea id="cfgMessage" class="field-input" rows="3" placeholder="Aplikasi sedang dalam perbaikan, coba lagi nanti...">${esc(data.maintenance_message || '')}</textarea>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">UPDATE APLIKASI</div>
          <div class="field">
            <label>Minimal Versi (Force Update)</label>
            <input type="text" id="cfgMinVersion" class="field-input" value="${esc(data.min_version || '8.0')}" placeholder="8.0">
          </div>
          <div class="field">
            <label>Versi Terbaru</label>
            <input type="text" id="cfgLatestVersion" class="field-input" value="${esc(data.latest_version || '8.0')}" placeholder="8.0">
          </div>
          <div class="field">
            <label>URL Download Update</label>
            <input type="text" id="cfgUpdateUrl" class="field-input" value="${esc(data.update_url || '')}" placeholder="https://example.com/DeltaFinal.apk">
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn-modal btn-modal-confirm" id="saveConfigBtn">SIMPAN KONFIGURASI</button>
        </div>
        <div class="settings-note">
          ⓘ Perubahan akan dibaca oleh App Delta saat user membuka aplikasi (butuh restart app).
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
        toast('Konfigurasi disimpan.');
        btn.disabled = false;
        btn.textContent = 'SIMPAN KONFIGURASI';
      } catch (err) {
        toast('Gagal simpan: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = 'SIMPAN KONFIGURASI';
      }
    });
  } catch (err) {
    setPage(`<div class="empty-state">Gagal memuat: ${esc(err.message)}</div>`);
  }
}

/* ── Event delegation for page content ─────────────────────── */
qs('#pageContent').addEventListener('click', e => {
  const uid = e.target.closest('[data-action="copy-uid"]');
  if (uid) {
    navigator.clipboard.writeText(uid.dataset.uid).then(() => toast('UID disalin')).catch(() => toast('Gagal salin UID', true));
    return;
  }
  if (e.target.closest('[data-action="refresh"]')) { currentSearch = ''; loadUsers(); return; }
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, uid: btnUid, banned } = btn.dataset;
  if (action === 'credit')   openCreditModal(btnUid);
  if (action === 'activate') openActivateModal(btnUid);
  if (action === 'revoke')   openRevokeModal(btnUid);
  if (action === 'hwid')     openHwidModal(btnUid);
  if (action === 'ban')      openBanModal(btnUid, banned === 'true');
  if (action === 'delete')   openDeleteModal(btnUid);
  if (action === "delete-all") openDeleteAllModal();
});

/* ── Modals ─────────────────────────────────────────────────── */
function modalShell(title, uid, bodyHtml, confirmLabel, confirmHandler) {
  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">${title}</div>
    <div class="modal-uid">uid: ${esc(uid)}</div>
    <div class="modal-body" id="modalBody">${bodyHtml}</div>
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
        return `Credit ${amt > 0 ? '+' + amt : amt} berhasil`;
      });
    });
}

function openActivateModal(uid) {
  modalShell('Aktifkan Premium', uid,
    `<div class="field"><label>Durasi (hari)</label><input type="number" id="mPremDays" value="30" min="1" autocomplete="off"></div>`,
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
    `<div class="modal-warn">Status premium akan dicabut dan akun kembali ke Free.</div>`,
    'Cabut',
    async () => {
      await runAction(uid, async () => {
        await updateDoc(doc(db, 'users', uid), { membership: 'free', 'premium.isActive': false });
        return 'Premium dicabut';
      });
    });
}

function openHwidModal(uid) {
  modalShell('Reset Device ID', uid,
    `<div class="modal-warn">Ikatan device lama akan dihapus. User bisa login di device baru.</div>`,
    'Reset',
    async () => {
      await runAction(uid, async () => {
        await updateDoc(doc(db, 'users', uid), { deviceId: null });
        return 'Device ID direset';
      });
    });
}

function openBanModal(uid, isBanned) {
  modalShell(isBanned ? 'Unban User' : 'Ban User', uid,
    `<div class="modal-warn ${isBanned ? '' : 'danger'}">${isBanned ? 'Buka blokir user ini?' : 'Blokir akses user ini ke aplikasi?'}</div>`,
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
    `<div class="modal-warn danger">Akun ini akan dihapus permanen dari database dan tidak bisa dikembalikan.</div>`,
    'Hapus',
    async () => {
      await runAction(uid, async () => {
        await deleteDoc(doc(db, 'users', uid));
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
    if (fullReload) { currentSearch = ''; await loadUsers(); }
    else { await loadUsers(); }
  } catch (err) {
    toast('Gagal: ' + err.message, true);
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Coba lagi'; }
  }
}

/* ── Delete All Users ──────────────────────────────────────── */
function openDeleteAllModal() {
  openModal(`
    <div class="modal-stripe"></div>
    <div class="modal-title">Hapus SEMUA User</div>
    <div class="modal-uid">⚠ Tindakan ini tidak bisa dibatalkan!</div>
    <div class="modal-body" id="modalBody">
      <div class="modal-warn danger">
        Semua user di Firestore akan dihapus permanen.<br><br>
        Ketik <b>HAPUS SEMUA</b> untuk konfirmasi:
      </div>
      <div class="field">
        <label>Konfirmasi</label>
        <input type="text" id="mConfirmText" placeholder="HAPUS SEMUA" autocomplete="off">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-ghost" id="mCancel">Batal</button>
      <button class="btn-modal btn-modal-confirm" id="mConfirm" style="background:#FF3B2F;">HAPUS SEMUA</button>
    </div>
  `);
  qs('#mCancel').addEventListener('click', closeModal);
  qs('#mConfirm').addEventListener('click', async () => {
    const input = qs('#mConfirmText').value.trim();
    if (input !== 'HAPUS SEMUA') {
      toast('Ketik "HAPUS SEMUA" untuk konfirmasi', true);
      return;
    }
    const btn = qs('#mConfirm');
    btn.disabled = true;
    btn.textContent = 'MENGHAPUS...';
    try {
      const snap = await getDocs(collection(db, 'users'));
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'users', d.id));
        count++;
      }
      toast(`Berhasil hapus ${count} user`);
      closeModal();
      await loadUsers();
    } catch (err) {
      toast('Gagal: ' + err.message, true);
      btn.disabled = false;
      btn.textContent = 'HAPUS SEMUA';
    }
  });
}

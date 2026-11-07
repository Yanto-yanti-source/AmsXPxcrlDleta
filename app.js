import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, increment } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCZQ_TuNdD0u6Yk9PNNBUNJvW5EZ-rDTKo",
  authDomain: "rorororrortoolsxrheadrtrick.firebaseapp.com",
  projectId: "rorororrortoolsxrheadrtrick",
  storageBucket: "rorororrortoolsxrheadrtrick.appspot.com",
  messagingSenderId: "872606748189",
  appId: "1:872606748189:android:bfc6694482b6c9dc3a80f4"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function toast(m, err=false) { const t=document.createElement('div'); t.className='toast'+(err?' err':''); t.textContent=m; $('#toastWrap').appendChild(t); setTimeout(()=>t.remove(),4000); }
function setPage(h) { $('#pageContent').innerHTML=h; }
function openModal(h) { $('#modalContent').innerHTML=h; $('#modalBg').classList.add('show'); }
function closeModal() { $('#modalBg').classList.remove('show'); }
function esc(s) { return s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(ts) { if(!ts) return '—'; try { const d=ts.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString('id-ID',{year:'numeric',month:'short',day:'numeric'}); } catch { return '—'; } }
function fmtNum(n) { return (n==null?0:n).toLocaleString('id-ID'); }

// ─── AUTH ─────────────────────────────────────────────────────
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn=$('#loginBtn'), err=$('#loginErr');
  err.classList.remove('show'); btn.disabled=true; btn.textContent='Memuat...';
  try { await signInWithEmailAndPassword(auth, $('#loginEmail').value, $('#loginPassword').value); }
  catch(e) { err.textContent='Login gagal: '+(e.code||e.message); err.classList.add('show'); btn.disabled=false; btn.textContent='Masuk'; }
});
$('#logoutBtn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (user) {
    try { const t=await user.getIdTokenResult(true); if(!t.claims.admin) { toast('Akun bukan admin',true); await signOut(auth); return; } }
    catch(e) { toast('Gagal verifikasi: '+e.message,true); await signOut(auth); return; }
    $('#loginView').style.display='none'; $('#appView').style.display='grid'; loadDashboard();
  } else {
    $('#loginView').style.display='flex'; $('#appView').style.display='none';
    $('#loginBtn').disabled=false; $('#loginBtn').textContent='Masuk';
  }
});

// ─── NAV ──────────────────────────────────────────────────────
$$('.nav-item').forEach(el => el.addEventListener('click', () => {
  if (el.id==='logoutBtn') return;
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const v=el.dataset.view;
  if (v==='dashboard') loadDashboard();
  else if (v==='users') loadUsers();
}));

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  setPage(`<div class="page-header"><div><div class="page-title">Dashboard</div></div></div><div class="empty">Memuat...</div>`);
  try {
    const snap = await getDocs(collection(db,'users'));
    let pa=0,pe=0,tc=0,fu=0,bl=0;
    const now=new Date();
    snap.forEach(d => {
      const data=d.data(); tc+=Number(data.creditBalance||0);
      if (data.blocked===true) bl++;
      const p=data.premium||{};
      if (p.isActive===true) {
        try { const e=p.expirationDate.toDate?p.expirationDate.toDate():new Date(p.expirationDate); e>now?pa++:pe++; } catch { pe++; }
      } else fu++;
    });
    setPage(`
      <div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-sub">Ringkasan data</div></div></div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total Users</div><div class="stat-value blue">${fmtNum(snap.size)}</div></div>
        <div class="stat"><div class="stat-label">Premium Aktif</div><div class="stat-value green">${fmtNum(pa)}</div><div class="stat-sub">${pe} expired</div></div>
        <div class="stat"><div class="stat-label">Total Credit</div><div class="stat-value amber">${fmtNum(tc)}</div></div>
        <div class="stat"><div class="stat-label">Blocked</div><div class="stat-value red">${fmtNum(bl)}</div></div>
      </div>
    `);
  } catch(e) { setPage(`<div class="empty">Error: ${esc(e.message)}</div>`); }
}

// ─── USERS ────────────────────────────────────────────────────
let allUsers=[];
async function loadUsers() {
  setPage(`<div class="page-header"><div><div class="page-title">Users</div></div></div><div class="empty">Memuat...</div>`);
  try {
    const snap = await getDocs(collection(db,'users'));
    allUsers=[]; snap.forEach(d => allUsers.push({id:d.id, ...d.data()}));
    allUsers.sort((a,b) => (b.creditBalance||0)-(a.creditBalance||0));
    renderUsers(allUsers);
  } catch(e) { setPage(`<div class="empty">Error: ${esc(e.message)}</div>`); }
}

function renderUsers(users) {
  const rows = users.map(u => {
    const p=u.premium||{};
    let badge='<span class="badge free">FREE</span>';
    if (p.isActive===true) {
      let exp=false;
      try { const d=p.expirationDate?.toDate?p.expirationDate.toDate():new Date(p.expirationDate); exp=d<=new Date(); } catch {}
      badge = exp ? '<span class="badge expired">EXPIRED</span>' : '<span class="badge premium">PREMIUM</span>';
    }
    if (u.blocked===true) badge='<span class="badge blocked">BANNED</span>';

    return `<tr>
      <td><div class="uid" onclick="navigator.clipboard.writeText('${esc(u.id)}');toast('UID disalin')">${esc(u.id)}</div></td>
      <td>${esc(u.deviceId||'—')}</td>
      <td>${badge}</td>
      <td><span class="credit-val">${fmtNum(u.creditBalance||0)}</span></td>
      <td>${fmtDate(u.createdAt)}</td>
      <td><div class="actions-cell">
        <button class="btn-icon green" onclick="openAddCredit('${esc(u.id)}')">+CR</button>
        <button class="btn-icon" onclick="openActivatePremium('${esc(u.id)}')">+PRM</button>
        <button class="btn-icon" onclick="openRevokePremium('${esc(u.id)}')">−PRM</button>
        <button class="btn-icon" onclick="openResetHwid('${esc(u.id)}')">HWID</button>
        <button class="btn-icon" onclick="openBanUser('${esc(u.id)}', ${u.blocked===true})">${u.blocked===true?'UNBAN':'BAN'}</button>
        <button class="btn-icon" onclick="openDeleteUser('${esc(u.id)}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');

  setPage(`
    <div class="page-header"><div><div class="page-title">Users</div><div class="page-sub">${users.length} user · klik UID untuk salin</div></div></div>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Cari UID atau Device ID...">
      <button class="btn" onclick="loadUsers()">↻ Refresh</button>
    </div>
    <div class="table-wrap">
      ${users.length===0 ? '<div class="empty">Belum ada user.</div>' : `
        <table><thead><tr><th>UID</th><th>Device ID</th><th>Status</th><th>Credit</th><th>Bergabung</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody></table>
      `}
    </div>
  `);

  const si=$('#searchInput');
  if (si) si.addEventListener('input', e => {
    const q=e.target.value.toLowerCase().trim();
    if (!q) { renderUsers(allUsers); return; }
    renderUsers(allUsers.filter(u => u.id.toLowerCase().includes(q) || (u.deviceId && String(u.deviceId).toLowerCase().includes(q))));
  });
}

// ─── ACTIONS ──────────────────────────────────────────────────
window.openAddCredit = uid => {
  openModal(`
    <div class="modal-title">Tambah / Kurangi Credit</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div class="field"><label>Jumlah Credit (+100 atau -50)</label><input type="number" id="mCreditAmount" placeholder="100"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitCredit" onclick="submitAddCredit('${esc(uid)}')">Simpan</button>
    </div>
  `);
};

window.submitAddCredit = async uid => {
  const amt=parseInt($('#mCreditAmount').value);
  const btn=$('#btnSubmitCredit');
  if (!amt||isNaN(amt)) { toast('Jumlah tidak valid',true); return; }
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    await updateDoc(doc(db,'users',uid), { creditBalance: increment(amt) });
    toast(`✓ Credit diperbarui`);
    closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent='Simpan';
  }
};

window.openActivatePremium = uid => {
  openModal(`
    <div class="modal-title">Aktifkan Premium</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div class="field"><label>Durasi (hari)</label><input type="number" id="mPremDays" value="30"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitPrem" onclick="submitActivatePremium('${esc(uid)}')">Aktifkan</button>
    </div>
  `);
};

window.submitActivatePremium = async uid => {
  const days=parseInt($('#mPremDays').value)||30;
  const btn=$('#btnSubmitPrem');
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    await updateDoc(doc(db,'users',uid), {
      membership: 'premium',
      premium: { isActive: true, expirationDate: exp, unlimitedCredit: true }
    });
    toast(`✓ Premium aktif selama ${days} hari`);
    closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent='Aktifkan';
  }
};

window.openRevokePremium = uid => {
  openModal(`
    <div class="modal-title">Cabut Premium</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div style="color:var(--mid);margin:16px 0">Yakin cabut premium user ini?</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitRevoke" onclick="submitRevokePremium('${esc(uid)}')">Cabut</button>
    </div>
  `);
};

window.submitRevokePremium = async uid => {
  const btn=$('#btnSubmitRevoke');
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    await updateDoc(doc(db,'users',uid), { membership: 'free', 'premium.isActive': false });
    toast('✓ Premium dicabut'); closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent='Cabut';
  }
};

window.openResetHwid = uid => {
  openModal(`
    <div class="modal-title">Reset HWID / Device ID</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div style="color:var(--mid);margin:16px 0">Menghapus ikatan device lama. User bisa login di device baru.</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitHwid" onclick="submitResetHwid('${esc(uid)}')">Reset</button>
    </div>
  `);
};

window.submitResetHwid = async uid => {
  const btn=$('#btnSubmitHwid');
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    await updateDoc(doc(db,'users',uid), { deviceId: null });
    toast('✓ HWID direset'); closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent='Reset';
  }
};

window.openBanUser = (uid, isBanned) => {
  openModal(`
    <div class="modal-title">${isBanned ? 'Unban' : 'Ban'} User</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div style="color:var(--mid);margin:16px 0">${isBanned ? 'Buka blokir user ini?' : 'Blokir akses user ini ke aplikasi?'}</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitBan" onclick="submitBanUser('${esc(uid)}', ${isBanned})">${isBanned ? 'Unban' : 'Ban'}</button>
    </div>
  `);
};

window.submitBanUser = async (uid, isBanned) => {
  const btn=$('#btnSubmitBan');
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    await updateDoc(doc(db,'users',uid), { blocked: !isBanned });
    toast(`✓ User ${isBanned ? 'di-unban' : 'di-ban'}`); closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent=isBanned ? 'Unban' : 'Ban';
  }
};

window.openDeleteUser = uid => {
  openModal(`
    <div class="modal-title">Hapus User</div>
    <div class="modal-sub">UID: ${esc(uid)}</div>
    <div style="color:var(--red);margin:16px 0">⚠️ Hapus user ini secara permanen dari database?</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnSubmitDel" onclick="submitDeleteUser('${esc(uid)}')">Hapus</button>
    </div>
  `);
};

window.submitDeleteUser = async uid => {
  const btn=$('#btnSubmitDel');
  btn.disabled=true; btn.textContent='Memproses...';
  try {
    await deleteDoc(doc(db,'users',uid));
    toast('✓ User dihapus'); closeModal(); loadUsers();
  } catch(e) {
    toast('❌ Gagal: '+e.message,true);
    btn.disabled=false; btn.textContent='Hapus';
  }
};

// ─── HAPUS SEMUA (Nuclear) ────────────────────────────────────
window.confirmDeleteAll = () => {
  openModal(`
    <div class="modal-title" style="color:var(--red)">⚠️ HAPUS SEMUA USER</div>
    <div class="modal-sub">Tindakan ini TIDAK BISA DIBATALKAN.</div>
    <div style="color:var(--mid);margin:16px 0;line-height:1.6">
      Semua data user (credit, premium, riwayat) akan dihapus permanen.<br><br>
      Ketik <b>HAPUS SEMUA</b> untuk konfirmasi:
    </div>
    <div class="field">
      <input type="text" id="confirmInput" placeholder="HAPUS SEMUA">
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn red" id="btnDeleteAll" onclick="submitDeleteAll()">Hapus Semua</button>
    </div>
  `);
};

window.submitDeleteAll = async () => {
  const val = $('#confirmInput').value.trim();
  if (val !== 'HAPUS SEMUA') { toast('Konfirmasi salah', true); return; }
  const btn = $('#btnDeleteAll');
  btn.disabled = true; btn.textContent = 'Menghapus...';
  try {
    const snap = await getDocs(collection(db, 'users'));
    let count = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, 'users', d.id));
      count++;
    }
    toast(`✓ ${count} user dihapus`);
    closeModal(); loadDashboard();
  } catch (e) {
    toast('❌ Gagal: ' + e.message, true);
    btn.disabled = false; btn.textContent = 'Hapus Semua';
  }
};

window.closeModal = closeModal;
window.loadUsers = loadUsers;
window.toast = toast;

$('#modalBg').addEventListener('click', e => { if (e.target.id==='modalBg') closeModal(); });
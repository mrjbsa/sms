/* =========================================================================
   MISTER JB HIGH SCHOOL — SCHOOL MANAGEMENT SYSTEM
   Single-file, offline, LocalStorage-based. Vanilla JS + TailwindCSS CDN.
   ========================================================================= */

/* ---------------------------- CONSTANTS ---------------------------- */
const DB_KEY = 'bfhs_db_v2';
const GRADE_SCALE = [
  {min:90,label:'A+'},{min:80,label:'A'},{min:70,label:'B'},
  {min:60,label:'C'},{min:50,label:'D'},{min:0,label:'F'}
];
const PERIOD_COLORS = ['#16a34a','#2563eb','#dc2626','#7c3aed','#ea580c','#0d9488','#7c2d12','#1d4ed8'];
const PERIOD_ICONS  = ['📗','📘','📕','📙','📓','📒','📚','📖'];
const DEFAULT_SUBJECTS = ['English','Mathematics','Science','Urdu','Social Studies','Computer'];
const DEFAULT_CLASSES  = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
const EXAMS = [{key:'pt1',label:'PT-1'},{key:'pt2',label:'PT-2'},{key:'mid',label:'Mid Term'},{key:'final',label:'Final Term'}];

/* ============================================================
   ANNOUNCEMENTS — categories + Pakistan's fixed-date public holidays.
   Moon-sighting holidays (Eid-ul-Fitr, Eid-ul-Adha, Eid Milad-un-Nabi,
   Ashura) shift every year, so those are NOT built in here — the
   Headmaster adds them as normal announcements once dates are confirmed.
   ============================================================ */
const ANN_CATEGORIES = ['Holiday','Event','General'];
const PK_FIXED_HOLIDAYS = [
  {md:'02-05', title:'Kashmir Solidarity Day', short:"A day of solidarity with the people of Kashmir, marked with rallies and a human chain at 10am.", detail:"Observed nationwide since 1990, Kashmir Solidarity Day expresses Pakistan's support for the Kashmiri people's right to self-determination. Schools usually hold a short assembly, and students are encouraged to wear black armbands or Kashmir-flag badges."},
  {md:'03-23', title:'Pakistan Day', short:"Marks the 1940 Lahore Resolution and the 1956 adoption of Pakistan's first constitution.", detail:"Pakistan Day commemorates the Lahore Resolution of 23 March 1940, in which the All-India Muslim League formally demanded a separate homeland for Muslims. It also marks the day Pakistan became an Islamic Republic in 1956. The day is marked nationwide with a military parade in Islamabad and flag-hoisting ceremonies in schools."},
  {md:'05-01', title:'Labour Day', short:"International Workers' Day, honouring the contribution of workers and labourers.", detail:"Also known as May Day, this public holiday recognises the rights and contributions of the labour force. It traces back to the 1886 Haymarket affair in Chicago and is observed in most countries around the world, including Pakistan."},
  {md:'08-14', title:'Independence Day', short:"Celebrates Pakistan's independence from British rule in 1947.", detail:"On 14 August 1947, Pakistan became an independent state. The day is celebrated nationwide with flag-hoisting ceremonies, the national anthem, green-and-white decorations, and patriotic songs. Schools typically hold a special assembly around this date."},
  {md:'09-06', title:'Defence Day', short:"Honours the Pakistan Armed Forces and those who defended the country in the 1965 war.", detail:"Defence and Martyrs Day (Youm-e-Difa) commemorates the resilience of Pakistan's armed forces during the 1965 war. Ceremonies are held at military graveyards and monuments, and a moment of silence is often observed in schools."},
  {md:'11-09', title:'Iqbal Day', short:"Marks the birth anniversary of the poet-philosopher Allama Muhammad Iqbal.", detail:"Allama Iqbal (1877–1938), the national poet of Pakistan, is remembered for his poetry and his vision of a separate Muslim homeland in South Asia. Schools often hold Iqbal-reading and poetry sessions on this day."},
  {md:'12-25', title:'Quaid-e-Azam Day', short:"Birthday of Muhammad Ali Jinnah, founder and first Governor-General of Pakistan.", detail:"Quaid-e-Azam Muhammad Ali Jinnah was born on 25 December 1876 and led the movement for Pakistan's independence. The day is a public holiday marked by wreath-laying ceremonies at his mausoleum in Karachi and special assemblies in schools."},
];

/* ---------------------------- DEFAULT DB ---------------------------- */
function defaultDB(){
  return {
    config:{
      schoolName:'Mister JB High School',
      logo:null,
      assemblyStart:'08:00', assemblyEnd:'08:15',
      schoolEnd:'14:40',
      breaksType:1,
      totalPeriods:8,
      periodsBeforeBreak1:3,
      periodsBeforeBreak2:3,
      break1Start:'10:30', break1End:'10:55',
      break2Start:'12:55', break2End:'13:20',
      passPercent:40,
      subjects: DEFAULT_SUBJECTS.slice(),      // default/fallback subject list
      classSubjects:{},                        // { "5th": ["English","Math",...] } per-class overrides
      gradeScale: GRADE_SCALE.map(g=>({...g})), // editable by headmaster
      classes: DEFAULT_CLASSES.slice(),
      year:'2024-2025',
      timetable:null, // generated array
      headmasterAccount:null, // {name,password,gmail,gmailPassword} set on first run
      classFee:{}   // {cls: monthlyAmount} — set by Headmaster in Fees tab
    },
    teachers:[],   // {id,name,subject,cls,password}
    students:[],   // {id,name,father,cls,section,roll,mobile,marksArchive:[{year,cls,marks}]}
    attendance:{}, // key `${cls}|${date}` -> {studentId:'P'/'A'/'L'}
    teacherAttendance:{}, // key `${date}` -> {teacherId:'P'/'A'/'L'}
    marks:{},      // studentId -> { subject: {pt1,pt2,mid,final} } (null = not entered yet)
    announcements:[], // {id,title,date,category,audience,short,detail} — Headmaster-authored; Pakistan's fixed holidays are added automatically, not stored here
    fees:{},       // studentId -> { 'YYYY-MM': {amount,status:'Paid'/'Unpaid',paidOn} }
    homework:[]    // {id,cls,subject,title,description,dateAssigned,dueDate,teacherId}
  };
}
let DB = loadDB();
function loadDB(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(!raw) return defaultDB();
    const parsed = JSON.parse(raw);
    // merge with defaults to survive schema growth
    const d = defaultDB();
    return Object.assign(d, parsed, {config:Object.assign(d.config, parsed.config||{})});
  }catch(e){ return defaultDB(); }
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(DB)); driveAutoSave(); }

/* ============================================================
   GOOGLE DRIVE CLOUD SYNC
   ------------------------------------------------------------
   One-time setup (done once by whoever hosts this website):
     1. Host these 3 files online (GitHub Pages / Netlify) so they
        have a real https:// address.
     2. Google Cloud Console -> create an OAuth Client ID (Web app)
        and an API key; add the hosted URL under Authorized JS origins.
     3. Paste them below, then re-upload.
   That ONE hosted copy then serves UNLIMITED independent schools:
   the first time a Headmaster clicks "Connect Google Drive", a new,
   private data file is created in THEIR OWN Google Drive (not
   shared with anyone else) and they get a unique "School Link"
   (this page's URL + ?fid=<their file id>). Sharing that link with
   their teachers and parents is what points those devices at THIS
   school's data — no code editing, no separate hosting needed per
   school. Every change auto-uploads within a couple of seconds, and
   every connected device (plus Parents, who need no sign-in at all)
   auto-checks for updates roughly every 25 seconds.
   ============================================================ */
const GOOGLE_CLIENT_ID = '561937132494-v9ffcqt3ijbr44dpr5jlo0f5b61vm7s4.apps.googleusercontent.com';
const GOOGLE_API_KEY   = 'AIzaSyCzzco0EgdjcwW9zrZf95slLioXK2cU6Cg';
/* A file id arriving via ?fid= in the URL (i.e. someone opened their
   school's shared link) always wins and is remembered on this device. */
const urlFid = new URLSearchParams(location.search).get('fid');
if(urlFid) localStorage.setItem('bfhs_drive_file_id', urlFid);
let   DRIVE_FILE_ID    = urlFid || localStorage.getItem('bfhs_drive_file_id') || '';
function schoolShareLink(){
  if(!DRIVE_FILE_ID) return '';
  const url = new URL(location.href); url.search=''; url.hash='';
  return `${url.toString()}?fid=${DRIVE_FILE_ID}`;
}
function copyShareLink(){
  const link = schoolShareLink(); if(!link) return;
  navigator.clipboard?.writeText(link).then(
    ()=>alert('School link copied! Send it to your teachers and parents.'),
    ()=>prompt('Copy this link and share it with your teachers and parents:', link)
  );
}

/* ============================================================
   PLATFORM APPROVAL GATE (paid service — owner approves each school)
   ------------------------------------------------------------
   Optional, off by default. If MASTER_REGISTRY_FILE_ID is left blank,
   every school works exactly as before with no approval step.
   Once the owner creates a registry (via the "⚙️ Platform Admin" link
   on the login screen, using OWNER_GMAIL) and pastes its file ID
   below, every NEW school that connects Google Drive here must be
   approved before its dashboard opens:
     • not listed / "pending" -> "Awaiting Approval" screen
     • "denied"               -> paid-service contact screen
     • "approved"             -> normal access
   The registry itself is a small JSON file in the owner's OWN Drive,
   shared as "Anyone with the link — Viewer" so every school's device
   can read its own status with no sign-in. Only the owner's Google
   account can ever WRITE to it — Google Drive enforces that on its
   own, so nobody can self-approve.
   ============================================================ */
const OWNER_GMAIL = 'mrjbsa.313@gmail.com';           // the Google account that unlocks the Platform Admin panel
const OWNER_CONTACT_EMAIL = 'mrjbsa.official@outlook.com'; // shown to schools that are denied / still pending
const MASTER_REGISTRY_FILE_ID = '';                        // paste the registry file's ID here once created — leave blank to disable the gate entirely

let APPROVAL_STATE = {status:'unknown', checkedAt:null}; // 'unknown' | 'approved' | 'pending' | 'denied'
let adminTokenClient=null, adminAccessToken=null, adminConnectedEmail=null, adminRegistry=null;

function registryConfigured(){ return !!(MASTER_REGISTRY_FILE_ID && !MASTER_REGISTRY_FILE_ID.includes('PASTE')); }
function refreshApprovalStatus(){
  if(!registryConfigured() || !DRIVE_FILE_ID){ APPROVAL_STATE={status:'approved', checkedAt:new Date()}; return Promise.resolve(); }
  return fetch(`https://www.googleapis.com/drive/v3/files/${MASTER_REGISTRY_FILE_ID}?alt=media&key=${GOOGLE_API_KEY}`)
    .then(r=>{ if(!r.ok) throw new Error('registry fetch failed'); return r.json(); })
    .then(reg=>{
      const entry = (reg.schools||{})[DRIVE_FILE_ID];
      APPROVAL_STATE = {status: entry ? entry.status : 'pending', checkedAt:new Date()};
    })
    .catch(()=>{ if(APPROVAL_STATE.status==='unknown') APPROVAL_STATE={status:'pending', checkedAt:new Date()}; });
}
function checkApprovalStatus(){ refreshApprovalStatus().then(render); }
function approvalRequestLinks(schoolName, gmail){
  const text = `New School Registration\n\nSchool Name: ${schoolName}\nHeadmaster Gmail: ${gmail||'(not set)'}\nSchool File ID: ${DRIVE_FILE_ID}`;
  return {
    mailto: `mailto:${OWNER_CONTACT_EMAIL}?subject=${encodeURIComponent('New School Registration — '+schoolName)}&body=${encodeURIComponent(text)}`,
    wa: `https://wa.me/?text=${encodeURIComponent(text)}`
  };
}
function renderApprovalGate(){
  if(APPROVAL_STATE.status==='denied'){
    return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md doc-frame">
        <div class="doc-topbar"></div>
        <div class="doc-arc"><div class="doc-shield">🚫</div><div class="doc-title" style="font-size:1.3rem;">Access Denied</div><div class="doc-subtitle">This is a paid service</div></div>
        <div class="p-6 text-center space-y-3">
          <p class="text-gray-700">Please contact us to purchase access before using this school management system.</p>
          <p class="font-bold text-[var(--navy)]">📧 ${esc(OWNER_CONTACT_EMAIL)}</p>
          <button onclick="logout()" class="bg-gray-200 rounded-lg px-5 py-2 font-bold mt-2">⬅️ Back to Login</button>
        </div>
        <div class="doc-footer"><span class="lead">Learn Today</span><span class="lead2">Lead Tomorrow</span></div>
      </div>
    </div>`;
  }
  const hm = DB.config.headmasterAccount || {};
  const links = approvalRequestLinks(DB.config.schoolName||'My School', hm.gmail||driveConnectedEmail||'');
  return `
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md doc-frame">
      <div class="doc-topbar"></div>
      <div class="doc-arc"><div class="doc-shield">⏳</div><div class="doc-title" style="font-size:1.3rem;">Awaiting Approval</div></div>
      <div class="p-6 text-center space-y-3">
        <p class="text-gray-700">This school's registration needs to be approved before the dashboard opens. Send your request if you haven't already:</p>
        <div class="flex flex-col gap-2">
          <a href="${links.mailto}" class="navy-btn rounded-lg px-5 py-2 font-bold">📧 Send Request by Email</a>
          <a href="${links.wa}" target="_blank" class="bg-green-600 text-white rounded-lg px-5 py-2 font-bold">💬 Send Request on WhatsApp</a>
        </div>
        <button onclick="checkApprovalStatus()" class="gold-btn rounded-lg px-5 py-2 font-bold mt-2">🔄 Check Approval Status</button>
        <button onclick="logout()" class="text-sm text-gray-500 underline mt-2 block mx-auto">⬅️ Back to Login</button>
        <p class="text-xs text-gray-400 mt-2">Questions? 📧 ${esc(OWNER_CONTACT_EMAIL)}</p>
      </div>
      <div class="doc-footer"><span class="lead">Learn Today</span><span class="lead2">Lead Tomorrow</span></div>
    </div>
  </div>`;
}

/* ---------- Platform Admin (owner-only) ---------- */
function adminInitTokenClient(){
  if(adminTokenClient || !window.google || !google.accounts) return;
  adminTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive',
    callback:(resp)=>{
      if(resp.error){ alert('Google sign-in failed: '+resp.error); return; }
      adminAccessToken = resp.access_token;
      fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+adminAccessToken}})
        .then(r=>r.json()).then(p=>{
          adminConnectedEmail = p.email;
          if(OWNER_GMAIL && !OWNER_GMAIL.includes('PASTE') && p.email.toLowerCase()!==OWNER_GMAIL.toLowerCase()){
            alert(`This Google account is not authorised as the Platform Admin.\n\nYou signed in as: ${p.email}\nExpected admin account: ${OWNER_GMAIL}\n\nPlease try again and choose the correct Google account.`);
            adminAccessToken=null; adminConnectedEmail=null; return;
          }
          SESSION = {role:'superadmin'};
          sessionStorage.setItem('bfhs_session', JSON.stringify(SESSION));
          alert(`Signed in as Platform Admin (${p.email}).`);
          if(registryConfigured()) adminLoadRegistry().then(render); else render();
        });
    }
  });
}
function adminConnect(){
  if(!driveConfigured()){ alert("Google Drive isn't set up yet — add a Google Client ID & API key first (see Cloud Sync instructions)."); return; }
  adminInitTokenClient();
  if(!adminTokenClient){ alert('Still loading Google sign-in — please try again in a moment.'); return; }
  adminTokenClient.requestAccessToken({prompt:'select_account'});
}
function adminLoadRegistry(){
  return fetch(`https://www.googleapis.com/drive/v3/files/${MASTER_REGISTRY_FILE_ID}?alt=media`,{headers:{Authorization:'Bearer '+adminAccessToken}})
    .then(r=>{ if(!r.ok) throw new Error('load failed'); return r.json(); })
    .then(reg=>{ adminRegistry = (reg && reg.schools) ? reg : {schools:{}}; })
    .catch(()=>{ adminRegistry = {schools:{}}; });
}
function adminSaveRegistry(){
  return fetch(`https://www.googleapis.com/upload/drive/v3/files/${MASTER_REGISTRY_FILE_ID}?uploadType=media`,{
    method:'PATCH', headers:{Authorization:'Bearer '+adminAccessToken, 'Content-Type':'application/json'},
    body: JSON.stringify(adminRegistry)
  }).then(r=>r.json());
}
function adminCreateRegistry(){
  const boundary='bfhs_registry_boundary';
  const meta = {name:'school_registry.json', mimeType:'application/json'};
  const initial = {schools:{}};
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(initial)}\r\n--${boundary}--`;
  fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
    method:'POST', headers:{Authorization:'Bearer '+adminAccessToken, 'Content-Type':`multipart/related; boundary=${boundary}`}, body
  }).then(r=>r.json()).then(f=>{
    if(!f.id){ alert('Could not create the registry file: '+(f.error?.message||'unknown error')); return; }
    fetch(`https://www.googleapis.com/drive/v3/files/${f.id}/permissions`,{
      method:'POST', headers:{Authorization:'Bearer '+adminAccessToken,'Content-Type':'application/json'},
      body: JSON.stringify({type:'anyone', role:'reader'})
    }).then(()=>{
      adminRegistry = {schools:{}};
      alert(`Registry created!\n\nFile ID: ${f.id}\n\nPaste this into the MASTER_REGISTRY_FILE_ID constant near the top of script.js and re-upload — a one-time step. Until you do, the approval gate stays off for everyone.`);
      render();
    });
  }).catch(e=>alert('Could not create the registry file: '+e.message));
}
function adminSetStatus(fileId, status){
  if(!adminRegistry) adminRegistry={schools:{}};
  if(!adminRegistry.schools[fileId]) adminRegistry.schools[fileId] = {name:'(manually added)', gmail:'', requestedAt:new Date().toISOString()};
  adminRegistry.schools[fileId].status = status;
  adminRegistry.schools[fileId].decidedAt = new Date().toISOString();
  adminSaveRegistry().then(()=>render());
}
function adminAddSchool(){
  const fileId = document.getElementById('adminFileId').value.trim();
  const name = document.getElementById('adminSchoolName').value.trim();
  const gmail = document.getElementById('adminSchoolGmail').value.trim();
  if(!fileId){ alert("Paste the school's File ID (from their request email/WhatsApp message)."); return; }
  if(!adminRegistry) adminRegistry={schools:{}};
  adminRegistry.schools[fileId] = {name:name||'(unnamed)', gmail, status:'pending', requestedAt:new Date().toISOString()};
  adminSaveRegistry().then(()=>render());
}
function renderSuperAdmin(){
  if(!registryConfigured()){
    document.getElementById('app').innerHTML = `<div class="max-w-lg mx-auto p-6 mt-10">${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">⚙️ Platform Admin — Set Up Registry</h2>
      <p class="text-sm text-gray-600 mb-4">Connected as <b>${esc(adminConnectedEmail||'')}</b>. Create your one master registry file (once, ever) to start approving schools.</p>
      <button onclick="adminCreateRegistry()" class="navy-btn rounded-lg px-5 py-2 font-bold">➕ Create Master Registry</button>
      <button onclick="logout()" class="bg-gray-200 rounded-lg px-5 py-2 font-bold ml-2">⬅️ Back to Login</button>
    `)}</div>`;
    return;
  }
  const schools = (adminRegistry && adminRegistry.schools) || {};
  const rows = Object.entries(schools).sort((a,b)=>(b[1].requestedAt||'').localeCompare(a[1].requestedAt||'')).map(([fid,s])=>`
    <tr class="border-b">
      <td class="py-2 text-xs">${esc(s.name||'-')}</td>
      <td class="text-xs">${esc(s.gmail||'-')}</td>
      <td class="text-xs font-mono">${esc(String(fid).slice(0,14))}…</td>
      <td class="text-xs font-bold ${s.status==='approved'?'text-green-600':s.status==='denied'?'text-red-600':'text-amber-600'}">${esc(s.status||'pending')}</td>
      <td class="whitespace-nowrap">
        <button onclick="adminSetStatus('${fid}','approved')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${s.status==='approved'?'bg-green-600 text-white':'bg-gray-100'}">Approve</button>
        <button onclick="adminSetStatus('${fid}','denied')" class="px-3 py-1 rounded-lg text-xs font-bold ${s.status==='denied'?'bg-red-600 text-white':'bg-gray-100'}">Deny</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No school requests yet.</td></tr>`;
  document.getElementById('app').innerHTML = `<div class="max-w-4xl mx-auto p-4 space-y-5">
    ${card(`<div class="flex justify-between items-center flex-wrap gap-2"><h2 class="text-xl font-bold text-[var(--navy)]">⚙️ Platform Admin</h2><button onclick="logout()" class="bg-gray-200 rounded-lg px-4 py-1.5 text-sm font-bold">⬅️ Logout</button></div><p class="text-sm text-gray-600 mt-1">Connected as <b>${esc(adminConnectedEmail||'')}</b></p>`)}
    ${card(`
      <h3 class="font-bold text-[var(--navy)] mb-3">➕ Manually Add a School</h3>
      <p class="text-xs text-gray-500 mb-3">Use this if a request arrived by email/WhatsApp instead of automatically. Get the File ID from their message.</p>
      <div class="grid md:grid-cols-3 gap-3">
        <input id="adminSchoolName" placeholder="School Name" class="border rounded-lg px-3 py-2">
        <input id="adminSchoolGmail" placeholder="Headmaster Gmail" class="border rounded-lg px-3 py-2">
        <input id="adminFileId" placeholder="School File ID" class="border rounded-lg px-3 py-2">
      </div>
      <button onclick="adminAddSchool()" class="gold-btn rounded-lg px-5 py-2 font-bold mt-3">Add as Pending</button>
    `)}
    ${card(`
      <h3 class="font-bold text-[var(--navy)] mb-3">📋 Schools</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">Name</th><th>Gmail</th><th>File ID</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    `)}
  </div>`;
}

let driveTokenClient=null, driveAccessToken=null, driveConnectedEmail=null, driveLastSync=null, driveAutoTimer=null;
function driveConfigured(){ return GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PASTE') && GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('PASTE'); }
function driveSetFileId(id){ DRIVE_FILE_ID = id; localStorage.setItem('bfhs_drive_file_id', id); }
function driveInitTokenClient(){
  if(driveTokenClient || !window.google || !google.accounts) return;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive',
    callback: (resp)=>{
      if(resp.error){ alert('Google sign-in failed: '+resp.error); return; }
      driveAccessToken = resp.access_token;
      fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+driveAccessToken}})
        .then(r=>r.json()).then(p=>{
          driveConnectedEmail = p.email;
          if(!DRIVE_FILE_ID) driveCreateFile(); else drivePullNow(true).then(render);
        });
    }
  });
}
function driveConnect(){
  if(!driveConfigured()){ alert("Google Drive isn't set up yet — add a Google Client ID & API key first (see Cloud Sync instructions)."); return; }
  driveInitTokenClient();
  if(!driveTokenClient){ alert('Still loading Google sign-in — please try again in a moment.'); return; }
  driveTokenClient.requestAccessToken({prompt:''});
}
function driveCreateFile(){
  const boundary='bfhs_boundary_xyz';
  const meta = {name:'school_db.json', mimeType:'application/json'};
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(DB)}\r\n--${boundary}--`;
  fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{
    method:'POST',
    headers:{Authorization:'Bearer '+driveAccessToken, 'Content-Type':`multipart/related; boundary=${boundary}`},
    body
  }).then(r=>r.json()).then(f=>{
    if(f.id){
      driveSetFileId(f.id);
      driveLastSync = new Date();
      refreshApprovalStatus().then(()=>{
        render();
        if(registryConfigured()){
          alert(`Your school's private data file has been created.\n\nThis is a paid platform — please send your approval request using the buttons on the screen now shown. Full access opens automatically once it's approved.`);
        } else {
          alert(`Your school's private data file has been created in your Google Drive!\n\nGo to Cloud Sync below and copy your unique "School Link" — send it to your teachers and share it with parents. Opening that link on their device connects them to THIS school's data automatically (no code editing needed).\n\nAlso click "Enable Parent Viewing" so parents can see records without signing in, and share this file (Editor access) with each teacher's Gmail from within Google Drive itself so they can save changes too.`);
        }
      });
    } else alert('Could not create the Drive file: '+(f.error?.message||'unknown error'));
  }).catch(e=>alert('Could not create the Drive file: '+e.message));
}
function drivePullNow(silent){
  if(!driveAccessToken || !DRIVE_FILE_ID){ if(!silent) alert('Connect Google Drive first.'); return Promise.resolve(); }
  return fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`,{headers:{Authorization:'Bearer '+driveAccessToken}})
    .then(r=>{ if(!r.ok) throw new Error('load failed ('+r.status+')'); return r.json(); })
    .then(data=>{ DB = Object.assign(defaultDB(), data, {config:Object.assign(defaultDB().config, data.config||{})}); localStorage.setItem(DB_KEY, JSON.stringify(DB)); driveLastSync=new Date(); if(!silent) render(); })
    .catch(e=>{ if(!silent) alert('Could not load from Drive: '+e.message); });
}
function driveSaveNow(silent){
  if(!driveAccessToken || !DRIVE_FILE_ID){ if(!silent) alert('Connect Google Drive first.'); return Promise.resolve(); }
  return fetch(`https://www.googleapis.com/upload/drive/v3/files/${DRIVE_FILE_ID}?uploadType=media`,{
    method:'PATCH',
    headers:{Authorization:'Bearer '+driveAccessToken, 'Content-Type':'application/json'},
    body: JSON.stringify(DB)
  }).then(r=>{ if(!r.ok) throw new Error('save failed ('+r.status+')'); driveLastSync=new Date(); if(!silent) render(); })
    .catch(e=>{ if(!silent) alert('Could not save to Drive: '+e.message); });
}
function driveAutoSave(){
  if(!driveAccessToken || !DRIVE_FILE_ID) return;
  clearTimeout(driveAutoTimer);
  driveAutoTimer = setTimeout(()=>driveSaveNow(true), 1500);
}
/* Parents read the shared file with just the public API key — no Google sign-in needed */
function driveParentPull(silent){
  if(!DRIVE_FILE_ID || !GOOGLE_API_KEY || GOOGLE_API_KEY.includes('PASTE')) return Promise.resolve();
  return fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media&key=${GOOGLE_API_KEY}`)
    .then(r=>{ if(!r.ok) throw new Error('fetch failed'); return r.json(); })
    .then(data=>{ DB = Object.assign(defaultDB(), data, {config:Object.assign(defaultDB().config, data.config||{})}); localStorage.setItem(DB_KEY, JSON.stringify(DB)); driveLastSync=new Date(); if(!silent) render(); })
    .catch(()=>{});
}
function driveMakePublicReadable(){
  if(!driveAccessToken || !DRIVE_FILE_ID){ alert('Connect Google Drive first.'); return; }
  fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/permissions`,{
    method:'POST', headers:{Authorization:'Bearer '+driveAccessToken, 'Content-Type':'application/json'},
    body: JSON.stringify({type:'anyone', role:'reader'})
  }).then(r=>r.json()).then(res=>{
    if(res.id) alert('Done — Parents can now automatically view the latest saved records without signing in.');
    else alert('Could not update sharing: '+(res.error?.message||'unknown error'));
  }).catch(e=>alert('Could not update sharing: '+e.message));
}
function renderCloudSyncPanel(){
  if(!driveConfigured()){
    return card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">☁️ Cloud Sync (Google Drive)</h2>
      <p class="text-sm text-gray-600 mb-2">Not set up yet. One-time setup (done once by whoever hosts this website — after that, unlimited schools can use it):</p>
      <ol class="list-decimal ml-5 text-sm text-gray-700 space-y-1">
        <li>Host these 3 files online (GitHub Pages / Netlify) so they have a real <code>https://</code> address.</li>
        <li>In Google Cloud Console, create an OAuth Client ID (Web application) + an API key, and add your hosted URL under Authorized JavaScript origins.</li>
        <li>Paste both into the <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_API_KEY</code> constants near the top of this file's code, then re-upload.</li>
      </ol>
    `);
  }
  const statusLine = driveAccessToken ? `Connected as <b>${esc(driveConnectedEmail||'…')}</b>` : 'Not connected this session';
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">☁️ Cloud Sync (Google Drive)</h2>
    <p class="text-sm text-gray-600 mb-3">${statusLine}${driveLastSync?` · Last synced ${driveLastSync.toLocaleTimeString()}`:''}</p>
    ${!DRIVE_FILE_ID?'<p class="text-sm text-amber-600 mb-3">No data file yet for this school — click Connect below to create one (do this once, as Headmaster).</p>':''}
    <div class="flex flex-wrap gap-3">
      <button onclick="driveConnect()" class="navy-btn rounded-lg px-5 py-2 font-bold">🔗 ${driveAccessToken?'Reconnect':'Connect'} Google Drive</button>
      <button onclick="driveSaveNow(false)" class="gold-btn rounded-lg px-5 py-2 font-bold">⬆️ Save Now</button>
      <button onclick="drivePullNow(false)" class="bg-gray-200 rounded-lg px-5 py-2 font-bold">⬇️ Load Latest</button>
      ${DRIVE_FILE_ID?`<button onclick="driveMakePublicReadable()" class="bg-purple-600 text-white rounded-lg px-5 py-2 font-bold">👀 Enable Parent Viewing</button>`:''}
    </div>
    <p class="text-xs text-gray-500 mt-3">Once connected, every change auto-uploads to Google Drive within a couple of seconds, and this device auto-checks for updates roughly every 25 seconds.</p>
    ${DRIVE_FILE_ID?`
    <div class="mt-5 pt-4 border-t">
      <h3 class="font-bold text-[var(--navy)] mb-1">🔗 Your School Link</h3>
      <p class="text-xs text-gray-500 mb-2">Send this link to your teachers, and share it with parents (e.g. in the school WhatsApp group). Opening it on their phone/computer connects them to <b>this school's</b> data only — nothing else needs installing.</p>
      <div class="flex flex-wrap gap-2 items-center">
        <input readonly value="${esc(schoolShareLink())}" onclick="this.select()" class="flex-1 min-w-[240px] border rounded-lg px-3 py-2 text-xs bg-gray-50">
        <button onclick="copyShareLink()" class="navy-btn rounded-lg px-4 py-2 text-sm font-bold">📋 Copy Link</button>
      </div>
    </div>
    <div class="mt-4 pt-4 border-t">
      <h3 class="font-bold text-[var(--navy)] mb-1">🔒 About security</h3>
      <p class="text-xs text-gray-500">Editing (Headmaster/Teachers) always requires signing in with a Google account that has been given Editor access to this file. "Enable Parent Viewing" makes the file <b>readable by anyone with the link</b>, which is what lets Parents see records without signing in — so treat the School Link like a password and only share it with your own school's families. Teacher/Parent login passwords set inside this app are stored in that same data file in plain text, not encrypted — fine for a small trusted school deployment, but not bank-grade security. For stronger protection, keep "Enable Parent Viewing" off and instead give each parent their own Google account with Viewer access, or use this system for non-sensitive records only.</p>
    </div>`:''}
  `);
}
setInterval(()=>{
  const tag = document.activeElement && document.activeElement.tagName;
  if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA') return; // don't disrupt typing
  if(SESSION && SESSION.role==='parent'){ driveParentPull(true).then(()=>{ if(SESSION) render(); }); }
  else if(driveAccessToken && DRIVE_FILE_ID){ drivePullNow(true).then(()=>{ if(SESSION) render(); }); }
}, 25000);

/* ---------------------------- SESSION ---------------------------- */
let SESSION = JSON.parse(sessionStorage.getItem('bfhs_session')||'null');
function setSession(s){ SESSION=s; sessionStorage.setItem('bfhs_session', JSON.stringify(s)); }
function logout(){ SESSION=null; sessionStorage.removeItem('bfhs_session'); render(); }

/* ---------------------------- HELPERS ---------------------------- */
function uid(){ return 'id'+Math.random().toString(36).slice(2,10); }
function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
function timeToMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function minToTime(m){ m=((m%1440)+1440)%1440; const h=Math.floor(m/60), mi=m%60; const ampm=h>=12?'PM':'AM'; let hh=h%12; if(hh===0)hh=12; return `${hh}:${String(mi).padStart(2,'0')} ${ampm}`; }
function minToTime24(m){ const h=Math.floor(m/60), mi=m%60; return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`; }
function grade(pct){
  const scale = (DB.config.gradeScale && DB.config.gradeScale.length) ? DB.config.gradeScale : GRADE_SCALE;
  const sorted = [...scale].sort((a,b)=>b.min-a.min);
  for(const g of sorted){ if(pct>=Number(g.min)) return g.label; }
  return sorted.length? sorted[sorted.length-1].label : 'F';
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* Subjects are configurable per-class; falls back to the school-wide default list */
function subjectsForClass(cls){
  const custom = DB.config.classSubjects && DB.config.classSubjects[cls];
  return (custom && custom.length) ? custom : DB.config.subjects;
}
/* Each exam (PT-1, PT-2, Mid, Final) is out of 100 marks per subject.
   The OVERALL marksheet (obtained / grade / result) follows a PROGRESSIVE rule:
   only PT-1 entered  -> obtained is out of 100 (subjects x 100)
   PT-1 + PT-2 entered -> obtained is out of 200
   + Mid entered        -> obtained is out of 300
   + Final entered       -> obtained is out of 400
   A mark is "entered" once a teacher has typed a value for it (even 0) —
   untouched exams stay `null` so they are never mistaken for a real zero. */
const EXAM_MAX_EACH = 100;
const EXAM_KEYS = EXAMS.map(e=>e.key); // ['pt1','pt2','mid','final']

function entered(rec, key){ return !!rec && rec[key]!==null && rec[key]!==undefined && rec[key]!==''; }

/* Highest exam index (0=pt1 .. 3=final) that has been entered for ANY subject
   of this student — this decides the shared denominator for the whole marksheet. */
function currentExamStageIndex(student, marksData){
  const subs = subjectsForClass(student.cls);
  const m = marksData || DB.marks[student.id] || {};
  let stage = 0;
  for(let i=EXAM_KEYS.length-1;i>=0;i--){
    if(subs.some(sub=>entered(m[sub], EXAM_KEYS[i]))){ stage=i; break; }
  }
  return stage;
}
function computeOverallPct(student, marksData){
  const subs = subjectsForClass(student.cls);
  const m = marksData || DB.marks[student.id] || {};
  const stage = currentExamStageIndex(student, m);
  const keys = EXAM_KEYS.slice(0, stage+1);
  let obtained=0, max=0;
  subs.forEach(sub=>{
    const rec = m[sub]||{};
    keys.forEach(k=>{ obtained += Number(rec[k])||0; });
    max += EXAM_MAX_EACH*keys.length;
  });
  return max? obtained/max*100 : 0;
}
/* Combined term-wise performance across all subjects: PT-1 alone, then PT-1+PT-2,
   then +Mid, then +Final (cumulative), each shown with its own % and grade. */
function termWiseStats(student, marksData){
  const subs = subjectsForClass(student.cls);
  const m = marksData || DB.marks[student.id] || {};
  const cum = [0,0,0,0];
  subs.forEach(sub=>{
    const rec = m[sub] || {};
    let running=0;
    EXAM_KEYS.forEach((k,i)=>{ running += Number(rec[k])||0; cum[i]+=running; });
  });
  return EXAMS.map((e,i)=>{
    const max = subs.length * EXAM_MAX_EACH * (i+1);
    const pct = max? (cum[i]/max*100) : 0;
    return {label:e.label, pct, grade:grade(pct)};
  });
}

/* ============================================================
   TIMETABLE GENERATOR
   Splits the school day into equal-length periods around 1 or 2
   breaks, based on headmaster-provided period counts per segment.
   ============================================================ */
function generateTimetable(cfg){
  const rows = [];
  rows.push({type:'assembly', label:'Assembly', icon:'📢', start:cfg.assemblyStart, end:cfg.assemblyEnd});

  const aEnd = timeToMin(cfg.assemblyEnd);
  const schoolEnd = timeToMin(cfg.schoolEnd);
  let periodNum = 1;
  let colorIdx = 0;

  function pushPeriods(segStart, segEnd, count){
    if(count<=0) return;
    const len = Math.floor((segEnd-segStart)/count);
    let cursor = segStart;
    for(let i=0;i<count;i++){
      const pStart = cursor;
      const pEnd = (i===count-1)? segEnd : cursor+len;
      rows.push({
        type:'period', label:`${ordinal(periodNum)} Period`, num:periodNum,
        icon:PERIOD_ICONS[colorIdx%PERIOD_ICONS.length],
        color:PERIOD_COLORS[colorIdx%PERIOD_COLORS.length],
        start:minToTime24(pStart), end:minToTime24(pEnd)
      });
      periodNum++; colorIdx++; cursor=pEnd;
    }
  }
  function ordinal(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }

  if(cfg.breaksType==1){
    const b1s=timeToMin(cfg.break1Start), b1e=timeToMin(cfg.break1End);
    const before = Math.min(cfg.periodsBeforeBreak1, cfg.totalPeriods);
    const after = cfg.totalPeriods - before;
    pushPeriods(aEnd, b1s, before);
    rows.push({type:'break', label:'Break', icon:'☕', mealIcon:'🍔🥤', start:minToTime24(b1s), end:minToTime24(b1e), variant:1});
    pushPeriods(b1e, schoolEnd, after);
  } else {
    const b1s=timeToMin(cfg.break1Start), b1e=timeToMin(cfg.break1End);
    const b2s=timeToMin(cfg.break2Start), b2e=timeToMin(cfg.break2End);
    const before1 = Math.min(cfg.periodsBeforeBreak1, cfg.totalPeriods);
    const before2 = Math.min(cfg.periodsBeforeBreak2, cfg.totalPeriods-before1);
    const after = cfg.totalPeriods - before1 - before2;
    pushPeriods(aEnd, b1s, before1);
    rows.push({type:'break', label:'Break', icon:'☕', mealIcon:'🍔🥤', start:minToTime24(b1s), end:minToTime24(b1e), variant:1});
    pushPeriods(b1e, b2s, before2);
    rows.push({type:'break', label:'Break', icon:'☕', mealIcon:'🍔🥤', start:minToTime24(b2s), end:minToTime24(b2e), variant:2});
    pushPeriods(b2e, schoolEnd, after);
  }
  return rows;
}

/* ============================================================
   RENDER: TIMETABLE CARD (matches reference images 1 & 3)
   ============================================================ */
function renderTimetableCard(opts={}){
  const cfg = DB.config;
  const rows = cfg.timetable || [];
  const editable = !!opts.editable;
  function timeCell(r,i){
    if(editable){
      return `<div class="flex items-center gap-1 flex-wrap">
        <input type="time" value="${r.start}" onchange="updateTTTime(${i},'start',this.value)" class="border rounded px-1 py-0.5 text-xs w-[92px]">
        <span>–</span>
        <input type="time" value="${r.end}" onchange="updateTTTime(${i},'end',this.value)" class="border rounded px-1 py-0.5 text-xs w-[92px]">
      </div>`;
    }
    return `${minToTime(timeToMin(r.start))} – ${minToTime(timeToMin(r.end))}`;
  }
  let bodyRows = rows.map((r,i)=>{
    if(r.type==='assembly'){
      return `<tr>
        <td class="font-bold">📢&nbsp; Assembly</td>
        <td class="text-center">👥</td>
        <td class="font-bold">${timeCell(r,i)}</td>
      </tr>`;
    }
    if(r.type==='break'){
      const cls = r.variant===2 ? 'tt-break2-row' : 'tt-break-row';
      return `<tr class="${cls}">
        <td class="font-bold">☕&nbsp; Break</td>
        <td class="text-center">🍔🥤</td>
        <td class="font-bold">${timeCell(r,i)}</td>
      </tr>`;
    }
    return `<tr>
      <td><span class="tt-badge" style="background:${r.color}">${r.num}${ordinalSuffix(r.num)}</span>&nbsp; ${r.label}</td>
      <td class="text-center">${r.icon}</td>
      <td class="font-bold">${timeCell(r,i)}</td>
    </tr>`;
  }).join('');

  return `
  <div class="doc-frame max-w-md mx-auto" id="timetableCard">
    <div class="doc-topbar"></div>
    <div class="doc-arc">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge">★ SCHOOL TIME TABLE ★</div>
    </div>
    <div class="p-4">
      <table class="tt-table rounded-xl overflow-hidden shadow">
        <thead><tr><th class="text-left">PERIOD</th><th>⏰</th><th class="text-left">TIME</th></tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}
function ordinalSuffix(n){ const s=['th','st','nd','rd'], v=n%100; return (s[(v-20)%10]||s[v]||s[0]); }

/* ============================================================
   RENDER: MARKSHEET CARD (matches reference image 2 exactly)
   ============================================================ */
function renderMarksheetCard(student, marksData, yearLabel){
  const cfg = DB.config;
  const subs = subjectsForClass(student.cls);
  const m = marksData || DB.marks[student.id] || {};
  const stage = currentExamStageIndex(student, m);       // 0..3 -> how many exams are "live" right now
  const activeKeys = EXAM_KEYS.slice(0, stage+1);
  const examMax = EXAM_MAX_EACH * activeKeys.length;      // 100 / 200 / 300 / 400 — grows as exams are entered
  let totalObtainedAll=0, totalMaxAll=0;
  const subjectRows = subs.map(sub=>{
    const rec = m[sub] || {};
    const cell = k => entered(rec,k) ? Number(rec[k]) : '-';
    const total = activeKeys.reduce((a,k)=>a+(Number(rec[k])||0),0); // only the exams entered so far
    const pct = examMax? (total/examMax*100) : 0;
    totalObtainedAll += total; totalMaxAll += examMax;
    return `<tr>
      <td class="text-left font-semibold">${esc(sub)}</td>
      <td>${cell('pt1')}</td><td>${cell('pt2')}</td><td>${cell('mid')}</td><td>${cell('final')}</td>
      <td class="font-bold">${total}/${examMax}</td>
      <td>${pct.toFixed(2)}</td>
      <td class="font-bold">${grade(pct)}</td>
    </tr>`;
  }).join('');
  const overallPct = totalMaxAll? (totalObtainedAll/totalMaxAll*100):0;
  const overallGrade = grade(overallPct);
  const result = overallPct >= (Number(cfg.passPercent)||40) ? 'PASS' : 'FAIL';
  const scale = (cfg.gradeScale&&cfg.gradeScale.length? cfg.gradeScale : GRADE_SCALE);
  const scaleSorted = [...scale].sort((a,b)=>b.min-a.min);
  const terms = termWiseStats(student, m);
  const stageLabel = EXAMS[stage].label;

  return `
  <div class="doc-frame max-w-lg mx-auto" id="marksheetCard">
    <div class="doc-topbar"></div>
    <div class="doc-arc">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge">★ STUDENT MARKSHEET ★</div>
    </div>
    <div class="p-4">
      <div class="ms-info-box grid grid-cols-2 gap-y-2 mb-4">
        <div>👤 <b>Student Name</b> : ${esc(student.name)}</div>
        <div>📅 <b>Year</b> : ${esc(yearLabel||cfg.year)}</div>
        <div>🧑 <b>Father's Name</b> : ${esc(student.father)}</div>
        <div>🎫 <b>Roll No.</b> : ${esc(student.roll)}</div>
        <div>🎓 <b>Class</b> : ${esc(student.cls)}</div>
        <div>👥 <b>Section</b> : ${esc(student.section)}</div>
      </div>
      <div class="overflow-x-auto">
      <table class="ms-table rounded-lg overflow-hidden shadow">
        <thead><tr>
          <th class="text-left">SUBJECTS</th><th>PT-1<br>(100)</th><th>PT-2<br>(100)</th><th>Mid<br>(100)</th><th>Final<br>(100)</th>
          <th>OBT.</th><th>%</th><th>GRADE</th>
        </tr></thead>
        <tbody>${subjectRows}</tbody>
      </table>
      </div>
      <p class="text-xs text-gray-500 mt-1">Currently up to <b>${esc(stageLabel)}</b> — overall obtained/percentage is out of ${examMax} per subject and will grow automatically as later exams are entered.</p>

      <div class="ms-summary-box mt-4 p-2">
        <div class="text-center font-bold bg-[var(--navy)] text-white rounded py-1 mb-2">TERM-WISE PERFORMANCE (ALL SUBJECTS COMBINED)</div>
        <div class="grid grid-cols-4 gap-2 text-center text-xs px-1">
          ${terms.map(t=>`<div class="border rounded-lg py-2"><div class="font-bold">${esc(t.label)}</div><div>${t.pct.toFixed(1)}%</div><div class="font-bold text-[var(--navy)]">${t.grade}</div></div>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div class="ms-summary-box">
          <div class="row"><span>TOTAL OBTAINED</span><span>${totalObtainedAll}/${totalMaxAll}</span></div>
          <div class="row"><span>PERCENTAGE</span><span class="text-green-600">${overallPct.toFixed(2)}%</span></div>
          <div class="row"><span>GRADE</span><span>${overallGrade}</span></div>
          <div class="row" style="border-bottom:none"><span>RESULT</span><span class="${result==='PASS'?'text-green-600':'text-red-600'}">${result}</span></div>
        </div>
        <div class="ms-summary-box p-2">
          <div class="text-center font-bold bg-[var(--navy)] text-white rounded py-1 mb-1">GRADE SCALE</div>
          <div class="text-xs px-2 space-y-1">
            ${scaleSorted.map(g=>`<div class="flex justify-between"><span>${g.min}% and above</span><span>${esc(g.label)}</span></div>`).join('')}
          </div>
        </div>
        <div class="ms-summary-box p-3 text-center">
          <div class="font-bold text-[var(--navy)] mb-1">REMARKS</div>
          <div class="italic">${result==='PASS'?'Well Done!':'Needs Improvement'}</div>
          <div class="text-2xl mt-1">${result==='PASS'?'🏅':'📌'}</div>
        </div>
      </div>
      <div class="flex justify-between mt-6 text-center text-sm font-ui" style="font-family:'Brush Script MT',cursive;">
        <div>Class Teacher<div class="border-t border-gray-400 mt-6 w-24 mx-auto font-ui text-xs" style="font-family:'Trebuchet MS',sans-serif;">Class Teacher</div></div>
        <div>Principal<div class="border-t border-gray-400 mt-6 w-24 mx-auto font-ui text-xs" style="font-family:'Trebuchet MS',sans-serif;">Principal</div></div>
        <div>Parent<div class="border-t border-gray-400 mt-6 w-24 mx-auto font-ui text-xs" style="font-family:'Trebuchet MS',sans-serif;">Parent Signature</div></div>
      </div>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}

function printCard(html){
  const styleTag = document.querySelector('style').outerHTML;
  const w = window.open('', 'PrintWindow', 'width=900,height=1000');
  if(!w){ alert('Please allow pop-ups for this site to print.'); return; }
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    ${styleTag}
    <style>
      @page{ size:A4; margin:10mm; }
      html,body{background:#fff;margin:0;padding:0;}
      body{display:flex;justify-content:center;padding:8mm 0;}
      .doc-frame{ width:190mm; min-height:277mm; margin:0 auto; box-shadow:none !important; border:none !important; }
      @media print{ .doc-frame{ width:190mm; min-height:277mm; } }
    </style>
    </head><body>${html}</body></html>`);
  w.document.close();
  const doPrint = ()=>{ try{ w.focus(); w.print(); }catch(e){} };
  w.onload = doPrint;
  setTimeout(doPrint, 700); // fallback in case onload already fired before listener attached
}

/* ============================================================
   LOGIN SCREEN
   ============================================================ */
function renderLogin(){
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="doc-frame">
        <div class="doc-topbar"></div>
        <div class="doc-arc" style="padding-bottom:24px;">
          <div class="doc-shield">${DB.config.logo?`<img src="${DB.config.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
          <div class="doc-title">${esc(DB.config.schoolName.split(' ').slice(0,2).join(' '))}</div>
          <div class="doc-subtitle">${esc(DB.config.schoolName.split(' ').slice(2).join(' '))}</div>
          <div class="doc-badge">★ SCHOOL MANAGEMENT ★</div>
        </div>
        <div class="p-6 font-ui">
          <div class="flex rounded-lg overflow-hidden border border-gray-300 mb-4 text-sm">
            ${['headmaster','teacher','parent'].map((r,i)=>`
              <button data-role="${r}" class="role-tab flex-1 py-2 ${i===0?'tab-btn active':''} bg-gray-50" onclick="selectRole('${r}')">${r[0].toUpperCase()+r.slice(1)}</button>
            `).join('')}
          </div>
          <div id="loginFields"></div>
          <div id="loginError" class="text-red-600 text-sm mt-2 hidden"></div>
          <button onclick="doLogin()" class="w-full navy-btn rounded-lg py-2.5 mt-4 font-bold">Login</button>
          <p class="text-center text-xs text-gray-400 mt-3"><button onclick="adminConnect()" class="underline">⚙️ Platform Admin</button></p>
        </div>
        <div class="doc-footer">
          <span class="lead">Learn Today</span>
          <span class="lead2">Lead Tomorrow</span>
        </div>
      </div>
    </div>
  </div>`;
  selectRole('headmaster');
}
let CURRENT_ROLE='headmaster';
function hmAccountExists(){ return !!(DB.config.headmasterAccount && DB.config.headmasterAccount.name && DB.config.headmasterAccount.password); }
function selectRole(role){
  CURRENT_ROLE = role;
  document.querySelectorAll('.role-tab').forEach(b=>b.classList.toggle('active', b.dataset.role===role));
  const box = document.getElementById('loginFields');
  if(role==='headmaster'){
    if(!hmAccountExists()){
      box.innerHTML = `<p class="text-xs text-gray-500 mb-3">First time here — create your Headmaster login.</p>
        <label class="block text-sm font-bold mb-1">Your Name</label>
        <input id="hmNewName" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="e.g. Muhammad Bilal">
        <label class="block text-sm font-bold mb-1">Create Password</label>
        <input id="hmNewPass" type="password" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Choose a password">
        <label class="block text-sm font-bold mb-1">Confirm Password</label>
        <input id="hmNewPass2" type="password" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Re-enter password">
        <p class="text-xs text-gray-500 mb-2">Only your Name and Password are needed to log in every time. Add your Gmail below once so records can be backed up/emailed — you won't be asked for it again at login (you can change it later from School Setup).</p>
        <label class="block text-sm font-bold mb-1">Gmail (for backups)</label>
        <input id="hmNewGmail" type="email" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="you@gmail.com">
        <label class="block text-sm font-bold mb-1">Gmail Password</label>
        <input id="hmNewGmailPass" type="password" class="w-full border rounded-lg px-3 py-2" placeholder="Your Gmail account password">`;
    } else {
      box.innerHTML = `<label class="block text-sm font-bold mb-1">Headmaster Name</label>
        <input id="loginName" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Enter your name">
        <label class="block text-sm font-bold mb-1">Password</label>
        <input id="loginPass" type="password" class="w-full border rounded-lg px-3 py-2" placeholder="Enter password">`;
    }
  } else if(role==='teacher'){
    const opts = DB.teachers.map(t=>`<option value="${t.id}">${esc(t.name)} — ${esc(t.subject)} (${esc(t.cls)})</option>`).join('');
    box.innerHTML = `<label class="block text-sm font-bold mb-1">Select Teacher</label>
      <select id="loginTeacher" class="w-full border rounded-lg px-3 py-2 mb-3">${opts || '<option value="">No teachers added yet</option>'}</select>
      <label class="block text-sm font-bold mb-1">Password</label>
      <input id="loginPass" type="password" class="w-full border rounded-lg px-3 py-2" placeholder="Password set by Headmaster">`;
  } else {
    box.innerHTML = `<label class="block text-sm font-bold mb-1">Student Roll No.</label>
      <input id="loginRoll" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="e.g. 25">
      <label class="block text-sm font-bold mb-1">Parent Mobile</label>
      <input id="loginMobile" type="text" class="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Registered mobile number">
      <label class="block text-sm font-bold mb-1">Password</label>
      <input id="loginPass" type="password" class="w-full border rounded-lg px-3 py-2" placeholder="Enter password">`;
  }
}
function doLogin(){
  const err = document.getElementById('loginError');
  err.classList.add('hidden');
  function showErr(msg){ err.textContent=msg; err.classList.remove('hidden'); }

  if(CURRENT_ROLE==='headmaster'){
    if(!hmAccountExists()){
      const name = document.getElementById('hmNewName').value.trim();
      const p1 = document.getElementById('hmNewPass').value;
      const p2 = document.getElementById('hmNewPass2').value;
      const gmail = document.getElementById('hmNewGmail').value.trim();
      const gmailPass = document.getElementById('hmNewGmailPass').value;
      if(!name || !p1){ showErr('Please enter your name and a password.'); return; }
      if(p1.length<4){ showErr('Password should be at least 4 characters.'); return; }
      if(p1!==p2){ showErr('Passwords do not match.'); return; }
      DB.config.headmasterAccount = {name, password:p1, gmail, gmailPassword:gmailPass};
      saveDB();
      setSession({role:'headmaster'}); render(); return;
    }
    const name = document.getElementById('loginName').value.trim();
    const pass = document.getElementById('loginPass').value;
    const acc = DB.config.headmasterAccount;
    if(name.toLowerCase()===String(acc.name).toLowerCase() && pass===acc.password){ setSession({role:'headmaster'}); render(); }
    else showErr('Incorrect name or password.');
  } else if(CURRENT_ROLE==='teacher'){
    const tid = document.getElementById('loginTeacher').value;
    if(!tid){ showErr('Please add a teacher first (Headmaster > Teachers).'); return; }
    const pass = document.getElementById('loginPass').value;
    const teacher = DB.teachers.find(t=>t.id===tid);
    const expected = teacher.password || 'teacher123'; // fallback for teachers added before passwords existed
    if(pass===expected){ setSession({role:'teacher', teacherId:tid}); render(); }
    else showErr('Incorrect password for this teacher.');
  } else {
    const pass = document.getElementById('loginPass').value;
    const roll = document.getElementById('loginRoll').value.trim();
    const mobile = document.getElementById('loginMobile').value.trim();
    const stu = DB.students.find(s=>String(s.roll)===roll && String(s.mobile)===mobile);
    if(!stu){ showErr('No student found with that Roll No. and Mobile.'); return; }
    const expected = stu.password || 'parent123'; // fallback for students added before per-student passwords existed
    if(pass===expected){ setSession({role:'parent', studentId:stu.id}); render(); }
    else showErr('Incorrect password for Parent.');
  }
}

/* ============================================================
   APP SHELL (sidebar + topbar) shared by dashboards
   ============================================================ */
function shell(title, tabs, activeTab, contentHtml){
  return `
  <div class="min-h-screen flex flex-col md:flex-row">
    <div class="md:w-64 navy-btn text-white flex md:flex-col no-print">
      <div class="p-4 border-b border-white/20 hidden md:block">
        <div class="font-bold text-lg">🎓 ${esc(DB.config.schoolName.split(' ')[0])}</div>
        <div class="text-xs text-gray-300">${esc(title)}</div>
      </div>
      <div class="flex md:flex-col overflow-x-auto md:overflow-visible flex-1">
        ${tabs.map(t=>`<button onclick="setTab('${t.key}')" class="side-link ${t.key===activeTab?'active':''} text-left px-4 py-3 whitespace-nowrap md:whitespace-normal text-sm font-ui hover:bg-white/10">${t.icon} ${esc(t.label)}</button>`).join('')}
      </div>
      <button onclick="logout()" class="px-4 py-3 text-left text-sm font-ui bg-red-600/80 hover:bg-red-700 md:mt-auto">🚪 Logout</button>
    </div>
    <div class="flex-1 p-4 md:p-8 font-ui overflow-x-hidden">
      ${contentHtml}
    </div>
  </div>`;
}
let ACTIVE_TAB=null;
function setTab(key){ ACTIVE_TAB=key; EDITING_STUDENT_ID=null; render(); }

/* ============================================================
   HEADMASTER DASHBOARD
   ============================================================ */
const HM_TABS = [
  {key:'setup', label:'School Setup', icon:'🏫'},
  {key:'cloudsync', label:'Cloud Sync', icon:'☁️'},
  {key:'announcements', label:'Announcements', icon:'📣'},
  {key:'timetable', label:'Timetable', icon:'🕒'},
  {key:'teachers', label:'Teachers', icon:'👩‍🏫'},
  {key:'teacherAttendance', label:'Teacher Attendance', icon:'🗓️'},
  {key:'students', label:'Students', icon:'🎒'},
  {key:'marks', label:'Marks Overview', icon:'📊'},
  {key:'fees', label:'Fees', icon:'💰'},
  {key:'homework', label:'Homework', icon:'📚'},
  {key:'idcards', label:'ID Cards', icon:'🪪'},
  {key:'promotion', label:'Promotion', icon:'🎓'},
  {key:'backup', label:'Backup', icon:'💾'},
];
function renderHeadmaster(){
  if(!ACTIVE_TAB || !HM_TABS.find(t=>t.key===ACTIVE_TAB)) ACTIVE_TAB='setup';
  let content='';
  if(ACTIVE_TAB==='setup') content = hmSetup();
  if(ACTIVE_TAB==='cloudsync') content = renderCloudSyncPanel();
  if(ACTIVE_TAB==='announcements') content = hmAnnouncements();
  if(ACTIVE_TAB==='timetable') content = hmTimetable();
  if(ACTIVE_TAB==='teachers') content = hmTeachers();
  if(ACTIVE_TAB==='teacherAttendance') content = hmTeacherAttendance();
  if(ACTIVE_TAB==='students') content = hmStudents();
  if(ACTIVE_TAB==='marks') content = hmMarksOverview();
  if(ACTIVE_TAB==='fees') content = hmFees();
  if(ACTIVE_TAB==='homework') content = hmHomework();
  if(ACTIVE_TAB==='idcards') content = hmIdCards();
  if(ACTIVE_TAB==='promotion') content = hmPromotion();
  if(ACTIVE_TAB==='backup') content = hmBackup();
  document.getElementById('app').innerHTML = shell('Headmaster', HM_TABS, ACTIVE_TAB, content);
}

function card(inner, extra=''){ return `<div class="bg-white rounded-2xl shadow p-5 ${extra}">${inner}</div>`; }

function hmSetup(){
  const c = DB.config;
  const csClass = document.getElementById('csClassSel')?.value || c.classes[0];
  return `
  <div class="space-y-5">
    ${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🏫 School Setup</h2>
    <div class="grid md:grid-cols-2 gap-4">
      <div><label class="block text-sm font-bold mb-1">School Name</label>
        <input id="cfgName" value="${esc(c.schoolName)}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">Academic Year</label>
        <input id="cfgYear" value="${esc(c.year)}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">Assembly Start</label>
        <input id="cfgAStart" type="time" value="${c.assemblyStart}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">Assembly End</label>
        <input id="cfgAEnd" type="time" value="${c.assemblyEnd}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">School End Time</label>
        <input id="cfgEnd" type="time" value="${c.schoolEnd}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">Default Pass %</label>
        <input id="cfgPass" type="number" value="${c.passPercent}" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">School Logo (optional)</label>
        <input id="cfgLogo" type="file" accept="image/*" class="w-full border rounded-lg px-3 py-2"></div>
      <div><label class="block text-sm font-bold mb-1">Default Subjects (used if a class has no custom list)</label>
        <input id="cfgSubjects" value="${esc(c.subjects.join(', '))}" class="w-full border rounded-lg px-3 py-2"></div>
      <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Classes (comma separated, order = promotion order)</label>
        <input id="cfgClasses" value="${esc(c.classes.join(', '))}" class="w-full border rounded-lg px-3 py-2"></div>
    </div>
    <button onclick="saveSetup()" class="navy-btn rounded-lg px-5 py-2 mt-4 font-bold">Save Setup</button>
    <span id="setupMsg" class="ml-3 text-green-600 font-bold hidden">Saved!</span>
    `)}

    ${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📚 Class-wise Subjects</h2>
    <p class="text-sm text-gray-500 mb-3">Different classes can have different subjects — set the exact subject list for each class here.</p>
    <div class="flex flex-wrap gap-3 items-end mb-3">
      <div><label class="block text-sm font-bold mb-1">Class</label>
        <select id="csClassSel" onchange="render()" class="border rounded-lg px-3 py-2">
          ${c.classes.map(cl=>`<option ${cl===csClass?'selected':''}>${esc(cl)}</option>`).join('')}
        </select></div>
      <div class="flex-1 min-w-[220px]"><label class="block text-sm font-bold mb-1">Subjects for ${esc(csClass)} (comma separated)</label>
        <input id="csSubjects" value="${esc(subjectsForClass(csClass).join(', '))}" class="w-full border rounded-lg px-3 py-2"></div>
      <button onclick="saveClassSubjects('${esc(csClass)}')" class="navy-btn rounded-lg px-4 py-2 font-bold">Save</button>
    </div>
    `)}

    ${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🏆 Grade Scale (Editable)</h2>
    <p class="text-sm text-gray-500 mb-3">Set your own percentage cut-offs and grade labels. These apply everywhere marks are graded.</p>
    <div id="gradeScaleRows" class="space-y-2 mb-3">
      ${c.gradeScale.map((g,i)=>`
        <div class="flex gap-2 items-center">
          <input type="number" class="gsMin border rounded-lg px-3 py-2 w-24" value="${g.min}" placeholder="Min %">
          <span>% and above =</span>
          <input type="text" class="gsLabel border rounded-lg px-3 py-2 w-24" value="${esc(g.label)}" placeholder="Grade">
          <button onclick="this.parentElement.remove()" class="text-red-600 font-bold">🗑️</button>
        </div>`).join('')}
    </div>
    <button onclick="addGradeRow()" class="text-sm font-bold text-[var(--navy)] mb-3">+ Add Grade Row</button><br>
    <button onclick="saveGradeScale()" class="navy-btn rounded-lg px-5 py-2 font-bold">Save Grade Scale</button>
    <span id="gradeMsg" class="ml-3 text-green-600 font-bold hidden">Saved!</span>
    `)}

    ${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🔐 Headmaster Login Account</h2>
    <p class="text-sm text-gray-600 mb-3">Signed in as <b>${esc(c.headmasterAccount?.name||'')}</b>. Your Name and Password are all that's needed to log in — they never ask for your Gmail again. All school records auto-save in this browser under this account. Since this app runs fully offline with no server, this isn't real Gmail cloud storage — use <b>Backup</b> to download a copy or email it to yourself for safekeeping.</p>
    <div class="flex items-center gap-3 mb-3">
      ${c.headmasterAccount?.photo?`<img src="${c.headmasterAccount.photo}" class="w-14 h-14 rounded-full object-cover">`:'<span class="text-3xl">👤</span>'}
      <div><label class="block text-sm font-bold mb-1">Your Photo (shown in Staff directory)</label>
      <input id="hmPhoto" type="file" accept="image/*" class="text-sm" onchange="saveHmPhoto(this)"></div>
    </div>
    <div class="grid md:grid-cols-3 gap-3">
      <input id="hmCurPass" type="password" placeholder="Current Password" class="border rounded-lg px-3 py-2">
      <input id="hmNewPass2_" type="password" placeholder="New Password" class="border rounded-lg px-3 py-2">
      <input id="hmNewPass3_" type="password" placeholder="Confirm New Password" class="border rounded-lg px-3 py-2">
    </div>
    <button onclick="changeHmPassword()" class="navy-btn rounded-lg px-5 py-2 mt-3 font-bold">Change Password</button>
    <span id="hmPassMsg" class="ml-3 text-sm font-bold hidden"></span>

    <hr class="my-4">
    <h3 class="font-bold text-[var(--navy)] mb-2">Gmail (used only for backup emails)</h3>
    <p class="text-sm text-gray-600 mb-3">Currently: <b>${esc(c.headmasterAccount?.gmail||'not set')}</b>. Update it any time — this does not change your login Name or Password.</p>
    <div class="grid md:grid-cols-2 gap-3">
      <input id="hmNewGmail_" type="email" placeholder="Gmail address" value="${esc(c.headmasterAccount?.gmail||'')}" class="border rounded-lg px-3 py-2">
      <input id="hmNewGmailPass_" type="password" placeholder="Gmail password" class="border rounded-lg px-3 py-2">
    </div>
    <button onclick="changeHmGmail()" class="navy-btn rounded-lg px-5 py-2 mt-3 font-bold">Save Gmail</button>
    <span id="hmGmailMsg" class="ml-3 text-sm font-bold hidden"></span>

    <hr class="my-4">
    <h3 class="font-bold text-[var(--navy)] mb-2">Change Your Name</h3>
    <div class="grid md:grid-cols-2 gap-3">
      <input id="hmNewName_" type="text" placeholder="New Headmaster Name" value="${esc(c.headmasterAccount?.name||'')}" class="border rounded-lg px-3 py-2">
      <button onclick="changeHmName()" class="navy-btn rounded-lg px-5 py-2 font-bold">Save Name</button>
    </div>
    <span id="hmNameMsg" class="ml-3 text-sm font-bold hidden"></span>

    <hr class="my-4">
    <h3 class="font-bold text-red-600 mb-2">⚠️ Danger Zone — Change of Management</h3>
    <p class="text-sm text-gray-600 mb-3">If the school's management/ownership is changing, delete this Headmaster account here. This does <b>NOT</b> delete any Student/Teacher/Marks/Attendance records — only this Headmaster login. After deleting, you'll be logged out and the app will show the first-time setup screen so the new Headmaster can create their own Name, Password and Gmail.</p>
    <button onclick="deleteHmAccount()" class="bg-red-600 text-white rounded-lg px-5 py-2 font-bold">🗑️ Delete Headmaster Account</button>
    `)}
  </div>`;
}
function saveSetup(){
  const c = DB.config;
  c.schoolName = document.getElementById('cfgName').value.trim() || c.schoolName;
  c.year = document.getElementById('cfgYear').value.trim();
  c.assemblyStart = document.getElementById('cfgAStart').value;
  c.assemblyEnd = document.getElementById('cfgAEnd').value;
  c.schoolEnd = document.getElementById('cfgEnd').value;
  c.passPercent = Number(document.getElementById('cfgPass').value)||40;
  c.subjects = document.getElementById('cfgSubjects').value.split(',').map(s=>s.trim()).filter(Boolean);
  c.classes = document.getElementById('cfgClasses').value.split(',').map(s=>s.trim()).filter(Boolean);
  const logoInput = document.getElementById('cfgLogo');
  const finish=()=>{ saveDB(); const m=document.getElementById('setupMsg'); m.classList.remove('hidden'); setTimeout(()=>render(),900); };
  if(logoInput.files && logoInput.files[0]){
    const reader = new FileReader();
    reader.onload = e=>{ c.logo = e.target.result; finish(); };
    reader.readAsDataURL(logoInput.files[0]);
  } else finish();
}
function saveClassSubjects(cls){
  const list = document.getElementById('csSubjects').value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!DB.config.classSubjects) DB.config.classSubjects={};
  DB.config.classSubjects[cls] = list;
  saveDB(); render();
}
function addGradeRow(){
  const wrap = document.getElementById('gradeScaleRows');
  wrap.insertAdjacentHTML('beforeend', `
    <div class="flex gap-2 items-center">
      <input type="number" class="gsMin border rounded-lg px-3 py-2 w-24" value="0" placeholder="Min %">
      <span>% and above =</span>
      <input type="text" class="gsLabel border rounded-lg px-3 py-2 w-24" value="" placeholder="Grade">
      <button onclick="this.parentElement.remove()" class="text-red-600 font-bold">🗑️</button>
    </div>`);
}
function saveGradeScale(){
  const mins = [...document.querySelectorAll('.gsMin')].map(i=>Number(i.value));
  const labels = [...document.querySelectorAll('.gsLabel')].map(i=>i.value.trim());
  const scale = mins.map((m,i)=>({min:m, label:labels[i]||'-'})).filter(g=>g.label && g.label!=='-');
  if(!scale.length){ alert('Please add at least one grade row.'); return; }
  DB.config.gradeScale = scale;
  saveDB();
  const m=document.getElementById('gradeMsg'); m.textContent='Saved!'; m.classList.remove('hidden'); m.classList.add('text-green-600');
  setTimeout(()=>render(),900);
}
function changeHmPassword(){
  const cur = document.getElementById('hmCurPass').value;
  const n1 = document.getElementById('hmNewPass2_').value;
  const n2 = document.getElementById('hmNewPass3_').value;
  const msg = document.getElementById('hmPassMsg');
  const acc = DB.config.headmasterAccount;
  msg.classList.remove('hidden');
  if(cur!==acc.password){ msg.textContent='Current password is incorrect.'; msg.className='ml-3 text-sm font-bold text-red-600'; return; }
  if(!n1 || n1.length<4){ msg.textContent='New password should be at least 4 characters.'; msg.className='ml-3 text-sm font-bold text-red-600'; return; }
  if(n1!==n2){ msg.textContent='New passwords do not match.'; msg.className='ml-3 text-sm font-bold text-red-600'; return; }
  acc.password = n1; saveDB();
  msg.textContent='Password changed!'; msg.className='ml-3 text-sm font-bold text-green-600';
}
function saveHmPhoto(input){
  if(!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e=>{ DB.config.headmasterAccount.photo = e.target.result; saveDB(); render(); };
  reader.readAsDataURL(input.files[0]);
}
function changeHmName(){
  const name = document.getElementById('hmNewName_').value.trim();
  const msg = document.getElementById('hmNameMsg');
  msg.classList.remove('hidden');
  if(!name){ msg.textContent='Please enter a name.'; msg.className='ml-3 text-sm font-bold text-red-600'; return; }
  DB.config.headmasterAccount.name = name;
  saveDB();
  msg.textContent='Name updated!'; msg.className='ml-3 text-sm font-bold text-green-600';
  setTimeout(()=>render(),900);
}
function deleteHmAccount(){
  const acc = DB.config.headmasterAccount;
  const pass = prompt('This removes the Headmaster login only (Student/Teacher/Marks/Attendance records stay safe). Type the current Headmaster password to confirm:');
  if(pass===null) return;
  if(pass!==acc.password){ alert('Incorrect password — Headmaster account was not deleted.'); return; }
  if(!confirm('Are you sure? You will be logged out and a new Headmaster will need to set up a fresh Name/Password.')) return;
  DB.config.headmasterAccount = null;
  saveDB();
  logout();
}
function changeHmGmail(){
  const gmail = document.getElementById('hmNewGmail_').value.trim();
  const gmailPass = document.getElementById('hmNewGmailPass_').value;
  const msg = document.getElementById('hmGmailMsg');
  msg.classList.remove('hidden');
  if(!gmail){ msg.textContent='Please enter a Gmail address.'; msg.className='ml-3 text-sm font-bold text-red-600'; return; }
  DB.config.headmasterAccount.gmail = gmail;
  if(gmailPass) DB.config.headmasterAccount.gmailPassword = gmailPass;
  saveDB();
  msg.textContent='Gmail updated!'; msg.className='ml-3 text-sm font-bold text-green-600';
  setTimeout(()=>render(),900);
}

function hmTimetable(){
  const c = DB.config;
  return `
  <div class="grid lg:grid-cols-2 gap-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🕒 Auto Timetable Generator</h2>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm font-bold mb-1">Number of Breaks</label>
          <select id="ttBreaks" onchange="toggleBreakFields(this.value)" class="w-full border rounded-lg px-3 py-2">
            <option value="1" ${c.breaksType==1?'selected':''}>1 Break</option>
            <option value="2" ${c.breaksType==2?'selected':''}>2 Breaks</option>
          </select></div>
        <div><label class="block text-sm font-bold mb-1">Total Periods (6-10)</label>
          <input id="ttTotal" type="number" min="6" max="10" value="${c.totalPeriods}" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label class="block text-sm font-bold mb-1">Periods before Break 1</label>
          <input id="ttBefore1" type="number" min="1" value="${c.periodsBeforeBreak1}" class="w-full border rounded-lg px-3 py-2"></div>
        <div id="before2Wrap" class="${c.breaksType==2?'':'hidden'}"><label class="block text-sm font-bold mb-1">Periods before Break 2</label>
          <input id="ttBefore2" type="number" min="1" value="${c.periodsBeforeBreak2}" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label class="block text-sm font-bold mb-1">Break 1 Start</label>
          <input id="ttB1s" type="time" value="${c.break1Start}" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label class="block text-sm font-bold mb-1">Break 1 End</label>
          <input id="ttB1e" type="time" value="${c.break1End}" class="w-full border rounded-lg px-3 py-2"></div>
        <div id="b2sWrap" class="${c.breaksType==2?'':'hidden'}"><label class="block text-sm font-bold mb-1">Break 2 Start</label>
          <input id="ttB2s" type="time" value="${c.break2Start}" class="w-full border rounded-lg px-3 py-2"></div>
        <div id="b2eWrap" class="${c.breaksType==2?'':'hidden'}"><label class="block text-sm font-bold mb-1">Break 2 End</label>
          <input id="ttB2e" type="time" value="${c.break2End}" class="w-full border rounded-lg px-3 py-2"></div>
      </div>
      <p class="text-xs text-gray-500 mt-2">Remaining time in each segment (between assembly/breaks/school end) is divided equally among the periods you assign to it.</p>
      <button onclick="genTimetable()" class="navy-btn rounded-lg px-5 py-2 mt-4 font-bold">⚡ Generate Timetable</button>
      ${c.timetable? '<p class="text-xs text-gray-500 mt-2">You can click any time cell in the preview to fine-tune it manually.</p>':''}
    `)}
    <div>
      ${c.timetable ? `
        <div class="flex justify-end gap-2 mb-2 no-print">
          <button onclick="printCard(document.getElementById('timetableCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button>
        </div>
        ${renderTimetableCard({editable:true})}
      ` : card('<p class="text-gray-500 text-center py-10">Generate a timetable to preview it here.</p>')}
    </div>
  </div>`;
}
function genTimetable(){
  const c = DB.config;
  c.breaksType = Number(document.getElementById('ttBreaks').value);
  c.totalPeriods = Math.min(10, Math.max(6, Number(document.getElementById('ttTotal').value)||8));
  c.periodsBeforeBreak1 = Number(document.getElementById('ttBefore1').value)||3;
  c.break1Start = document.getElementById('ttB1s').value;
  c.break1End = document.getElementById('ttB1e').value;
  if(c.breaksType==2){
    c.periodsBeforeBreak2 = Number(document.getElementById('ttBefore2').value)||3;
    c.break2Start = document.getElementById('ttB2s').value;
    c.break2End = document.getElementById('ttB2e').value;
  }
  c.timetable = generateTimetable(c);
  saveDB();
  render();
}
// Called directly from the "Number of Breaks" <select>'s onchange — toggles the Break-2 fields.
function toggleBreakFields(val){
  const show = String(val)==='2';
  document.getElementById('before2Wrap')?.classList.toggle('hidden', !show);
  document.getElementById('b2sWrap')?.classList.toggle('hidden', !show);
  document.getElementById('b2eWrap')?.classList.toggle('hidden', !show);
}
// Headmaster manually fine-tunes a single generated period's start/end time.
function updateTTTime(idx, field, value){
  if(DB.config.timetable && DB.config.timetable[idx]){
    DB.config.timetable[idx][field] = value;
    saveDB();
  }
}

function hmTeachers(){
  const rows = DB.teachers.map(t=>`
    <tr class="border-b">
      <td class="py-2">${t.photo?`<img src="${t.photo}" class="w-9 h-9 rounded-full object-cover">`:'<span class="text-xl">👤</span>'}</td>
      <td>${esc(t.name)}</td><td>${esc(t.subject)}</td><td>${esc(t.cls)}</td>
      <td class="whitespace-nowrap">
        <button onclick="resetTeacherPass('${t.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">🔑 Reset Password</button>
        <button onclick="delTeacher('${t.id}')" class="text-red-600 text-sm font-bold">🗑️ Remove</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No teachers yet.</td></tr>`;
  const classOpts = DB.config.classes.map(c=>`<option>${esc(c)}</option>`).join('');
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">👩‍🏫 Teachers</h2>
    <p class="text-sm text-gray-500 mb-3">Set a login password for the teacher when assigning them to a class — they'll use it to log in. Photo is optional and shows up in the Staff directory that Parents and Teachers can see.</p>
    <div class="grid md:grid-cols-6 gap-3 mb-4">
      <input id="tName" placeholder="Teacher Name" class="border rounded-lg px-3 py-2">
      <input id="tSubject" placeholder="Subject" class="border rounded-lg px-3 py-2">
      <select id="tClass" class="border rounded-lg px-3 py-2">${classOpts}</select>
      <input id="tPassword" type="text" placeholder="Set Login Password" class="border rounded-lg px-3 py-2">
      <input id="tPhoto" type="file" accept="image/*" class="border rounded-lg px-2 py-2 text-sm">
      <button onclick="addTeacher()" class="navy-btn rounded-lg px-3 py-2 font-bold">+ Add Teacher</button>
    </div>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Photo</th><th>Name</th><th>Subject</th><th>Class</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `);
}
function addTeacher(){
  const name=document.getElementById('tName').value.trim();
  const subject=document.getElementById('tSubject').value.trim();
  const cls=document.getElementById('tClass').value;
  const password=document.getElementById('tPassword').value.trim();
  const photoInput=document.getElementById('tPhoto');
  if(!name||!subject){ alert('Please enter teacher name and subject.'); return; }
  if(!password){ alert('Please set a login password for this teacher.'); return; }
  const finish=(photo)=>{ DB.teachers.push({id:uid(), name, subject, cls, password, photo:photo||null}); saveDB(); render(); };
  if(photoInput.files && photoInput.files[0]){
    const reader = new FileReader();
    reader.onload = e=>finish(e.target.result);
    reader.readAsDataURL(photoInput.files[0]);
  } else finish(null);
}
function delTeacher(id){ if(confirm('Remove this teacher?')){ DB.teachers = DB.teachers.filter(t=>t.id!==id); saveDB(); render(); } }
function resetTeacherPass(id){
  const t = DB.teachers.find(x=>x.id===id); if(!t) return;
  const np = prompt(`Set a new login password for ${t.name}:`, '');
  if(np===null) return;
  if(!np.trim()){ alert('Password cannot be empty.'); return; }
  t.password = np.trim(); saveDB(); alert('Password updated.');
}

/* ---------- Headmaster marks Teacher attendance — same P/A/L method as Student attendance ---------- */
function todayISO(){ return new Date().toISOString().slice(0,10); }
function hmTeacherAttendance(){
  const date = document.getElementById('hmAttDate')?.value || todayISO();
  const att = DB.teacherAttendance[date] || {};
  const rows = DB.teachers.map(t=>{
    const status = att[t.id] || 'P';
    return `<tr class="border-b">
      <td class="py-2">${esc(t.name)}</td><td>${esc(t.subject)} (${esc(t.cls)})</td>
      <td class="whitespace-nowrap">
        <button onclick="markTeacherAtt('${date}','${t.id}','P')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${status==='P'?'bg-green-600 text-white':'bg-gray-100'}">Present</button>
        <button onclick="markTeacherAtt('${date}','${t.id}','A')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${status==='A'?'bg-red-600 text-white':'bg-gray-100'}">Absent</button>
        <button onclick="markTeacherAtt('${date}','${t.id}','L')" class="px-3 py-1 rounded-lg text-xs font-bold ${status==='L'?'bg-amber-500 text-white':'bg-gray-100'}">Leave</button>
      </td>
      <td><button onclick="viewTeacherAttendance('${t.id}')" class="text-[var(--navy)] text-sm font-bold">📅 Record</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No teachers yet.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🗓️ Teacher Attendance</h2>
    <div class="mb-4"><label class="font-bold text-sm mr-2">Date:</label>
      <input id="hmAttDate" type="date" value="${date}" onchange="render()" class="border rounded-lg px-3 py-2"></div>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Name</th><th>Subject (Class)</th><th>Status</th><th>History</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `)}<div id="teacherAttPreview" class="mt-5"></div>`;
}
function markTeacherAtt(date, teacherId, status){
  if(!DB.teacherAttendance[date]) DB.teacherAttendance[date]={};
  DB.teacherAttendance[date][teacherId]=status;
  saveDB(); render();
}
/* Full history for one teacher — record is kept forever and is only ever removed if the
   Headmaster explicitly deletes it; there is no automatic expiry. */
function renderTeacherAttendanceSummary(teacher){
  const dates = Object.keys(DB.teacherAttendance).filter(d=>DB.teacherAttendance[d][teacher.id]).sort().reverse();
  const rows = dates.map(d=>{
    const status = DB.teacherAttendance[d][teacher.id];
    const label = status==='P'?'Present':status==='L'?'Leave':'Absent';
    const cls = status==='P'?'text-green-600':status==='L'?'text-amber-600':'text-red-600';
    return `<tr class="border-b"><td class="py-2">${d}</td><td class="font-bold ${cls}">${label}</td></tr>`;
  }).join('') || `<tr><td colspan="2" class="text-center text-gray-400 py-4">No attendance recorded yet.</td></tr>`;
  const total = dates.length;
  const present = dates.filter(d=>DB.teacherAttendance[d][teacher.id]==='P').length;
  const absent = dates.filter(d=>DB.teacherAttendance[d][teacher.id]==='A').length;
  const leave = dates.filter(d=>DB.teacherAttendance[d][teacher.id]==='L').length;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📅 Attendance Record — ${esc(teacher.name)}</h2>
    <div class="flex flex-wrap gap-4 mb-3 text-sm font-bold">
      <span class="text-green-600">Present: ${present}</span>
      <span class="text-red-600">Absent: ${absent}</span>
      <span class="text-amber-600">Leave: ${leave}</span>
      <span>Total marked: ${total} days (${total? (present/total*100).toFixed(1):0}% present)</span>
    </div>
    <div class="overflow-x-auto max-h-96 overflow-y-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `);
}
function viewTeacherAttendance(id){
  const t = DB.teachers.find(x=>x.id===id); if(!t) return;
  render();
  setTimeout(()=>{
    const box = document.getElementById('teacherAttPreview');
    if(box){ box.innerHTML = renderTeacherAttendanceSummary(t); box.scrollIntoView({behavior:'smooth'}); }
  },0);
}

/* Shared attendance summary box — used by Headmaster, Teacher (Progress tab), and Parent */
function renderAttendanceSummary(stu){
  const keys = Object.keys(DB.attendance).filter(k=>k.startsWith(stu.cls+'|') && DB.attendance[k][stu.id]);
  const rows = keys.sort().reverse().map(k=>{
    const date = k.split('|')[1];
    const status = DB.attendance[k][stu.id];
    const label = status==='P'?'Present':status==='L'?'Leave':'Absent';
    const cls = status==='P'?'text-green-600':status==='L'?'text-amber-600':'text-red-600';
    return `<tr class="border-b"><td class="py-2">${date}</td><td class="font-bold ${cls}">${label}</td></tr>`;
  }).join('') || `<tr><td colspan="2" class="text-center text-gray-400 py-4">No attendance recorded yet.</td></tr>`;
  const total = keys.length;
  const present = keys.filter(k=>DB.attendance[k][stu.id]==='P').length;
  const absent = keys.filter(k=>DB.attendance[k][stu.id]==='A').length;
  const leave = keys.filter(k=>DB.attendance[k][stu.id]==='L').length;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📅 Attendance — ${esc(stu.name)}</h2>
    <div class="flex flex-wrap gap-4 mb-3 text-sm font-bold">
      <span class="text-green-600">Present: ${present}</span>
      <span class="text-red-600">Absent: ${absent}</span>
      <span class="text-amber-600">Leave: ${leave}</span>
      <span>Total marked: ${total} days (${total? (present/total*100).toFixed(1):0}% present)</span>
    </div>
    <div class="overflow-x-auto max-h-96 overflow-y-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `);
}

let EDITING_STUDENT_ID = null;
/* Shared Add/Edit/Delete student manager.
   lockedClass = null   -> Headmaster: full class dropdown, sees all students
   lockedClass = "5th"  -> Teacher: class fixed, sees only their own class's students */
function studentManagerCard(lockedClass){
  const editing = EDITING_STUDENT_ID ? DB.students.find(s=>s.id===EDITING_STUDENT_ID) : null;
  const classOpts = DB.config.classes.map(c=>`<option ${editing&&editing.cls===c?'selected':''}>${esc(c)}</option>`).join('');
  const list = lockedClass ? DB.students.filter(s=>s.cls===lockedClass) : DB.students;
  const rows = list.map(s=>`
    <tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.father)}</td>
      <td>${esc(s.cls)}</td><td>${esc(s.section)}</td><td>${esc(s.mobile)}</td>
      <td class="whitespace-nowrap">
        <button onclick="viewMarksheet('${s.id}')" title="Marksheet" class="text-[var(--navy)] text-sm font-bold mr-2">📄</button>
        <button onclick="viewStudentAttendance('${s.id}')" title="Attendance" class="text-[var(--navy)] text-sm font-bold mr-2">📅</button>
        ${s.marksArchive&&s.marksArchive.length?`<button onclick="viewMarksHistory('${s.id}')" title="Past Records" class="text-purple-700 text-sm font-bold mr-2">📜</button>`:''}
        <button onclick="startEditStudent('${s.id}')" title="Edit" class="text-amber-600 text-sm font-bold mr-2">✏️</button>
        <button onclick="delStudent('${s.id}')" title="Delete" class="text-red-600 text-sm font-bold">🗑️</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-4">No students yet.</td></tr>`;

  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🎒 ${editing?'Edit Student':'Add Student'}</h2>
      <div class="grid md:grid-cols-3 gap-3">
        <input id="sName" placeholder="Student Name" value="${editing?esc(editing.name):''}" class="border rounded-lg px-3 py-2">
        <input id="sFather" placeholder="Father's Name" value="${editing?esc(editing.father):''}" class="border rounded-lg px-3 py-2">
        ${lockedClass ? `<input value="${esc(lockedClass)}" disabled class="border rounded-lg px-3 py-2 bg-gray-100">`
                      : `<select id="sClass" class="border rounded-lg px-3 py-2">${classOpts}</select>`}
        <input id="sSection" placeholder="Section (e.g. A)" value="${editing?esc(editing.section):''}" class="border rounded-lg px-3 py-2">
        <input id="sRoll" placeholder="Roll No." value="${editing?esc(editing.roll):''}" class="border rounded-lg px-3 py-2">
        <input id="sMobile" placeholder="Parent Mobile" value="${editing?esc(editing.mobile):''}" class="border rounded-lg px-3 py-2">
        <input id="sPassword" type="text" placeholder="${editing?'New Parent Password (leave blank to keep)':'Set Parent Login Password'}" class="border rounded-lg px-3 py-2">
      </div>
      <p class="text-xs text-gray-500 mt-2">Parents log in with this student's Roll No. + Mobile Number + this Password.</p>
      <div class="mt-4 flex gap-2">
        <button onclick="saveStudentForm(${lockedClass?`'${esc(lockedClass)}'`:'null'})" class="navy-btn rounded-lg px-5 py-2 font-bold">${editing?'💾 Update Student':'+ Add Student'}</button>
        ${editing?`<button onclick="cancelEditStudent()" class="bg-gray-200 rounded-lg px-5 py-2 font-bold">Cancel</button>`:''}
      </div>
    `)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📋 ${lockedClass?`Students — Class ${esc(lockedClass)}`:'All Students'}</h2>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Father</th><th>Class</th><th>Sec</th><th>Mobile</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    `)}
    <div id="marksheetPreview"></div>
  </div>`;
}
function startEditStudent(id){ EDITING_STUDENT_ID=id; render(); setTimeout(()=>{ document.getElementById('sName')?.scrollIntoView({behavior:'smooth'}); },0); }
function cancelEditStudent(){ EDITING_STUDENT_ID=null; render(); }
function saveStudentForm(lockedClass){
  const name=document.getElementById('sName').value.trim();
  const father=document.getElementById('sFather').value.trim();
  const cls = lockedClass || document.getElementById('sClass').value;
  const section=document.getElementById('sSection').value.trim();
  const roll=document.getElementById('sRoll').value.trim();
  const mobile=document.getElementById('sMobile').value.trim();
  const password=document.getElementById('sPassword').value.trim();
  if(!name||!roll){ alert('Please enter at least student name and roll number.'); return; }
  if(EDITING_STUDENT_ID){
    const s = DB.students.find(x=>x.id===EDITING_STUDENT_ID);
    if(s) Object.assign(s, {name,father,cls,section,roll,mobile, password: password||s.password});
    EDITING_STUDENT_ID = null;
  } else {
    if(!password){ alert("Please set a parent login password for this student."); return; }
    DB.students.push({id:uid(), name, father, cls, section, roll, mobile, password});
  }
  saveDB(); render();
}
function delStudent(id){
  if(confirm('Remove this student and all their records?')){
    DB.students=DB.students.filter(s=>s.id!==id);
    delete DB.marks[id];
    if(EDITING_STUDENT_ID===id) EDITING_STUDENT_ID=null;
    saveDB(); render();
  }
}
function hmStudents(){ return studentManagerCard(null); }
function viewMarksheet(id){
  const stu = DB.students.find(s=>s.id===id); if(!stu) return;
  render(); // keep current tab (works for both headmaster Students tab and teacher Students/Progress tabs)
  setTimeout(()=>{
    const box = document.getElementById('marksheetPreview');
    if(box){
      box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('marksheetCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` + renderMarksheetCard(stu);
      box.scrollIntoView({behavior:'smooth'});
    }
  },0);
}
function viewMarksHistory(id){
  const stu = DB.students.find(s=>s.id===id); if(!stu) return;
  render();
  setTimeout(()=>{
    const box = document.getElementById('marksheetPreview');
    if(!box) return;
    const archive = stu.marksArchive||[];
    const list = archive.map((a,i)=>`
      <div class="flex items-center justify-between border-b py-2">
        <span>📜 <b>${esc(a.year)}</b> — Class ${esc(a.cls)}</span>
        <button onclick="viewArchivedMarksheet('${stu.id}',${i})" class="text-[var(--navy)] text-sm font-bold">View Marksheet</button>
      </div>`).join('') || `<p class="text-gray-400 text-center py-4">No past records yet.</p>`;
    box.innerHTML = card(`<h2 class="text-xl font-bold text-[var(--navy)] mb-3">📜 Past Records — ${esc(stu.name)}</h2>${list}`) + `<div id="archiveMarksheetView" class="mt-4"></div>`;
    box.scrollIntoView({behavior:'smooth'});
  },0);
}
function viewArchivedMarksheet(studentId, idx){
  const stu = DB.students.find(s=>s.id===studentId); if(!stu) return;
  const a = (stu.marksArchive||[])[idx]; if(!a) return;
  const box = document.getElementById('archiveMarksheetView');
  if(box){
    box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('marksheetCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` +
      renderMarksheetCard({...stu, cls:a.cls}, a.marks, a.year);
    box.scrollIntoView({behavior:'smooth'});
  }
}
function viewStudentAttendance(id){
  const stu = DB.students.find(s=>s.id===id); if(!stu) return;
  render();
  setTimeout(()=>{
    const box = document.getElementById('marksheetPreview');
    if(box){
      box.innerHTML = renderAttendanceSummary(stu);
      box.scrollIntoView({behavior:'smooth'});
    }
  },0);
}

function hmMarksOverview(){
  const rows = DB.students.map(s=>{
    const pct = computeOverallPct(s);
    const result = pct>=(DB.config.passPercent||40)?'PASS':'FAIL';
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)} ${esc(s.section)}</td>
      <td>${pct.toFixed(2)}%</td><td class="font-bold ${result==='PASS'?'text-green-600':'text-red-600'}">${result}</td>
      <td class="whitespace-nowrap">
        <button onclick="viewMarksheet('${s.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">📄 Marksheet</button>
        <button onclick="viewStudentAttendance('${s.id}')" class="text-[var(--navy)] text-sm font-bold">📅 Attendance</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="text-center text-gray-400 py-4">No students yet.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📊 Marks Overview (All Classes)</h2>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Class</th><th>%</th><th>Result</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `)}<div id="marksheetPreview" class="mt-5"></div>`;
}
function hmPromotion(){
  const classes = DB.config.classes;
  const clsSel = document.getElementById('promoClassSel')?.value || classes[0];
  const students = DB.students.filter(s=>s.cls===clsSel);
  const rows = students.map(s=>{
    const pct = computeOverallPct(s);
    const autoPass = pct >= (DB.config.passPercent||40);
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${pct.toFixed(2)}%</td>
      <td><input type="checkbox" class="promoCheck w-5 h-5" data-id="${s.id}" ${autoPass?'checked':''}></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🎓 Promotion System</h2>
    <div class="flex flex-wrap gap-3 items-end mb-4">
      <div><label class="block text-sm font-bold mb-1">Select Class</label>
        <select id="promoClassSel" onchange="render()" class="border rounded-lg px-3 py-2">
          ${classes.map(c=>`<option ${c===clsSel?'selected':''}>${esc(c)}</option>`).join('')}
        </select></div>
      <div><label class="block text-sm font-bold mb-1">Pass %</label>
        <input id="promoPassPct" type="number" value="${DB.config.passPercent}" class="border rounded-lg px-3 py-2 w-24"></div>
      <button onclick="applyPassPct()" class="navy-btn rounded-lg px-4 py-2 font-bold">Apply %</button>
    </div>
    <p class="text-sm text-gray-500 mb-2">Tick the students who should PASS and move up. Unticked students are marked FAIL / stay back.</p>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>%</th><th>Promote?</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
    <button onclick="promoteClass('${clsSel}')" class="navy-btn rounded-lg px-5 py-2 mt-4 font-bold">🚀 Promote Selected Students</button>
    <span id="promoMsg" class="ml-3 text-green-600 font-bold hidden">Done!</span>
  `);
}
function applyPassPct(){ DB.config.passPercent = Number(document.getElementById('promoPassPct').value)||40; saveDB(); render(); }
function promoteClass(cls){
  const classes = DB.config.classes;
  const idx = classes.indexOf(cls);
  const nextClass = idx>=0 && idx<classes.length-1 ? classes[idx+1] : cls;
  document.querySelectorAll('.promoCheck').forEach(chk=>{
    const stu = DB.students.find(s=>s.id===chk.dataset.id);
    if(!stu) return;
    if(chk.checked){
      // Archive this year's marks (never delete automatically) then start a fresh sheet for the new class/year.
      if(DB.marks[stu.id]){
        if(!stu.marksArchive) stu.marksArchive=[];
        stu.marksArchive.push({year:DB.config.year, cls:stu.cls, marks:DB.marks[stu.id]});
      }
      stu.cls = nextClass;
      delete DB.marks[stu.id];
    } else {
      stu.remark = 'FAIL - Stayed Back';
    }
  });
  saveDB();
  const m=document.getElementById('promoMsg'); m.classList.remove('hidden'); setTimeout(()=>render(),1200);
}

function hmBackup(){
  const acc = DB.config.headmasterAccount;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">💾 Backup & Restore</h2>
    <p class="text-sm text-gray-600 mb-4">This app works fully offline in your browser, so data auto-saves locally — it isn't literally stored inside Gmail. Export a JSON backup regularly and email it to yourself (<b>${esc(acc?.gmail||'your Gmail — add it in School Setup')}</b>) so you always have an offsite copy, and can restore it on any device.</p>
    <div class="flex flex-wrap gap-3">
      <button onclick="exportData()" class="gold-btn rounded-lg px-5 py-2 font-bold">⬇️ Download Backup File</button>
      <button onclick="emailBackupReminder()" class="navy-btn rounded-lg px-5 py-2 font-bold">📧 Open Gmail to Email It</button>
      <label class="navy-btn rounded-lg px-5 py-2 font-bold cursor-pointer">
        ⬆️ Import Backup File
        <input type="file" accept="application/json" class="hidden" onchange="importData(event)">
      </label>
    </div>
    <p class="text-xs text-gray-500 mt-3">Step 1: Download the backup file. Step 2: click "Open Gmail" and attach the file you just downloaded before sending.</p>
  `);
}
function emailBackupReminder(){
  exportData();
  const to = encodeURIComponent(DB.config.headmasterAccount?.gmail || '');
  const subject = encodeURIComponent(`${DB.config.schoolName} — Backup ${new Date().toISOString().slice(0,10)}`);
  const body = encodeURIComponent('A backup file has just been downloaded to your device. Please attach it to this email before sending, so you have an offsite copy.');
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`, '_blank');
}
function exportData(){
  const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`bfhs_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function importData(evt){
  const file = evt.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const parsed = JSON.parse(e.target.result);
      DB = Object.assign(defaultDB(), parsed, {config:Object.assign(defaultDB().config, parsed.config||{})});
      saveDB(); alert('Backup restored successfully!'); render();
    }catch(err){ alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
}

/* ============================================================
   TEACHER DASHBOARD
   ============================================================ */
const T_TABS = [
  {key:'attendance', label:'Attendance', icon:'📅'},
  {key:'marksentry', label:'Marks Entry', icon:'✏️'},
  {key:'students', label:'Students', icon:'🎒'},
  {key:'progress', label:'Student Progress', icon:'📈'},
  {key:'homework', label:'Homework', icon:'📚'},
  {key:'announcements', label:'Announcements', icon:'📣'},
  {key:'timetable', label:'Timetable', icon:'🕒'},
  {key:'idcard', label:'My ID Card', icon:'🪪'},
  {key:'staff', label:'Staff', icon:'👥'},
  {key:'backup', label:'Backup', icon:'💾'},
];
function renderTeacher(){
  const teacher = DB.teachers.find(t=>t.id===SESSION.teacherId);
  if(!teacher){ logout(); return; }
  if(!ACTIVE_TAB || !T_TABS.find(t=>t.key===ACTIVE_TAB)) ACTIVE_TAB='attendance';
  let content='';
  if(ACTIVE_TAB==='attendance') content = tAttendance(teacher);
  if(ACTIVE_TAB==='marksentry') content = tMarksEntry(teacher);
  if(ACTIVE_TAB==='students') content = studentManagerCard(teacher.cls);
  if(ACTIVE_TAB==='progress') content = tProgress(teacher);
  if(ACTIVE_TAB==='homework') content = tHomework(teacher);
  if(ACTIVE_TAB==='announcements') content = renderAnnouncements('teacher');
  if(ACTIVE_TAB==='timetable') content = DB.config.timetable ? renderTimetableCard({}) : card('<p class="text-gray-500 text-center py-10">Timetable not generated yet.</p>');
  if(ACTIVE_TAB==='idcard') content = tIdCard(teacher);
  if(ACTIVE_TAB==='staff') content = renderStaffDirectory();
  if(ACTIVE_TAB==='backup') content = tBackup(teacher);
  document.getElementById('app').innerHTML = shell(`Teacher — ${esc(teacher.name)} (${esc(teacher.cls)})`, T_TABS, ACTIVE_TAB, content);
}
function tBackup(teacher){
  const gmail = DB.config.headmasterAccount?.gmail || '';
  return renderCloudSyncPanel() + card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">💾 Local Backup File</h2>
    <p class="text-sm text-gray-600 mb-4">Prefer a manual file instead of/alongside Cloud Sync? Download a backup file and email it${gmail?` to the Headmaster (<b>${esc(gmail)}</b>)`:''} — attach the downloaded file before sending.</p>
    <div class="flex flex-wrap gap-3">
      <button onclick="exportData()" class="gold-btn rounded-lg px-5 py-2 font-bold">⬇️ Download Backup File</button>
      <button onclick="teacherEmailBackup()" class="navy-btn rounded-lg px-5 py-2 font-bold">📧 Open Gmail to Email It</button>
    </div>
    ${!gmail?`<p class="text-xs text-amber-600 mt-3">Headmaster hasn't added a Gmail yet — ask them to add it in School Setup so it auto-fills here.</p>`:''}
  `);
}
function teacherEmailBackup(){
  exportData();
  const to = encodeURIComponent(DB.config.headmasterAccount?.gmail || '');
  const subject = encodeURIComponent(`${DB.config.schoolName} — Class Backup ${new Date().toISOString().slice(0,10)}`);
  const body = encodeURIComponent('A backup file has just been downloaded to your device. Please attach it to this email before sending.');
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`, '_blank');
}
function tAttendance(teacher){
  // Only the teacher(s) assigned to this class can mark its attendance — enforced by filtering on teacher.cls.
  const date = document.getElementById('attDate')?.value || new Date().toISOString().slice(0,10);
  const key = `${teacher.cls}|${date}`;
  const att = DB.attendance[key] || {};
  const students = DB.students.filter(s=>s.cls===teacher.cls);
  const rows = students.map(s=>{
    const status = att[s.id] || 'P';
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td class="whitespace-nowrap">
        <button onclick="markAtt('${teacher.cls}','${date}','${s.id}','P')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${status==='P'?'bg-green-600 text-white':'bg-gray-100'}">Present</button>
        <button onclick="markAtt('${teacher.cls}','${date}','${s.id}','A')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${status==='A'?'bg-red-600 text-white':'bg-gray-100'}">Absent</button>
        <button onclick="markAtt('${teacher.cls}','${date}','${s.id}','L')" class="px-3 py-1 rounded-lg text-xs font-bold ${status==='L'?'bg-amber-500 text-white':'bg-gray-100'}">Leave</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="3" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📅 Attendance — Class ${esc(teacher.cls)}</h2>
    <div class="mb-4"><label class="font-bold text-sm mr-2">Date:</label>
      <input id="attDate" type="date" value="${date}" onchange="render()" class="border rounded-lg px-3 py-2"></div>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `);
}
function tProgress(teacher){
  const students = DB.students.filter(s=>s.cls===teacher.cls);
  const rows = students.map(s=>{
    const pct = computeOverallPct(s);
    const result = pct>=(DB.config.passPercent||40)?'PASS':'FAIL';
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td>${pct.toFixed(2)}%</td><td class="font-bold ${result==='PASS'?'text-green-600':'text-red-600'}">${result}</td>
      <td class="whitespace-nowrap">
        <button onclick="viewMarksheet('${s.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">📄 Marksheet</button>
        <button onclick="viewStudentAttendance('${s.id}')" class="text-[var(--navy)] text-sm font-bold">📅 Attendance</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📈 Student Progress — Class ${esc(teacher.cls)}</h2>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>%</th><th>Result</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `)}<div id="marksheetPreview" class="mt-5"></div>`;
}
function markAtt(cls,date,studentId,status){
  const key = `${cls}|${date}`;
  if(!DB.attendance[key]) DB.attendance[key]={};
  DB.attendance[key][studentId]=status;
  saveDB(); render();
}
function tMarksEntry(teacher){
  const students = DB.students.filter(s=>s.cls===teacher.cls);
  const subject = document.getElementById('meSubject')?.value || DB.config.subjects[0];
  const exam = document.getElementById('meExam')?.value || 'pt1';
  const rows = students.map(s=>{
    const rec = (DB.marks[s.id]||{})[subject]||{};
    const val = rec[exam] ?? '';
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td><input type="number" min="0" max="100" value="${val}" onchange="setMark('${s.id}','${subject}','${exam}',this.value)" class="border rounded-lg px-2 py-1 w-24"></td>
      <td>${(function(){
        const m=(DB.marks[s.id]||{})[subject]||{};
        const enteredKeys = EXAM_KEYS.filter(k=>entered(m,k));
        if(!enteredKeys.length) return '—';
        const t = enteredKeys.reduce((a,k)=>a+(Number(m[k])||0),0);
        const max = enteredKeys.length*100;
        const pct = t/max*100;
        return `${t}/${max} (${pct.toFixed(1)}% — ${grade(pct)})`;
      })()}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">✏️ Marks Entry — Class ${esc(teacher.cls)}</h2>
    <div class="flex flex-wrap gap-3 mb-4">
      <select id="meSubject" onchange="render()" class="border rounded-lg px-3 py-2">
        ${DB.config.subjects.map(s=>`<option ${s===subject?'selected':''}>${esc(s)}</option>`).join('')}
      </select>
      <select id="meExam" onchange="render()" class="border rounded-lg px-3 py-2">
        ${EXAMS.map(e=>`<option value="${e.key}" ${e.key===exam?'selected':''}>${e.label}</option>`).join('')}
      </select>
    </div>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Marks (/100)</th><th>Subject Total (auto)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `);
}
/* ============================================================
   ANNOUNCEMENTS — shared by Headmaster (manage), Teacher & Parent (view)
   ============================================================ */
function fixedHolidaysForYear(year){
  return PK_FIXED_HOLIDAYS.map(h=>({
    id:'fixed-'+year+'-'+h.md, isFixed:true, category:'Holiday', audience:'both',
    date:`${year}-${h.md}`, title:h.title, short:h.short, detail:h.detail
  }));
}
/* audience: 'teacher' | 'parent' shows that audience's own + 'both' items.
   audience: 'all' (Headmaster management view) shows everything, unfiltered. */
function allAnnouncements(audience){
  const now = new Date();
  const fixed = [now.getFullYear(), now.getFullYear()+1].flatMap(fixedHolidaysForYear);
  const list = [...(DB.announcements||[]), ...fixed];
  const filtered = audience==='all' ? list : list.filter(a=> a.audience==='both' || a.audience===audience);
  return filtered.sort((a,b)=> a.date.localeCompare(b.date));
}
function addAnnouncement(){
  const title = document.getElementById('annTitle').value.trim();
  const date = document.getElementById('annDate').value;
  const category = document.getElementById('annCategory').value;
  const audience = document.getElementById('annAudience').value;
  const short = document.getElementById('annShort').value.trim();
  const detail = document.getElementById('annDetail').value.trim();
  if(!title || !date || !short){ alert('Please fill in the title, date, and short description.'); return; }
  DB.announcements.push({id:uid(), title, date, category, audience, short, detail});
  saveDB();
  const t=document.getElementById('annTitle'), s=document.getElementById('annShort'), d=document.getElementById('annDetail');
  if(t)t.value=''; if(s)s.value=''; if(d)d.value='';
  render();
}
function deleteAnnouncement(id){
  if(confirm('Delete this announcement?')){
    DB.announcements = DB.announcements.filter(a=>a.id!==id);
    saveDB(); render();
  }
}
function annBadgeClass(cat){ return cat==='Holiday' ? 'ann-badge-holiday' : cat==='Event' ? 'ann-badge-event' : 'ann-badge-general'; }
function annAudienceLabel(a){ return a==='both' ? 'Teachers & Parents' : a==='teacher' ? 'Teachers only' : 'Parents only'; }
function annDateBox(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return `<div class="ann-date-box"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleString('en',{month:'short'}).toUpperCase()}</div></div>`;
}
function renderAnnouncementList(audience, opts={}){
  const today = todayISO();
  const items = allAnnouncements(audience);
  const upcoming = items.filter(a=>a.date>=today);
  const past = items.filter(a=>a.date<today).slice(-8).reverse();
  function itemHtml(a){
    return `<div class="ann-card ${a.date===today?'ann-today':''}">
      ${annDateBox(a.date)}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span class="font-bold text-[var(--navy)]">${esc(a.title)}</span>
          <span class="ann-badge ${annBadgeClass(a.category)}">${esc(a.category)}</span>
          ${a.date===today?'<span class="ann-badge bg-amber-100 text-amber-700">TODAY</span>':''}
          ${opts.manage?`<span class="ann-badge bg-gray-100 text-gray-600">${annAudienceLabel(a.audience)}</span>`:''}
        </div>
        <p class="text-sm text-gray-700">${esc(a.short)}</p>
        ${a.detail?`<p class="text-xs text-gray-500 mt-1">${esc(a.detail)}</p>`:''}
        ${(opts.manage && !a.isFixed)?`<button onclick="deleteAnnouncement('${a.id}')" class="text-red-600 text-xs font-bold mt-2">🗑️ Delete</button>`:''}
      </div>
    </div>`;
  }
  return `
    <div class="space-y-3 mb-6">
      <h3 class="font-bold text-[var(--navy)]">📌 Upcoming</h3>
      ${upcoming.length? upcoming.map(itemHtml).join('') : '<p class="text-gray-400 text-sm">No upcoming announcements.</p>'}
    </div>
    ${past.length?`<div class="space-y-3">
      <h3 class="font-bold text-gray-500">🕘 Recent</h3>
      ${past.map(itemHtml).join('')}
    </div>`:''}
  `;
}
function renderAnnouncements(audience){
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-2">📣 Announcements</h2>
    <p class="text-xs text-gray-500 mb-4">Pakistan's fixed national holidays appear automatically. Moon-sighting holidays (Eid, Ashura, Eid Milad-un-Nabi) are posted by the Headmaster once dates are confirmed.</p>
    ${renderAnnouncementList(audience)}
  `);
}
function hmAnnouncements(){
  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📣 New Announcement</h2>
      <div class="grid md:grid-cols-2 gap-4">
        <div><label class="block text-sm font-bold mb-1">Title</label>
          <input id="annTitle" placeholder="e.g. Eid-ul-Fitr Holidays" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label class="block text-sm font-bold mb-1">Date</label>
          <input id="annDate" type="date" value="${todayISO()}" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label class="block text-sm font-bold mb-1">Category</label>
          <select id="annCategory" class="w-full border rounded-lg px-3 py-2">${ANN_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-bold mb-1">Show to</label>
          <select id="annAudience" class="w-full border rounded-lg px-3 py-2">
            <option value="both">Teachers &amp; Parents</option>
            <option value="teacher">Teachers only</option>
            <option value="parent">Parents only</option>
          </select></div>
        <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Short description</label>
          <input id="annShort" placeholder="One line shown on the announcement card" class="w-full border rounded-lg px-3 py-2"></div>
        <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Detail (optional)</label>
          <textarea id="annDetail" rows="3" placeholder="Longer paragraph, shown under the short description" class="w-full border rounded-lg px-3 py-2"></textarea></div>
      </div>
      <button onclick="addAnnouncement()" class="gold-btn rounded-lg px-5 py-2 font-bold mt-4">➕ Post Announcement</button>
    `)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📋 All Announcements</h2>
      ${renderAnnouncementList('all', {manage:true})}
    `)}
  </div>`;
}

/* ============================================================
   FEE MANAGEMENT — Headmaster sets per-class monthly fee & collects;
   Parent views history and prints a voucher.
   ============================================================ */
function currentMonthKey(){ return todayISO().slice(0,7); }
function feeAmountFor(cls){ return Number((DB.config.classFee||{})[cls]) || 0; }
function ensureFeeRecord(studentId, month, cls){
  if(!DB.fees[studentId]) DB.fees[studentId]={};
  if(!DB.fees[studentId][month]) DB.fees[studentId][month] = {amount: feeAmountFor(cls), status:'Unpaid', paidOn:null};
  return DB.fees[studentId][month];
}
function setClassFee(cls,val){ if(!DB.config.classFee) DB.config.classFee={}; DB.config.classFee[cls]=Number(val)||0; saveDB(); render(); }
function setFeeAmount(studentId,month,cls,val){ const rec=ensureFeeRecord(studentId,month,cls); rec.amount=Number(val)||0; saveDB(); render(); }
function setFeeStatus(studentId,month,cls,status){ const rec=ensureFeeRecord(studentId,month,cls); rec.status=status; rec.paidOn = status==='Paid'?todayISO():null; saveDB(); render(); }
function monthLabel(month){ return new Date(`${month}-01T00:00:00`).toLocaleString('en',{month:'long',year:'numeric'}); }
function renderFeeVoucherCard(student, month){
  const cfg = DB.config;
  const rec = ensureFeeRecord(student.id, month, student.cls);
  const due = `${month}-10`;
  return `
  <div class="doc-frame max-w-md mx-auto" id="feeVoucherCard">
    <div class="doc-topbar"></div>
    <div class="doc-arc">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge">★ FEE VOUCHER ★</div>
    </div>
    <div class="p-5 space-y-4">
      <div class="ms-info-box grid grid-cols-2 gap-2">
        <div><b>Student:</b> ${esc(student.name)}</div>
        <div><b>Roll No:</b> ${esc(student.roll)}</div>
        <div><b>Class:</b> ${esc(student.cls)}</div>
        <div><b>Father:</b> ${esc(student.father||'-')}</div>
        <div><b>Month:</b> ${monthLabel(month)}</div>
        <div><b>Due Date:</b> ${due}</div>
      </div>
      <div class="ms-summary-box">
        <div class="row"><span>Tuition Fee</span><span>Rs. ${rec.amount}</span></div>
        <div class="row"><span>Status</span><span class="${rec.status==='Paid'?'text-green-600':'text-red-600'}">${rec.status}${rec.paidOn?` (${rec.paidOn})`:''}</span></div>
        <div class="row" style="border-bottom:none;font-size:1rem;"><span>Total Payable</span><span>Rs. ${rec.amount}</span></div>
      </div>
      <p class="text-xs text-gray-500">Please pay before the due date to avoid a late fee. This voucher is computer-generated and valid without signature.</p>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}
function hmFees(){
  const cls = document.getElementById('feeClassSel')?.value || DB.config.classes[0];
  const month = document.getElementById('feeMonthSel')?.value || currentMonthKey();
  const students = DB.students.filter(s=>s.cls===cls);
  const rows = students.map(s=>{
    const rec = ensureFeeRecord(s.id, month, s.cls);
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td><input type="number" value="${rec.amount}" onchange="setFeeAmount('${s.id}','${month}','${cls}',this.value)" class="border rounded-lg px-2 py-1 w-24"></td>
      <td class="whitespace-nowrap">
        <button onclick="setFeeStatus('${s.id}','${month}','${cls}','Paid')" class="px-3 py-1 rounded-lg text-xs font-bold mr-1 ${rec.status==='Paid'?'bg-green-600 text-white':'bg-gray-100'}">Paid</button>
        <button onclick="setFeeStatus('${s.id}','${month}','${cls}','Unpaid')" class="px-3 py-1 rounded-lg text-xs font-bold ${rec.status==='Unpaid'?'bg-red-600 text-white':'bg-gray-100'}">Unpaid</button>
      </td>
      <td><button onclick="viewFeeVoucher('${s.id}','${month}')" class="text-[var(--navy)] text-sm font-bold">🧾 Voucher</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">💰 Monthly Fee — Class Amounts</h2>
      <div class="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
        ${DB.config.classes.map(c=>`
        <div><label class="block text-xs font-bold mb-1">Class ${esc(c)}</label>
          <input type="number" value="${(DB.config.classFee||{})[c] ?? ''}" placeholder="Rs." onchange="setClassFee('${c}',this.value)" class="w-full border rounded-lg px-2 py-1.5 text-sm"></div>`).join('')}
      </div>
    `)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🧾 Fee Collection</h2>
      <div class="flex flex-wrap gap-3 mb-4">
        <select id="feeClassSel" onchange="render()" class="border rounded-lg px-3 py-2">${DB.config.classes.map(c=>`<option ${c===cls?'selected':''}>${esc(c)}</option>`).join('')}</select>
        <input id="feeMonthSel" type="month" value="${month}" onchange="render()" class="border rounded-lg px-3 py-2">
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Amount</th><th>Status</th><th>Voucher</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    `)}
    <div id="feeVoucherPreview"></div>
  </div>`;
}
function viewFeeVoucher(studentId, month){
  const box = document.getElementById('feeVoucherPreview'); if(!box) return;
  const stu = DB.students.find(s=>s.id===studentId); if(!stu) return;
  box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('feeVoucherCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` + renderFeeVoucherCard(stu, month);
}
function renderParentFees(stu){
  const cm = currentMonthKey();
  if(!DB.fees[stu.id] || !DB.fees[stu.id][cm]){ ensureFeeRecord(stu.id, cm, stu.cls); saveDB(); }
  const months = Object.keys(DB.fees[stu.id]||{}).sort().reverse();
  const rows = months.map(m=>{
    const rec = DB.fees[stu.id][m];
    return `<tr class="border-b"><td class="py-2">${monthLabel(m)}</td><td>Rs. ${rec.amount}</td>
      <td class="font-bold ${rec.status==='Paid'?'text-green-600':'text-red-600'}">${rec.status}</td>
      <td><button onclick="viewFeeVoucher('${stu.id}','${m}')" class="text-[var(--navy)] text-sm font-bold">🧾 Voucher</button></td></tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No fee records yet.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">💰 Fee History</h2>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Month</th><th>Amount</th><th>Status</th><th>Voucher</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `)}<div id="feeVoucherPreview" class="mt-5"></div>`;
}

/* ============================================================
   HOMEWORK — Teacher posts for their own class; Parent & Headmaster view.
   ============================================================ */
function renderHomeworkList(cls, opts={}){
  const list = DB.homework.filter(h=>h.cls===cls).sort((a,b)=>b.dueDate.localeCompare(a.dueDate));
  return list.map(h=>`
    <div class="ann-card">
      ${annDateBox(h.dueDate)}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span class="font-bold text-[var(--navy)]">${esc(h.title)}</span>
          <span class="ann-badge ann-badge-general">${esc(h.subject)}</span>
        </div>
        <p class="text-sm text-gray-700">${esc(h.description)}</p>
        <p class="text-xs text-gray-500 mt-1">Assigned: ${h.dateAssigned} • Due: ${h.dueDate}</p>
        ${opts.manage?`<button onclick="deleteHomework('${h.id}')" class="text-red-600 text-xs font-bold mt-2">🗑️ Delete</button>`:''}
      </div>
    </div>`).join('') || '<p class="text-gray-400 text-sm">No homework posted yet.</p>';
}
function addHomework(cls){
  const subject = document.getElementById('hwSubject').value;
  const title = document.getElementById('hwTitle').value.trim();
  const description = document.getElementById('hwDesc').value.trim();
  const dueDate = document.getElementById('hwDue').value;
  if(!title || !dueDate){ alert('Please fill in the title and due date.'); return; }
  DB.homework.push({id:uid(), cls, subject, title, description, dueDate, dateAssigned: todayISO(), teacherId: SESSION.teacherId});
  saveDB(); render();
}
function deleteHomework(id){ if(confirm('Delete this homework?')){ DB.homework = DB.homework.filter(h=>h.id!==id); saveDB(); render(); } }
function tHomework(teacher){
  const subject = document.getElementById('hwSubject')?.value || subjectsForClass(teacher.cls)[0];
  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📚 Assign Homework — Class ${esc(teacher.cls)}</h2>
      <div class="grid md:grid-cols-2 gap-4">
        <div><label class="block text-sm font-bold mb-1">Subject</label>
          <select id="hwSubject" class="w-full border rounded-lg px-3 py-2">${subjectsForClass(teacher.cls).map(s=>`<option ${s===subject?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
        <div><label class="block text-sm font-bold mb-1">Due Date</label>
          <input id="hwDue" type="date" value="${todayISO()}" class="w-full border rounded-lg px-3 py-2"></div>
        <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Title</label>
          <input id="hwTitle" placeholder="e.g. Exercise 4.2, Q1–10" class="w-full border rounded-lg px-3 py-2"></div>
        <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Details</label>
          <textarea id="hwDesc" rows="3" placeholder="Instructions for students/parents" class="w-full border rounded-lg px-3 py-2"></textarea></div>
      </div>
      <button onclick="addHomework('${teacher.cls}')" class="gold-btn rounded-lg px-5 py-2 font-bold mt-4">➕ Post Homework</button>
    `)}
    ${card(`<h2 class="text-xl font-bold text-[var(--navy)] mb-4">📋 Posted Homework</h2><div class="space-y-3">${renderHomeworkList(teacher.cls,{manage:true})}</div>`)}
  </div>`;
}
function hmHomework(){
  const cls = document.getElementById('hwClassSel')?.value || DB.config.classes[0];
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📚 Homework Overview</h2>
    <select id="hwClassSel" onchange="render()" class="border rounded-lg px-3 py-2 mb-4">${DB.config.classes.map(c=>`<option ${c===cls?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <div class="space-y-3">${renderHomeworkList(cls)}</div>
  `);
}

/* ============================================================
   ID CARDS — Headmaster generates for any student/teacher;
   Teacher & Parent can view/print their own.
   ============================================================ */
function renderIdCard(person, role){
  const cfg = DB.config;
  const photo = person.photo ? `<img src="${person.photo}" class="w-full h-full object-cover rounded-full">` : '👤';
  const idNo = role==='Student' ? `STU-${esc(person.roll)}-${esc(person.cls)}` : `STF-${esc(String(person.id).slice(-6).toUpperCase())}`;
  return `
  <div class="doc-frame max-w-xs mx-auto" id="idCard">
    <div class="doc-topbar"></div>
    <div class="doc-arc" style="padding:20px 16px 30px;">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title" style="font-size:1.2rem;">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle" style="font-size:.8rem;">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge" style="padding:5px 16px;font-size:.75rem;">★ IDENTITY CARD ★</div>
    </div>
    <div class="p-4 text-center">
      <div class="w-20 h-20 mx-auto rounded-full border-4 flex items-center justify-center text-3xl mb-2" style="border-color:var(--gold);background:#eef1f8;">${photo}</div>
      <div class="font-bold text-lg text-[var(--navy)]">${esc(person.name)}</div>
      <div class="text-xs text-gray-500 mb-3">${role}${role==='Student'?` — Class ${esc(person.cls)}`:role==='Teacher'?` — ${esc(person.subject)} (${esc(person.cls)})`:''}</div>
      <div class="ms-info-box text-left text-xs space-y-1">
        <div><b>ID No:</b> ${idNo}</div>
        ${role==='Student'?`<div><b>Father:</b> ${esc(person.father||'-')}</div><div><b>Roll No:</b> ${esc(person.roll)}</div>`:''}
        <div><b>Session:</b> ${esc(cfg.year)}</div>
      </div>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}
function hmIdCards(){
  const type = document.getElementById('idType')?.value || 'student';
  const cls = document.getElementById('idClassSel')?.value || DB.config.classes[0];
  let rows='';
  if(type==='student'){
    const students = DB.students.filter(s=>s.cls===cls);
    rows = students.map(s=>`<tr class="border-b"><td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td><td><button onclick="viewIdCard('${s.id}','student')" class="text-[var(--navy)] text-sm font-bold">🪪 Generate</button></td></tr>`).join('') || `<tr><td colspan="3" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  } else {
    rows = DB.teachers.map(t=>`<tr class="border-b"><td class="py-2">${esc(t.name)}</td><td>${esc(t.subject)} (${esc(t.cls)})</td><td><button onclick="viewIdCard('${t.id}','teacher')" class="text-[var(--navy)] text-sm font-bold">🪪 Generate</button></td></tr>`).join('') || `<tr><td colspan="3" class="text-center text-gray-400 py-4">No teachers yet.</td></tr>`;
  }
  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">🪪 ID Cards</h2>
      <div class="flex flex-wrap gap-3 mb-4">
        <select id="idType" onchange="render()" class="border rounded-lg px-3 py-2">
          <option value="student" ${type==='student'?'selected':''}>Students</option>
          <option value="teacher" ${type==='teacher'?'selected':''}>Teachers</option>
        </select>
        ${type==='student'?`<select id="idClassSel" onchange="render()" class="border rounded-lg px-3 py-2">${DB.config.classes.map(c=>`<option ${c===cls?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b">${type==='student'?'<th class="py-2">Roll</th><th>Name</th>':'<th class="py-2">Name</th><th>Subject (Class)</th>'}<th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    `)}
    <div id="idCardPreview"></div>
  </div>`;
}
function viewIdCard(id, type){
  const box = document.getElementById('idCardPreview'); if(!box) return;
  const person = type==='student' ? DB.students.find(s=>s.id===id) : DB.teachers.find(t=>t.id===id);
  if(!person) return;
  box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('idCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` + renderIdCard(person, type==='student'?'Student':'Teacher');
}
function tIdCard(teacher){
  return `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('idCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` + renderIdCard(teacher,'Teacher');
}
function pIdCard(stu){
  return `<div class="flex justify-end mb-2 no-print"><button onclick="printCard(document.getElementById('idCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button></div>` + renderIdCard(stu,'Student');
}

/* ============================================================
   STAFF DIRECTORY — shared by Parent and Teacher dashboards
   ============================================================ */
function renderStaffDirectory(){
  const hm = DB.config.headmasterAccount;
  const hmCard = hm ? `
    <div class="flex items-center gap-3 border rounded-xl p-3">
      ${hm.photo?`<img src="${hm.photo}" class="w-14 h-14 rounded-full object-cover">`:'<span class="text-3xl">👤</span>'}
      <div><div class="font-bold">${esc(hm.name)}</div><div class="text-xs text-gray-500">Headmaster</div></div>
    </div>` : '';
  const tCards = DB.teachers.map(t=>`
    <div class="flex items-center gap-3 border rounded-xl p-3">
      ${t.photo?`<img src="${t.photo}" class="w-14 h-14 rounded-full object-cover">`:'<span class="text-3xl">👤</span>'}
      <div><div class="font-bold">${esc(t.name)}</div><div class="text-xs text-gray-500">${esc(t.subject)} — Class ${esc(t.cls)}</div></div>
    </div>`).join('');
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">👥 Staff Directory</h2>
    <div class="grid sm:grid-cols-2 gap-3">${hmCard}${tCards || '<p class="text-gray-400 col-span-2 text-center py-4">No teachers added yet.</p>'}</div>
  `);
}

function setMark(studentId,subject,exam,value){
  if(!DB.marks[studentId]) DB.marks[studentId]={};
  if(!DB.marks[studentId][subject]) DB.marks[studentId][subject]={pt1:null,pt2:null,mid:null,final:null};
  const v = String(value).trim();
  DB.marks[studentId][subject][exam] = (v==='') ? null : (Number(v)||0);
  saveDB(); render();
}

/* ============================================================
   PARENT DASHBOARD
   ============================================================ */
const P_TABS = [
  {key:'marksheet', label:'Marksheet', icon:'📄'},
  {key:'attendance', label:'Attendance', icon:'📅'},
  {key:'fees', label:'Fees', icon:'💰'},
  {key:'homework', label:'Homework', icon:'📚'},
  {key:'announcements', label:'Announcements', icon:'📣'},
  {key:'timetable', label:'Timetable', icon:'🕒'},
  {key:'idcard', label:'ID Card', icon:'🪪'},
  {key:'staff', label:'Staff', icon:'👥'},
];
function renderParent(){
  const stu = DB.students.find(s=>s.id===SESSION.studentId);
  if(!stu){ logout(); return; }
  if(!ACTIVE_TAB || !P_TABS.find(t=>t.key===ACTIVE_TAB)) ACTIVE_TAB='marksheet';
  let content='';
  if(ACTIVE_TAB==='marksheet') content = `
    <div class="flex justify-end gap-2 mb-2 no-print">
      <button onclick="driveParentPull(false)" class="bg-gray-200 rounded-lg px-4 py-1.5 text-sm font-bold">🔄 Refresh${driveLastSync?` (synced ${driveLastSync.toLocaleTimeString()})`:''}</button>
      <button onclick="printCard(document.getElementById('marksheetCard').outerHTML)" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button>
    </div>
    ${renderMarksheetCard(stu)}`;
  if(ACTIVE_TAB==='attendance') content = renderAttendanceSummary(stu);
  if(ACTIVE_TAB==='fees') content = renderParentFees(stu);
  if(ACTIVE_TAB==='homework') content = card(`<h2 class="text-xl font-bold text-[var(--navy)] mb-4">📚 Homework — Class ${esc(stu.cls)}</h2><div class="space-y-3">${renderHomeworkList(stu.cls)}</div>`);
  if(ACTIVE_TAB==='announcements') content = renderAnnouncements('parent');
  if(ACTIVE_TAB==='timetable') content = DB.config.timetable ? renderTimetableCard({}) : card('<p class="text-gray-500 text-center py-10">Timetable not generated yet.</p>');
  if(ACTIVE_TAB==='idcard') content = pIdCard(stu);
  if(ACTIVE_TAB==='staff') content = renderStaffDirectory();
  document.getElementById('app').innerHTML = shell(`Parent — ${esc(stu.name)}`, P_TABS, ACTIVE_TAB, content);
}

/* ============================================================
   ROOT RENDER
   ============================================================ */
function render(){
  if(!SESSION){ renderLogin(); return; }
  if(SESSION.role==='superadmin'){ renderSuperAdmin(); return; }
  if(registryConfigured() && DRIVE_FILE_ID && APPROVAL_STATE.status!=='approved'){
    document.getElementById('app').innerHTML = renderApprovalGate();
    return;
  }
  if(SESSION.role==='headmaster') renderHeadmaster();
  else if(SESSION.role==='teacher') renderTeacher();
  else if(SESSION.role==='parent') renderParent();
  else { logout(); }
}
Promise.all([driveParentPull(true), refreshApprovalStatus()]).then(render); // grab the latest shared data + approval status (if Cloud Sync is set up) before first paint
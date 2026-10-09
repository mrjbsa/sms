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
/* A school can teach anywhere from 1st up to 12th at most; the Headmaster picks the highest class in School Setup. */
const ALL_CLASSES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'];
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
    certificates:[], // issued certificates: {id,serial,type,studentId,issuedOn,student:{...snapshot},data:{...}}
    alumni:[],     // students who passed out of the highest class (kept for certificates/records)
    salaries:{},   // teacherId -> { 'YYYY-MM': {amount,status:'Paid'/'Unpaid',paidOn} } — same pattern as fees
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
     4. In OAuth consent screen -> "Publish App" (move out of Testing)
        so ANY Gmail can sign in, not just ones you've manually added
        as Test Users. Uses the 'drive.file' scope (only ever touches
        files this app itself created) so Google's review for this is
        the light "sensitive scope" kind, not the costly, slow
        "restricted scope" security assessment — while still in
        Testing mode, only the ~100 Gmails you've added as Test Users
        can connect; everyone else sees an "Access blocked" screen.
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
   Once the owner creates a registry (via the hidden Platform Admin
   panel — click the login card's footer 5 times) and pastes its file
   ID below, every NEW school that connects Google Drive here must be
   approved (with a plan + expiry date) before its dashboard opens:
     • not listed / "pending" -> "Awaiting Approval" screen
     • "denied"               -> paid-service contact screen
     • "approved" + not expired -> normal access
     • "approved" + expiry date has passed -> treated as "expired",
       same contact screen with a renewal-specific message
   The registry itself is a small JSON file in the owner's OWN Drive,
   shared as "Anyone with the link — Viewer" so every school's device
   can read its own status with no sign-in. Only the owner's Google
   account can ever WRITE to it — Google Drive enforces that on its
   own, so nobody can self-approve. Expiry is checked client-side by
   comparing today's date to the stored expiryDate — nothing needs to
   "run" on a server for a plan to lapse.
   ============================================================ */
const OWNER_CONTACT_EMAIL = 'mrjbsa.official@outlook.com'; // shown to schools that are denied / expired / still pending
const MASTER_REGISTRY_FILE_ID = '1k4GUW-UpL1UHIycxXajWsV3attplEdto';                        // must match the admin site's value — paste here once created; leave blank to disable the gate entirely

/* Plan catalog — "price" is just a suggested amount shown when approving;
   the admin can edit it per school (discounts, negotiated deals, etc.)
   before approving, and whatever is entered is what counts as income. */
const PLAN_OPTIONS = [
  {key:'trial', label:'Free Trial — 1 Month', months:1,  price:0},
  {key:'m1',    label:'1 Month',              months:1,  price:2000},
  {key:'m2',    label:'2 Months',             months:2,  price:3800},
  {key:'m3',    label:'3 Months',             months:3,  price:5500},
  {key:'m4',    label:'4 Months',             months:4,  price:7200},
  {key:'m5',    label:'5 Months',             months:5,  price:8800},
  {key:'m6',    label:'6 Months',             months:6,  price:10500},
  {key:'y1',    label:'1 Year',               months:12, price:18000},
  {key:'lifetime', label:'Lifetime',          months:null, price:40000},
];
function planByKey(key){ return PLAN_OPTIONS.find(p=>p.key===key) || PLAN_OPTIONS[0]; }
/* The stored status plus a live expiry check — this is what actually decides
   access, so a plan "auto-denies" the moment its date passes, with nothing
   needing to run on a schedule anywhere. */
function effectiveStatus(entry){
  if(!entry) return 'pending';
  if(entry.status==='approved' && entry.expiryDate && entry.expiryDate < todayISO()) return 'expired';
  return entry.status || 'pending';
}

let APPROVAL_STATE = {status:'unknown', entry:null, checkedAt:null}; // status: 'unknown'|'approved'|'pending'|'denied'|'expired'
let REQUESTED_PLAN='trial';
function setRequestedPlan(v){ REQUESTED_PLAN=v; }

function registryConfigured(){ return !!(MASTER_REGISTRY_FILE_ID && !MASTER_REGISTRY_FILE_ID.includes('PASTE')); }
/* Reads the registry trying every route that can work from a browser, in order, and reports ALL failures.
   Routes: (1) API key, plain request  (2) the school's own Google sign-in token (no key needed — works even
   if the API key is restricted)  (3) token + key  (no extra fallbacks: more requests only make Google's anti-abuse block worse). */
function fetchRegistryJson(){
  const id = MASTER_REGISTRY_FILE_ID;
  const base = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
  const tok = (typeof driveAccessToken!=='undefined' && driveAccessToken) ? {Authorization:'Bearer '+driveAccessToken} : null;
  const routes = [
    tok && ['sign-in token', ()=>fetch(base,{headers:tok})],
    ['api-key', ()=>fetch(`${base}&key=${GOOGLE_API_KEY}`)],
    tok && ['token+key', ()=>fetch(`${base}&key=${GOOGLE_API_KEY}`,{headers:tok})],
  ].filter(Boolean);
  const errs=[];
  const next=i=>{
    if(i>=routes.length) return Promise.reject(new Error(errs.join(' | ')));
    const [name,run]=routes[i];
    return run().then(r=>{
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.text().then(t=>{ const j=JSON.parse(t); if(!j||typeof j!=='object') throw new Error('not JSON'); return j; });
    }).catch(e=>{ errs.push(name+': '+((e&&e.message)||'failed')); return next(i+1); });
  };
  return next(0);
}
let APPROVAL_NEXT_AT=0, APPROVAL_FAILS=0;
function refreshApprovalStatus(){
  if(!registryConfigured() || !DRIVE_FILE_ID){ APPROVAL_STATE={status:'approved', entry:null, checkedAt:new Date()}; return Promise.resolve(); }
  return fetchRegistryJson()
    .then(reg=>{
      const schools = (reg && reg.schools) || {};
      const entry = schools[DRIVE_FILE_ID] || null;
      APPROVAL_STATE = {status: effectiveStatus(entry), entry, listed:!!entry, registryCount:Object.keys(schools).length, checkedAt:new Date()};
      APPROVAL_FAILS=0; APPROVAL_NEXT_AT=Date.now()+30000;
    })
    /* FAIL CLOSED but HONEST: access stays blocked, yet the status is "error" (a connection/setup
       problem) — never dressed up as "pending", which would wrongly suggest the admin has not decided. */
    .catch(e=>{ APPROVAL_FAILS++; APPROVAL_NEXT_AT=Date.now()+Math.min(300000,30000*Math.pow(2,APPROVAL_FAILS-1)); APPROVAL_STATE={status:'error', entry:null, checkedAt:new Date(), checkFailed:true, detail:(e&&e.message)||'network error'}; });
}
let GATE_SHOWN=false, GATE_CHECKING=false, GATE_MSG='', WELCOME_PENDING=false;
function checkApprovalStatus(){
  GATE_CHECKING=true; GATE_MSG=''; render();
  refreshApprovalStatus().then(()=>{
    GATE_CHECKING=false;
    const st = APPROVAL_STATE.status;
    if(st==='error') GATE_MSG='⚠️ Could not verify: '+(APPROVAL_STATE.detail||'connection problem')+' — this is not a decision about your school.';
    else if(st==='pending') GATE_MSG = APPROVAL_STATE.listed ? 'Still pending — the admin has your School ID but has not approved it yet.' : 'Not approved yet — the admin has not added this School ID.';
    else if(st==='denied') GATE_MSG='The admin has declined this request.';
    else if(st==='expired') GATE_MSG='This plan has expired.';
    else GATE_MSG='';
    render();
  });
}
function copySchoolId(){
  const done=()=>alert('School ID copied.');
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(DRIVE_FILE_ID).then(done,()=>prompt('Copy your School ID:',DRIVE_FILE_ID));
  else prompt('Copy your School ID:',DRIVE_FILE_ID);
}
function openDashboardAfterApproval(){ WELCOME_PENDING=false; render(); }
/* While the approval screen is up, re-check every 10s on its own (not blocked by a focused
   dropdown like the general 25s sync is), so the moment the admin approves, this updates. */
setInterval(()=>{
  if(GATE_SHOWN && !GATE_CHECKING && SESSION && Date.now()>=APPROVAL_NEXT_AT){ refreshApprovalStatus().then(()=>render()); }
}, 10000);
const OWNER_WHATSAPP = ''; // optional: your WhatsApp number with country code, digits only (e.g. 923001234567) — if blank, WhatsApp opens its normal "choose a contact" screen
function approvalRequestText(schoolName, gmail){
  return `New School Registration\n\nSchool Name: ${schoolName}\nHeadmaster Gmail: ${gmail||'(not set)'}\nSchool File ID: ${DRIVE_FILE_ID}\nRequested Plan: ${planByKey(REQUESTED_PLAN).label}`;
}
function approvalRequestLinks(schoolName, gmail){
  const text = approvalRequestText(schoolName, gmail);
  const subject = 'New School Registration — '+schoolName;
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(OWNER_CONTACT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    mailto: `mailto:${OWNER_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    wa: `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`
  };
}
function copyApprovalRequest(){
  const hm = DB.config.headmasterAccount || {};
  const text = approvalRequestText(DB.config.schoolName||'My School', hm.gmail||driveConnectedEmail||'');
  const done = ()=>alert('Request details copied! Paste them into an email/WhatsApp message to '+OWNER_CONTACT_EMAIL);
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, ()=>prompt('Copy this and send it to '+OWNER_CONTACT_EMAIL+':', text));
  else prompt('Copy this and send it to '+OWNER_CONTACT_EMAIL+':', text);
}
/* Shared "where does my request stand?" panel: 3-step tracker, the School ID the admin must
   approve, when it was last checked, and the result of the last manual check. */
function gateStatusPanel(){
  const st = APPROVAL_STATE.status;
  const isErr = st==='error';
  const bad = st==='denied'||st==='expired';
  const stepCls = (on,done)=> done ? 'bg-green-600 text-white' : on ? 'bg-amber-400 text-[#081235] animate-pulse' : 'bg-gray-200 text-gray-500';
  const mid = bad ? (st==='denied'?'Declined':'Expired') : isErr ? 'Can’t verify' : 'Under review';
  const steps = [
    {n:'1',t:'Registered', on:false, done:true},
    {n:'2',t:mid, on:!bad&&!isErr, done:false, bad, warn:isErr},
    {n:'3',t:'Approved', on:false, done:false}
  ];
  const tracker = steps.map((x,i)=>`
    <div class="flex flex-col items-center flex-1 min-w-0">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${x.bad?'bg-red-600 text-white':x.warn?'bg-orange-500 text-white':stepCls(x.on,x.done)}">${x.done?'✓':x.bad?'✕':x.warn?'!':x.n}</div>
      <div class="text-[11px] mt-1 ${x.bad?'text-red-600 font-bold':x.warn?'text-orange-600 font-bold':x.on?'font-bold text-[var(--navy)]':'text-gray-500'}">${x.t}</div>
    </div>${i<2?'<div class="flex-none w-6 h-0.5 bg-gray-300 mt-4"></div>':''}`).join('');
  const label = st==='pending' ? (APPROVAL_STATE.listed?'⏳ Pending — admin is reviewing':'⏳ Not yet reviewed by the admin')
              : {denied:'🚫 Declined by the admin', expired:'⌛ Plan expired', error:'⚠️ Unable to verify right now', unknown:'… Checking'}[st] || st;
  const labelCls = bad ? 'text-red-600' : isErr ? 'text-orange-600' : 'text-amber-600';
  const n = APPROVAL_STATE.registryCount;
  const detail = isErr
    ? `<div class="rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-left text-orange-800 mt-2"><b>Status not checked yet.</b> This device could not read the approval registry without signing in — it is <b>not</b> a decision about your school. ${driveAccessToken?'':'Tap the button below to sign in with Google and see your real status.'}<br>Technical detail: <code class="break-all">${esc(APPROVAL_STATE.detail||'unknown')}</code><br>${driveAccessToken?'':'<button onclick="driveConnect()" class="mt-2 w-full navy-btn rounded-lg py-2 font-bold">🔗 Connect Google Drive and retry</button>'}Please send this message to the admin.</div>`
    : st==='pending'
      ? `<p class="text-xs text-gray-600 mt-2 text-left">${APPROVAL_STATE.listed
          ? '✔ Registry reachable — the admin has this School ID on file and is deciding.'
          : `Registry reachable (${n} school${n===1?'':'s'} listed) — this School ID is not listed yet. Send your request below, or ask the admin to add this exact ID.`}</p>`
      : '';
  return `
    <div class="flex items-start justify-center gap-1 mb-3">${tracker}</div>
    <div class="rounded-lg border p-3 text-left text-sm space-y-1">
      <div>Status: <b class="${labelCls}">${label}</b></div>
      <div class="text-xs text-gray-500">Last checked: ${APPROVAL_STATE.checkedAt?APPROVAL_STATE.checkedAt.toLocaleTimeString():'—'} · re-checks automatically</div>
      <div class="text-xs text-gray-500 flex items-center gap-2 flex-wrap">School ID: <code class="bg-gray-100 px-1 rounded break-all">${esc(DRIVE_FILE_ID)}</code>
        <button onclick="copySchoolId()" class="underline text-[var(--navy)]">copy</button></div>
    </div>
    ${detail}
    ${GATE_CHECKING?'<p class="text-sm text-gray-600 mt-2">🔄 Checking with the admin…</p>':''}
    ${(!GATE_CHECKING&&GATE_MSG)?`<p class="text-sm mt-2 ${isErr||bad?'text-red-600':'text-amber-700'} font-bold">${esc(GATE_MSG)}</p>`:''}`;
}
function gateCheckButton(){
  return `<button onclick="checkApprovalStatus()" ${GATE_CHECKING?'disabled':''} class="gold-btn rounded-lg px-5 py-2 font-bold mt-2 ${GATE_CHECKING?'opacity-60':''}">${GATE_CHECKING?'Checking…':'🔄 Check Approval Status'}</button>`;
}
function renderApprovalWelcome(){
  const e = APPROVAL_STATE.entry||{};
  return `
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md doc-frame">
      <div class="doc-topbar"></div>
      <div class="doc-arc"><div class="doc-shield">✅</div><div class="doc-title" style="font-size:1.3rem;">Approved!</div><div class="doc-subtitle">Your school is now active</div></div>
      <div class="p-6 text-center space-y-3">
        <div class="rounded-lg border p-3 text-sm text-left space-y-1">
          <div>Plan: <b>${esc(e.planLabel||'Active')}</b></div>
          <div>${e.expiryDate?`Valid until: <b>${esc(e.expiryDate)}</b>`:'Validity: <b>Lifetime</b>'}</div>
        </div>
        <p class="text-gray-700 text-sm">Thank you for registering. You can now use the full dashboard.</p>
        <button onclick="openDashboardAfterApproval()" class="navy-btn rounded-lg px-6 py-2.5 font-bold">Open Dashboard →</button>
      </div>
      <div class="doc-footer"><span class="lead">Learn Today</span><span class="lead2">Lead Tomorrow</span></div>
    </div>
  </div>`;
}
function renderApprovalGate(){
  if(APPROVAL_STATE.status==='denied'){
    return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md doc-frame">
        <div class="doc-topbar"></div>
        <div class="doc-arc"><div class="doc-shield">🚫</div><div class="doc-title" style="font-size:1.3rem;">Access Declined</div><div class="doc-subtitle">This is a paid service</div></div>
        <div class="p-6 text-center space-y-3">
          ${gateStatusPanel()}
          <p class="text-gray-700 text-sm">Please contact us to purchase access before using this school management system.</p>
          <p class="font-bold text-[var(--navy)]">📧 ${esc(OWNER_CONTACT_EMAIL)}</p>
          ${gateCheckButton()}
          <button onclick="logout()" class="text-sm text-gray-500 underline mt-2 block mx-auto">⬅️ Back to Login</button>
        </div>
        <div class="doc-footer"><span class="lead">Learn Today</span><span class="lead2">Lead Tomorrow</span></div>
      </div>
    </div>`;
  }
  if(APPROVAL_STATE.status==='expired'){
    const e = APPROVAL_STATE.entry||{};
    return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md doc-frame">
        <div class="doc-topbar"></div>
        <div class="doc-arc"><div class="doc-shield">⌛</div><div class="doc-title" style="font-size:1.3rem;">Subscription Expired</div></div>
        <div class="p-6 text-center space-y-3">
          ${gateStatusPanel()}
          <p class="text-gray-700 text-sm">Your <b>${esc(e.planLabel||'plan')}</b> expired on <b>${esc(e.expiryDate||'')}</b>. Please renew to continue using the dashboard.</p>
          <p class="font-bold text-[var(--navy)]">📧 ${esc(OWNER_CONTACT_EMAIL)}</p>
          ${gateCheckButton()}
          <button onclick="logout()" class="text-sm text-gray-500 underline mt-2 block mx-auto">⬅️ Back to Login</button>
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
        ${gateStatusPanel()}
        <p class="text-gray-700 text-sm">If you haven't yet, send your request so the admin knows which school to approve:</p>
        <div class="text-left">
          <label class="block text-xs font-bold text-gray-500 mb-1">Plan you'd like</label>
          <select onchange="setRequestedPlan(this.value)" class="w-full border rounded-lg px-3 py-2 text-sm">
            ${PLAN_OPTIONS.map(p=>`<option value="${p.key}" ${p.key===REQUESTED_PLAN?'selected':''}>${p.label}${p.price?` — Rs. ${p.price}`:''}</option>`).join('')}
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <a href="${links.gmail}" target="_blank" rel="noopener" class="navy-btn rounded-lg px-5 py-2 font-bold">📧 Send Request via Gmail</a>
          <a href="${links.wa}" target="_blank" rel="noopener" class="bg-green-600 text-white rounded-lg px-5 py-2 font-bold">💬 Send Request on WhatsApp</a>
          <button onclick="copyApprovalRequest()" class="bg-gray-200 rounded-lg px-5 py-2 font-bold">📋 Copy Request Details</button>
        </div>
        <p class="text-xs text-gray-500">Or send these details yourself to <b>${esc(OWNER_CONTACT_EMAIL)}</b> from any email — <a href="${links.mailto}" class="underline">open in your mail app</a>.</p>
        ${gateCheckButton()}
        <button onclick="logout()" class="text-sm text-gray-500 underline mt-2 block mx-auto">⬅️ Back to Login</button>
        <p class="text-xs text-gray-400 mt-2">Questions? 📧 ${esc(OWNER_CONTACT_EMAIL)}</p>
      </div>
      <div class="doc-footer"><span class="lead">Learn Today</span><span class="lead2">Lead Tomorrow</span></div>
    </div>
  </div>`;
}

let driveTokenClient=null, driveAccessToken=null, driveConnectedEmail=null, driveLastSync=null, driveAutoTimer=null;
function driveConfigured(){ return GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PASTE') && GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('PASTE'); }
function driveSetFileId(id){ DRIVE_FILE_ID = id; localStorage.setItem('bfhs_drive_file_id', id); refreshApprovalStatus(); }
function driveInitTokenClient(){
  if(driveTokenClient || !window.google || !google.accounts) return;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    callback: (resp)=>{
      if(resp.error){ alert('Google sign-in failed: '+resp.error); return; }
      /* Google's consent screen lets the user untick the Drive checkbox. If that happens
         the token has no Drive access and every file call fails with "insufficient
         authentication scopes" — catch it here with a clear instruction instead. */
      if(!google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/drive.file')){
        alert('Google Drive permission was not granted.\n\nOn the Google screen, please TICK the checkbox that says "See, edit, create and delete only the specific Google Drive files you use with this app", then press Continue.\n\nClick Connect Google Drive and try again.');
        driveAccessToken = null;
        return;
      }
      driveAccessToken = resp.access_token;
      fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+driveAccessToken}})
        .then(r=>{ if(!r.ok) throw new Error('Could not read your Google account info (status '+r.status+').'); return r.json(); })
        .then(p=>{
          driveConnectedEmail = p.email;
          if(!DRIVE_FILE_ID) driveCreateFile(); else refreshApprovalStatus().then(()=>drivePullNow(true)).then(render);
        })
        .catch(e=>alert('Google Drive sign-in failed: '+e.message));
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
      <h3 class="font-bold text-[var(--navy)] mb-1">⚙️ Platform Approval Gate</h3>
      <p class="text-xs ${registryConfigured()?'text-green-600':'text-red-600'} font-bold mb-1">${registryConfigured() ? '✅ ON — new schools need admin approval before their dashboard opens.' : '🚫 OFF — anyone who connects Google Drive gets in immediately, no approval needed.'}</p>
      <p class="text-xs text-gray-500">This school's current status: <b>${esc(APPROVAL_STATE.status)}</b>${APPROVAL_STATE.checkedAt?` (checked ${APPROVAL_STATE.checkedAt.toLocaleTimeString()})`:''}.</p>
      ${APPROVAL_STATE.checkFailed?`<p class="text-xs text-red-600 font-bold mt-1">⚠️ The last check could not read the registry file: ${esc(APPROVAL_STATE.detail||'unknown')} — access stays blocked until it succeeds.</p>`:''}
      <p class="text-xs text-gray-500 mt-1">Registry file this site is reading: <code class="bg-gray-100 px-1 rounded">${esc(MASTER_REGISTRY_FILE_ID)}</code> — compare this EXACT ID, character for character, against the one shown on the Platform Admin site's header. If they don't match, this device/deployment is reading a different (likely old/test) registry — re-upload the current public script.js here.</p>
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
  refreshApprovalStatus().then(()=>{
    if(SESSION && SESSION.role==='parent'){ driveParentPull(true).then(()=>{ if(SESSION) render(); }); }
    else if(driveAccessToken && DRIVE_FILE_ID){ drivePullNow(true).then(()=>{ if(SESSION) render(); }); }
    else if(SESSION){ render(); } // catches a plan that just expired/got denied, even with nothing else to sync
  });
}, 25000);

/* ---------------------------- SESSION ---------------------------- */
let SESSION = JSON.parse(sessionStorage.getItem('bfhs_session')||'null');
function setSession(s){ SESSION=s; sessionStorage.setItem('bfhs_session', JSON.stringify(s)); }
function logout(){ SESSION=null; GATE_SHOWN=false; WELCOME_PENDING=false; GATE_MSG=''; sessionStorage.removeItem('bfhs_session'); render(); }

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
  return EXAMS.map((e,i)=>{
    const key = EXAM_KEYS[i];
    const anyEntered = subs.some(sub=>entered(m[sub], key));
    if(!anyEntered) return {label:e.label, pct:null, grade:null};
    let obtained=0;
    subs.forEach(sub=>{ obtained += Number((m[sub]||{})[key])||0; });
    const max = subs.length * EXAM_MAX_EACH;
    const pct = max? (obtained/max*100) : 0;
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
          ${terms.map(t=>`<div class="border rounded-lg py-2"><div class="font-bold">${esc(t.label)}</div>${t.pct===null?'<div class="text-gray-400">—</div><div class="text-gray-400 text-xs">Not entered</div>':`<div>${t.pct.toFixed(1)}%</div><div class="font-bold text-[var(--navy)]">${t.grade}</div>`}</div>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 ms-grid3">
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

/* ============================================================
   PRINT + SAVE-AS-JPG ENGINE
   - Marksheet / Timetable / Fee Voucher: printed on a real A4 page
     (210 x 297 mm) at the card's own natural size — same design as
     on screen, never stretched or distorted, just placed on an A4
     sheet with a normal margin.
   - ID Card: its own exact 85.6 x 54 mm (credit-card) page.
   - "Save JPG" renders that exact same card at high resolution.
   The card is built ONCE here in the main page (where all styles are
   already loaded and stable) and the finished result is handed to the
   print window / image renderer, so both always look identical.
   ============================================================ */
const CARD_BASE_W = {marksheetCard:700, timetableCard:560, feeVoucherCard:560, salarySlipCard:560, certificateCard:700};
const CARD_LABEL  = {marksheetCard:'Marksheet', timetableCard:'Timetable', feeVoucherCard:'Fee-Voucher', idCard:'ID-Card', salarySlipCard:'Salary-Slip', certificateCard:'Certificate'};

/* Print / image copy of a card: no editable inputs (they cut text off), no duplicate id. */
function staticCardHtml(el){
  const c = el.cloneNode(true);
  c.removeAttribute('id');
  c.querySelectorAll('input,select,textarea').forEach(inp=>{
    const span = document.createElement('span');
    let v = inp.value || inp.getAttribute('value') || '';
    if(inp.type==='time' && v){ try{ v = minToTime(timeToMin(v)); }catch(e){} }
    span.textContent = v;
    inp.replaceWith(span);
  });
  c.querySelectorAll('[onclick],[onchange]').forEach(n=>{ n.removeAttribute('onclick'); n.removeAttribute('onchange'); });
  return c.outerHTML;
}
const wait = ms => new Promise(r=>setTimeout(r,ms));
/* Builds a plain, undistorted copy of the card at its own natural size — this is
   handed to BOTH the print window and the JPG renderer, so what you print/save is
   always exactly what was on screen, just placed on a real A4 (or card-size) page. */
async function buildSheet(id){
  const el = document.getElementById(id); if(!el) return null;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff;';
  if(id==='idCard'){
    host.innerHTML = staticCardHtml(el);
    document.body.appendChild(host);
    await wait(60);
    return {host, node: host.firstElementChild, w:323.5, h:204.1, isId:true};
  }
  const w = CARD_BASE_W[id] || 620;
  host.innerHTML = staticCardHtml(el);
  document.body.appendChild(host);
  const node = host.firstElementChild;
  node.style.maxWidth = 'none';
  node.style.width = w+'px';
  node.style.margin = '0';
  await wait(150);                       // let Tailwind generate CSS for the cloned markup
  const h = node.offsetHeight;
  return {host, node, w, h, isId:false};
}
/* Every style rule currently on the page (Tailwind + style.css) as one string. */
function collectPageCss(){
  let css = '';
  for(const sh of Array.from(document.styleSheets)){
    try{ css += Array.from(sh.cssRules).map(r=>r.cssText).join('\n')+'\n'; }catch(e){}
  }
  return css;
}

async function printEl(id){
  if(!document.getElementById(id)) return;
  const w = window.open('', 'PrintWindow', 'width=900,height=1000');   // opened inside the click, before any await
  if(!w){ alert('Please allow pop-ups for this site to print.'); return; }
  w.document.write('<p style="font-family:sans-serif;padding:20px;">Preparing print preview…</p>');
  let built;
  try{ built = await buildSheet(id); }catch(e){ w.close(); alert('Could not prepare the print view: '+e.message); return; }
  if(!built){ w.close(); return; }
  const html = built.node.outerHTML;
  built.host.remove();
  const page = built.isId ? '85.6mm 54mm' : 'A4';
  const margin = built.isId ? '0' : '8mm';
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${CARD_LABEL[id]||'Print'}</title>
    <style>${collectPageCss()}</style>
    <style>
      @page{ size:${page}; margin:${margin}; }
      html,body{ margin:0; padding:0; background:#fff; }
      body{ display:flex; justify-content:center; ${built.isId?'align-items:center; min-height:100vh;':'align-items:flex-start;'} }
      *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      @media print{ .no-print{ display:none !important; } }
      .pre-print-banner{
        position:fixed; top:0; left:0; right:0; z-index:9; background:#0b1a4a; color:#fff;
        font-family:'Trebuchet MS',sans-serif; padding:10px 16px; display:flex;
        align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
      }
      .pre-print-banner b{ color:#f7c948; }
      .pre-print-banner button{
        background:#f0a500; color:#081235; font-weight:700; border:none;
        border-radius:8px; padding:8px 18px; cursor:pointer; font-size:14px;
      }
    </style></head><body>
    <div class="pre-print-banner no-print">
      <span>Before printing: <b>Paper size = ${built.isId?'smallest/Custom (85.6×54mm)':'A4'}</b>, <b>Margins = None</b>, <b>Scale = 100%</b>.</span>
      <button onclick="window.print()">🖨️ Print Now</button>
    </div>
    <div class="no-print" style="height:52px;"></div>
    ${html}
    </body></html>`);
  w.document.close();
}

/* --- picture rendering: SVG-foreignObject first (uses the browser's own renderer, needs no library),
       html2canvas as a backup --- */
function svgToCanvas(node, w, h, scale){
  return new Promise((resolve,reject)=>{
    const cs = getComputedStyle(document.body);
    const xhtml = new XMLSerializer().serializeToString(node);
    const css = collectPageCss().replace(/]]>/g,']] >');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w*scale)}" height="${Math.round(h*scale)}" viewBox="0 0 ${w} ${h}">
      <foreignObject x="0" y="0" width="${w}" height="${h}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:#fff;font-family:${cs.fontFamily.replace(/"/g,"'")};color:${cs.color};line-height:1.5;">
          <style><![CDATA[${css}]]></style>${xhtml}
        </div>
      </foreignObject></svg>`;
    const img = new Image();
    img.onload = ()=>{
      try{
        const c = document.createElement('canvas');
        c.width = Math.round(w*scale); c.height = Math.round(h*scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
        ctx.drawImage(img,0,0,c.width,c.height);
        c.toDataURL('image/png',0.1);              // throws if the canvas got tainted
        resolve(c);
      }catch(e){ reject(e); }
    };
    img.onerror = ()=>reject(new Error('svg image failed to load'));
    img.src = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
let _h2cLoading=null;
function ensureHtml2Canvas(){
  if(window.html2canvas) return Promise.resolve();
  if(_h2cLoading) return _h2cLoading;
  _h2cLoading = new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload=()=>resolve();
    s.onerror=()=>{ _h2cLoading=null; reject(new Error('image-saving backup library failed to load')); };
    document.head.appendChild(s);
  });
  return _h2cLoading;
}
async function nodeToCanvas(node, w, h, scale){
  try{ return await svgToCanvas(node, w, h, scale); }
  catch(e1){
    try{ await ensureHtml2Canvas(); }catch(e2){ throw e1; }
    return await html2canvas(node, {scale, backgroundColor:'#ffffff', useCORS:true, logging:false,
             width:w, height:h, windowWidth:Math.ceil(w), windowHeight:Math.ceil(h), scrollX:0, scrollY:0, x:0, y:0});
  }
}
function downloadCanvasJpg(canvas, name){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(!blob){ reject(new Error('the browser could not create the image')); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/jpeg', 0.98);
  });
}
async function jpgEl(id){
  const el = document.getElementById(id); if(!el) return;
  let built;
  try{
    built = await buildSheet(id);
    const canvas = await nodeToCanvas(built.node, built.w, built.h, built.isId ? 10 : 4);
    const who = (el.getAttribute('data-fname')||'').replace(/[^\w\-]+/g,'_');
    await downloadCanvasJpg(canvas, `${CARD_LABEL[id]||'Card'}${who?'-'+who:''}-${todayISO()}.jpg`);
  }catch(e){
    alert('Could not save the image: '+(e&&e.message?e.message:e)+'\n\nTip: use the Print button and choose "Save as PDF" as a fallback.');
  }finally{ if(built) built.host.remove(); }
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
          <p class="text-center text-xs text-gray-400 mt-3"><a href="privacy-policy.html" target="_blank" class="underline">Privacy Policy</a> · <a href="terms-of-service.html" target="_blank" class="underline">Terms of Service</a></p>
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
  {key:'dashboard', label:'Dashboard', icon:'📈'},
  {key:'setup', label:'School Setup', icon:'🏫'},
  {key:'cloudsync', label:'Cloud Sync', icon:'☁️'},
  {key:'announcements', label:'Announcements', icon:'📣'},
  {key:'timetable', label:'Timetable', icon:'🕒'},
  {key:'teachers', label:'Teachers', icon:'👩‍🏫'},
  {key:'teacherAttendance', label:'Teacher Attendance', icon:'🗓️'},
  {key:'students', label:'Students', icon:'🎒'},
  {key:'marks', label:'Marks Overview', icon:'📊'},
  {key:'fees', label:'Fees', icon:'💰'},
  {key:'salary', label:'Salary', icon:'🧾'},
  {key:'homework', label:'Homework', icon:'📚'},
  {key:'idcards', label:'ID Cards', icon:'🪪'},
  {key:'certificates', label:'Certificates', icon:'📜'},
  {key:'promotion', label:'Promotion', icon:'🎓'},
  {key:'backup', label:'Backup', icon:'💾'},
];
function renderHeadmaster(){
  if(!ACTIVE_TAB || !HM_TABS.find(t=>t.key===ACTIVE_TAB)) ACTIVE_TAB='dashboard';
  let content='';
  if(ACTIVE_TAB==='dashboard') content = hmDashboard();
  if(ACTIVE_TAB==='setup') content = hmSetup();
  if(ACTIVE_TAB==='cloudsync') content = renderCloudSyncPanel();
  if(ACTIVE_TAB==='announcements') content = hmAnnouncements();
  if(ACTIVE_TAB==='timetable') content = hmTimetable();
  if(ACTIVE_TAB==='teachers') content = hmTeachers();
  if(ACTIVE_TAB==='teacherAttendance') content = hmTeacherAttendance();
  if(ACTIVE_TAB==='students') content = hmStudents();
  if(ACTIVE_TAB==='marks') content = hmMarksOverview();
  if(ACTIVE_TAB==='fees') content = hmFees();
  if(ACTIVE_TAB==='salary') content = hmSalary();
  if(ACTIVE_TAB==='homework') content = hmHomework();
  if(ACTIVE_TAB==='idcards') content = hmIdCards();
  if(ACTIVE_TAB==='certificates') content = hmCertificates();
  if(ACTIVE_TAB==='promotion') content = hmPromotion();
  if(ACTIVE_TAB==='backup') content = hmBackup();
  document.getElementById('app').innerHTML = shell('Headmaster', HM_TABS, ACTIVE_TAB, content);
}

function card(inner, extra=''){ return `<div class="bg-white rounded-2xl shadow p-5 ${extra}">${inner}</div>`; }

function hmSetup(){
  const c = DB.config;
  let topIdx = Math.max(...c.classes.map(x=>ALL_CLASSES.indexOf(x)));
  if(!(topIdx>=0)) topIdx = Math.min(Math.max(c.classes.length,1),12)-1;
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
      <div class="md:col-span-2"><label class="block text-sm font-bold mb-1">Classes your school teaches</label>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm">1st up to</span>
          <select id="cfgTopClass" class="border rounded-lg px-3 py-2">${ALL_CLASSES.map((x,i)=>`<option value="${x}" ${i===topIdx?'selected':''}>${x}</option>`).join('')}</select>
          <span class="text-xs text-gray-500">(maximum 12th) · currently: ${esc(c.classes.join(', '))}</span>
        </div>
        <p class="text-xs text-gray-500 mt-1">Promotion follows this order, and the highest class is where students pass out. If you add 11th/12th, set their subjects in "Class-wise Subjects" below.</p>
      </div>
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
  let newClasses = null;
  const topSel = document.getElementById('cfgTopClass');
  if(topSel){
    newClasses = ALL_CLASSES.slice(0, ALL_CLASSES.indexOf(topSel.value)+1);
    const dropped = c.classes.filter(x=>!newClasses.includes(x));
    const orphans = DB.students.filter(st=>dropped.includes(st.cls));
    if(orphans.length && !confirm(`${orphans.length} student(s) are in classes that would no longer exist (${[...new Set(orphans.map(st=>st.cls))].join(', ')}), so they would vanish from every class list.\n\nMove them first (Students → Edit), or press Cancel to keep the current classes.\n\nPress OK only if you really want to continue.`)) return;
  }
  c.schoolName = document.getElementById('cfgName').value.trim() || c.schoolName;
  c.year = document.getElementById('cfgYear').value.trim();
  c.assemblyStart = document.getElementById('cfgAStart').value;
  c.assemblyEnd = document.getElementById('cfgAEnd').value;
  c.schoolEnd = document.getElementById('cfgEnd').value;
  c.passPercent = Number(document.getElementById('cfgPass').value)||40;
  c.subjects = document.getElementById('cfgSubjects').value.split(',').map(s=>s.trim()).filter(Boolean);
  if(newClasses) c.classes = newClasses;
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
          <button onclick="printEl('timetableCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('timetableCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button>
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
  const rows = DB.teachers.map(t=>{
    const accessBadge = t.drivePermissionId
      ? `<span class="ann-badge bg-green-100 text-green-700">✅ Can Save to Drive</span>`
      : `<span class="ann-badge bg-gray-100 text-gray-600">Local only</span>`;
    return `
    <tr class="border-b">
      <td class="py-2">${t.photo?`<img src="${t.photo}" class="w-9 h-9 rounded-full object-cover">`:'<span class="text-xl">👤</span>'}</td>
      <td>${esc(t.name)}</td><td>${esc(t.subject)}</td><td>${esc(t.cls)}</td>
      <td class="text-xs">${esc(t.gmail||'—')}</td>
      <td>${accessBadge}</td>
      <td class="whitespace-nowrap">
        <button onclick="resetTeacherPass('${t.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">🔑 Password</button>
        <button onclick="editTeacherSalaryInfo('${t.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">🧾 Join/Salary</button>
        ${t.drivePermissionId
          ? `<button onclick="driveRevokeTeacherAccess('${t.id}')" class="text-red-600 text-sm font-bold mr-2">🚫 Revoke Drive Access</button>`
          : `<button onclick="driveGrantTeacherAccess('${t.id}')" class="text-green-700 text-sm font-bold mr-2">🔓 Grant Drive Access</button>`}
        <button onclick="delTeacher('${t.id}')" class="text-red-600 text-sm font-bold">🗑️ Remove</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-4">No teachers yet.</td></tr>`;
  const classOpts = DB.config.classes.map(c=>`<option>${esc(c)}</option>`).join('');
  return card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-4">👩‍🏫 Teachers</h2>
    <p class="text-sm text-gray-500 mb-3">Set a login password for the teacher when assigning them to a class — they'll use it to log in. Photo is optional and shows up in the Staff directory that Parents and Teachers can see. Add their Gmail if you want to grant them Drive edit access with one click below.</p>
    <div class="grid md:grid-cols-6 gap-3 mb-2">
      <input id="tName" placeholder="Teacher Name" class="border rounded-lg px-3 py-2">
      <input id="tSubject" placeholder="Subject" class="border rounded-lg px-3 py-2">
      <select id="tClass" class="border rounded-lg px-3 py-2">${classOpts}</select>
      <input id="tPassword" type="text" placeholder="Set Login Password" class="border rounded-lg px-3 py-2">
      <input id="tGmail" type="email" placeholder="Gmail (for Drive access)" class="border rounded-lg px-3 py-2">
      <input id="tPhoto" type="file" accept="image/*" class="border rounded-lg px-2 py-2 text-sm">
      <input id="tJoinDate" type="date" value="${todayISO()}" title="Join Date (used for salary tracking)" class="border rounded-lg px-3 py-2">
      <input id="tSalary" type="number" placeholder="Monthly Salary (Rs.)" class="border rounded-lg px-3 py-2">
    </div>
    <button onclick="addTeacher()" class="navy-btn rounded-lg px-4 py-2 font-bold mb-4">+ Add Teacher</button>
    ${!driveAccessToken?'<p class="text-xs text-amber-600 mb-3">Connect Google Drive (Cloud Sync tab) as Headmaster first — Grant/Revoke Drive Access buttons need that connection to work.</p>':''}
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Photo</th><th>Name</th><th>Subject</th><th>Class</th><th>Gmail</th><th>Drive Access</th><th>Action</th></tr></thead>
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
  const gmail=document.getElementById('tGmail').value.trim();
  const photoInput=document.getElementById('tPhoto');
  const joinDate=document.getElementById('tJoinDate').value || todayISO();
  const salary=Number(document.getElementById('tSalary').value)||0;
  if(!name||!subject){ alert('Please enter teacher name and subject.'); return; }
  if(!password){ alert('Please set a login password for this teacher.'); return; }
  const finish=(photo)=>{ DB.teachers.push({id:uid(), name, subject, cls, password, gmail, photo:photo||null, drivePermissionId:null, joinDate, salary}); saveDB(); render(); };
  if(photoInput.files && photoInput.files[0]){
    const reader = new FileReader();
    reader.onload = e=>finish(e.target.result);
    reader.readAsDataURL(photoInput.files[0]);
  } else finish(null);
}
function delTeacher(id){ if(confirm('Remove this teacher?')){ DB.teachers = DB.teachers.filter(t=>t.id!==id); saveDB(); render(); } }
function editTeacherSalaryInfo(id){
  const t = DB.teachers.find(x=>x.id===id); if(!t) return;
  const jd = prompt(`Join Date for ${t.name} (YYYY-MM-DD) — used to track how many months of salary are due:`, t.joinDate || schoolYearStart());
  if(jd===null) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(jd)){ alert('Please enter the date as YYYY-MM-DD.'); return; }
  const sal = prompt(`Monthly Salary for ${t.name} (Rs.):`, t.salary||0);
  if(sal===null) return;
  t.joinDate = jd; t.salary = Number(sal)||0;
  saveDB(); render();
}
function resetTeacherPass(id){
  const t = DB.teachers.find(x=>x.id===id); if(!t) return;
  const np = prompt(`Set a new login password for ${t.name}:`, '');
  if(np===null) return;
  if(!np.trim()){ alert('Password cannot be empty.'); return; }
  t.password = np.trim(); saveDB(); alert('Password updated.');
}
/* ---------- Grant/Revoke a teacher's own Drive edit access, from inside the app ----------
   Uses the same Drive Permissions API as "Enable Parent Viewing" — Headmaster must be
   connected (Cloud Sync) since only their token can manage sharing on their own file. */
function driveGrantTeacherAccess(teacherId){
  if(!driveAccessToken || !DRIVE_FILE_ID){ alert('Connect Google Drive first (Cloud Sync tab, as Headmaster).'); return; }
  const teacher = DB.teachers.find(t=>t.id===teacherId); if(!teacher) return;
  let gmail = (teacher.gmail||'').trim();
  if(!gmail){ gmail = (prompt(`Enter ${teacher.name}'s Gmail address:`,'')||'').trim(); if(!gmail) return; teacher.gmail=gmail; }
  fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/permissions?sendNotificationEmail=true`,{
    method:'POST', headers:{Authorization:'Bearer '+driveAccessToken,'Content-Type':'application/json'},
    body: JSON.stringify({type:'user', role:'writer', emailAddress:gmail})
  }).then(r=>r.json()).then(res=>{
    if(res.id){
      teacher.drivePermissionId = res.id;
      saveDB(); render();
      alert(`${teacher.name} can now save changes to Google Drive.\n\nThey'll get an email from Google Drive — they should then open the School Link on their own device and connect Google Drive in Cloud Sync using ${gmail}.`);
    } else alert('Could not grant access: '+(res.error?.message||'unknown error'));
  }).catch(e=>alert('Could not grant access: '+e.message));
}
function driveRevokeTeacherAccess(teacherId){
  if(!driveAccessToken || !DRIVE_FILE_ID){ alert('Connect Google Drive first (Cloud Sync tab, as Headmaster).'); return; }
  const teacher = DB.teachers.find(t=>t.id===teacherId); if(!teacher) return;
  if(!teacher.drivePermissionId){ alert('This teacher does not have Drive edit access yet.'); return; }
  if(!confirm(`Remove ${teacher.name}'s ability to save changes to Google Drive? They will still be able to log in and use the app, but their changes will only stay on their own device.`)) return;
  fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/permissions/${teacher.drivePermissionId}`,{
    method:'DELETE', headers:{Authorization:'Bearer '+driveAccessToken}
  }).then(r=>{
    if(r.ok || r.status===204){ teacher.drivePermissionId=null; saveDB(); render(); }
    else r.json().then(res=>alert('Could not remove access: '+(res.error?.message||'unknown error'))).catch(()=>alert('Could not remove access.'));
  }).catch(e=>alert('Could not remove access: '+e.message));
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
        <input id="sAdmission" type="date" value="${editing?esc(editing.admissionDate||''):todayISO()}" title="Admission Date (used to track fee dues)" class="border rounded-lg px-3 py-2">
        <input id="sPassword" type="text" placeholder="${editing?'New Parent Password (leave blank to keep)':'Set Parent Login Password'}" class="border rounded-lg px-3 py-2">
      </div>
      <p class="text-xs text-gray-500 mt-2">Parents log in with this student's Roll No. + Mobile Number + this Password. Admission date is used to track how many months of fee are due.</p>
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
  const admissionDate=document.getElementById('sAdmission').value || todayISO();
  const password=document.getElementById('sPassword').value.trim();
  if(!name||!roll){ alert('Please enter at least student name and roll number.'); return; }
  if(EDITING_STUDENT_ID){
    const s = DB.students.find(x=>x.id===EDITING_STUDENT_ID);
    if(s) Object.assign(s, {name,father,cls,section,roll,mobile,admissionDate, password: password||s.password});
    EDITING_STUDENT_ID = null;
  } else {
    if(!password){ alert("Please set a parent login password for this student."); return; }
    DB.students.push({id:uid(), name, father, cls, section, roll, mobile, admissionDate, password});
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
      box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderMarksheetCard(stu);
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
    box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` +
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
    ${clsSel===classes[classes.length-1]?'<p class="text-sm text-amber-700 mb-2">🎓 This is the highest class — promoted students are moved to the Alumni list (still available in Certificates).</p>':''}
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
  ensureCertData();
  const classes = DB.config.classes;
  const idx = classes.indexOf(cls);
  const isLast = idx>=0 && idx===classes.length-1;
  const nextClass = idx>=0 && !isLast ? classes[idx+1] : cls;
  const checks = [...document.querySelectorAll('.promoCheck')];
  const chosen = checks.filter(c=>c.checked).map(c=>DB.students.find(st=>st.id===c.dataset.id)).filter(Boolean);
  if(isLast && chosen.length){
    const owing = chosen.filter(st=>feeSummary(st).totalDue>0);
    let msg = `${cls} is this school's highest class.\n\n${chosen.length} selected student(s) will be marked PASSED OUT and moved to the Alumni list (their records stay available for Pass / Leaving / Character certificates).`;
    if(owing.length) msg += `\n\n⚠️ ${owing.length} of them still have unpaid fees: ${owing.slice(0,5).map(st=>st.name).join(', ')}${owing.length>5?'…':''}`;
    if(!confirm(msg+'\n\nContinue?')) return;
  }
  const passedOut = [];
  checks.forEach(chk=>{
    const stu = DB.students.find(st=>st.id===chk.dataset.id);
    if(!stu) return;
    if(chk.checked){
      // Archive this year's marks (never delete automatically) then start a fresh sheet for the new class/year.
      if(DB.marks[stu.id]){
        if(!stu.marksArchive) stu.marksArchive=[];
        stu.marksArchive.push({year:DB.config.year, cls:stu.cls, marks:DB.marks[stu.id]});
      }
      if(isLast){
        DB.alumni.push(Object.assign({}, stu, {finalPct:computeOverallPct(stu), finalClass:stu.cls, passedOutOn:todayISO(), passedOutYear:DB.config.year}));
        passedOut.push(stu.id);
      } else {
        stu.cls = nextClass;
      }
      delete DB.marks[stu.id];
    } else {
      stu.remark = 'FAIL - Stayed Back';
    }
  });
  if(passedOut.length) DB.students = DB.students.filter(st=>!passedOut.includes(st.id));
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
  {key:'salary', label:'My Salary', icon:'🧾'},
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
  if(ACTIVE_TAB==='salary') content = renderTeacherSalary(teacher);
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
  const due = nextMonthDue(month, 10);
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
/* ============================================================
   CLASS RANKING — auto-decided from entered marks (reuses the same
   percentage calculation as the Marksheet, so positions always match).
   ============================================================ */
function studentOverallPercent(student){
  const subs = subjectsForClass(student.cls);
  const m = DB.marks[student.id] || {};
  const stage = currentExamStageIndex(student, m);
  const activeKeys = EXAM_KEYS.slice(0, stage+1);
  const examMax = EXAM_MAX_EACH * activeKeys.length;
  let obtained=0, max=0;
  subs.forEach(sub=>{
    const rec = m[sub] || {};
    obtained += activeKeys.reduce((a,k)=>a+(Number(rec[k])||0),0);
    max += examMax;
  });
  return max? (obtained/max*100) : 0;
}
function classTopThree(cls){
  return DB.students.filter(s=>s.cls===cls)
    .map(s=>({student:s, pct:studentOverallPercent(s)}))
    .filter(x=>x.pct>0)
    .sort((a,b)=>b.pct-a.pct)
    .slice(0,3);
}

/* ============================================================
   FEE DUES — running total of paid vs due per student, and how many
   months they're behind, auto-backfilled from their admission month.
   ============================================================ */
function monthsRange(fromDateStr, toMonthKey){
  let [y,m] = (fromDateStr||'').slice(0,7).split('-').map(Number);
  const [ty,tm] = toMonthKey.split('-').map(Number);
  if(!y||!m) return [toMonthKey];
  const out=[];
  while(y<ty || (y===ty && m<=tm)){
    out.push(`${y}-${String(m).padStart(2,'0')}`);
    m++; if(m>12){ m=1; y++; }
  }
  return out;
}
/* A month's fee/salary is due on a day within the FOLLOWING month, e.g.
   November's fee is due by 10th December — not within November itself. */
function nextMonthDue(monthKey, day){
  let [y,m] = monthKey.split('-').map(Number);
  m++; if(m>12){ m=1; y++; }
  return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
/* Students/teachers added before this tracking feature existed have no
   admission/join date on record — defaulting those to "today" would hide
   every month they actually owe, so fall back to the start of the current
   academic year instead (editable per-person any time from Students/Teachers). */
function schoolYearStart(){
  const y = parseInt((DB.config.year||'').slice(0,4),10);
  return y ? `${y}-04-01` : currentMonthKey()+'-01';
}
function feeSummary(stu){
  const months = monthsRange(stu.admissionDate || schoolYearStart(), currentMonthKey());
  let totalBilled=0, totalPaid=0; const unpaidMonths=[];
  months.forEach(mo=>{
    const rec = ensureFeeRecord(stu.id, mo, stu.cls);
    totalBilled += rec.amount;
    if(rec.status==='Paid') totalPaid += rec.amount; else unpaidMonths.push(mo);
  });
  return {totalBilled, totalPaid, totalDue: totalBilled-totalPaid, unpaidMonths, unpaidCount: unpaidMonths.length};
}

function hmDashboard(){
  const totalStudents = DB.students.length;
  const totalTeachers = DB.teachers.length;
  const totalClasses = DB.config.classes.length;
  const today = todayISO();
  const todaysAtt = DB.attendance[today] || {};
  const presentToday = Object.values(todaysAtt).filter(v=>v==='P').length;
  const attPct = totalStudents? Math.round(presentToday/totalStudents*100) : 0;
  const cm = currentMonthKey();
  let pendingCount=0, pendingAmount=0;
  DB.students.forEach(s=>{
    const rec = ensureFeeRecord(s.id, cm, s.cls);
    if(rec.status!=='Paid'){ pendingCount++; pendingAmount+=rec.amount; }
  });
  /* Overall (all-time, all students/teachers) running totals — the "perfect calculation" view */
  let feeTotalPaid=0, feeTotalDue=0, feeOverdueStudents=0;
  DB.students.forEach(s=>{ const sum=feeSummary(s); feeTotalPaid+=sum.totalPaid; feeTotalDue+=sum.totalDue; if(sum.unpaidCount>=2) feeOverdueStudents++; });
  let salTotalPaid=0, salTotalDue=0, salOverdueStaff=0;
  DB.teachers.forEach(t=>{ const sum=salarySummary(t); salTotalPaid+=sum.totalPaid; salTotalDue+=sum.totalDue; if(sum.unpaidCount>=2) salOverdueStaff++; });
  saveDB();
  const upcomingAnn = allAnnouncements('all').filter(a=>a.date>=today).slice(0,4);
  const cls = document.getElementById('dashClassSel')?.value || DB.config.classes[0];
  const top3 = classTopThree(cls);
  const medal = ['🥇','🥈','🥉'];
  const medalBg = ['#f0a500','#9ca3af','#b45309'];

  return `
  <div class="space-y-5">
    <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div class="doc-frame p-4 text-center"><div class="text-3xl font-bold text-[var(--navy)]">${totalStudents}</div><div class="text-xs text-gray-500 mt-1">🎒 Total Students</div></div>
      <div class="doc-frame p-4 text-center"><div class="text-3xl font-bold text-[var(--navy)]">${totalTeachers}</div><div class="text-xs text-gray-500 mt-1">👩‍🏫 Total Teachers</div></div>
      <div class="doc-frame p-4 text-center"><div class="text-3xl font-bold text-[var(--navy)]">${totalClasses}</div><div class="text-xs text-gray-500 mt-1">🏫 Total Classes</div></div>
      <div class="doc-frame p-4 text-center"><div class="text-3xl font-bold ${pendingCount?'text-red-600':'text-green-600'}">${pendingCount}</div><div class="text-xs text-gray-500 mt-1">💰 Pending This Month ${pendingCount?`(Rs. ${pendingAmount})`:''}</div></div>
    </div>
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-3">💼 Overall Finances</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="ms-summary-box p-3">
          <div class="font-bold text-[var(--navy)] mb-2">💰 Student Fees (all-time)</div>
          <div class="row"><span>Total Collected</span><span class="text-green-600 font-bold">Rs. ${feeTotalPaid}</span></div>
          <div class="row"><span>Total Due</span><span class="${feeTotalDue>0?'text-red-600':'text-green-600'} font-bold">Rs. ${feeTotalDue}</span></div>
          <div class="row" style="border-bottom:none;"><span>Students 2+ months overdue</span><span class="font-bold ${feeOverdueStudents?'text-red-600':'text-green-600'}">${feeOverdueStudents}</span></div>
        </div>
        <div class="ms-summary-box p-3">
          <div class="font-bold text-[var(--navy)] mb-2">🧾 Staff Salary (all-time)</div>
          <div class="row"><span>Total Paid</span><span class="text-green-600 font-bold">Rs. ${salTotalPaid}</span></div>
          <div class="row"><span>Total Due</span><span class="${salTotalDue>0?'text-red-600':'text-green-600'} font-bold">Rs. ${salTotalDue}</span></div>
          <div class="row" style="border-bottom:none;"><span>Staff 2+ months overdue</span><span class="font-bold ${salOverdueStaff?'text-red-600':'text-green-600'}">${salOverdueStaff}</span></div>
        </div>
      </div>
    `)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-3">📊 Today's Attendance</h2>
      <div class="flex items-center gap-4 flex-wrap">
        <div class="text-4xl font-bold text-[var(--navy)]">${attPct}%</div>
        <div class="text-sm text-gray-500">${presentToday} / ${totalStudents} students marked present today across all classes.</div>
      </div>
    `)}
    ${card(`
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 class="text-xl font-bold text-[var(--navy)]">🏆 Class Toppers</h2>
        <select id="dashClassSel" onchange="render()" class="border rounded-lg px-3 py-2 text-sm">${DB.config.classes.map(c=>`<option ${c===cls?'selected':''}>${esc(c)}</option>`).join('')}</select>
      </div>
      ${top3.length? `<div class="grid sm:grid-cols-3 gap-3">${top3.map((t,i)=>`
        <div class="ann-card">
          <div class="ann-date-box" style="background:${medalBg[i]};"><div class="d">${medal[i]}</div><div class="m">${i+1}${i===0?'ST':i===1?'ND':'RD'}</div></div>
          <div class="flex-1 min-w-0"><div class="font-bold text-[var(--navy)]">${esc(t.student.name)}</div><div class="text-xs text-gray-500">Roll ${esc(t.student.roll)}</div><div class="text-sm font-bold mt-1">${t.pct.toFixed(2)}%</div></div>
        </div>`).join('')}</div>` : `<p class="text-gray-400 text-sm">No marks entered yet for Class ${esc(cls)}.</p>`}
    `)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-3">📣 Upcoming</h2>
      ${upcomingAnn.length? `<div class="space-y-2">${upcomingAnn.map(a=>`<div class="ann-card">${annDateBox(a.date)}<div class="flex-1 min-w-0"><div class="font-bold text-[var(--navy)]">${esc(a.title)}</div><div class="text-xs text-gray-500">${esc(a.short)}</div></div></div>`).join('')}</div>` : '<p class="text-gray-400 text-sm">Nothing scheduled.</p>'}
    `)}
  </div>`;
}


/* ============================================================
   SALARY — same pattern as Fees, but for Teachers (keyed by joinDate
   instead of admissionDate). Due date is also 1st–10th of the
   FOLLOWING month, matching how the fee vouchers work.
   ============================================================ */
function ensureSalaryRecord(teacherId, month, defaultAmount){
  if(!DB.salaries[teacherId]) DB.salaries[teacherId]={};
  if(!DB.salaries[teacherId][month]) DB.salaries[teacherId][month] = {amount: Number(defaultAmount)||0, status:'Unpaid', paidOn:null};
  return DB.salaries[teacherId][month];
}
function setSalaryAmount(teacherId,month,val){ const rec=ensureSalaryRecord(teacherId,month,0); rec.amount=Number(val)||0; saveDB(); render(); }
function setSalaryStatus(teacherId,month,status){ const t=DB.teachers.find(x=>x.id===teacherId); const rec=ensureSalaryRecord(teacherId,month,t?t.salary:0); rec.status=status; rec.paidOn = status==='Paid'?todayISO():null; saveDB(); render(); }
function salarySummary(t){
  const months = monthsRange(t.joinDate || schoolYearStart(), currentMonthKey());
  let totalBilled=0, totalPaid=0; const unpaidMonths=[];
  months.forEach(mo=>{
    const rec = ensureSalaryRecord(t.id, mo, t.salary);
    totalBilled += rec.amount;
    if(rec.status==='Paid') totalPaid += rec.amount; else unpaidMonths.push(mo);
  });
  return {totalBilled, totalPaid, totalDue: totalBilled-totalPaid, unpaidMonths, unpaidCount: unpaidMonths.length};
}
function renderSalarySlipCard(t, month){
  const cfg = DB.config;
  const rec = ensureSalaryRecord(t.id, month, t.salary);
  const due = nextMonthDue(month, 10);
  return `
  <div class="doc-frame max-w-md mx-auto" id="salarySlipCard">
    <div class="doc-topbar"></div>
    <div class="doc-arc">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge">★ SALARY SLIP ★</div>
    </div>
    <div class="p-5 space-y-4">
      <div class="ms-info-box grid grid-cols-2 gap-2">
        <div><b>Staff:</b> ${esc(t.name)}</div>
        <div><b>Role:</b> ${esc(t.subject)} Teacher</div>
        <div><b>Class:</b> ${esc(t.cls)}</div>
        <div><b>Month:</b> ${monthLabel(month)}</div>
        <div><b>Due Date:</b> ${due}</div>
      </div>
      <div class="ms-summary-box">
        <div class="row"><span>Monthly Salary</span><span>Rs. ${rec.amount}</span></div>
        <div class="row"><span>Status</span><span class="${rec.status==='Paid'?'text-green-600':'text-red-600'}">${rec.status}${rec.paidOn?` (${rec.paidOn})`:''}</span></div>
        <div class="row" style="border-bottom:none;font-size:1rem;"><span>Total Payable</span><span>Rs. ${rec.amount}</span></div>
      </div>
      <p class="text-xs text-gray-500">This slip is computer-generated and valid without signature.</p>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}
function hmSalary(){
  const tid = document.getElementById('salTeacherSel')?.value || (DB.teachers[0]&&DB.teachers[0].id);
  const month = document.getElementById('salMonthSel')?.value || currentMonthKey();
  const t = DB.teachers.find(x=>x.id===tid);
  let collectionBlock = '<p class="text-gray-400 text-sm">No teachers yet.</p>';
  if(t){
    const rec = ensureSalaryRecord(t.id, month, t.salary);
    collectionBlock = `
      <div class="flex flex-wrap gap-3 mb-4 items-center">
        <select id="salTeacherSel" onchange="render()" class="border rounded-lg px-3 py-2">${DB.teachers.map(x=>`<option value="${x.id}" ${x.id===tid?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
        <input id="salMonthSel" type="month" value="${month}" onchange="render()" class="border rounded-lg px-3 py-2">
        <input type="number" value="${rec.amount}" onchange="setSalaryAmount('${t.id}','${month}',this.value)" class="border rounded-lg px-2 py-2 w-28" title="Amount for this month">
        <button onclick="setSalaryStatus('${t.id}','${month}','Paid')" class="px-3 py-2 rounded-lg text-xs font-bold ${rec.status==='Paid'?'bg-green-600 text-white':'bg-gray-100'}">Paid</button>
        <button onclick="setSalaryStatus('${t.id}','${month}','Unpaid')" class="px-3 py-2 rounded-lg text-xs font-bold ${rec.status==='Unpaid'?'bg-red-600 text-white':'bg-gray-100'}">Unpaid</button>
        <button onclick="viewSalarySlip('${t.id}','${month}')" class="text-[var(--navy)] text-sm font-bold">🧾 Slip</button>
      </div>`;
  }
  const duesRows = DB.teachers.map(x=>{
    const sum = salarySummary(x);
    const badge = sum.unpaidCount>=3 ? `<span class="ann-badge bg-red-100 text-red-700">⚠️ ${sum.unpaidCount} months overdue</span>`
                : sum.unpaidCount>=1 ? `<span class="ann-badge bg-amber-100 text-amber-700">${sum.unpaidCount} month${sum.unpaidCount>1?'s':''} due</span>`
                : `<span class="ann-badge bg-green-100 text-green-700">✅ Up to date</span>`;
    return `<tr class="border-b">
      <td class="py-2">${esc(x.name)}</td><td>${esc(x.subject)}</td>
      <td class="text-green-700 font-bold">Rs. ${sum.totalPaid}</td>
      <td class="${sum.totalDue>0?'text-red-600':'text-gray-400'} font-bold">Rs. ${sum.totalDue}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No teachers yet.</td></tr>`;
  saveDB();
  return `
  <div class="space-y-5">
    ${card(`<h2 class="text-xl font-bold text-[var(--navy)] mb-4">🧾 Salary Collection</h2>${collectionBlock}`)}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📋 Salary Dues Summary</h2>
      <p class="text-xs text-gray-500 mb-3">Running total since each teacher's join date — flags staff who are 2+ months behind.</p>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">Name</th><th>Subject</th><th>Total Paid</th><th>Total Due</th><th>Status</th></tr></thead>
        <tbody>${duesRows}</tbody>
      </table>
      </div>
    `)}
    <div id="salarySlipPreview"></div>
  </div>`;
}
function viewSalarySlip(teacherId, month){
  const box = document.getElementById('salarySlipPreview'); if(!box) return;
  const t = DB.teachers.find(x=>x.id===teacherId); if(!t) return;
  box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('salarySlipCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('salarySlipCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderSalarySlipCard(t, month);
}
function renderTeacherSalary(t){
  const sum = salarySummary(t);
  const cm = currentMonthKey();
  if(!DB.salaries[t.id] || !DB.salaries[t.id][cm]){ ensureSalaryRecord(t.id, cm, t.salary); saveDB(); }
  const months = Object.keys(DB.salaries[t.id]||{}).sort().reverse();
  const rows = months.map(m=>{
    const rec = DB.salaries[t.id][m];
    return `<tr class="border-b"><td class="py-2">${monthLabel(m)}</td><td>Rs. ${rec.amount}</td>
      <td class="font-bold ${rec.status==='Paid'?'text-green-600':'text-red-600'}">${rec.status}</td>
      <td><button onclick="viewSalarySlip('${t.id}','${m}')" class="text-[var(--navy)] text-sm font-bold">🧾 Slip</button></td></tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No salary records yet.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-3">💰 My Salary</h2>
    <div class="grid sm:grid-cols-3 gap-3 mb-4">
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Total Paid</div><div class="text-xl font-bold text-green-600">Rs. ${sum.totalPaid}</div></div>
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Total Due</div><div class="text-xl font-bold ${sum.totalDue>0?'text-red-600':'text-green-600'}">Rs. ${sum.totalDue}</div></div>
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Status</div><div class="text-sm font-bold mt-1">${sum.unpaidCount>=3?`⚠️ ${sum.unpaidCount} months overdue`:sum.unpaidCount>=1?`${sum.unpaidCount} month${sum.unpaidCount>1?'s':''} due`:'✅ Up to date'}</div></div>
    </div>
    <h3 class="font-bold text-[var(--navy)] mb-2">Month-by-Month</h3>
    <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">Month</th><th>Amount</th><th>Status</th><th>Slip</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  `)}<div id="salarySlipPreview" class="mt-5"></div>`;
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
  const duesRows = students.map(s=>{
    const sum = feeSummary(s);
    const badge = sum.unpaidCount>=3 ? `<span class="ann-badge bg-red-100 text-red-700">⚠️ ${sum.unpaidCount} months overdue</span>`
                : sum.unpaidCount>=1 ? `<span class="ann-badge bg-amber-100 text-amber-700">${sum.unpaidCount} month${sum.unpaidCount>1?'s':''} due</span>`
                : `<span class="ann-badge bg-green-100 text-green-700">✅ Up to date</span>`;
    return `<tr class="border-b">
      <td class="py-2">${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td class="text-green-700 font-bold">Rs. ${sum.totalPaid}</td>
      <td class="${sum.totalDue>0?'text-red-600':'text-gray-400'} font-bold">Rs. ${sum.totalDue}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No students in this class.</td></tr>`;
  saveDB();
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
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📋 Fee Dues Summary — Class ${esc(cls)}</h2>
      <p class="text-xs text-gray-500 mb-3">Running total since each student's admission date — flags students who are 2+ months behind.</p>
      <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">Roll</th><th>Name</th><th>Total Paid</th><th>Total Due</th><th>Status</th></tr></thead>
        <tbody>${duesRows}</tbody>
      </table>
      </div>
    `)}
    <div id="feeVoucherPreview"></div>
  </div>`;
}
function viewFeeVoucher(studentId, month){
  const box = document.getElementById('feeVoucherPreview'); if(!box) return;
  const stu = DB.students.find(s=>s.id===studentId); if(!stu) return;
  box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('feeVoucherCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('feeVoucherCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderFeeVoucherCard(stu, month);
}
function renderParentFees(stu){
  const cm = currentMonthKey();
  if(!DB.fees[stu.id] || !DB.fees[stu.id][cm]){ ensureFeeRecord(stu.id, cm, stu.cls); saveDB(); }
  const sum = feeSummary(stu);
  const months = Object.keys(DB.fees[stu.id]||{}).sort().reverse();
  const rows = months.map(m=>{
    const rec = DB.fees[stu.id][m];
    return `<tr class="border-b"><td class="py-2">${monthLabel(m)}</td><td>Rs. ${rec.amount}</td>
      <td class="font-bold ${rec.status==='Paid'?'text-green-600':'text-red-600'}">${rec.status}</td>
      <td><button onclick="viewFeeVoucher('${stu.id}','${m}')" class="text-[var(--navy)] text-sm font-bold">🧾 Voucher</button></td></tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No fee records yet.</td></tr>`;
  return `${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-3">💰 Fee Summary</h2>
    <div class="grid sm:grid-cols-3 gap-3 mb-4">
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Total Paid</div><div class="text-xl font-bold text-green-600">Rs. ${sum.totalPaid}</div></div>
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Total Due</div><div class="text-xl font-bold ${sum.totalDue>0?'text-red-600':'text-green-600'}">Rs. ${sum.totalDue}</div></div>
      <div class="ms-summary-box p-3 text-center"><div class="text-xs text-gray-500">Status</div><div class="text-sm font-bold mt-1">${sum.unpaidCount>=3?`⚠️ ${sum.unpaidCount} months overdue`:sum.unpaidCount>=1?`${sum.unpaidCount} month${sum.unpaidCount>1?'s':''} due`:'✅ Up to date'}</div></div>
    </div>
    <h3 class="font-bold text-[var(--navy)] mb-2">Month-by-Month</h3>
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
  const isStu = role==='Student';
  const photo = person.photo ? `<img src="${person.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:20pt;">👤</span>`;
  const logo = cfg.logo ? `<img src="${cfg.logo}" style="width:100%;height:100%;object-fit:cover;">` : '🎓';
  const idNo = isStu ? `STU-${esc(person.roll)}-${esc(person.cls)}` : `STF-${esc(String(person.id).slice(-6).toUpperCase())}`;
  const line2 = isStu ? `Class ${esc(person.cls)}` : `${esc(person.subject)} · Class ${esc(person.cls)}`;
  const rows = isStu
    ? [['ID No',idNo],['Father',person.father||'-'],['Roll No',person.roll],['Session',cfg.year]]
    : [['ID No',idNo],['Subject',person.subject],['Class',person.cls],['Session',cfg.year]];
  const rowsHtml = rows.map(r=>`<div style="display:flex;font-size:6.3pt;line-height:1.6;"><b style="width:12.5mm;flex:none;color:#0b1a4a;">${r[0]}</b><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r[1])}</span></div>`).join('');
  const card = `
  <div id="idCard" data-fname="${esc(person.name)}" style="width:85.6mm;height:54mm;box-sizing:border-box;background:#fbfbf9;border-radius:3mm;overflow:hidden;display:flex;font-family:'Trebuchet MS','Segoe UI',sans-serif;border:0.3mm solid #dcdfe8;color:#1a1a2e;">
    <div style="width:27mm;flex:none;background:#0b1a4a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.8mm;border-right:1mm solid #f0a500;">
      <div style="width:19mm;height:19mm;border-radius:50%;border:0.8mm solid #f0a500;background:#eef1f8;display:flex;align-items:center;justify-content:center;overflow:hidden;">${photo}</div>
      <div style="background:#f0a500;color:#081235;font-weight:700;font-size:5.5pt;letter-spacing:0.4mm;padding:0.5mm 2.4mm;border-radius:99px;">${role.toUpperCase()}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
      <div style="background:#0b1a4a;color:#fff;padding:1.6mm 2.4mm;display:flex;align-items:center;gap:1.6mm;border-bottom:0.7mm solid #f0a500;">
        <div style="width:7mm;height:7mm;flex:none;border:0.5mm solid #f0a500;border-radius:1.4mm 1.4mm 40% 40%;display:flex;align-items:center;justify-content:center;color:#f7c948;font-size:9pt;overflow:hidden;">${logo}</div>
        <div style="min-width:0;">
          <div style="font-family:Georgia,serif;font-weight:700;font-size:7pt;line-height:1.15;">${esc(cfg.schoolName)}</div>
          <div style="color:#f7c948;font-size:4.6pt;letter-spacing:0.35mm;margin-top:0.4mm;">★ IDENTITY CARD ★</div>
        </div>
      </div>
      <div style="padding:1.8mm 2.6mm 0;flex:1;min-width:0;">
        <div style="font-family:Georgia,serif;font-weight:700;color:#0b1a4a;font-size:9.5pt;line-height:1.15;word-break:break-word;">${esc(person.name)}</div>
        <div style="color:#666;font-size:6pt;margin:0.4mm 0 1.4mm;">${line2}</div>
        ${rowsHtml}
      </div>
      <div style="background:#0b1a4a;padding:0.9mm 2.6mm;display:flex;justify-content:space-between;font-family:'Brush Script MT',cursive;font-size:7pt;">
        <span style="color:#fff;">Learn Today</span><span style="color:#f7c948;">Lead Tomorrow</span>
      </div>
    </div>
  </div>`;
  /* on-screen preview is shown 1.5x bigger; print / JPG always use the real 85.6 x 54 mm card */
  return `<div style="overflow-x:auto;"><div style="width:128.4mm;height:81mm;margin:0 auto;"><div style="transform:scale(1.5);transform-origin:top left;width:85.6mm;">${card}</div></div></div>`;
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
  box.innerHTML = `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderIdCard(person, type==='student'?'Student':'Teacher');
}
function tIdCard(teacher){
  return `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderIdCard(teacher,'Teacher');
}
function pIdCard(stu){
  return `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('idCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderIdCard(stu,'Student');
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
  {key:'certificates', label:'Certificates', icon:'📜'},
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
      <button onclick="printEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('marksheetCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button>
    </div>
    ${renderMarksheetCard(stu)}`;
  if(ACTIVE_TAB==='attendance') content = renderAttendanceSummary(stu);
  if(ACTIVE_TAB==='fees') content = renderParentFees(stu);
  if(ACTIVE_TAB==='homework') content = card(`<h2 class="text-xl font-bold text-[var(--navy)] mb-4">📚 Homework — Class ${esc(stu.cls)}</h2><div class="space-y-3">${renderHomeworkList(stu.cls)}</div>`);
  if(ACTIVE_TAB==='announcements') content = renderAnnouncements('parent');
  if(ACTIVE_TAB==='timetable') content = DB.config.timetable ? renderTimetableCard({}) : card('<p class="text-gray-500 text-center py-10">Timetable not generated yet.</p>');
  if(ACTIVE_TAB==='idcard') content = pIdCard(stu);
  if(ACTIVE_TAB==='certificates') content = renderParentCertificates(stu);
  if(ACTIVE_TAB==='staff') content = renderStaffDirectory();
  document.getElementById('app').innerHTML = shell(`Parent — ${esc(stu.name)}`, P_TABS, ACTIVE_TAB, content);
}

/* ============================================================
   ROOT RENDER
   ============================================================ */
/* ============================================================
   CERTIFICATES — Pass, School Leaving, Character, Participation/Achievement.
   Every issued certificate gets a serial number and is stored with a snapshot of the
   student's details, so it can be re-printed later exactly as issued (even after the
   student is promoted or passes out). Headmaster issues; Parents can view/print their own.
   ============================================================ */
const CERT_TYPES = {
  pass:         {label:'Pass Certificate',                         title:'CERTIFICATE OF PASS',          icon:'🏅'},
  leaving:      {label:'School Leaving Certificate',               title:'SCHOOL LEAVING CERTIFICATE',   icon:'📜'},
  character:    {label:'Character Certificate',                    title:'CHARACTER CERTIFICATE',        icon:'🛡️'},
  participation:{label:'Participation / Achievement Certificate',  title:'CERTIFICATE OF PARTICIPATION', icon:'🏆'}
};
const EVENT_CATEGORIES = ['Sports / Game','Quiz Competition','Debate','Speech','Art / Drawing','Science Fair','Naat / Qirat','Other'];
const EVENT_POSITIONS  = ['Participation','1st Position','2nd Position','3rd Position','Winner','Runner-up'];
const LEAVING_REASONS  = ['Completed studies','Parents’ request','Transfer to another school','Relocation / shifting','Other'];
const CONDUCT_LEVELS   = ['Excellent','Very Good','Good','Satisfactory'];
let LAST_CERT_ID = null;

function ensureCertData(){ if(!DB.certificates) DB.certificates=[]; if(!DB.alumni) DB.alumni=[]; }
function certDate(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return isNaN(d)?esc(iso):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function certPeople(grp){ ensureCertData(); return grp==='__alumni' ? DB.alumni : DB.students.filter(st=>st.cls===grp); }
function certFindPerson(id){ ensureCertData(); return DB.students.find(st=>st.id===id) || DB.alumni.find(st=>st.id===id) || null; }
function certPctFor(p){ return p.finalPct!=null ? Number(p.finalPct) : studentOverallPercent(p); }
/* Outstanding fees. For passed-out students only already-recorded months are counted
   (feeSummary() would otherwise keep inventing new unpaid months after they left). */
function certDues(p){
  if(p.passedOutOn){
    return Object.values(DB.fees[p.id]||{}).reduce((t,r)=>t+(r.status!=='Paid'?(Number(r.amount)||0):0),0);
  }
  return feeSummary(p).totalDue;
}

function renderCertificateCard(rec){
  const cfg=DB.config, st=rec.student, d=rec.data||{}, T=CERT_TYPES[rec.type]||CERT_TYPES.pass;
  const who = `<b>${esc(st.name)}</b>, S/D of <b>${esc(st.father||'—')}</b>, Roll No. <b>${esc(st.roll)}</b>`;
  let body='';
  if(rec.type==='pass'){
    body = `This is to certify that ${who}, a student of <b>Class ${esc(st.cls)}</b> of this school, has <b>PASSED</b> the <b>${esc(d.exam||'Annual Examination')}</b> held in session <b>${esc(d.session||cfg.year)}</b>${d.pct!=null?`, securing <b>${Number(d.pct).toFixed(2)}%</b> marks (Grade <b>${esc(d.grade||'')}</b>)`:''}. We wish him/her every success in the future.`;
  } else if(rec.type==='leaving'){
    body = `This is to certify that ${who}, was a bonafide student of this school${st.admissionDate?` from <b>${certDate(st.admissionDate)}</b>`:''} to <b>${certDate(d.leaveDate)}</b>. The last class studied was <b>Class ${esc(d.lastClass||st.cls)}</b>. The reason for leaving is stated as <b>${esc(d.reason)}</b>, and his/her conduct during the stay was <b>${esc(d.conduct)}</b>. School dues: <b>${d.duesCleared?'cleared in full':`Rs. ${esc(d.duesAmount)} outstanding at the time of issue`}</b>. This certificate is issued on request.`;
  } else if(rec.type==='character'){
    body = `This is to certify that ${who}, is a student of <b>Class ${esc(st.cls)}</b> of this school${st.admissionDate?` since <b>${certDate(st.admissionDate)}</b>`:''}. During this period his/her character and conduct have been <b>${esc(d.conduct)}</b>, and to the best of our knowledge he/she bears a good moral character.${d.purpose?` This certificate is issued ${esc(d.purpose)}.`:''}`;
  } else {
    const pos = d.position||'Participation';
    const phrase = pos==='Participation' ? 'in recognition of active participation in'
                 : pos==='Winner' ? 'in recognition of winning'
                 : pos==='Runner-up' ? 'in recognition of being the Runner-up in'
                 : `in recognition of securing the <b>${esc(pos)}</b> in`;
    body = `This certificate is proudly presented to <b>${esc(st.name)}</b>, S/D of <b>${esc(st.father||'—')}</b>, of <b>Class ${esc(st.cls)}</b>, ${phrase} the <b>${esc(d.event)}</b> (${esc(d.category)}) held on <b>${certDate(d.eventDate)}</b>${d.organizer?`, organized by <b>${esc(d.organizer)}</b>`:''}. We appreciate the effort and wish continued success.`;
  }
  const hmName = cfg.headmasterAccount && cfg.headmasterAccount.name || '';
  return `
  <div class="doc-frame max-w-2xl mx-auto" id="certificateCard" data-fname="${esc(st.name)}" style="min-height:960px;display:flex;flex-direction:column;">
    <div class="doc-topbar"></div>
    <div class="doc-arc">
      <div class="doc-shield">${cfg.logo?`<img src="${cfg.logo}" class="w-full h-full object-cover rounded-lg">`:'🎓'}</div>
      <div class="doc-title">${esc(cfg.schoolName.split(' ').slice(0,2).join(' '))}</div>
      <div class="doc-subtitle">${esc(cfg.schoolName.split(' ').slice(2).join(' '))}</div>
      <div class="doc-badge">★ CERTIFICATE ★</div>
    </div>
    <div style="flex:1;margin:18px 22px;border:4px double #f0a500;border-radius:16px;padding:26px 30px;display:flex;flex-direction:column;justify-content:space-between;background:#fffdf7;">
      <div style="text-align:center;">
        <div style="font-size:2.2rem;">${T.icon}</div>
        <div style="font-family:Georgia,serif;color:#0b1a4a;font-size:1.5rem;font-weight:700;letter-spacing:2px;margin-top:4px;">${T.title}</div>
        <div style="width:90px;height:3px;background:#f0a500;margin:10px auto 18px;border-radius:2px;"></div>
      </div>
      <p style="font-family:Georgia,serif;font-size:1.05rem;line-height:1.9;text-align:justify;color:#1a1a2e;margin:0;">${body}</p>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px;text-align:center;font-family:'Trebuchet MS',sans-serif;font-size:.8rem;">
          <div style="width:30%;"><div style="border-top:1.5px solid #0b1a4a;padding-top:4px;font-weight:700;">Class Teacher</div></div>
          <div style="width:70px;height:70px;border:3px double #f0a500;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#0b1a4a;font-size:.6rem;font-weight:700;line-height:1.2;">SCHOOL<br>SEAL</div>
          <div style="width:30%;"><div style="border-top:1.5px solid #0b1a4a;padding-top:4px;font-weight:700;">Principal / Headmaster</div>${hmName?`<div style="color:#666;font-size:.7rem;">${esc(hmName)}</div>`:''}</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:16px;font-family:'Trebuchet MS',sans-serif;font-size:.75rem;color:#555;"><span>Certificate No: <b>${esc(rec.serial)}</b></span><span>Date of Issue: <b>${certDate(rec.issuedOn)}</b></span></div>
      </div>
    </div>
    <div class="doc-footer">
      <span class="lead">Learn Today</span>
      <span class="lead2">Lead Tomorrow</span>
    </div>
  </div>`;
}
function certPreviewHtml(rec){
  return `<div class="flex justify-end mb-2 no-print"><button onclick="printEl('certificateCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold">🖨️ Print</button> <button onclick="jpgEl('certificateCard')" class="gold-btn rounded-lg px-4 py-1.5 text-sm font-bold ml-2" style="background:var(--navy);color:#fff;">🖼️ Save JPG</button></div>` + renderCertificateCard(rec);
}
function viewCertificate(id){ LAST_CERT_ID=id; render(); setTimeout(()=>{ const e=document.getElementById('certPreview'); if(e) e.scrollIntoView({behavior:'smooth',block:'start'}); },50); }
function deleteCertificate(id){
  ensureCertData();
  const rec = DB.certificates.find(c=>c.id===id); if(!rec) return;
  if(!confirm(`Delete certificate ${rec.serial} for ${rec.student.name}?\n\nThis removes it from the issued list (and from the parent's view).`)) return;
  DB.certificates = DB.certificates.filter(c=>c.id!==id);
  if(LAST_CERT_ID===id) LAST_CERT_ID=null;
  saveDB(); render();
}

function issueCertificate(){
  ensureCertData();
  const q = id=>document.getElementById(id);
  const type = q('certType').value;
  const p = certFindPerson(q('certStudent') && q('certStudent').value);
  if(!p){ alert('Please select a student first.'); return; }
  const d = {};
  if(type==='pass'){
    d.exam = q('cExam').value.trim() || 'Annual Examination';
    d.session = q('cSession').value.trim() || DB.config.year;
    const raw = q('cPct').value;
    d.pct = raw==='' ? null : Number(raw);
    if(d.pct!=null){
      if(!(d.pct>=0 && d.pct<=100)){ alert('Percentage must be between 0 and 100.'); return; }
      d.grade = grade(d.pct);
      const need = Number(DB.config.passPercent)||40;
      if(d.pct<need && !confirm(`${p.name} has ${d.pct}%, which is below the pass mark (${need}%).\n\nIssue a PASS certificate anyway?`)) return;
    }
  } else if(type==='leaving'){
    d.leaveDate = q('cLeaveDate').value || todayISO();
    d.reason = q('cReason').value; d.conduct = q('cConduct').value;
    d.lastClass = q('cLastClass').value.trim() || p.cls;
    const dues = certDues(p); d.duesCleared = dues<=0; d.duesAmount = dues;
    if(dues>0 && !confirm(`${p.name} still has Rs. ${dues} in unpaid fees.\n\nIssue the Leaving Certificate anyway? (It will state that dues were outstanding.)`)) return;
  } else if(type==='character'){
    d.conduct = q('cConduct').value; d.purpose = q('cPurpose').value.trim();
  } else {
    d.event = q('cEvent').value.trim();
    if(!d.event){ alert('Please enter the event name.'); return; }
    d.category = q('cCategory').value; d.position = q('cPosition').value;
    d.eventDate = q('cEventDate').value || todayISO(); d.organizer = q('cOrganizer').value.trim();
  }
  const yr = todayISO().slice(0,4);
  const nums = DB.certificates.filter(c=>c.serial && c.serial.startsWith('CERT-'+yr+'-')).map(c=>parseInt(c.serial.split('-')[2],10)||0);
  const n = (nums.length?Math.max(...nums):0)+1;
  const rec = {
    id:uid(), serial:`CERT-${yr}-${String(n).padStart(4,'0')}`, type, studentId:p.id, issuedOn:todayISO(),
    student:{name:p.name, father:p.father||'', cls:p.cls, roll:p.roll, section:p.section||'', admissionDate:p.admissionDate||''},
    data:d
  };
  DB.certificates.push(rec); LAST_CERT_ID = rec.id;
  saveDB(); render();
  setTimeout(()=>{ const e=document.getElementById('certPreview'); if(e) e.scrollIntoView({behavior:'smooth',block:'start'}); },50);
}

function hmCertificates(){
  ensureCertData();
  const q = id=>document.getElementById(id);
  const cfg = DB.config;
  const type = (q('certType') && q('certType').value) || 'pass';
  const groups = [...cfg.classes, ...(DB.alumni.length?['__alumni']:[])];
  let grp = q('certClassSel') && q('certClassSel').value; if(!groups.includes(grp)) grp = cfg.classes[0];
  const people = certPeople(grp);
  let pid = q('certStudent') && q('certStudent').value; if(!people.find(x=>x.id===pid)) pid = people[0] && people[0].id;
  const p = people.find(x=>x.id===pid);
  const opt = (arr,sel)=>arr.map(x=>`<option ${x===sel?'selected':''}>${esc(x)}</option>`).join('');
  const inp = 'class="w-full border rounded-lg px-3 py-2"';
  const lbl = t=>`<label class="block text-sm font-bold mb-1">${t}</label>`;
  let fields='';
  if(p){
    if(type==='pass'){
      const pct = certPctFor(p);
      fields = `
        <div>${lbl('Examination')}<input id="cExam" value="Annual Examination" maxlength="50" ${inp}></div>
        <div>${lbl('Session')}<input id="cSession" value="${esc(cfg.year)}" ${inp}></div>
        <div>${lbl('Percentage obtained <span class="font-normal text-gray-500">(auto from marks — edit if needed)</span>')}<input id="cPct" type="number" step="0.01" value="${pct>0?pct.toFixed(2):''}" ${inp}></div>`;
    } else if(type==='leaving'){
      const dues = certDues(p);
      fields = `
        <div>${lbl('Date of leaving')}<input id="cLeaveDate" type="date" value="${todayISO()}" ${inp}></div>
        <div>${lbl('Reason for leaving')}<select id="cReason" ${inp}>${opt(LEAVING_REASONS)}</select></div>
        <div>${lbl('Conduct')}<select id="cConduct" ${inp}>${opt(CONDUCT_LEVELS,'Good')}</select></div>
        <div>${lbl('Class last studied')}<input id="cLastClass" value="${esc(p.finalClass||p.cls)}" maxlength="20" ${inp}></div>
        <div class="md:col-span-2 text-sm ${dues>0?'text-red-600 font-bold':'text-green-700'}">${dues>0?`⚠️ Rs. ${dues} in school fees is still unpaid for this student — the certificate will say so.`:'✅ No outstanding school fees.'}</div>`;
    } else if(type==='character'){
      fields = `
        <div>${lbl('Conduct')}<select id="cConduct" ${inp}>${opt(CONDUCT_LEVELS,'Good')}</select></div>
        <div>${lbl('Purpose <span class="font-normal text-gray-500">(optional)</span>')}<input id="cPurpose" maxlength="80" placeholder="e.g. for admission in another school" ${inp}></div>`;
    } else {
      fields = `
        <div>${lbl('Event name')}<input id="cEvent" maxlength="80" placeholder="e.g. Inter-School Quiz Competition 2026" ${inp}></div>
        <div>${lbl('Category')}<select id="cCategory" ${inp}>${opt(EVENT_CATEGORIES)}</select></div>
        <div>${lbl('Position / Award')}<select id="cPosition" ${inp}>${opt(EVENT_POSITIONS)}</select></div>
        <div>${lbl('Event date')}<input id="cEventDate" type="date" value="${todayISO()}" ${inp}></div>
        <div class="md:col-span-2">${lbl('Organized by <span class="font-normal text-gray-500">(optional)</span>')}<input id="cOrganizer" maxlength="60" placeholder="${esc(cfg.schoolName)}" ${inp}></div>`;
    }
  }
  const issued = [...DB.certificates].reverse();
  const logRows = issued.map(c=>`<tr class="border-b">
      <td class="py-2 font-mono text-xs">${esc(c.serial)}</td>
      <td>${esc((CERT_TYPES[c.type]||{}).label||c.type)}</td>
      <td>${esc(c.student.name)} <span class="text-xs text-gray-500">(${esc(c.student.cls)})</span></td>
      <td class="text-xs">${certDate(c.issuedOn)}</td>
      <td class="whitespace-nowrap"><button onclick="viewCertificate('${c.id}')" class="text-[var(--navy)] text-sm font-bold mr-2">👁️ View / Print</button><button onclick="deleteCertificate('${c.id}')" class="text-red-600 text-sm font-bold">🗑️</button></td>
    </tr>`).join('') || `<tr><td colspan="5" class="text-center text-gray-400 py-4">No certificates issued yet.</td></tr>`;
  const last = LAST_CERT_ID && DB.certificates.find(c=>c.id===LAST_CERT_ID);
  return `
  <div class="space-y-5">
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-4">📜 Issue a Certificate</h2>
      <div class="grid md:grid-cols-3 gap-3 mb-4">
        <div>${lbl('Certificate type')}<select id="certType" onchange="render()" ${inp}>${Object.entries(CERT_TYPES).map(([k,v])=>`<option value="${k}" ${k===type?'selected':''}>${v.icon} ${v.label}</option>`).join('')}</select></div>
        <div>${lbl('Class')}<select id="certClassSel" onchange="render()" ${inp}>${groups.map(g=>`<option value="${esc(g)}" ${g===grp?'selected':''}>${g==='__alumni'?'🎓 Passed-out students (Alumni)':esc(g)}</option>`).join('')}</select></div>
        <div>${lbl('Student')}<select id="certStudent" onchange="render()" ${inp}>${people.map(x=>`<option value="${x.id}" ${x.id===pid?'selected':''}>${esc(x.name)} — Roll ${esc(x.roll)}</option>`).join('')||'<option value="">No students</option>'}</select></div>
      </div>
      ${p?`<p class="text-xs text-gray-500 mb-3">S/D of <b>${esc(p.father||'—')}</b> · Roll ${esc(p.roll)} · Class ${esc(p.cls)}${p.admissionDate?` · Admitted ${certDate(p.admissionDate)}`:''}</p>`:''}
      <div class="grid md:grid-cols-2 gap-3">${fields}</div>
      ${p?`<button onclick="issueCertificate()" class="gold-btn rounded-lg px-5 py-2 font-bold mt-4">📜 Generate Certificate</button>`:'<p class="text-sm text-gray-400">Add students first to issue certificates.</p>'}
    `)}
    ${last?`<div id="certPreview">${certPreviewHtml(last)}</div>`:''}
    ${card(`
      <h2 class="text-xl font-bold text-[var(--navy)] mb-3">🗂️ Issued Certificates</h2>
      <p class="text-xs text-gray-500 mb-3">Every certificate has its own serial number and can be re-printed exactly as issued.</p>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="text-left border-b"><th class="py-2">No.</th><th>Type</th><th>Student</th><th>Issued</th><th>Action</th></tr></thead>
        <tbody>${logRows}</tbody>
      </table></div>
    `)}
  </div>`;
}
function renderParentCertificates(stu){
  ensureCertData();
  const mine = DB.certificates.filter(c=>c.studentId===stu.id).reverse();
  const last = LAST_CERT_ID && mine.find(c=>c.id===LAST_CERT_ID);
  const rows = mine.map(c=>`<tr class="border-b"><td class="py-2 font-mono text-xs">${esc(c.serial)}</td><td>${esc((CERT_TYPES[c.type]||{}).label||c.type)}</td><td class="text-xs">${certDate(c.issuedOn)}</td><td><button onclick="viewCertificate('${c.id}')" class="text-[var(--navy)] text-sm font-bold">👁️ View / Print</button></td></tr>`).join('')
    || `<tr><td colspan="4" class="text-center text-gray-400 py-4">No certificates have been issued yet.</td></tr>`;
  return `<div class="space-y-5">${card(`
    <h2 class="text-xl font-bold text-[var(--navy)] mb-3">📜 Certificates — ${esc(stu.name)}</h2>
    <div class="overflow-x-auto"><table class="w-full text-sm">
      <thead><tr class="text-left border-b"><th class="py-2">No.</th><th>Type</th><th>Issued</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`)}
    ${last?`<div id="certPreview">${certPreviewHtml(last)}</div>`:''}
  </div>`;
}

function render(){
  if(!SESSION){ renderLogin(); return; }
  if(registryConfigured() && DRIVE_FILE_ID && APPROVAL_STATE.status!=='approved'){
    GATE_SHOWN = true;
    document.getElementById('app').innerHTML = renderApprovalGate();
    return;
  }
  if(GATE_SHOWN){ GATE_SHOWN=false; WELCOME_PENDING=true; }   // was waiting, now approved
  if(WELCOME_PENDING){ document.getElementById('app').innerHTML = renderApprovalWelcome(); return; }
  if(SESSION.role==='headmaster') renderHeadmaster();
  else if(SESSION.role==='teacher') renderTeacher();
  else if(SESSION.role==='parent') renderParent();
  else { logout(); }
}
Promise.all([driveParentPull(true), refreshApprovalStatus()]).then(render); // grab the latest shared data + approval status (if Cloud Sync is set up) before first paint
/**
 * BetterSkin — Browser Skin Manager
 * Pure vanilla JS — no build tools needed.
 */

/* ================================================================
   EMBEDDED STEVE SKIN — real 64×64 Minecraft Steve skin as PNG
   ================================================================ */
let STEVE_DATA_URL = null;

function buildSteveSkin() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  const fill = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

  // === HEAD ===
  fill(8,0,8,8,'#6b4226');
  fill(16,0,8,8,'#6b4226');
  fill(0,8,8,8,'#6b4226'); fill(1,8,6,2,'#6b4226'); fill(2,10,4,1,'#6b4226');
  fill(8,8,8,8,'#c8a078');
  fill(9,11,2,1,'#ffffff'); fill(13,11,2,1,'#ffffff');
  fill(10,11,1,1,'#3f2819'); fill(14,11,1,1,'#3f2819');
  fill(11,13,2,1,'#6b4226');
  fill(8,8,8,1,'#6b4226');
  fill(16,8,8,8,'#6b4226'); fill(17,8,6,2,'#6b4226');
  fill(24,8,8,8,'#6b4226');
  fill(8,0,8,8,'#6b4226');

  // === BODY ===
  fill(20,16,8,4,'#3c8ec4');
  fill(20,20,8,12,'#3c8ec4');
  fill(20,20,4,12,'#35729e');
  fill(16,20,4,12,'#35729e');
  fill(28,20,4,12,'#35729e');
  fill(32,20,8,12,'#35729e');
  fill(28,16,8,4,'#35729e');

  // === RIGHT LEG ===
  fill(0,16,4,4,'#3b3b6e');
  fill(4,16,4,4,'#3b3b6e');
  fill(0,20,4,12,'#3b3b6e');
  fill(4,20,4,12,'#37376a');
  fill(8,20,4,12,'#3b3b6e');
  fill(12,20,4,12,'#37376a');

  // === RIGHT ARM ===
  fill(40,16,4,4,'#c8a078');
  fill(44,16,4,4,'#c8a078');
  fill(40,20,4,12,'#c8a078');
  fill(44,20,4,12,'#c8a078');
  fill(48,20,4,12,'#c8a078');
  fill(52,20,4,12,'#c8a078');
  fill(40,20,4,4,'#3c8ec4');
  fill(44,20,4,4,'#3c8ec4');
  fill(48,20,4,4,'#35729e');
  fill(52,20,4,4,'#35729e');

  // === LEFT LEG ===
  fill(16,48,4,4,'#3b3b6e');
  fill(20,48,4,4,'#3b3b6e');
  fill(16,52,4,12,'#3b3b6e');
  fill(20,52,4,12,'#37376a');
  fill(24,52,4,12,'#3b3b6e');
  fill(28,52,4,12,'#37376a');

  // === LEFT ARM ===
  fill(32,48,4,4,'#c8a078');
  fill(36,48,4,4,'#c8a078');
  fill(32,52,4,12,'#c8a078');
  fill(36,52,4,12,'#c8a078');
  fill(40,52,4,12,'#c8a078');
  fill(44,52,4,12,'#c8a078');
  fill(32,52,4,4,'#35729e');
  fill(36,52,4,4,'#3c8ec4');
  fill(40,52,4,4,'#35729e');
  fill(44,52,4,4,'#35729e');

  STEVE_DATA_URL = c.toDataURL('image/png');
  return c;
}

/* ================================================================
   STATE
   ================================================================ */
let state = {
  token: null, playerUuid: null, username: null, activeSkin: null,
  currentPage: 'login',
  editorTool: 'pencil', editorColor: '#ff0000',
  editorZoom: 8,
  editorHistory: [], editorHistoryIdx: -1,
  isDrawing: false
};

let skinViewer = null;
let availableCapes = [];
let canUploadPublicCape = false;
let canUploadCustomCape = true;
let selfSigningEnabled = true;
let selectedCapeUuid = null;
let hasAppliedCape = false;
let previewEquipment = 'cape';
let editorViewer = null;
let showGuide = true;
let editorInited = false;
let editorCapeEquipment = 'cape';

/* ================================================================
   THEME SYSTEM
   ================================================================ */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ws_theme', theme);
  // Update active button
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('theme-active', b.dataset.theme === theme);
  });
}

function initTheme() {
  const saved = 'dark';
  setTheme(saved);
}

/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  buildSteveSkin();
  initTheme();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) { verifyToken(token); }
  else if (sessionStorage.getItem('ws_token')) {
    state.token = sessionStorage.getItem('ws_token');
    state.playerUuid = sessionStorage.getItem('ws_uuid');
    state.username = sessionStorage.getItem('ws_username');
    showApp();
  } else {
    showLogin('Get a link by typing /skin in the Minecraft server.');
  }

  // Nav links
  document.querySelectorAll('[data-page]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.page); })
  );

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn =>
    btn.addEventListener('click', () => setTheme(btn.dataset.theme))
  );

  // Editor tools
  document.querySelectorAll('[data-tool]').forEach(el =>
    el.addEventListener('click', () => selectTool(el.dataset.tool))
  );

  const cp = document.getElementById('color-picker');
  if (cp) cp.addEventListener('input', e => setColor(e.target.value));
  setupPalette();

  document.getElementById('btn-undo')?.addEventListener('click', editorUndo);
  document.getElementById('btn-redo')?.addEventListener('click', editorRedo);
  document.getElementById('btn-clear')?.addEventListener('click', editorClear);

  document.getElementById('btn-toggle-guide')?.addEventListener('click', () => {
    showGuide = !showGuide;
    document.getElementById('btn-toggle-guide').classList.toggle('active', showGuide);
    redrawDisplay();
  });

  document.getElementById('btn-load-steve')?.addEventListener('click', loadSteveIntoEditor);
  document.getElementById('btn-load-file')?.addEventListener('click', () => document.getElementById('editor-file-input').click());
  document.getElementById('editor-file-input')?.addEventListener('change', loadFileIntoEditor);
  document.getElementById('btn-load-current')?.addEventListener('click', loadCurrentSkinIntoEditor);

  // Import tabs
  document.querySelectorAll('.import-tabs .tab').forEach(el =>
    el.addEventListener('click', () => switchImportTab(el.dataset.tab))
  );

  document.getElementById('import-username')?.addEventListener('keydown', e => { if (e.key==='Enter') importFromUsername(); });
  document.getElementById('import-url')?.addEventListener('keydown', e => { if (e.key==='Enter') importFromUrl(); });
});

/* ================================================================
   AUTH
   ================================================================ */
async function verifyToken(token) {
  try {
    const resp = await api(`/api/auth/verify/${token}`);
    state.token = resp.sessionToken;
    state.playerUuid = resp.playerUuid;
    state.username = resp.username;
    sessionStorage.setItem('ws_token', resp.sessionToken);
    sessionStorage.setItem('ws_uuid', resp.playerUuid);
    sessionStorage.setItem('ws_username', resp.username);
    window.history.replaceState({}, '', '/skins');
    showApp();
  } catch { showLogin('Invalid or expired token. Type /skin in the server for a new link.'); }
}

function showLogin(msg) {
  document.getElementById('page-login').classList.remove('hidden');
  document.getElementById('navbar').classList.add('hidden');
  const s = document.getElementById('login-status'), e = document.getElementById('login-error');
  if (msg && msg.includes('Invalid')) { s.classList.add('hidden'); e.textContent=msg; e.classList.remove('hidden'); }
  else if (msg) { e.classList.add('hidden'); s.textContent=msg; s.classList.remove('hidden'); }
}

function showApp() {
  document.getElementById('page-login').classList.add('hidden');
  document.getElementById('navbar').classList.remove('hidden');
  document.getElementById('username-display').textContent = state.username;
  applyTranslations();
  navigateTo('dashboard');
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.remove('hidden');
  const nl = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (nl) nl.classList.add('active');
  if (page === 'dashboard') loadDashboard();
  if (page === 'editor') initEditor();
  if (page === 'presets') loadPresets();
  if (page === 'explore') renderExplore();
}

/* ================================================================
   API HELPER
   ================================================================ */
async function api(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const resp = await fetch(url, { ...opts, headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showAppDialog(message,{title=t('dialog-title'),confirm=false,confirmText=t('dialog-confirm'),cancelText=t('dialog-cancel')}={}) {
  return new Promise(resolve=>{
    document.querySelector('.app-dialog-backdrop')?.remove();
    const backdrop=document.createElement('div'); backdrop.className='app-dialog-backdrop';
    const dialog=document.createElement('section'); dialog.className='app-dialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    const heading=document.createElement('h2'); heading.textContent=title;
    const text=document.createElement('p'); text.textContent=message;
    const actions=document.createElement('div'); actions.className='app-dialog-actions';
    const close=result=>{ backdrop.remove(); resolve(result); };
    if(confirm) { const cancel=document.createElement('button'); cancel.className='secondary-btn'; cancel.textContent=cancelText; cancel.onclick=()=>close(false); actions.appendChild(cancel); }
    const ok=document.createElement('button'); ok.className='primary-btn'; ok.dataset.confirm=confirm?'true':'false'; ok.textContent=confirm?confirmText:t('dialog-ok'); ok.onclick=()=>close(true); actions.appendChild(ok);
    backdrop.addEventListener('click',e=>{ if(e.target===backdrop) close(false); });
    dialog.append(heading,text,actions); backdrop.appendChild(dialog); document.body.appendChild(backdrop); ok.focus();
  });
}

/* ================================================================
   DASHBOARD
   ================================================================ */
async function loadDashboard() {
  try {
    await loadCapeOptions();
    const skin = await api(`/api/skins/${state.playerUuid}`);
    state.activeSkin = skin.textureValue ? skin : null;
    syncAppliedCape(skin.textureValue);
    const noSkin = document.getElementById('no-skin');
    const skinInfo = document.getElementById('skin-info');
    if (state.activeSkin) {
      noSkin.classList.add('hidden'); skinInfo.classList.remove('hidden');
      document.getElementById('info-model').textContent = 'Model: ' + (skin.modelType||'DEFAULT');
      document.getElementById('info-source').textContent = 'Source: ' + (skin.source||'unknown');
      initDashboardPreview(skin.textureValue, skin.modelType === 'SLIM');
      applySelectedCapePreview();
    } else {
      noSkin.classList.remove('hidden'); skinInfo.classList.add('hidden');
      initDashboardPreview(null, false);
      applySelectedCapePreview();
    }
    const history = await api(`/api/skins/${state.playerUuid}/all`);
    renderHistory(history);
  } catch (err) { console.error('Dashboard error:', err); }
}

function syncAppliedCape(textureValue) {
  selectedCapeUuid=null;
  hasAppliedCape=false;
  document.querySelectorAll('#cape-options .cape-option.selected').forEach(option=>option.classList.remove('selected'));
  const clearButton=document.getElementById('btn-cape-clear');
  if(!textureValue) { if(clearButton) clearButton.disabled=true; return; }
  try {
    const textures=JSON.parse(atob(textureValue)).textures;
    const appliedUrl=textures?.CAPE?.url;
    hasAppliedCape=!!appliedUrl;
    if(clearButton) clearButton.disabled=!hasAppliedCape;
    if(!appliedUrl) return;
    const index=availableCapes.findIndex(c=>(c.url?.cape||c.url||c.texture?.url||c.textureUrl||c.image||'')===appliedUrl);
    if(index>=0) {
      selectedCapeUuid=availableCapes[index].uuid||availableCapes[index].id||availableCapes[index].cape;
      document.querySelectorAll('.cape-option').forEach((node,i)=>node.classList.toggle('selected',i===index));
    }
  } catch(e) { console.warn('Could not detect applied cape',e); }
}

async function loadCapeOptions() {
  const container=document.getElementById('cape-options'); if(!container) return;
  container.innerHTML=`<p class="muted">${escapeHtml(t('cape-loading'))}</p>`;
  try {
    const capeResponse=await api(`/api/skins/${state.playerUuid}/capes`);
    selfSigningEnabled=capeResponse?.selfSigning!==false;
    canUploadCustomCape=capeResponse?.canUploadCustom!==false&&selfSigningEnabled;
    canUploadPublicCape=!!capeResponse?.canUploadPublic;
    availableCapes=Array.isArray(capeResponse)?capeResponse:capeResponse?.capes;
    const publicWrap=document.getElementById('custom-cape-public-wrap');
    if(publicWrap) publicWrap.classList.toggle('hidden',!canUploadPublicCape);
    const uploadForm=document.getElementById('custom-cape-form');
    if(uploadForm) uploadForm.classList.toggle('hidden',!canUploadCustomCape);
    // The endpoint normally returns its `capes` array; also accept the raw
    // MineSkin response so every returned entry is rendered if proxy format changes.
    if(!Array.isArray(availableCapes)) availableCapes=Array.isArray(availableCapes?.capes)?availableCapes.capes:[];
    container.innerHTML=availableCapes.map((cape,index)=>{
      const uuid=cape.uuid||cape.id||cape.cape;
      const name=cape.alias||cape.name||cape.title||`${t('cape-title')} ${index+1}`;
      const rawUrl=cape.url?.cape||cape.url||cape.texture?.url||cape.textureUrl||cape.image;
      const url=typeof rawUrl==='string'?rawUrl:null;
      const isPrivate=cape.support==='private';
      const supportKey=cape.custom?(isPrivate?'cape-support-private':'cape-support-public'):'cape-support-public';
      const rawSupport=cape.support==null?'':String(cape.support);
      const supportLabel=selfSigningEnabled?t(supportKey):(rawSupport||t(cape.supported===false?'cape-account-required':'cape-available'));
      const support=String(cape.support??'').toLowerCase();
      const selectable=cape.custom||selfSigningEnabled||(cape.supported!==false&&!['none','unsupported','false','unavailable'].includes(support));
      const remove=cape.custom&&cape.canDelete?`<button type="button" class="cape-delete" title="${escapeHtml(t('cape-delete'))}" aria-label="${escapeHtml(t('cape-delete'))}" onclick="event.stopPropagation();deleteCustomCape('${escapeHtml(uuid)}')">×</button>`:'';
      return `<div role="button" aria-disabled="${!selectable}" tabindex="${selectable?0:-1}" class="cape-option ${selectable?"":"unavailable"} ${cape.custom?"custom-cape-card":""} ${selectedCapeUuid===uuid?"selected":""}" onclick="selectCapeOption('${escapeHtml(uuid||'')}',${index})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCapeOption('${escapeHtml(uuid||'')}',${index});}" title="${escapeHtml(name)}">${remove}${url?`<span class="cape-thumb"><img src="${escapeHtml(url)}" alt="${escapeHtml(tf('cape-texture-alt',{name}))}"></span>`:`<span class="cape-no-image">${escapeHtml(t('cape-no-preview'))}</span>`}<span class="cape-name">${escapeHtml(name)}</span><small class="cape-support ${isPrivate?"private":""}" data-translation-key="${selfSigningEnabled?supportKey:''}">${escapeHtml(supportLabel)}</small></div>`;
    }).join('')||`<p class="muted">${escapeHtml(t('cape-none-available'))}</p>`;
  } catch(e) { container.innerHTML=`<p class="muted">${escapeHtml(tf('cape-load-error',{error:e.message}))}</p><button type="button" class="secondary-btn" onclick="loadCapeOptions()">${escapeHtml(t('cape-retry'))}</button>`; }
}

async function uploadCustomCapeUrl() {
  if(!canUploadCustomCape) return;
  const input=document.getElementById('custom-cape-url');
  const capeUrl=input?.value.trim();
  const capeName=document.getElementById('custom-cape-name')?.value.trim();
  if(!capeName) { await showAppDialog(t('cape-name-required')); return; }
  if(!capeUrl) { await showAppDialog(t('cape-url-required')); return; }
  try {
    const result=await api(`/api/skins/${state.playerUuid}/capes/custom`,{method:'POST',body:JSON.stringify({capeUrl,capeName,public:canUploadPublicCape&&!!document.getElementById('custom-cape-public')?.checked})});
    availableCapes=[result,...availableCapes];
    selectedCapeUuid=result.uuid;
    await loadCapeOptions();
    const index=availableCapes.findIndex(c=>c.uuid===result.uuid);
    selectCapeOption(result.uuid,index);
    input.value=''; document.getElementById('custom-cape-name').value='';
  } catch(e) { await showAppDialog(tf('cape-add-error',{error:e.message}),{title:t('cape-add-error-title')}); }
}

async function deleteCustomCape(uuid) {
  const cape=availableCapes.find(item=>(item.uuid||item.id||item.cape)===uuid);
  if(!cape?.custom) return;
  const capeName=cape.alias||cape.name||t('cape-title');
  const confirmed=await showAppDialog(t('cape-delete-confirm').replaceAll('%name%',capeName),{title:t('cape-delete-title'),confirm:true,confirmText:t('cape-delete'),cancelText:t('dialog-cancel')});
  if(!confirmed) return;
  try {
    await api(`/api/skins/${state.playerUuid}/capes/custom/${encodeURIComponent(uuid)}`,{method:'DELETE'});
    if(selectedCapeUuid===uuid) { selectedCapeUuid=null; applySelectedCapePreview(); }
    await loadCapeOptions();
  } catch(e) { await showAppDialog(tf('cape-delete-error',{error:e.message}),{title:t('cape-add-error-title')}); }
}

function selectCapeOption(uuid,index) {
  if(!uuid) return;
  const cape=availableCapes[index];
  const support=String(cape?.support??'').toLowerCase();
  if(!cape?.custom&&!selfSigningEnabled&&(cape?.supported===false||['none','unsupported','false','unavailable'].includes(support))) return;
  selectedCapeUuid=uuid;
  document.querySelectorAll('.cape-option').forEach((node,i)=>node.classList.toggle('selected',i===index));
  applySelectedCapePreview(index);
}

function applySelectedCapePreview(index=null) {
  if(!skinViewer) return;
  if(!selectedCapeUuid) { Promise.resolve(skinViewer.loadCape(null)).catch(()=>{}); return; }
  const cape=availableCapes[index??availableCapes.findIndex(c=>(c.uuid||c.id||c.cape)===selectedCapeUuid)];
  const rawUrl=cape?.url?.cape||cape?.url||cape?.texture?.url||cape?.textureUrl||cape?.image;
  const url=typeof rawUrl==='string'?rawUrl:null;
  if(url) {
    Promise.resolve(skinViewer.loadCape(url,previewEquipment==='elytra'?{backEquipment:'elytra'}:{})).catch(e=>console.warn('Cape preview failed',e));
  }
}

function toggleCapeEquipment() {
  previewEquipment=previewEquipment==='cape'?'elytra':'cape';
  const button=document.getElementById('preview-equipment-toggle');
  if(button) button.textContent=previewEquipment==='elytra'?t('cape-show'):t('cape-show-elytra');
  applySelectedCapePreview();
}

async function applyCape(clear) {
  if(clear&&!hasAppliedCape) return;
  if(!clear&&!selectedCapeUuid) { await showAppDialog(t('cape-select-required')); return; }
  const buttons=[document.getElementById('btn-cape-apply'),document.getElementById('btn-cape-clear')];
  buttons.forEach(b=>b.disabled=true);
  try {
    const cape=availableCapes.find(c=>(c.uuid||c.id||c.cape)===selectedCapeUuid);
    await api(`/api/skins/${state.playerUuid}/cape/${clear?'clear':'apply'}`,{method:'POST',body:clear?undefined:JSON.stringify({capeUuid:selectedCapeUuid,capeUrl:cape?.url})});
    await loadDashboard();
  } catch(e) { await showAppDialog(tf('cape-apply-error',{error:e.message}),{title:t('cape-add-error-title')}); }
  finally { buttons.forEach(b=>b.disabled=false); }
}

function renderHistory(skins) {
  const c = document.getElementById('skin-history');
  if (!skins || !skins.length) { c.innerHTML = `<p class="muted">${t('no-history')}</p>`; return; }
  c.innerHTML = skins.map(s => {
    const thumbId = `thumb-${s.id}`;
    // Schedule thumbnail rendering after DOM update
    setTimeout(() => renderSkinThumbnail(thumbId, s.textureValue), 0);
    return `
    <div class="history-item ${s.active ? 'active-skin' : ''}">
      <div class="history-left">
        <canvas id="${thumbId}" class="history-thumb" width="40" height="40"></canvas>
        <div class="history-meta">
          <span class="tag">${escapeHtml(s.source||'')}</span>
          <span class="tag">${escapeHtml(s.modelType||'')}</span>
          <span class="muted">${new Date(s.createdAt*1000).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="history-actions">${s.active
        ? `<span class="active-badge">${t('active-badge')}</span>`
        : `<button class="apply-btn" onclick="applySkin(${s.id})">${t('btn-apply')}</button><button class="delete-btn" onclick="deleteSkin(${s.id})">${t('skin-delete-button')}</button>`}</div>
    </div>`;
  }).join('');
}

/**
 * Renders a small face (head front) thumbnail from a texture value onto a canvas.
 */
function renderSkinThumbnail(canvasId, textureValue) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  const url = skinUrlFromTexture(textureValue) || STEVE_DATA_URL;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw head front (8x8 at 8,8) scaled to fill the 40x40 canvas
    g.drawImage(img, 8, 8, 8, 8, 0, 0, 40, 40);
    // Draw hat overlay (8x8 at 40,8) on top
    g.drawImage(img, 40, 8, 8, 8, 0, 0, 40, 40);
  };
  img.onerror = () => {
    g.fillStyle = '#3d3d5c';
    g.fillRect(0, 0, 40, 40);
    g.fillStyle = '#888';
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText('?', 20, 25);
  };
  img.src = url;
}

async function applySkin(skinId) {
  try { await api(`/api/skins/${state.playerUuid}/apply/${skinId}`, {method:'POST'}); loadDashboard(); }
  catch (e) { await showAppDialog(tf('skin-apply-error',{error:e.message}),{title:t('skin-error-title')}); }
}

async function deleteSkin(skinId) {
  if(!await showAppDialog(t('skin-delete-confirm'),{title:t('skin-delete-title'),confirm:true,confirmText:t('skin-delete-button')})) return;
  try { await api(`/api/skins/${state.playerUuid}/delete/${skinId}`,{method:'DELETE'}); await loadDashboard(); }
  catch(e) { await showAppDialog(tf('skin-delete-error',{error:e.message}),{title:t('skin-delete-error-title')}); }
}

/* ================================================================
   3D PREVIEWS  (skinview3d)
   ================================================================ */
function skinUrlFromTexture(val) {
  if (!val) return null;
  try {
    const d = JSON.parse(atob(val));
    let url = d.textures?.SKIN?.url;
    if (url) return url.replace('http://textures.minecraft.net','https://textures.minecraft.net');
  } catch {}
  return null;
}

function initDashboardPreview(textureValue, slim) {
  const canvas = document.getElementById('skin-preview-canvas');
  if (!canvas) return;
  const url = skinUrlFromTexture(textureValue) || STEVE_DATA_URL;
  const model = slim ? 'slim' : 'default';

  if (typeof skinview3d !== 'undefined') {
    if (skinViewer) {
      try { skinViewer.loadSkin(url, { model }); return; }
      catch { try { skinViewer.loadSkin(url); return; } catch {} }
    }
    try {
      skinViewer = new skinview3d.SkinViewer({
        canvas, width: 280, height: 380,
        skin: url, model
      });
      skinViewer.animation = new skinview3d.WalkingAnimation();
      skinViewer.animation.speed = 0.5;
      skinViewer.zoom = 0.9;
      skinViewer.autoRotate = true;
      skinViewer.autoRotateSpeed = 0.5;
      return;
    } catch(e) { console.warn('skinview3d dashboard init failed:', e); }
  }

  // 2D fallback
  render2DPreview(canvas, url);
}

function initEditorPreview3D() {
  const canvas = document.getElementById('editor-preview-canvas');
  if (!canvas) return;

  if (typeof skinview3d !== 'undefined') {
    if (editorViewer) { try { editorViewer.dispose(); } catch {} editorViewer = null; }
    try {
      editorViewer = new skinview3d.SkinViewer({
        canvas, width: 200, height: 300,
        skin: STEVE_DATA_URL, model: getEditorModel() === 'slim' ? 'slim' : 'default'
      });
      editorViewer.animation = new skinview3d.WalkingAnimation();
      editorViewer.animation.speed = 0.5;
      editorViewer.zoom = 0.9;
      editorViewer.autoRotate = true;
      editorViewer.autoRotateSpeed = 0.8;
      return;
    } catch(e) { console.warn('skinview3d editor init failed:', e); }
  }

  render2DPreview(canvas, STEVE_DATA_URL);
}

function updateEditorPreview3D() {
  const dc = document.getElementById('editor-canvas');
  if (!dc) return;
  const url = dc.toDataURL('image/png');
  const model = getEditorModel() === 'slim' ? 'slim' : 'default';

  if (editorViewer) {
    try { editorViewer.loadSkin(url, { model }); return; }
    catch { try { editorViewer.loadSkin(url); return; } catch {} }
  }

  const canvas = document.getElementById('editor-preview-canvas');
  if (canvas) render2DPreview(canvas, url);
}

/**
 * 2D fallback: renders front+back+sides of a Minecraft skin.
 */
function render2DPreview(canvas, skinSrc) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface2').trim() || '#222238';
  g.fillRect(0, 0, w, h);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const tmp = document.createElement('canvas');
    tmp.width = 64; tmp.height = 64;
    const tc = tmp.getContext('2d');
    tc.imageSmoothingEnabled = false;
    tc.drawImage(img, 0, 0, 64, 64);

    // Draw 4 views: Front, Back, Left, Right
    const scale = Math.floor(h * 0.35 / 32);
    const pw = 16 * scale, ph = 32 * scale;

    const views = [
      { label: 'Front', ox: Math.floor(w * 0.25 - pw/2), oy: Math.floor(h * 0.1), parts: 'front' },
      { label: 'Back',  ox: Math.floor(w * 0.75 - pw/2), oy: Math.floor(h * 0.1), parts: 'back' },
      { label: 'Left',  ox: Math.floor(w * 0.25 - pw/2), oy: Math.floor(h * 0.55), parts: 'left' },
      { label: 'Right', ox: Math.floor(w * 0.75 - pw/2), oy: Math.floor(h * 0.55), parts: 'right' },
    ];

    for (const v of views) {
      // Label
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = `${Math.max(9, scale * 2)}px sans-serif`;
      g.textAlign = 'center';
      g.fillText(v.label, v.ox + pw/2, v.oy - 4);

      const draw = (sx,sy,sw,sh, dx,dy) => {
        g.drawImage(tmp, sx,sy,sw,sh, dx,dy, sw*scale, sh*scale);
      };

      if (v.parts === 'front') {
        draw(8,8,8,8,   v.ox+4*scale, v.oy);
        draw(20,20,8,12, v.ox+4*scale, v.oy+8*scale);
        draw(44,20,4,12, v.ox,         v.oy+8*scale);
        draw(36,52,4,12, v.ox+12*scale,v.oy+8*scale);
        draw(4,20,4,12,  v.ox+4*scale, v.oy+20*scale);
        draw(20,52,4,12, v.ox+8*scale, v.oy+20*scale);
        draw(40,8,8,8,   v.ox+4*scale, v.oy); // hat
      } else if (v.parts === 'back') {
        draw(24,8,8,8,   v.ox+4*scale, v.oy);
        draw(32,20,8,12, v.ox+4*scale, v.oy+8*scale);
        draw(48,20,4,12, v.ox+12*scale,v.oy+8*scale);
        draw(40,20,4,12, v.ox,         v.oy+8*scale);
        draw(12,20,4,12, v.ox+8*scale, v.oy+20*scale);
        draw(28,52,4,12, v.ox+4*scale, v.oy+20*scale);
        draw(56,8,8,8,   v.ox+4*scale, v.oy); // hat back
      } else if (v.parts === 'right') {
        draw(0,8,8,8,    v.ox+4*scale, v.oy);
        draw(16,20,4,12, v.ox+6*scale, v.oy+8*scale);
        draw(40,20,4,12, v.ox+2*scale, v.oy+8*scale);
        draw(0,20,4,12,  v.ox+6*scale, v.oy+20*scale);
        draw(16,52,4,12, v.ox+6*scale, v.oy+20*scale);
      } else if (v.parts === 'left') {
        draw(16,8,8,8,   v.ox+4*scale, v.oy);
        draw(28,20,4,12, v.ox+6*scale, v.oy+8*scale);
        draw(48,20,4,12, v.ox+10*scale,v.oy+8*scale);
        draw(8,20,4,12,  v.ox+6*scale, v.oy+20*scale);
        draw(24,52,4,12, v.ox+6*scale, v.oy+20*scale);
      }
    }
  };
  img.onerror = () => {
    g.fillStyle = '#a6adc8'; g.font = '14px sans-serif';
    g.textAlign = 'center'; g.fillText('No preview', w/2, h/2);
  };
  img.src = skinSrc;
}

/* ================================================================
   SKIN EDITOR
   ================================================================ */
const GUIDE_REGIONS = [
  {x:0,y:0,w:8,h:8,c:'rgba(239,68,68,.30)',l:''},
  {x:8,y:0,w:8,h:8,c:'rgba(239,68,68,.20)',l:''},
  {x:0,y:8,w:8,h:8,c:'rgba(239,68,68,.25)',l:''},
  {x:8,y:8,w:8,h:8,c:'rgba(239,68,68,.40)',l:'Head'},
  {x:16,y:8,w:8,h:8,c:'rgba(239,68,68,.25)',l:''},
  {x:24,y:8,w:8,h:8,c:'rgba(239,68,68,.20)',l:''},
  {x:32,y:0,w:8,h:8,c:'rgba(250,204,21,.20)',l:''},
  {x:40,y:0,w:8,h:8,c:'rgba(250,204,21,.15)',l:''},
  {x:32,y:8,w:8,h:8,c:'rgba(250,204,21,.20)',l:''},
  {x:40,y:8,w:8,h:8,c:'rgba(250,204,21,.30)',l:'Hat'},
  {x:48,y:8,w:8,h:8,c:'rgba(250,204,21,.20)',l:''},
  {x:56,y:8,w:8,h:8,c:'rgba(250,204,21,.15)',l:''},
  {x:0,y:16,w:4,h:4,c:'rgba(96,165,250,.25)',l:''},
  {x:4,y:16,w:4,h:4,c:'rgba(96,165,250,.20)',l:''},
  {x:0,y:20,w:4,h:12,c:'rgba(96,165,250,.25)',l:''},
  {x:4,y:20,w:4,h:12,c:'rgba(96,165,250,.35)',l:'R.Leg'},
  {x:8,y:20,w:4,h:12,c:'rgba(96,165,250,.25)',l:''},
  {x:12,y:20,w:4,h:12,c:'rgba(96,165,250,.20)',l:''},
  {x:16,y:16,w:4,h:4,c:'rgba(74,222,128,.25)',l:''},
  {x:20,y:16,w:8,h:4,c:'rgba(74,222,128,.20)',l:''},
  {x:16,y:20,w:4,h:12,c:'rgba(74,222,128,.25)',l:''},
  {x:20,y:20,w:8,h:12,c:'rgba(74,222,128,.40)',l:'Body'},
  {x:28,y:20,w:4,h:12,c:'rgba(74,222,128,.25)',l:''},
  {x:32,y:20,w:8,h:12,c:'rgba(74,222,128,.20)',l:''},
  {x:40,y:16,w:4,h:4,c:'rgba(192,132,252,.25)',l:''},
  {x:44,y:16,w:4,h:4,c:'rgba(192,132,252,.20)',l:''},
  {x:40,y:20,w:4,h:12,c:'rgba(192,132,252,.25)',l:''},
  {x:44,y:20,w:4,h:12,c:'rgba(192,132,252,.35)',l:'R.Arm'},
  {x:48,y:20,w:4,h:12,c:'rgba(192,132,252,.25)',l:''},
  {x:52,y:20,w:4,h:12,c:'rgba(192,132,252,.20)',l:''},
  {x:0,y:32,w:4,h:4,c:'rgba(96,165,250,.15)',l:''},
  {x:4,y:32,w:4,h:4,c:'rgba(96,165,250,.10)',l:''},
  {x:0,y:36,w:4,h:12,c:'rgba(96,165,250,.15)',l:''},
  {x:4,y:36,w:4,h:12,c:'rgba(96,165,250,.20)',l:'R.Leg²'},
  {x:8,y:36,w:4,h:12,c:'rgba(96,165,250,.15)',l:''},
  {x:12,y:36,w:4,h:12,c:'rgba(96,165,250,.10)',l:''},
  {x:16,y:32,w:4,h:4,c:'rgba(74,222,128,.15)',l:''},
  {x:20,y:32,w:8,h:4,c:'rgba(74,222,128,.10)',l:''},
  {x:16,y:36,w:4,h:12,c:'rgba(74,222,128,.15)',l:''},
  {x:20,y:36,w:8,h:12,c:'rgba(74,222,128,.20)',l:'Body²'},
  {x:28,y:36,w:4,h:12,c:'rgba(74,222,128,.15)',l:''},
  {x:32,y:36,w:8,h:12,c:'rgba(74,222,128,.10)',l:''},
  {x:40,y:32,w:4,h:4,c:'rgba(192,132,252,.15)',l:''},
  {x:44,y:32,w:4,h:4,c:'rgba(192,132,252,.10)',l:''},
  {x:40,y:36,w:4,h:12,c:'rgba(192,132,252,.15)',l:''},
  {x:44,y:36,w:4,h:12,c:'rgba(192,132,252,.20)',l:'R.Arm²'},
  {x:48,y:36,w:4,h:12,c:'rgba(192,132,252,.15)',l:''},
  {x:52,y:36,w:4,h:12,c:'rgba(192,132,252,.10)',l:''},
  {x:16,y:48,w:4,h:4,c:'rgba(96,165,250,.25)',l:''},
  {x:20,y:48,w:4,h:4,c:'rgba(96,165,250,.20)',l:''},
  {x:16,y:52,w:4,h:12,c:'rgba(96,165,250,.25)',l:''},
  {x:20,y:52,w:4,h:12,c:'rgba(96,165,250,.35)',l:'L.Leg'},
  {x:24,y:52,w:4,h:12,c:'rgba(96,165,250,.25)',l:''},
  {x:28,y:52,w:4,h:12,c:'rgba(96,165,250,.20)',l:''},
  {x:32,y:48,w:4,h:4,c:'rgba(192,132,252,.25)',l:''},
  {x:36,y:48,w:4,h:4,c:'rgba(192,132,252,.20)',l:''},
  {x:32,y:52,w:4,h:12,c:'rgba(192,132,252,.25)',l:''},
  {x:36,y:52,w:4,h:12,c:'rgba(192,132,252,.35)',l:'L.Arm'},
  {x:40,y:52,w:4,h:12,c:'rgba(192,132,252,.25)',l:''},
  {x:44,y:52,w:4,h:12,c:'rgba(192,132,252,.20)',l:''},
  {x:0,y:48,w:4,h:4,c:'rgba(96,165,250,.15)',l:''},
  {x:4,y:48,w:4,h:4,c:'rgba(96,165,250,.10)',l:''},
  {x:0,y:52,w:4,h:12,c:'rgba(96,165,250,.15)',l:''},
  {x:4,y:52,w:4,h:12,c:'rgba(96,165,250,.20)',l:'L.Leg²'},
  {x:8,y:52,w:4,h:12,c:'rgba(96,165,250,.15)',l:''},
  {x:12,y:52,w:4,h:12,c:'rgba(96,165,250,.10)',l:''},
  {x:48,y:48,w:4,h:4,c:'rgba(192,132,252,.15)',l:''},
  {x:52,y:48,w:4,h:4,c:'rgba(192,132,252,.10)',l:''},
  {x:48,y:52,w:4,h:12,c:'rgba(192,132,252,.15)',l:''},
  {x:52,y:52,w:4,h:12,c:'rgba(192,132,252,.20)',l:'L.Arm²'},
  {x:56,y:52,w:4,h:12,c:'rgba(192,132,252,.15)',l:''},
  {x:60,y:52,w:4,h:12,c:'rgba(192,132,252,.10)',l:''},
];

function initEditor() {
  const dataCanvas = document.getElementById('editor-canvas');
  const display    = document.getElementById('editor-display');
  if (!dataCanvas || !display) return;

  const dCtx = dataCanvas.getContext('2d', { willReadFrequently: true });
  dCtx.imageSmoothingEnabled = false;

  if (!editorInited) {
    editorInited = true;
    loadImageToDataCanvas(STEVE_DATA_URL, () => {
      editorSaveState();
      redrawDisplay();
      updateEditorPreview3D();
    });
  } else {
    redrawDisplay();
  }

  display.onmousedown  = e => { state.isDrawing = true;  editorDraw(e); };
  display.onmousemove  = e => { if (state.isDrawing) editorDraw(e); };
  display.onmouseup    = () => { if (state.isDrawing) { state.isDrawing = false; editorSaveState(); updateEditorPreview3D(); } };
  display.onmouseleave = () => { if (state.isDrawing) { state.isDrawing = false; editorSaveState(); updateEditorPreview3D(); } };

  display.ontouchstart = e => { e.preventDefault(); state.isDrawing = true;  editorDrawTouch(e); };
  display.ontouchmove  = e => { e.preventDefault(); if (state.isDrawing) editorDrawTouch(e); };
  display.ontouchend   = () => { if (state.isDrawing) { state.isDrawing = false; editorSaveState(); updateEditorPreview3D(); } };

  updateDisplaySize();
  initEditorPreview3D();
}

function loadImageToDataCanvas(src, cb) {
  const dc = document.getElementById('editor-canvas');
  if (!dc) return;
  const ctx = dc.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(img, 0, 0, 64, 64);
    if (cb) cb();
  };
  img.onerror = () => { console.warn('Failed to load image:', src); if (cb) cb(); };
  img.src = src;
}

function redrawDisplay() {
  const dc  = document.getElementById('editor-canvas');
  const dsp = document.getElementById('editor-display');
  if (!dc || !dsp) return;
  const z = state.editorZoom;
  const size = 64 * z;
  dsp.width  = size;
  dsp.height = size;
  dsp.style.width  = size + 'px';
  dsp.style.height = size + 'px';

  const g = dsp.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Checkerboard
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#2a2a3d' : '#23233a';
      g.fillRect(x * z, y * z, z, z);
    }
  }

  // Skin pixels
  g.drawImage(dc, 0, 0, 64, 64, 0, 0, size, size);

  // Guide overlay
  if (showGuide) {
    for (const r of GUIDE_REGIONS) {
      g.fillStyle = r.c;
      g.fillRect(r.x * z, r.y * z, r.w * z, r.h * z);
      g.strokeStyle = 'rgba(255,255,255,0.3)';
      g.lineWidth = 1;
      g.strokeRect(r.x * z + 0.5, r.y * z + 0.5, r.w * z - 1, r.h * z - 1);
      if (r.l) {
        const fontSize = Math.min(r.w, r.h) * z * 0.22;
        if (fontSize >= 6) {
          g.font = `bold ${Math.round(fontSize)}px sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = 'rgba(255,255,255,0.85)';
          g.fillText(r.l, (r.x + r.w/2) * z, (r.y + r.h/2) * z, r.w * z - 4);
        }
      }
    }
  }

  // Grid
  if (z >= 6) {
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    g.lineWidth = 1;
    for (let i = 1; i < 64; i++) {
      g.beginPath(); g.moveTo(i*z, 0); g.lineTo(i*z, size); g.stroke();
      g.beginPath(); g.moveTo(0, i*z); g.lineTo(size, i*z); g.stroke();
    }
  }
}

function updateDisplaySize() {
  const z = state.editorZoom;
  document.getElementById('zoom-label').textContent = z + '×';
  redrawDisplay();
}

function editorZoom(delta) {
  state.editorZoom = Math.max(2, Math.min(16, state.editorZoom + delta));
  updateDisplaySize();
}

function editorDraw(e) {
  const dsp = document.getElementById('editor-display');
  const rect = dsp.getBoundingClientRect();
  const z = state.editorZoom;
  const px = Math.floor((e.clientX - rect.left) / z);
  const py = Math.floor((e.clientY - rect.top) / z);
  doEditorAction(px, py);
}

function editorDrawTouch(e) {
  const t = e.touches[0];
  const dsp = document.getElementById('editor-display');
  const rect = dsp.getBoundingClientRect();
  const z = state.editorZoom;
  const px = Math.floor((t.clientX - rect.left) / z);
  const py = Math.floor((t.clientY - rect.top) / z);
  doEditorAction(px, py);
}

function doEditorAction(x, y) {
  if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
  const dc = document.getElementById('editor-canvas');
  const ctx = dc.getContext('2d');
  switch (state.editorTool) {
    case 'pencil': setPixel(ctx, x, y, state.editorColor); break;
    case 'eraser': setPixelRGBA(ctx, x, y, 0, 0, 0, 0); break;
    case 'fill':
      floodFill(ctx, x, y, hexToRGBA(state.editorColor));
      state.isDrawing = false; editorSaveState(); updateEditorPreview3D();
      break;
    case 'picker':
      const d = ctx.getImageData(x, y, 1, 1).data;
      setColor('#' + [d[0],d[1],d[2]].map(c=>c.toString(16).padStart(2,'0')).join(''));
      selectTool('pencil');
      break;
  }
  redrawDisplay();
}

function setPixel(ctx, x, y, hex) { const [r,g,b]=hexToRGB(hex); setPixelRGBA(ctx,x,y,r,g,b,255); }

function setPixelRGBA(ctx, x, y, r, g, b, a) {
  const id = ctx.createImageData(1,1);
  id.data[0]=r; id.data[1]=g; id.data[2]=b; id.data[3]=a;
  ctx.putImageData(id, x, y);
}

function floodFill(ctx, sx, sy, fc) {
  const img = ctx.getImageData(0,0,64,64), d = img.data;
  const ti = (sy*64+sx)*4;
  const tc = [d[ti],d[ti+1],d[ti+2],d[ti+3]];
  if (tc[0]===fc[0]&&tc[1]===fc[1]&&tc[2]===fc[2]&&tc[3]===fc[3]) return;
  const stack = [[sx,sy]], visited = new Set();
  while (stack.length) {
    const [x,y] = stack.pop(), k = x+','+y;
    if (visited.has(k)||x<0||x>=64||y<0||y>=64) continue;
    const i=(y*64+x)*4;
    if (d[i]!==tc[0]||d[i+1]!==tc[1]||d[i+2]!==tc[2]||d[i+3]!==tc[3]) continue;
    visited.add(k);
    d[i]=fc[0]; d[i+1]=fc[1]; d[i+2]=fc[2]; d[i+3]=fc[3];
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(img,0,0);
}

function selectTool(tool) {
  state.editorTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
}

function setColor(hex) {
  state.editorColor = hex;
  const cp = document.getElementById('color-picker'); if (cp) cp.value = hex;
  const cv = document.getElementById('color-preview'); if (cv) cv.style.background = hex;
}

function setupPalette() {
  const cols = ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00',
    '#ff00ff','#00ffff','#ff8800','#8800ff','#884400','#888888',
    '#cccccc','#448844','#4444ff','#ff4488'];
  const p = document.getElementById('palette');
  if (!p) return;
  p.innerHTML = cols.map(c=>`<button class="palette-color" style="background:${c}" onclick="setColor('${c}')"></button>`).join('');
}

function editorSaveState() {
  const dc = document.getElementById('editor-canvas');
  if (!dc) return;
  const ctx = dc.getContext('2d');
  const data = ctx.getImageData(0,0,64,64);
  state.editorHistory = state.editorHistory.slice(0, state.editorHistoryIdx+1);
  state.editorHistory.push(data);
  state.editorHistoryIdx = state.editorHistory.length - 1;
  if (state.editorHistory.length > 50) { state.editorHistory.shift(); state.editorHistoryIdx--; }
}

function editorUndo() {
  if (state.editorHistoryIdx <= 0) return;
  state.editorHistoryIdx--;
  const dc = document.getElementById('editor-canvas');
  dc.getContext('2d').putImageData(state.editorHistory[state.editorHistoryIdx], 0, 0);
  redrawDisplay(); updateEditorPreview3D();
}

function editorRedo() {
  if (state.editorHistoryIdx >= state.editorHistory.length-1) return;
  state.editorHistoryIdx++;
  const dc = document.getElementById('editor-canvas');
  dc.getContext('2d').putImageData(state.editorHistory[state.editorHistoryIdx], 0, 0);
  redrawDisplay(); updateEditorPreview3D();
}

function editorClear() {
  const dc = document.getElementById('editor-canvas');
  dc.getContext('2d').clearRect(0,0,64,64);
  editorSaveState(); redrawDisplay(); updateEditorPreview3D();
}

function getEditorModel() {
  const r = document.querySelector('input[name="editor-model"]:checked');
  return r ? r.value : 'steve';
}

/* ---- Import-into-editor functions ---- */

function loadSteveIntoEditor() {
  loadImageToDataCanvas(STEVE_DATA_URL, () => {
    state.editorHistory = []; state.editorHistoryIdx = -1;
    editorSaveState(); redrawDisplay(); updateEditorPreview3D();
  });
}

function loadFileIntoEditor() {
  const input = document.getElementById('editor-file-input');
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImageToDataCanvas(reader.result, () => {
      state.editorHistory = []; state.editorHistoryIdx = -1;
      editorSaveState(); redrawDisplay(); updateEditorPreview3D();
    });
  };
  reader.readAsDataURL(file);
  input.value = '';
}

async function loadCurrentSkinIntoEditor() {
  if (!state.activeSkin || !state.activeSkin.textureValue) {
    try {
      const skin = await api(`/api/skins/${state.playerUuid}`);
      if (skin && skin.textureValue) state.activeSkin = skin;
    } catch {}
  }
  if (!state.activeSkin || !state.activeSkin.textureValue) {
    await showAppDialog(t('skin-no-active'));
    return;
  }
  const url = skinUrlFromTexture(state.activeSkin.textureValue);
  if (!url) { await showAppDialog(t('skin-texture-unavailable')); return; }
  loadImageToDataCanvas(url, () => {
    state.editorHistory = []; state.editorHistoryIdx = -1;
    editorSaveState(); redrawDisplay(); updateEditorPreview3D();
  });
}

/* ---- Save from editor ---- */
async function saveSkinFromEditor() {
  const dc = document.getElementById('editor-canvas');
  if (!dc) return;
  const btn = document.getElementById('btn-save-skin');
  const status = document.getElementById('editor-status');
  btn.disabled = true;
  btn.textContent = t('editor-signing');
  status.className = 'info'; status.textContent = t('editor-signing-msg'); status.classList.remove('hidden');
  try {
    const base64 = dc.toDataURL('image/png').split(',')[1];
    await api(`/api/skins/${state.playerUuid}`, {
      method: 'PUT',
      body: JSON.stringify({ imageBase64: base64, model: getEditorModel(), source: 'EDITOR' })
    });
    status.className = 'success'; status.textContent = t('editor-saved');
    loadDashboard();
  } catch (err) { status.className = 'error'; status.textContent = '' + err.message; }
  finally { btn.disabled = false; btn.textContent = t('btn-save'); }
}

/* ================================================================
   IMPORT
   ================================================================ */
function switchImportTab(tab) {
  document.querySelectorAll('.import-tabs .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById('tab-'+tab)?.classList.remove('hidden');
}

function getImportModel() { return document.querySelector('input[name="import-model"]:checked')?.value || 'steve'; }

async function importFromUsername() {
  const input = document.getElementById('import-username');
  const status = document.getElementById('import-status');
  if (!input.value.trim()) return;
  status.className='info'; status.textContent=t('import-looking'); status.classList.remove('hidden');
  try {
    await api('/api/import/username', { method:'POST', body:JSON.stringify({username:input.value.trim(),model:getImportModel()}) });
    status.className='success'; status.textContent=t('import-success'); input.value='';
  } catch(e) { status.className='error'; status.textContent=''+e.message; }
}

async function importFromUrl() {
  const input = document.getElementById('import-url');
  const status = document.getElementById('import-status');
  if (!input.value.trim()) return;
  status.className='info'; status.textContent=t('import-downloading'); status.classList.remove('hidden');
  try {
    await api('/api/import/url', { method:'POST', body:JSON.stringify({url:input.value.trim(),model:getImportModel()}) });
    status.className='success'; status.textContent=t('import-success'); input.value='';
  } catch(e) { status.className='error'; status.textContent=''+e.message; }
}

async function importFromFile(input) {
  const file = input.files[0]; if (!file) return;
  const status = document.getElementById('import-status');
  status.className='info'; status.textContent=t('import-uploading'); status.classList.remove('hidden');
  try {
    const base64 = await fileToBase64(file);
    await api(`/api/skins/${state.playerUuid}`, { method:'PUT', body:JSON.stringify({imageBase64:base64,model:getImportModel(),source:'UPLOAD'}) });
    status.className='success'; status.textContent=t('import-success');
  } catch(e) { status.className='error'; status.textContent=''+e.message; }
  input.value='';
}

/* ================================================================
   PRESETS
   ================================================================ */
async function loadPresets() {
  try {
    const [g, p] = await Promise.all([
      api('/api/presets/global').catch(()=>[]),
      api('/api/presets').catch(()=>[])
    ]);
    renderPresets('global-presets', g, false);
    renderPresets('personal-presets', p, true);
  } catch(e) { console.error('Presets error:', e); }
}

function renderPresets(id, presets, canDel) {
  const c = document.getElementById(id);
  if (!presets||!presets.length) { c.innerHTML=`<p class="muted">${canDel?t('presets-none-personal'):t('presets-none')}</p>`; return; }
  c.innerHTML = presets.map(p=>`
    <div class="preset-card"><div>
      <div class="preset-name">${escapeHtml(p.name)}</div>
      <div class="preset-meta"><span class="tag">${escapeHtml(p.modelType||'DEFAULT')}</span><span class="tag">${escapeHtml(p.source||'')}</span></div>
    </div><div class="preset-actions">
      <button class="apply-btn" onclick="applyPreset(${p.id})">${t('btn-apply')}</button>
      ${canDel?`<button class="delete-btn" onclick="deletePreset(${p.id})"></button>`:''}
    </div></div>`).join('');
}

async function applyPreset(id) {
  const s=document.getElementById('preset-status');
  try { await api(`/api/presets/${id}/apply`,{method:'POST'}); s.className='success'; s.textContent=t('presets-applied'); s.classList.remove('hidden'); setTimeout(()=>s.classList.add('hidden'),3000); }
  catch(e) { s.className='error'; s.textContent=''+e.message; s.classList.remove('hidden'); }
}

async function deletePreset(id) {
  if (!await showAppDialog(t('presets-delete-confirm'),{title:t('skin-delete-title'),confirm:true,confirmText:t('skin-delete-button')})) return;
  try { await api(`/api/presets/${id}`,{method:'DELETE'}); loadPresets(); } catch(e) { await showAppDialog(tf('skin-delete-preset-error',{error:e.message}),{title:t('skin-delete-error-title')}); }
}

function toggleSavePreset() { document.getElementById('save-preset-form').classList.toggle('hidden'); }

async function savePreset() {
  const name = document.getElementById('preset-name').value.trim();
  if (!name) return;
  const s=document.getElementById('preset-status');
  try {
    const skin = await api(`/api/skins/${state.playerUuid}`);
    if (!skin||!skin.id) { s.className='error'; s.textContent=t('presets-no-active'); s.classList.remove('hidden'); return; }
    await api('/api/presets', { method:'POST', body:JSON.stringify({name,skinId:skin.id}) });
    document.getElementById('preset-name').value=''; toggleSavePreset();
    s.className='success'; s.textContent=t('presets-saved'); s.classList.remove('hidden');
    setTimeout(()=>s.classList.add('hidden'),3000); loadPresets();
  } catch(e) { s.className='error'; s.textContent=''+e.message; s.classList.remove('hidden'); }
}

/* ================================================================
   EXPLORE
   ================================================================ */
const EXPLORE_SITES = [
  {
    icon: '', title: 'The Skindex', url: 'https://www.minecraftskins.com/',
    desc: 'One of the largest Minecraft skin databases. Browse, search, and download thousands of community-made skins.',
    tip: 'Find a skin you like, click Download, use the Import tab to upload the PNG file.'
  },
  {
    icon: '', title: 'NameMC', url: 'https://namemc.com/minecraft-skins',
    desc: 'View popular skins, trending designs, and look up any player\'s skin by username.',
    tip: 'Find a username, go to Import, "From Username" tab and type their name.'
  },
  {
    icon: '', title: 'Planet Minecraft', url: 'https://www.planetminecraft.com/skins/',
    desc: 'A huge community hub with skins, maps, and more. Great for unique and creative skin designs.',
    tip: 'Download the skin PNG, use the Import tab to upload it.'
  },
  {
    icon: '', title: 'Nova Skin', url: 'https://minecraft.novaskin.me/',
    desc: 'An advanced online skin editor with 3D preview. Create or modify skins with powerful tools.',
    tip: 'Design your skin, export as PNG, upload via Import or use our built-in Editor.'
  },
  {
    icon: '', title: 'MineSkin', url: 'https://mineskin.org/',
    desc: 'Generate signed Minecraft skin data from images. This is the service BetterSkin uses behind the scenes!',
    tip: 'You can paste a MineSkin URL directly in the Import, "From URL" tab.'
  },
  {
    icon: '', title: 'Minecraft Skins', url: 'https://www.minecraftskins.net/',
    desc: 'Another great skin gallery with categories, tags, and easy downloads.',
    tip: 'Download the skin PNG file, use Import, "Upload File" to apply it.'
  }
];

function renderExplore() {
  const grid = document.getElementById('explore-grid');
  if (!grid) return;
  grid.innerHTML = EXPLORE_SITES.map(site => `
    <div class="explore-card">
      <div class="explore-card-header">
        <span class="explore-icon">${site.icon}</span>
        <span class="explore-title">${escapeHtml(site.title)}</span>
      </div>
      <p class="explore-desc">${escapeHtml(site.desc)}</p>
      <div class="explore-tip">${escapeHtml(site.tip)}</div>
      <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="explore-link">
        Visit ${escapeHtml(site.title)}
      </a>
    </div>
  `).join('');
}

/* ================================================================
   i18n
   ================================================================ */
const T = {
  en: {
    'nav-dashboard':'Dashboard','nav-editor':'Editor','nav-import':'Import','nav-presets':'Presets','nav-explore':'Explore',
    'dashboard-title':'Current Skin','no-skin':'No custom skin set. Use the editor or import!',
    'btn-import':'Import','btn-editor':'Editor','btn-presets':'Presets',
    'history-title':'Skin History','no-history':'No skins yet.','active-badge':'Active','btn-apply':'Apply',
    'editor-title':'Skin Editor','model-steve':'Steve (Classic)','model-slim':'Alex (Slim)',
    'btn-save':'Save & Apply',
    'editor-signing':'Signing skin...',
    'editor-signing-msg':'Sending skin to MineSkin for signing... This may take a moment.',
    'editor-saved':'Skin saved and applied! Rejoin the server or wait for it to update.',
    'editor-preview':'Preview','editor-cape-title':'Cape Editor','editor-cape-description':'Draw a 64 × 32 cape texture and preview it on your character.','editor-cape-color':'Brush color','editor-cape-clear':'Clear cape','editor-cape-name':'Cape name','editor-cape-save':'Save cape','editor-cape-saved':'Cape saved to your cape collection.',
    'import-title':'Import Skin','tab-username':'From Username','tab-url':'From URL','tab-file':'Upload File',
    'import-username-ph':'Enter Minecraft username...','import-url-ph':'Paste skin image URL...',
    'import-search':'Search','import-apply':'Apply',
    'import-dropzone':'Drag & drop a PNG file here, or click to browse',
    'import-looking':'Looking up player and signing skin...',
    'import-downloading':'Downloading and signing skin...',
    'import-uploading':'Uploading and signing skin...',
    'import-success':'Skin imported and applied!',
    'presets-title':'Skin Presets','presets-save-btn':'Save Current Skin as Preset',
    'presets-name-ph':'Preset name...','presets-save':'Save','presets-cancel':'Cancel',
    'presets-global':'Server Presets','presets-personal':'My Presets',
    'presets-none':'No presets available.','presets-none-personal':'No presets yet.',
    'presets-applied':'Preset applied!','presets-saved':'Preset saved!',
    'presets-no-active':'No active skin to save as preset.','presets-delete-confirm':'Delete this preset?',
    'explore-title':'Explore Skins','explore-desc':'Browse these popular websites to find amazing skins, then import them using the Import tab!',
    'cape-title':'Cape','cape-description':'Choose a cape to preview it with your current skin.','cape-clear':'Clear','cape-apply':'Apply','cape-support-public':'Public','cape-support-private':'Private','cape-support-owner':'Owner only','cape-support-none':'Unsupported',
    'cape-name-placeholder':'Cape name','cape-url-placeholder':'https://example.com/cape.png','cape-name-label':'Cape name','cape-url-label':'Cape image URL','cape-add-custom':'Add custom cape','cape-public-upload':'Public cape','cape-delete':'Delete cape','cape-delete-title':'Delete cape','cape-delete-confirm':'Delete “%name%”? This cape will be permanently removed.','cape-delete-error':'Cape could not be deleted: %error%',
    'cape-loading':'Loading capes…','cape-none-available':'No capes available.','cape-load-error':'Could not load available capes: %error%','cape-retry':'Retry','cape-account-required':'Account required','cape-available':'Available','cape-texture-alt':'%name% cape texture',
    'cape-show':'Cape','cape-show-elytra':'Elytra','cape-no-preview':'No preview','cape-select-required':'Select a cape first.','cape-name-required':'Enter a name for your custom cape.','cape-url-required':'Enter a cape PNG URL.',
    'cape-add-error-title':'Cape error','cape-add-error':'Custom cape could not be added: %error%','cape-apply-error':'Cape update failed: %error%',
    'skin-error-title':'Skin error','skin-apply-error':'Failed: %error%','skin-delete-title':'Delete skin','skin-delete-confirm':'Delete this skin from history?','skin-delete-button':'Delete',
    'skin-delete-error-title':'Delete error','skin-delete-error':'Could not delete skin: %error%','skin-delete-preset-error':'Failed: %error%','skin-no-active':'No active skin found. Import or set a skin first.','skin-texture-unavailable':'Could not extract skin URL from texture data.',
    'dialog-title':'BetterSkin','dialog-ok':'OK','dialog-confirm':'Confirm','dialog-cancel':'Cancel',
    'tool-pencil':'Pencil','tool-eraser':'Eraser','tool-fill':'Fill','tool-picker':'Pick Color','editor-load-steve':'Load Steve','editor-load-file':'Load PNG','editor-load-current':'Load My Skin',
  },
  'pt-PT': {
    'nav-dashboard':'Painel','nav-editor':'Editor','nav-import':'Importar','nav-presets':'Presets','nav-explore':'Explorar',
    'dashboard-title':'Skin Atual','no-skin':'Sem skin personalizada. Usa o editor ou importa uma!',
    'btn-import':'Importar','btn-editor':'Editor','btn-presets':'Presets',
    'history-title':'Histórico de Skins','no-history':'Sem skins ainda.','active-badge':'Ativa','btn-apply':'Aplicar',
    'editor-title':'Editor de Skins','model-steve':'Steve (Clássico)','model-slim':'Alex (Slim)',
    'btn-save':'Guardar & Aplicar',
    'editor-signing':'A assinar skin...',
    'editor-signing-msg':'A enviar skin para o MineSkin para assinar... Pode demorar um momento.',
    'editor-saved':'Skin guardada e aplicada! Volta a entrar no servidor ou espera pela atualização.',
    'editor-preview':'Pré-visualização','editor-cape-title':'Editor de capas','editor-cape-description':'Desenha uma textura de capa de 64 × 32 e pré-visualiza-a na personagem.','editor-cape-color':'Cor do pincel','editor-cape-clear':'Limpar capa','editor-cape-name':'Nome da capa','editor-cape-save':'Guardar capa','editor-cape-saved':'Capa guardada na tua coleção.',
    'import-title':'Importar Skin','tab-username':'Por Username','tab-url':'Por URL','tab-file':'Carregar Ficheiro',
    'import-username-ph':'Introduz o username do Minecraft...','import-url-ph':'Cola o URL da imagem da skin...',
    'import-search':'Procurar','import-apply':'Aplicar',
    'import-dropzone':'Arrasta e larga um ficheiro PNG aqui, ou clica para procurar',
    'import-looking':'A procurar jogador e a assinar skin...',
    'import-downloading':'A descarregar e assinar skin...',
    'import-uploading':'A carregar e assinar skin...',
    'import-success':'Skin importada e aplicada!',
    'presets-title':'Presets de Skins','presets-save-btn':'Guardar Skin Atual como Preset',
    'presets-name-ph':'Nome do preset...','presets-save':'Guardar','presets-cancel':'Cancelar',
    'presets-global':'Presets do Servidor','presets-personal':'Os Meus Presets',
    'presets-none':'Sem presets disponíveis.','presets-none-personal':'Sem presets ainda.',
    'presets-applied':'Preset aplicado!','presets-saved':'Preset guardado!',
    'presets-no-active':'Sem skin ativa para guardar como preset.','presets-delete-confirm':'Apagar este preset?',
    'explore-title':'Explorar Skins','explore-desc':'Explora estes sites populares para encontrar skins incríveis, depois importa-as usando a aba Importar!',
    'cape-title':'Capa','cape-description':'Escolhe uma capa para pré-visualizar com a skin atual.','cape-clear':'Limpar','cape-apply':'Aplicar','cape-support-public':'Pública','cape-support-private':'Privada','cape-support-owner':'Apenas proprietário','cape-support-none':'Não suportada',
    'cape-name-placeholder':'Nome da capa','cape-url-placeholder':'https://exemplo.com/capa.png','cape-name-label':'Nome da capa','cape-url-label':'URL da imagem da capa','cape-add-custom':'Adicionar capa personalizada','cape-public-upload':'Capa pública','cape-delete':'Eliminar capa','cape-delete-title':'Eliminar capa','cape-delete-confirm':'Eliminar “%name%”? Esta capa será removida permanentemente.','cape-delete-error':'Não foi possível eliminar a capa: %error%',
    'cape-loading':'A carregar capas…','cape-none-available':'Não existem capas disponíveis.','cape-load-error':'Não foi possível carregar as capas: %error%','cape-retry':'Tentar novamente','cape-account-required':'Requer conta','cape-available':'Disponível','cape-texture-alt':'Textura da capa %name%',
    'cape-show':'capa','cape-show-elytra':'élitros','cape-no-preview':'Sem pré-visualização','cape-select-required':'Seleciona primeiro uma capa.','cape-name-required':'Introduz um nome para a capa personalizada.','cape-url-required':'Introduz o URL de uma capa PNG.',
    'cape-add-error-title':'Erro na capa','cape-add-error':'Não foi possível adicionar a capa: %error%','cape-apply-error':'Falha ao atualizar a capa: %error%',
    'skin-error-title':'Erro na skin','skin-apply-error':'Falha: %error%','skin-delete-title':'Apagar skin','skin-delete-confirm':'Apagar esta skin do histórico?','skin-delete-button':'Apagar',
    'skin-delete-error-title':'Erro ao apagar','skin-delete-error':'Não foi possível apagar a skin: %error%','skin-delete-preset-error':'Falha: %error%','skin-no-active':'Não há uma skin ativa. Importa ou define uma skin primeiro.','skin-texture-unavailable':'Não foi possível obter o URL da skin dos dados da textura.',
    'dialog-title':'BetterSkin','dialog-ok':'OK','dialog-confirm':'Confirmar','dialog-cancel':'Cancelar',
    'tool-pencil':'Lápis','tool-eraser':'Borracha','tool-fill':'Preencher','tool-picker':'Escolher cor','editor-load-steve':'Carregar Steve','editor-load-file':'Carregar PNG','editor-load-current':'Carregar a minha skin',
  },
  'zh-CN': {
    'nav-dashboard':'主页','nav-editor':'皮肤编辑器','nav-import':'导入','nav-presets':'预设','nav-explore':'探索',
    'dashboard-title':'当前皮肤','no-skin':'尚未设置自定义皮肤。请使用编辑器或导入皮肤。','btn-import':'导入','btn-editor':'编辑器','btn-presets':'预设',
    'history-title':'皮肤历史','no-history':'暂无皮肤记录。','active-badge':'当前使用','btn-apply':'应用',
    'editor-title':'皮肤编辑器','model-steve':'Steve（经典）','model-slim':'Alex（纤细）','btn-save':'保存并应用','editor-signing':'正在签名皮肤…',
    'editor-signing-msg':'正在将皮肤发送至 MineSkin 签名，请稍候。','editor-saved':'皮肤已保存并应用！重新进入服务器或等待更新。','editor-preview':'预览','editor-cape-title':'披风编辑器','editor-cape-description':'绘制 64 × 32 的披风纹理，并在角色模型上预览。','editor-cape-color':'画笔颜色','editor-cape-clear':'清空披风','editor-cape-name':'披风名称','editor-cape-save':'保存披风','editor-cape-saved':'披风已保存到你的披风列表。',
    'import-title':'导入皮肤','tab-username':'按用户名导入','tab-url':'从网址导入','tab-file':'上传文件','import-username-ph':'输入 Minecraft 用户名…','import-url-ph':'粘贴皮肤图片网址…',
    'import-search':'搜索','import-apply':'应用','import-dropzone':'将 PNG 文件拖到此处，或点击选择文件','import-looking':'正在查询玩家并签名皮肤…','import-downloading':'正在下载并签名皮肤…','import-uploading':'正在上传并签名皮肤…','import-success':'皮肤已导入并应用！',
    'presets-title':'皮肤预设','presets-save-btn':'将当前皮肤保存为预设','presets-name-ph':'预设名称…','presets-save':'保存','presets-cancel':'取消','presets-global':'服务器预设','presets-personal':'我的预设',
    'presets-none':'暂无可用预设。','presets-none-personal':'你还没有预设。','presets-applied':'预设已应用！','presets-saved':'预设已保存！','presets-no-active':'没有可保存为预设的当前皮肤。','presets-delete-confirm':'确定删除此预设吗？',
    'explore-title':'探索皮肤','explore-desc':'浏览这些热门网站寻找喜欢的皮肤，然后通过“导入”页面导入。',
    'cape-title':'披风','cape-description':'选择披风，在当前皮肤模型上预览效果。','cape-clear':'清除','cape-apply':'应用','cape-support-public':'公开','cape-support-private':'私有','cape-support-owner':'仅所有者','cape-support-none':'不支持','cape-name-placeholder':'披风名称','cape-url-placeholder':'https://example.com/cape.png','cape-name-label':'披风名称','cape-url-label':'披风图片网址','cape-add-custom':'添加自定义披风','cape-public-upload':'公开披风','cape-delete':'删除披风','cape-delete-title':'删除披风','cape-delete-confirm':'确定删除“%name%”吗？此披风将被永久移除。','cape-delete-error':'删除披风失败：%error%',
    'cape-loading':'正在加载披风…','cape-none-available':'暂无可用披风。','cape-load-error':'无法加载披风：%error%','cape-retry':'重试','cape-account-required':'需要账号','cape-available':'可用','cape-texture-alt':'%name% 披风纹理',
    'cape-show':'披风','cape-show-elytra':'鞘翅','cape-no-preview':'无预览','cape-select-required':'请先选择一件披风。','cape-name-required':'请输入自定义披风名称。','cape-url-required':'请输入披风 PNG 图片网址。','cape-add-error-title':'披风错误','cape-add-error':'添加自定义披风失败：%error%','cape-apply-error':'更新披风失败：%error%',
    'skin-error-title':'皮肤错误','skin-apply-error':'操作失败：%error%','skin-delete-title':'删除皮肤','skin-delete-confirm':'确定从历史记录中删除此皮肤吗？','skin-delete-button':'删除','skin-delete-error-title':'删除失败','skin-delete-error':'无法删除皮肤：%error%','skin-delete-preset-error':'操作失败：%error%','skin-no-active':'没有当前皮肤，请先导入或设置皮肤。','skin-texture-unavailable':'无法从纹理数据中提取皮肤网址。',
    'dialog-title':'BetterSkin','dialog-ok':'确定','dialog-confirm':'确认','dialog-cancel':'取消',
    'tool-pencil':'画笔','tool-eraser':'橡皮擦','tool-fill':'填充','tool-picker':'取色','editor-load-steve':'加载 Steve','editor-load-file':'加载 PNG','editor-load-current':'加载我的皮肤',
  }
};
let currentLocale = localStorage.getItem('ws_locale') || 'en';
if(!T[currentLocale]) currentLocale='en';
function t(k) { return (T[currentLocale]||T.en)[k] || T.en[k] || k; }
function tf(k,vars={}) { return Object.entries(vars).reduce((s,[name,value])=>s.replaceAll(`%${name}%`,value),t(k)); }
function setLocale(l) { if(!T[l]) return; currentLocale=l; localStorage.setItem('ws_locale',l); applyTranslations(); }

function applyTranslations() {
  // Nav
  document.querySelectorAll('.nav-link[data-page="dashboard"]').forEach(e=>e.textContent=t('nav-dashboard'));
  document.querySelectorAll('.nav-link[data-page="editor"]').forEach(e=>e.textContent=t('nav-editor'));
  document.querySelectorAll('.nav-link[data-page="import"]').forEach(e=>e.textContent=t('nav-import'));
  document.querySelectorAll('.nav-link[data-page="presets"]').forEach(e=>e.textContent=t('nav-presets'));
  document.querySelectorAll('.nav-link[data-page="explore"]').forEach(e=>e.textContent=t('nav-explore'));
  // Dashboard
  const dh=document.querySelector('#page-dashboard .preview-section h2'); if(dh) dh.textContent=t('dashboard-title');
  const ns=document.getElementById('no-skin'); if(ns) ns.textContent=t('no-skin');
  const ht=document.querySelector('#page-dashboard .actions-section h3'); if(ht) ht.textContent=t('history-title');
  document.querySelectorAll('#skin-history .history-actions .apply-btn').forEach(button=>button.textContent=t('btn-apply'));
  document.querySelectorAll('#skin-history .history-actions .delete-btn').forEach(button=>button.textContent=t('skin-delete-button'));
  document.querySelectorAll('#skin-history .history-actions .active-badge').forEach(badge=>badge.textContent=t('active-badge'));
  const ct=document.querySelector('.cape-picker-title h3'); if(ct) ct.textContent=t('cape-title');
  const cd=document.querySelector('.cape-picker-title .muted'); if(cd) cd.textContent=t('cape-description');
  const cb=document.getElementById('btn-cape-clear'); if(cb) cb.textContent=t('cape-clear');
  const ca=document.getElementById('btn-cape-apply'); if(ca&&!ca.disabled) ca.textContent=t('cape-apply');
  const cn=document.getElementById('custom-cape-name'); if(cn) { cn.placeholder=t('cape-name-placeholder'); cn.setAttribute('aria-label',t('cape-name-label')); }
  const cu=document.getElementById('custom-cape-url'); if(cu) { cu.placeholder=t('cape-url-placeholder'); cu.setAttribute('aria-label',t('cape-url-label')); }
  const addCape=document.querySelector('#custom-cape-form button'); if(addCape) addCape.textContent=t('cape-add-custom');
  const equipment=document.getElementById('preview-equipment-toggle'); if(equipment) equipment.textContent=previewEquipment==='elytra'?t('cape-show'):t('cape-show-elytra');
  const dialog=document.querySelector('.app-dialog'); if(dialog) { const ok=dialog.querySelector('.app-dialog-actions .primary-btn'); if(ok) ok.textContent=ok.dataset.confirm==='true'?t('dialog-confirm'):t('dialog-ok'); const cancel=dialog.querySelector('.app-dialog-actions .secondary-btn'); if(cancel) cancel.textContent=t('dialog-cancel'); }
  document.querySelectorAll('.cape-option').forEach(button=>{
    const badge=button.querySelector('.cape-support');
    if(badge&&badge.dataset.translationKey) badge.textContent=t(badge.dataset.translationKey);
  });
  const publicLabel=document.querySelector('#custom-cape-public-wrap span'); if(publicLabel) publicLabel.textContent=t('cape-public-upload');
  document.querySelectorAll('.quick-actions .action-btn').forEach(b=>{
    if(b.dataset.page==='import') b.textContent=t('btn-import');
    if(b.dataset.page==='editor') b.textContent=t('btn-editor');
    if(b.dataset.page==='presets') b.textContent=t('btn-presets');
  });
  // Editor
  const et=document.querySelector('#page-editor > h1'); if(et) et.textContent=t('editor-title');
  const sb=document.getElementById('btn-save-skin'); if(sb&&!sb.disabled) sb.textContent=t('btn-save');
  const ep=document.querySelector('.editor-preview h3'); if(ep) ep.textContent=t('editor-preview');
  const capeEditorTitle=document.getElementById('editor-cape-title'); if(capeEditorTitle) capeEditorTitle.textContent=t('editor-cape-title');
  const capeEditorDescription=document.getElementById('editor-cape-description'); if(capeEditorDescription) capeEditorDescription.textContent=t('editor-cape-description');
  const capeColorLabel=document.getElementById('editor-cape-color-label'); if(capeColorLabel) capeColorLabel.textContent=t('editor-cape-color');
  const capeClear=document.getElementById('btn-editor-cape-clear'); if(capeClear) capeClear.textContent=t('editor-cape-clear');
  const capeName=document.getElementById('editor-cape-name'); if(capeName) capeName.placeholder=t('editor-cape-name');
  const capeSave=document.getElementById('btn-editor-cape-save'); if(capeSave&&!capeSave.disabled) capeSave.textContent=t('editor-cape-save');
  const capeEquipment=document.getElementById('editor-cape-equipment-toggle'); if(capeEquipment) capeEquipment.textContent=editorCapeEquipment==='elytra'?t('cape-show'):t('cape-show-elytra');
  const editorLoads=['btn-load-steve','btn-load-file','btn-load-current'];
  ['editor-load-steve','editor-load-file','editor-load-current'].forEach((key,i)=>{ const button=document.getElementById(editorLoads[i]); if(button) button.textContent=t(key); });
  const setLabelText=(selector,value)=>{ const label=document.querySelector(selector); if(label&&label.lastChild) label.lastChild.textContent=' '+value; };
  setLabelText('.editor-model-select label:first-child',t('model-steve'));
  setLabelText('.editor-model-select label:last-child',t('model-slim'));
  setLabelText('.import-model-select label:first-child',t('model-steve'));
  setLabelText('.import-model-select label:last-child',t('model-slim'));
  ['pencil','eraser','fill','picker'].forEach((tool,i)=>{ const key=['tool-pencil','tool-eraser','tool-fill','tool-picker'][i]; const button=document.querySelector(`.tool-btn[data-tool="${tool}"]`); if(button) button.title=t(key); });
  const importTitle=document.querySelector('#page-import > h1'); if(importTitle) importTitle.textContent=t('import-title');
  document.querySelectorAll('.import-tabs [data-tab]').forEach(button=>button.textContent=t(`tab-${button.dataset.tab}`));
  const username=document.getElementById('import-username'); if(username) username.placeholder=t('import-username-ph');
  const importUrl=document.getElementById('import-url'); if(importUrl) importUrl.placeholder=t('import-url-ph');
  const usernameSearch=document.querySelector('#tab-username .primary-btn'); if(usernameSearch) usernameSearch.textContent=t('import-search');
  const urlApply=document.querySelector('#tab-url .primary-btn'); if(urlApply) urlApply.textContent=t('import-apply');
  const dropzone=document.querySelector('#tab-file .dropzone p'); if(dropzone) dropzone.textContent=t('import-dropzone');
  const presetTitle=document.querySelector('#page-presets > h1'); if(presetTitle) presetTitle.textContent=t('presets-title');
  const savePreset=document.getElementById('btn-show-save-preset'); if(savePreset) savePreset.textContent=t('presets-save-btn');
  const presetName=document.getElementById('preset-name'); if(presetName) presetName.placeholder=t('presets-name-ph');
  const presetForm=document.querySelector('#save-preset-form'); if(presetForm) { const buttons=presetForm.querySelectorAll('button'); if(buttons[0]) buttons[0].textContent=t('presets-save'); if(buttons[1]) buttons[1].textContent=t('presets-cancel'); }
  const presetHeadings=document.querySelectorAll('#page-presets > h2'); if(presetHeadings[0]) presetHeadings[0].textContent=t('presets-global'); if(presetHeadings[1]) presetHeadings[1].textContent=t('presets-personal');
  // Explore
  const ext=document.querySelector('#page-explore > h1'); if(ext) ext.textContent=t('explore-title');
  const exd=document.querySelector('#page-explore > p.muted'); if(exd) exd.textContent=t('explore-desc');
  // Lang buttons highlight
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('lang-active'));
  document.querySelector(`.lang-btn[onclick="setLocale('${currentLocale}')"]`)?.classList.add('lang-active');
}

/* ================================================================
   UTILITY
   ================================================================ */
function hexToRGB(h) { return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
function hexToRGBA(h) { return [...hexToRGB(h), 255]; }
function escapeHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function fileToBase64(f) { return new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result.split(',')[1]); r.onerror=no; r.readAsDataURL(f); }); }


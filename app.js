// CONFIG & CONSTANTS
const CREDENTIALS = { pass: "666" }; // Single User Mode
const API_URL = 'https://script.google.com/macros/s/AKfycbw1qKTFZ7KH55Q1FxdXb1s29UqRZnw7tQs03K8yo529ZN9WA0uRZVK8yioSBP5lik8How/exec';

// STATE
let currentUser = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

function checkSession() {
    const session = localStorage.getItem('levo_session');
    if (session === 'active') {
        showApp();
    } else {
        showLogin();
    }
}

// --- AUTH SYSTEM ---
function setupLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = document.getElementById('password').value;
        const btn = form.querySelector('button');
        const err = document.getElementById('login-error');

        // Simple Local Auth
        if (pass === CREDENTIALS.pass) {
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Accediendo...';
            setTimeout(() => {
                localStorage.setItem('levo_session', 'active');
                showApp();
            }, 800);
        } else {
            err.innerText = "Clave incorrecta. Acceso denegado.";
            form.reset();
            setTimeout(() => err.innerText = '', 2000);
        }
    });
}
// Run once on load
setupLogin();

function logout() {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem('levo_session');
        location.reload();
    }
}

// --- NAVIGATION & UI ---
function showApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    showView('dashboard'); // Default view
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

window.showView = function (viewName) {
    // 1. Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // 2. Show target view
    const target = document.getElementById('view-' + viewName);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.warn("View not found:", viewName);
        return; // Don't update nav if view doesn't exist
    }

    // 3. Update Sidebar Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // Find link that calls this view
    const sideLink = document.querySelector(`.nav-item[onclick="showView('${viewName}')"]`);
    if (sideLink) sideLink.classList.add('active');

    // 4. Update Bottom Nav (Mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    const bottomLink = document.querySelector(`.bottom-nav-item[onclick="showView('${viewName}')"]`);
    if (bottomLink) bottomLink.classList.add('active');

    // 5. Update Title
    const titleEl = document.getElementById('current-page-title');
    if (titleEl) {
        // Map simplified names to Titles
        const titles = {
            'dashboard': 'Command Center',
            'products': 'Catálogo Maestro',
            'warehouse': 'Gestión de Almacén',
            'movements': 'Movimientos',
            'purchases': 'Compras',
            'users': 'Usuarios'
        };
        titleEl.innerText = titles[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
    }

    // 6. Trigger Data Load
    if (viewName === 'products') loadProducts();
    if (viewName === 'movements') loadLogistics();
    if (viewName === 'warehouse') loadWarehouseData();
}


// --- MODULE LOGIC: PRODUCTS (CATALOG) ---
let PRODUCT_CACHE = [];

async function loadProducts() {
    const container = document.getElementById('products-grid');
    container.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:40px; color:var(--text-muted);"><i class="fas fa-circle-notch fa-spin"></i> Cargando catálogo...</div>`;

    if (PRODUCT_CACHE.length > 0) {
        renderProductGrid(PRODUCT_CACHE);
        // Background refresh
        fetchProductsAPI();
    } else {
        await fetchProductsAPI();
    }
}

async function fetchProductsAPI() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getProducts' })
        });
        const result = await response.json();

        if (result.success) {
            PRODUCT_CACHE = result.data;
            renderProductGrid(PRODUCT_CACHE);
        } else {
            console.error(result.error);
        }
    } catch (e) {
        console.error("Fetch Error", e);
    }
}

// Helper to fix Drive Links
function fixDriveLink(url) {
    if (!url) return '';
    // If it's a Drive standard export link, convert to thumbnail for speed/reliability
    if (url.includes('drive.google.com') && url.includes('id=')) {
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}=s400`; // s400 = 400px widht
        }
    }
    return url;
}

function renderProductGrid(list) {
    const container = document.getElementById('products-grid');
    if (!container) return;

    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; grid-column:1/-1; padding:20px;">No se encontraron productos.</div>`;
        return;
    }

    list.forEach(p => {
        const cleanImg = fixDriveLink(p.image);
        const hasImg = cleanImg && cleanImg.length > 5;
        const imgHtml = hasImg ? `<img src="${cleanImg}" class="prod-img" onerror="this.src='https://placehold.co/400x300?text=No+Img'">`
            : `<i class="fas fa-box" style="font-size:2rem; opacity:0.3"></i>`;

        const stockClass = p.stock <= p.minNodes ? (p.stock === 0 ? 'critical' : 'low') : '';
        const stockIcon = p.stock <= p.minNodes ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-cubes"></i>';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="prod-img-box">${imgHtml}</div>
            <button class="btn-edit" onclick="openProductModal('${p.code}')"><i class="fas fa-pencil"></i></button>
            <div class="prod-body">
                <div class="prod-code">${p.code}</div>
                <div class="prod-title">${p.name}</div>
                <div class="prod-stock ${stockClass}">
                    ${stockIcon} <b>${p.stock}</b> <span style="font-size:10px; opacity:0.7">${p.unitMeasure}</span>
                    <span style="font-weight:600; margin-left:auto;">${p.unitPrice ? '$' + p.unitPrice.toFixed(2) : '-'}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.filterProducts = function () {
    const term = document.getElementById('prod-search').value.toLowerCase();
    const filtered = PRODUCT_CACHE.filter(p =>
        p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
    renderProductGrid(filtered);
}

// --- PRODUCT EDIT MODAL ---
window.openProductModal = function (code) {
    const p = PRODUCT_CACHE.find(i => i.code === code);
    if (!p) return;

    document.getElementById('edit-row').value = p.row;
    document.getElementById('edit-code').value = p.code;
    document.getElementById('edit-name').value = p.name;
    document.getElementById('edit-desc').value = p.desc;
    document.getElementById('edit-image').value = p.image;

    // Pricing
    document.getElementById('edit-unitprice').value = p.unitPrice || '';
    document.getElementById('edit-unitmeasure').value = p.unitMeasure || '';

    // Presentations 1-3
    const setPres = (idx, data) => {
        document.getElementById(`edit-p${idx}-name`).value = data?.name || '';
        document.getElementById(`edit-p${idx}-factor`).value = data?.factor || '';
        document.getElementById(`edit-p${idx}-price`).value = data?.price || '';
    };
    setPres(1, p.pres1);
    setPres(2, p.pres2);
    setPres(3, p.pres3);

    // Preview
    const prev = document.getElementById('edit-img-preview');
    const cleanImg = fixDriveLink(p.image);
    if (cleanImg) { prev.src = cleanImg; prev.style.display = 'block'; }
    else { prev.style.display = 'none'; }

    // Logic for Image Input Change
    document.getElementById('edit-image').onkeyup = (e) => {
        const val = fixDriveLink(e.target.value);
        if (val) { prev.src = val; prev.style.display = 'block'; }
    };

    document.getElementById('product-modal').classList.add('open');
}

window.uploadProductImage = function () {
    const fileInput = document.getElementById('upload-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const statusEl = document.getElementById('upload-status');
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subiendo ${file.name}...`;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64Data = e.target.result.split(',')[1]; // Remove "data:image/png;base64," prefix

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadImage',
                    payload: {
                        name: file.name,
                        mimeType: file.type,
                        data: base64Data
                    }
                })
            });
            const result = await response.json();

            if (result.success) {
                // Determine clean URL (fixDriveLink handles the rest)
                const url = result.url;
                document.getElementById('edit-image').value = url;

                // Trigger Preview Update
                const prev = document.getElementById('edit-img-preview');
                const cleanImg = fixDriveLink(url);
                prev.src = cleanImg;
                prev.style.display = 'block';

                statusEl.innerHTML = `<i class="fas fa-check" style="color:var(--success)"></i> Subida completada`;
                setTimeout(() => statusEl.style.display = 'none', 2000);
            } else {
                statusEl.innerHTML = `<span style="color:var(--danger)">Error: ${result.error}</span>`;
            }
        } catch (err) {
            console.error(err);
            statusEl.innerHTML = `<span style="color:var(--danger)">Error de conexión</span>`;
        }
    };
    reader.readAsDataURL(file);
}

window.closeProductModal = function () {
    document.getElementById('product-modal').classList.remove('open');
}

window.saveProductChanges = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    // Helper to get pres data
    const getPres = (idx) => ({
        name: document.getElementById(`edit-p${idx}-name`).value,
        factor: Number(document.getElementById(`edit-p${idx}-factor`).value),
        price: Number(document.getElementById(`edit-p${idx}-price`).value)
    });

    const payload = {
        row: parseInt(document.getElementById('edit-row').value),
        code: document.getElementById('edit-code').value,
        name: document.getElementById('edit-name').value,
        desc: document.getElementById('edit-desc').value,
        image: document.getElementById('edit-image').value,

        unitPrice: Number(document.getElementById('edit-unitprice').value),
        unitMeasure: document.getElementById('edit-unitmeasure').value,

        pres1: getPres(1),
        pres2: getPres(2),
        pres3: getPres(3)
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'saveProduct', payload: payload })
        });
        const result = await response.json();

        if (result.success) {
            alert("Producto actualizado correctamente.");
            closeProductModal();
            // Update Local Cache
            const idx = PRODUCT_CACHE.findIndex(p => p.code === payload.code);
            if (idx !== -1) {
                if (idx !== -1) {
                    // Merge updates to cache
                    Object.assign(PRODUCT_CACHE[idx], payload);
                    renderProductGrid(PRODUCT_CACHE); // Re-render immediately
                }
            }
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Error de conexión");
        console.error(err);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- LOGISTICS MODULE ---

let LOGISTICS_CACHE = { preingresos: [], guias: [] };

window.switchLogisticsTab = function (tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    // Find the clicked tab element by content logic or simple iteration
    const tabs = document.querySelectorAll('.tab');
    if (tabName === 'preingresos') tabs[0].classList.add('active');
    if (tabName === 'guias') tabs[1].classList.add('active');

    document.getElementById(`tab-${tabName}`).style.display = 'block';
}

async function loadLogistics() {
    // Parallel Fetch
    try {
        const p1 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getPreingresos' }) }).then(r => r.json());
        const p2 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuias' }) }).then(r => r.json());

        const [resPre, resGuias] = await Promise.all([p1, p2]);

        if (resPre.success) {
            LOGISTICS_CACHE.preingresos = resPre.data;
            renderPreingresos(resPre.data);
        }
        if (resGuias.success) {
            LOGISTICS_CACHE.guias = resGuias.data;
            renderGuias(resGuias.data);
        }
    } catch (e) {
        console.error("Logistics Error", e);
    }
}

function renderPreingresos(data) {
    const grid = document.getElementById('preingresos-grid');
    if (!grid) return;
    grid.innerHTML = '';

    data.forEach(item => {
        // Parse date
        let dateStr = item.fecha;
        try { dateStr = new Date(item.fecha).toLocaleDateString(); } catch (e) { }

        // Parse photos (array format "[url, url]")
        let thumb = 'https://placehold.co/400x300?text=No+Foto';
        try {
            // Clean weird formats if any
            let raw = item.fotos;
            if (raw && raw.startsWith('[')) {
                const arr = JSON.parse(raw);
                if (arr.length > 0) thumb = fixDriveLink(arr[0]);
            }
        } catch (e) { }

        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            <img src="${thumb}" class="gallery-img" onclick="window.open('${thumb.replace('=s400', '=s2000')}', '_blank')">
            <div class="gallery-body">
                <div class="gallery-title">${item.proveedor || 'Proveedor Desconocido'}</div>
                <div class="gallery-meta">
                    <span>${dateStr}</span>
                    <span class="status-badge ${item.estado === 'PROCESADO' ? 'status-success' : 'status-pending'}">${item.estado}</span>
                </div>
                <div style="font-size:11px; margin-top:5px; color:var(--text-muted);">${item.comentario || ''}</div>
                ${item.monto ? `<div style="margin-top:5px; font-weight:bold; color:var(--primary);">Total: $${Number(item.monto).toFixed(2)}</div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderGuias(data) {
    const tbody = document.getElementById('guias-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(g => {
        const row = document.createElement('tr');
        // Simple date format
        let dateStr = g.fecha;
        try { dateStr = new Date(g.fecha).toLocaleDateString(); } catch (e) { }

        const isIngreso = String(g.tipo).toUpperCase().includes('INGRESO');
        const typeBadge = `<span class="status-badge" style="background:${isIngreso ? 'rgba(13,110,253,0.1)' : 'rgba(255,193,7,0.1)'}; color:${isIngreso ? '#0d6efd' : '#ffc107'}">${g.tipo}</span>`;

        row.innerHTML = `
            <td style="font-size:12px;">${dateStr}</td>
            <td>${typeBadge}</td>
            <td>
                <div style="font-weight:600; font-size:13px;">${g.proveedor || g.usuario || '-'}</div>
                <div style="font-size:10px; color:var(--text-muted);">ID: ${g.idGuia.substring(0, 8)}...</div>
            </td>
            <td><span class="status-badge status-success">${g.estado}</span></td>
            <td>
                <button class="btn-primary" style="padding:4px 8px; font-size:10px;" onclick="openGuiaDetails('${g.idGuia}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.openGuiaDetails = async function (idGuia) {
    const modal = document.getElementById('guia-modal');
    modal.classList.add('open');

    // Set loading
    document.getElementById('guia-details-body').innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';
    document.getElementById('guia-new-body').innerHTML = '<tr><td colspan="3">Cargando...</td></tr>';

    try {
        const res = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'getGuiaDetails', payload: { idGuia: idGuia } })
        }).then(r => r.json());

        if (res.success) {
            const tbody1 = document.getElementById('guia-details-body');
            tbody1.innerHTML = '';
            res.details.forEach(d => {
                tbody1.innerHTML += `<tr>
                    <td>${d.codigoProducto}</td>
                    <td><b>${d.cantidad}</b></td>
                    <td>${d.FechaVencimientoProducto ? new Date(d.FechaVencimientoProducto).toLocaleDateString() : '-'}</td>
                </tr>`;
            });
            if (res.details.length === 0) tbody1.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin detalles estándar</td></tr>';

            const tbody2 = document.getElementById('guia-new-body');
            tbody2.innerHTML = '';
            res.newProducts.forEach(n => {
                tbody2.innerHTML += `<tr>
                    <td>${n.DescripcionProducto}</td>
                    <td><b>${n.Cantidad}</b></td>
                    <td>${n.CodigoBarra || '-'}</td>
                </tr>`;
            });
            if (res.newProducts.length === 0) tbody2.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin incidencias/nuevos</td></tr>';

        } else {
            alert("Error al cargar detalles");
        }
    } catch (e) { console.error(e); }
}

// --- MODULE LOGIC: WAREHOUSE (Placeholder for now) ---
async function loadWarehouseData() {
    const container = document.getElementById('view-warehouse');
    // For now, inject the Import Logic here or keep it separate? 
    // Let's migrate the 'Solicitudes' logic here as an example of fetching.

    /* 
       Ideally, we would reuse renderSolicitudes logic here.
       But since I did a clean UI, I'll put a placeholder or basic fetch.
    */
    /*
    container.innerHTML = `
        <h1>Gestión de Almacén</h1>
        <div class="card" style="padding:20px; text-align:center;">
            <button class="btn-primary" onclick="openImportModal()">Importar Ventas (Legacy)</button>
        </div>
        <div id="warehouse-content">Cargando...</div>
    `;
    */
}

// --- LEGACY IMPORT LOGIC (Preserved & Global) ---
// This logic is complex and handles Excel files, so we keep it globally accessible.
// We can trigger it from any button via onclick="openImportModal()"

window.openImportModal = function () {
    let modal = document.getElementById('import-modal');
    if (!modal) {
        // Create modal on the fly if it doesn't exist (it's not in new index.html)
        createImportModal();
        modal = document.getElementById('import-modal');
    }
    modal.style.display = 'flex';

    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.value = '';
    const fileName = document.getElementById('file-name');
    if (fileName) fileName.innerText = '';
}

window.closeImportModal = function () {
    const modal = document.getElementById('import-modal');
    if (modal) modal.style.display = 'none';
}

function createImportModal() {
    const div = document.createElement('div');
    div.id = 'import-modal';
    div.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; justify-content:center; align-items:center;';

    div.innerHTML = `
        <div class="login-card" style="width:90%; max-width:500px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3 style="margin:0;">Importar Excel</h3>
                <button onclick="closeImportModal()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="color:var(--text-secondary); font-size:12px;">Zona Asignada</label>
                <select id="import-zone" class="input-field" style="margin-top:5px;">
                    <option value="Zona 1">Zona 1</option>
                    <option value="Zona 2">Zona 2</option>
                    <option value="General">General</option>
                </select>
            </div>

            <div id="drop-zone" style="border:2px dashed var(--border); border-radius:8px; padding:30px; text-align:center; cursor:pointer; transition:0.2s;">
                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                <p style="margin-bottom: 10px; color:var(--text-primary);">Arrastra o Click aquí</p>
                <input type="file" id="import-file" accept=".xlsx, .xls" style="display:none">
                <p id="file-name" style="margin-top: 10px; color: var(--success); font-size: 12px; min-height:1.2em;"></p>
            </div>
            
            <button class="btn-primary" onclick="processImport()" style="margin-top:20px;">Procesar e Importar</button>
        </div>
    `;
    document.body.appendChild(div);

    // Bind Events
    const dropZone = div.querySelector('#drop-zone');
    const fileInput = div.querySelector('#import-file');

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        if (fileInput.files.length) document.getElementById('file-name').innerText = fileInput.files[0].name;
    };
    // (Drag and drop logic omitted for brevity in this Quick Action version, but click works)
}

window.processImport = async function () {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    const zone = document.getElementById('import-zone').value;
    const btn = document.querySelector('#import-modal .btn-primary');

    if (!file) return alert("Selecciona un archivo.");

    btn.innerText = "Procesando...";
    btn.disabled = true;

    if (typeof XLSX === 'undefined') {
        alert("Error: Librería SheetJS no cargada. Revisa tu conexión internet.");
        btn.innerText = "Error";
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            // ... (Simplified Parsing Logic reuse) ...
            // FOR NOW, let's just alert the row count to prove it works
            alert(`LevoWeb: Leídas ${jsonData.length} filas del Excel.\n(La lógica completa de inserción se conectará en la fase de lógica).`);

            closeImportModal();

        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            btn.innerText = "Procesar e Importar";
            btn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- MOBILE MENU LOGIC ---
window.toggleMobileMenu = function () {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('menu-backdrop');

    if (sidebar.classList.contains('open')) {
        // Close
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
    } else {
        // Open
        sidebar.classList.add('open');
        backdrop.classList.add('open');
    }
}

// Modify showView to auto-close menu on mobile
const originalShowView = window.showView;
window.showView = function (viewName) {
    originalShowView(viewName);

    // Auto-close on mobile
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        toggleMobileMenu();
    }
}

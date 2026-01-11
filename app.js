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

// --- PRE-INGRESOS ENHANCED (GROUPED) ---
function renderPreingresos(data) {
    const grid = document.getElementById('preingresos-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Sort
    data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Group
    const groups = {};
    data.forEach(item => {
        let d = 'Sin Fecha';
        try { d = new Date(item.fecha).toLocaleDateString(); } catch (e) { }
        if (!groups[d]) groups[d] = [];
        groups[d].push(item);
    });

    Object.keys(groups).forEach(dateKey => {
        // Header
        const header = document.createElement('div');
        header.className = 'logistics-group-header';
        header.style.gridColumn = '1/-1'; // Span all
        header.innerHTML = `<span><i class="far fa-calendar"></i> ${dateKey}</span> <span>${groups[dateKey].length} Items</span>`;
        grid.appendChild(header);

        groups[dateKey].forEach(item => {
            let thumb = 'https://placehold.co/400x300?text=No+Foto';
            let photoCount = 0;
            let allPhotos = [];
            try {
                let raw = item.fotos;
                if (raw && raw.startsWith('[')) {
                    allPhotos = JSON.parse(raw);
                    if (allPhotos.length > 0) { thumb = fixDriveLink(allPhotos[0]); photoCount = allPhotos.length; }
                } else if (raw) { thumb = fixDriveLink(raw); allPhotos = [raw]; photoCount = 1; }
            } catch (e) { }

            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.innerHTML = `
                <div style="position:relative;">
                    <img src="${thumb}" class="gallery-img" onclick='openProtoGallery(${JSON.stringify(allPhotos)})'>
                    ${photoCount > 1 ? `<span style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:white; padding:2px 6px; border-radius:10px; font-size:10px;">+${photoCount - 1}</span>` : ''}
                </div>
                <div class="gallery-body">
                    <div class="gallery-title" style="display:flex; justify-content:space-between;">
                        <span>${item.proveedor || 'Desconocido'}</span>
                        <button class="btn-icon-small" onclick="printTicket('PRE', '${item.idPreingreso}')"><i class="fas fa-print"></i></button>
                    </div>
                    <div class="gallery-meta">
                        <span>${new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="status-badge ${item.estado === 'PROCESADO' ? 'status-success' : 'status-pending'}">${item.estado}</span>
                    </div>
                    <!-- EDIT BUTTON -->
                    <div style="margin-top:5px; display:flex; gap:5px;">
                        <button class="btn-secondary-small" onclick='openEditPreingreso(${JSON.stringify(item)})' style="flex:1; font-size:11px;">Editar / Ver Detalles</button>
                    </div>
                    <div style="font-size:11px; margin-top:5px; color:var(--text-muted);">${item.comentario || ''}</div>
                </div>
             `;
            grid.appendChild(card);
        });
    });
}

window.openProtoGallery = function (photos) {
    if (!photos || photos.length === 0) return;
    photos.forEach(p => window.open(fixDriveLink(p).replace('=s400', '=s2000'), '_blank'));
}

// --- GUIAS ENHANCED (GROUP BY DAY & SEARCH) ---

// Filter Function
window.filterLogistics = function () {
    const term = document.getElementById('logistics-search').value.toLowerCase();

    // Filter Guias
    const filteredGuias = LOGISTICS_CACHE.guias.filter(g =>
        (g.proveedor && g.proveedor.toLowerCase().includes(term)) ||
        (g.usuario && g.usuario.toLowerCase().includes(term)) ||
        (g.idGuia && g.idGuia.toLowerCase().includes(term)) ||
        (g.fecha && g.fecha.toLowerCase().includes(term))
    );
    renderGuias(filteredGuias);
}

function renderGuias(data) {
    const container = document.getElementById('guias-container');
    if (!container) return; // Matches HTML update
    container.innerHTML = '';

    // Group By Date
    const groups = {};
    data.forEach(g => {
        let d = 'Sin Fecha';
        try { d = new Date(g.fecha).toLocaleDateString(); } catch (e) { }
        if (!groups[d]) groups[d] = [];
        groups[d].push(g);
    });

    // Sort groups DESC
    const sortedDates = Object.keys(groups).sort((a, b) => {
        return new Date(groups[b][0].fecha) - new Date(groups[a][0].fecha);
    });

    sortedDates.forEach(dateKey => {
        // Group Header
        const header = document.createElement('div');
        header.className = 'logistics-group-header';
        header.innerHTML = `<span><i class="far fa-calendar-alt"></i> ${dateKey}</span>`;
        container.appendChild(header);

        groups[dateKey].forEach(g => {
            let timeStr = '';
            try { timeStr = new Date(g.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { }
            const isIngreso = String(g.tipo).toUpperCase().includes('INGRESO');

            // ALERT LOGIC
            const isPending = g.estado === 'PENDIENTE' || g.estado === 'EN PROCESO';
            const hasAlert = g.hasIncidents && isPending;

            const card = document.createElement('div');
            card.className = `guia-card ${hasAlert ? 'card-alert' : ''}`;
            card.onclick = (e) => {
                if (!e.target.closest('button')) openGuiaDetails(g.idGuia);
            };

            card.innerHTML = `
                <div class="guia-main">
                    <div class="guia-row">
                        <span class="guia-id">${g.idGuia.substring(0, 8)}</span>
                        <span class="status-badge" style="background:${isIngreso ? 'rgba(13,110,253,0.1)' : 'rgba(255,193,7,0.1)'}; color:${isIngreso ? '#0d6efd' : '#ffc107'}">${g.tipo}</span>
                        ${hasAlert ? '<span class="incident-pill"><i class="fas fa-exclamation-triangle"></i> Nuevos</span>' : ''}
                    </div>
                    <div class="guia-row">
                         <div class="guia-prov">${g.proveedor || g.usuario || 'Sin Nombre'}</div>
                    </div>
                    <div class="guia-row">
                        <span style="font-size:11px; color:var(--text-muted);"><i class="far fa-clock"></i> ${timeStr}</span>
                        <span class="status-badge status-success" style="margin-left:auto;">${g.estado}</span>
                    </div>
                </div>
                <div class="guia-actions">
                    <button class="btn-icon-small" onclick="printTicket('GUIA', '${g.idGuia}')"><i class="fas fa-print"></i></button>
                    <button class="btn-icon-small"><i class="fas fa-chevron-right"></i></button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}
const headerRow = document.createElement('tr');
headerRow.innerHTML = `<td colspan="5" style="background:var(--bg-body); font-weight:bold; font-size:11px; padding:4px 10px; color:var(--text-muted);">${dateKey}</td>`;
tbody.appendChild(headerRow);

groups[dateKey].forEach(g => {
    const row = document.createElement('tr');
    let timeStr = '';
    try { timeStr = new Date(g.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { }

    const isIngreso = String(g.tipo).toUpperCase().includes('INGRESO');
    const typeBadge = `<span class="status-badge" style="background:${isIngreso ? 'rgba(13,110,253,0.1)' : 'rgba(255,193,7,0.1)'}; color:${isIngreso ? '#0d6efd' : '#ffc107'}">${g.tipo}</span>`;

    row.innerHTML = `
                <td style="font-size:12px;">${timeStr}</td>
                <td>${typeBadge}</td>
                <td>
                    <div style="font-weight:600; font-size:13px;">${g.proveedor || g.usuario || '-'}</div>
                    <div style="font-size:10px; color:var(--text-muted); font-family:monospace;">${g.idGuia.substring(0, 6)}...</div>
                </td>
                <td><span class="status-badge status-success">${g.estado}</span></td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px; font-size:10px;" onclick="openGuiaDetails('${g.idGuia}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-secondary" style="padding:4px 8px; font-size:10px; margin-left:5px;" onclick="printTicket('GUIA', '${g.idGuia}')">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            `;
    tbody.appendChild(row);
});
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
                const nameDisplay = d.productName ? `<b>${d.productName}</b><br><span style="font-size:10px; color:var(--text-muted);">${d.codigoProducto}</span>` : d.codigoProducto;
                tbody1.innerHTML += `<tr>
                    <td>${nameDisplay}</td>
                    <td><b>${d.cantidad}</b></td>
                    <td>${d.FechaVencimientoProducto ? new Date(d.FechaVencimientoProducto).toLocaleDateString() : '-'}</td>
                </tr>`;
            });
            if (res.details.length === 0) tbody1.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin detalles estándar</td></tr>';

            const tbody2 = document.getElementById('guia-new-body');
            tbody2.innerHTML = '';

            // Filter "PROCESADO" from view? User said it remains as "sombra".
            // Let's show them but greyed out? Or hidden?
            // "asi yo al guardar cambio el estado de la fila a 'PROCESADO' asi este producto procesado pasa a ser como una sombra"
            // Suggests visible but inactive.

            res.newProducts.forEach(n => {
                const isProcessed = n.Estado === 'PROCESADO';
                const rowStyle = isProcessed ? 'style="opacity:0.5; background:rgba(0,0,0,0.2);"' : '';
                const actionBtn = isProcessed ? '<span style="font-size:10px;">Procesado</span>' :
                    `<button class="btn-primary" style="padding:2px 6px; font-size:10px;" onclick='openIncidentResolve(${JSON.stringify(n)}, "${idGuia}")'>Procesar</button>`;

                tbody2.innerHTML += `<tr ${rowStyle}>
                    <td>
                        <div style="font-weight:bold;">${n.DescripcionProducto}</div>
                        <div style="font-size:10px; color:var(--text-muted);">${n.CodigoBarra || '-'}</div>
                    </td>
                    <td><b>${n.Cantidad}</b></td>
                    <td>${actionBtn}</td>
                </tr>`;
            });
            if (res.newProducts.length === 0) tbody2.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Sin incidencias</td></tr>';

        } else {
            alert("Error al cargar detalles");
        }
    } catch (e) { console.error(e); }
}

// --- TICKET PRINTING SYSTEM ---
window.printTicket = async function (type, id) {
    // 1. Fetch Details if needed
    let content = '';
    const date = new Date().toLocaleString();

    if (type === 'GUIA') {
        const g = LOGISTICS_CACHE.guias.find(x => x.idGuia === id);
        if (!g) return;

        // Fetch details synchronously-ish for printing
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuiaDetails', payload: { idGuia: id } }) }).then(r => r.json());
        if (!res.success) return alert("Error cargando datos para imprimir");

        let itemsHtml = '';
        res.details.forEach(d => {
            const name = d.productName || d.codigoProducto;
            itemsHtml += `<tr><td>${name}</td><td align="right">${d.cantidad}</td></tr>`;
        });

        // Filter out processed incidents for ticket?? User said "sombra".
        // Maybe ticket should only show active ones?
        // User said: "al procesarse debe agregarse una nueva fila a la guia detalle...".
        // So the new valid item will appear in 'itemsHtml' (details) if we reload.
        // The old incident shouldn't appear in the ticket or should appear as reference?
        // Let's hide PROCESADO ones from Ticket for clarity.
        const activeNew = res.newProducts.filter(n => n.Estado !== 'PROCESADO');
        activeNew.forEach(n => itemsHtml += `<tr><td>${n.DescripcionProducto} (N)</td><td align="right">${n.Cantidad}</td></tr>`);

        content = `
            <div class="ticket">
                <div class="header">
                    <h2>LevoWeb</h2>
                    <p>GUIA DE REMISIÓN</p>
                    <p>ID: ${id.substring(0, 8)}</p>
                    <p>${date}</p>
                </div>
                <div class="info">
                    <p><b>Tipo:</b> ${g.tipo}</p>
                    <p><b>Prov/User:</b> ${g.proveedor || g.usuario}</p>
                    <p><b>Estado:</b> ${g.estado}</p>
                </div>
                <hr>
                <table>
                    <thead><tr><th align="left">Desc</th><th align="right">Cant</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <hr>
                <div style="text-align:center; margin-top:10px;">
                    <p>Gracias por su operación</p>
                </div>
            </div>
        `;
    }

    if (type === 'PRE') {
        const p = LOGISTICS_CACHE.preingresos.find(x => x.idPreingreso === id);
        if (!p) return;
        content = `
            <div class="ticket">
                <div class="header">
                     <h2>LevoWeb</h2>
                    <p>CONSTANCIA DE RECEPCIÓN</p>
                    <p>${date}</p>
                </div>
                <div class="info">
                    <p><b>Proveedor:</b> ${p.proveedor}</p>
                    <p><b>Monto:</b> ${p.monto}</p>
                    <p><b>Nota:</b> ${p.comentario}</p>
                </div>
                <hr>
                <p>Referencia: ${p.idPreingreso}</p>
            </div>
        `;
    }

    // Open Print Window
    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`
        <html>
        <head>
            <style>
                @page { size: 80mm auto; margin: 0; }
                body { font-family: 'Courier New', monospace; width: 78mm; margin: 0 auto; color: black; background:white;}
                .ticket { padding: 10px; }
                .header { text-align: center; margin-bottom: 10px; }
                h2 { margin: 0; font-size: 16px; }
                p { margin: 2px 0; font-size: 12px; }
                table { width: 100%; font-size: 12px; border-collapse: collapse; }
                hr { border: 0.5px dashed #000; }
                .info { margin-bottom: 10px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${content}
        </body>
        </html>
    `);
    win.document.close();
}

window.openIncidentResolve = async function (item, idGuia) {
    // Simple Prompt UI for now (User asked for "better design" later, but logic first)
    // We need: New Code (from catalog), Qty, Expiry.
    // Let's inject a modal overlay dynamically or reuse one.

    // We need products list for validation/selection.
    // Should check if we have them.
    if (!window.PRODUCT_CATALOG_CACHE) {
        // Fetch on demand
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) }).then(r => r.json());
            if (res.success) window.PRODUCT_CATALOG_CACHE = res.data;
        } catch (e) { }
    }

    let options = '';
    if (window.PRODUCT_CATALOG_CACHE) {
        window.PRODUCT_CATALOG_CACHE.forEach(p => {
            options += `<option value="${p.code}">${p.name} (${p.code})</option>`;
        });
    }

    const overlay = document.createElement('div');
    overlay.className = 'menu-backdrop open';
    overlay.style.zIndex = '1200';
    overlay.innerHTML = `
        <div class="login-card" style="width:90%; max-width:400px;">
            <h3>Procesar Incidencia</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:15px;">
                Producto: ${item.DescripcionProducto}<br>
                Barra Orig: ${item.CodigoBarra}
            </p>
            
            <label style="font-size:12px;">Producto Real (Catálogo)</label>
            <input list="prod-list" id="inc-new-code" class="input-field" placeholder="Buscar código o nombre...">
            <datalist id="prod-list">${options}</datalist>
            
            <label style="font-size:12px;">Cantidad Real</label>
            <input type="number" id="inc-new-qty" class="input-field" value="${item.Cantidad}">
            
            <label style="font-size:12px;">Vencimiento</label>
            <input type="date" id="inc-expiry" class="input-field">
            
            <div style="margin-top:20px; display:flex; gap:10px;">
                 <button class="btn button-secondary" onclick="this.closest('.menu-backdrop').remove()">Cancelar</button>
                 <button class="btn button-primary" onclick="submitIncidentResolve('${idGuia}', '${item.CodigoBarra}')">Guardar y Procesar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.submitIncidentResolve = async function (idGuia, oldBarcode) {
    const newCode = document.getElementById('inc-new-code').value;
    const newQty = document.getElementById('inc-new-qty').value;
    const expiry = document.getElementById('inc-expiry').value;

    // Extract code logic if using datalist "Name (Code)" format ??
    // Actually datalist value is what is in the input. If option value is code, it puts code.
    // If user types text, it might not be the code. Smart search needed?
    // User said "abastecer del catalogo".
    // Let's assume input has the code.

    if (!newCode || !newQty) return alert("Falta código o cantidad");

    const btn = event.target;
    btn.innerText = "Procesando...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'processIncident',
                payload: {
                    idGuia: idGuia,
                    oldBarcode: oldBarcode,
                    newCode: newCode,
                    newQty: newQty,
                    newExpiry: expiry
                }
            })
        }).then(r => r.json());

        if (res.success) {
            alert("Incidencia procesada correctamente.");
            document.querySelector('.menu-backdrop.open[style*="z-index: 1200"]').remove(); // Close overlay
            openGuiaDetails(idGuia); // Reload modal details
        } else {
            alert("Error: " + res.error);
        }
    } catch (e) {
        alert("Error de red");
    } finally {
        btn.innerText = "Guardar y Procesar";
        btn.disabled = false;
    }
}
window.openEditPreingreso = function (item) {
    // Placeholder for now
    alert("Edición rápida: " + item.proveedor);
}
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

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
    // Parallel Fetch: Preingresos, Guias, Products (Catalog), AND ALL DETAILS (Instant Load)
    try {
        const p1 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getPreingresos' }) }).then(r => r.json());
        const p2 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuias' }) }).then(r => r.json());
        const p3 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) }).then(r => r.json());
        const p4 = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAllGuiaDetails' }) }).then(r => r.json());

        const [resPre, resGuias, resProd, resDet] = await Promise.all([p1, p2, p3, p4]);

        if (resProd.success && resProd.data) {
            LOGISTICS_CACHE.products = resProd.data;
            // Build Datalist
            const datalist = document.getElementById('product-list-cache'); // We need to create this in HTML or just use logic
            // ... (handled in UI) ...
        }

        if (resDet.success && resDet.data) {
            LOGISTICS_CACHE.detailsMap = resDet.data; // Store ALL details mapped by ID
        }

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
// --- PRE-INGRESOS SQUARE FLIP (CAROUSEL) ---
window.togglePreCard = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('flipped');
};

window.nextPreImage = function (id, direction) {
    const card = document.getElementById(id);
    if (!card) return;
    const imgs = card.querySelectorAll('.pre-carousel-img');
    if (imgs.length < 2) return;

    let activeIdx = 0;
    imgs.forEach((img, i) => { if (img.classList.contains('active')) activeIdx = i; });

    imgs[activeIdx].classList.remove('active');
    let newIdx = activeIdx + direction;
    if (newIdx >= imgs.length) newIdx = 0;
    if (newIdx < 0) newIdx = imgs.length - 1;
    imgs[newIdx].classList.add('active');
    event.stopPropagation(); // Prevent flip
};

window.expandPreImage = function (id) {
    const card = document.getElementById(id);
    const activeImg = card.querySelector('.pre-carousel-img.active');
    if (activeImg) {
        let lightbox = document.getElementById('lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.innerHTML = '<span id="lightbox-close" onclick="this.parentElement.style.display=\'none\'">&times;</span><img id="lightbox-img">';
            document.body.appendChild(lightbox);
        }
        document.getElementById('lightbox-img').src = activeImg.src;
        lightbox.style.display = 'flex';
    }
    event.stopPropagation();
};

function renderPreingresos(data) {
    // Target the correct container. Use 'preingresos-container' (consistent with Guias)
    // If HTML has 'preingresos-grid' ID, we should probably target that or fix HTML.
    // Let's target 'preingresos-container' and ensure HTML matches.
    let container = document.getElementById('preingresos-container');
    if (!container) container = document.getElementById('preingresos-grid'); // Fallback
    if (!container) return;

    container.innerHTML = '';

    // Default class for container if it's the grid wrapper 
    // container.className = 'preingreso-grid'; 
    // Wait, grouping requires headers. So container is wrapper, grid is child.

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
        try { return new Date(groups[b][0].fecha) - new Date(groups[a][0].fecha); } catch (e) { return 0; }
    });

    sortedDates.forEach(dateKey => {
        const header = document.createElement('div');
        header.className = 'logistics-group-header';
        header.innerHTML = `<span><i class="far fa-clock"></i> ${dateKey}</span>`;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'preingreso-grid';

        groups[dateKey].forEach(p => {
            const uniqueId = 'pre-' + p.idPreingreso;

            // Image Logic (Carousel)
            let imgs = [];
            if (p.fotos) {
                if (p.fotos.includes(',')) imgs = p.fotos.split(',');
                else imgs = [p.fotos];
                // Clean JSON if needed
                if (imgs.length == 1 && imgs[0].startsWith('[')) {
                    try { imgs = JSON.parse(imgs[0]); } catch (e) { }
                }
            }

            let carouselHtml = '';
            if (imgs.length === 0) {
                carouselHtml = `<div class="guia-no-img" style="background:#111;"><i class="fas fa-box-open" style="font-size:40px; color:#333;"></i></div>`;
            } else {
                imgs.forEach((url, i) => {
                    carouselHtml += `<img src="${fixDriveLink(url)}" class="pre-carousel-img ${i === 0 ? 'active' : ''}">`;
                });
                if (imgs.length > 1) {
                    carouselHtml += `
                        <button class="carousel-ctrl carousel-prev" onclick="nextPreImage('${uniqueId}', -1)"><i class="fas fa-chevron-left"></i></button>
                        <button class="carousel-ctrl carousel-next" onclick="nextPreImage('${uniqueId}', 1)"><i class="fas fa-chevron-right"></i></button>
                     `;
                }
                carouselHtml += `<button class="expand-btn" onclick="expandPreImage('${uniqueId}')"><i class="fas fa-expand"></i></button>`;
            }

            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'pre-card-wrapper';
            cardWrapper.innerHTML = `
                <div class="pre-card" id="${uniqueId}" onclick="togglePreCard('${uniqueId}')">
                    <!-- FRONT -->
                    <div class="pre-face pre-front">
                        <div class="pre-header">
                            <div class="pre-prov">${p.proveedor}</div>
                            <div class="pre-time">${new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div class="pre-carousel">
                            ${carouselHtml}
                        </div>
                        <div class="pre-footer">
                            <div class="pre-comment">${p.comentario || 'Sin comentario'}</div>
                            <span class="pre-badge">${p.estado || 'PENDIENTE'}</span>
                        </div>
                    </div>
                    
                    <!-- BACK -->
                    <div class="pre-face pre-back">
                        <button class="action-btn-large" onclick="event.stopPropagation(); printTicket('PRE', '${p.idPreingreso}')">
                            <i class="fas fa-print"></i> <span>Ticket</span>
                        </button>
                        <button class="action-btn-large" onclick="event.stopPropagation(); openEditPreingreso('${p.idPreingreso}')">
                            <i class="fas fa-pen"></i> <span>Editar</span>
                        </button>
                    </div>
                </div>
             `;
            grid.appendChild(cardWrapper);
        });
        container.appendChild(grid);
    });
}

window.openProtoGallery = function (photos) {
    if (!photos || photos.length === 0) return;
    photos.forEach(p => window.open(fixDriveLink(p).replace('=s400', '=s2000'), '_blank'));
}

// --- GUIAS ENHANCED (GROUP BY DAY & SEARCH) ---

// Filter Function
window.filterLogistics = function filterLogistics() {
    // 1. Get Text Query
    const query = document.getElementById('search-logistics').value.toLowerCase();
    // 2. Get Date Query
    const dateInput = document.getElementById('search-date');
    const dateQuery = dateInput ? dateInput.value : ''; // YYYY-MM-DD

    // Filter Preingresos
    const filteredPre = LOGISTICS_CACHE.preingresos.filter(p => {
        const txtMatch = (p.proveedor || '').toLowerCase().includes(query) || (p.comentario || '').toLowerCase().includes(query);
        const dateMatch = !dateQuery || (p.fecha && new Date(p.fecha).toISOString().startsWith(dateQuery));
        return txtMatch && dateMatch;
    });
    renderPreingresos(filteredPre);

    // Filter Guias
    const filteredGuias = LOGISTICS_CACHE.guias.filter(g => {
        const txtMatch = (g.proveedor || g.usuario || '').toLowerCase().includes(query) || (g.idGuia || '').toLowerCase().includes(query);
        const dateMatch = !dateQuery || (g.fecha && new Date(g.fecha).toISOString().startsWith(dateQuery));
        return txtMatch && dateMatch;
    });
    renderGuias(filteredGuias);
}

// --- PRE-INGRESOS SQUARE FLIP (CAROUSEL) ---
window.togglePreCard = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('flipped');
};

window.nextPreImage = function (id, direction) {
    const card = document.getElementById(id);
    if (!card) return;
    const imgs = card.querySelectorAll('.pre-carousel-img');
    if (imgs.length < 2) return;

    let activeIdx = 0;
    imgs.forEach((img, i) => { if (img.classList.contains('active')) activeIdx = i; });

    imgs[activeIdx].classList.remove('active');
    let newIdx = activeIdx + direction;
    if (newIdx >= imgs.length) newIdx = 0;
    if (newIdx < 0) newIdx = imgs.length - 1;
    imgs[newIdx].classList.add('active');
    event.stopPropagation(); // Prevent flip
};

window.expandPreImage = function (id) {
    const card = document.getElementById(id);
    const activeImg = card.querySelector('.pre-carousel-img.active');
    if (activeImg) {
        let lightbox = document.getElementById('lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox';
            lightbox.innerHTML = '<span id="lightbox-close" onclick="this.parentElement.style.display=\'none\'">&times;</span><img id="lightbox-img">';
            document.body.appendChild(lightbox);
        }
        document.getElementById('lightbox-img').src = activeImg.src;
        lightbox.style.display = 'flex';
    }
    event.stopPropagation();
};

function renderPreingresos(data) {
    const container = document.getElementById('preingresos-container');
    if (!container) return;
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
        const header = document.createElement('div');
        header.className = 'logistics-group-header';
        header.innerHTML = `<span><i class="far fa-clock"></i> ${dateKey}</span>`;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'preingreso-grid';

        groups[dateKey].forEach(p => {
            const uniqueId = 'pre-' + p.idPreingreso;

            // Image Logic (Carousel)
            let imgs = [];
            if (p.fotos) {
                if (p.fotos.includes(',')) imgs = p.fotos.split(',');
                else imgs = [p.fotos];
                // Clean JSON if needed
                if (imgs.length == 1 && imgs[0].startsWith('[')) {
                    try { imgs = JSON.parse(imgs[0]); } catch (e) { }
                }
            }

            let carouselHtml = '';
            // PLACEHOLDER FOR NO IMAGES
            if (imgs.length === 0) {
                carouselHtml = `
                    <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#1e293b; color:#475569;">
                        <i class="fas fa-image" style="font-size:40px; margin-bottom:10px;"></i>
                        <span style="font-size:12px;">Sin Imagen</span>
                    </div>`;
            } else {
                imgs.forEach((url, i) => {
                    carouselHtml += `<img src="${fixDriveLink(url)}" class="pre-carousel-img ${i === 0 ? 'active' : ''}">`;
                });
                if (imgs.length > 1) {
                    carouselHtml += `
                        <button class="carousel-ctrl carousel-prev" onclick="nextPreImage('${uniqueId}', -1)"><i class="fas fa-chevron-left"></i></button>
                        <button class="carousel-ctrl carousel-next" onclick="nextPreImage('${uniqueId}', 1)"><i class="fas fa-chevron-right"></i></button>
                     `;
                }
                carouselHtml += `<button class="expand-btn" onclick="expandPreImage('${uniqueId}')"><i class="fas fa-expand"></i></button>`;
            }

            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'pre-card-wrapper';
            cardWrapper.innerHTML = `
                <div class="pre-card" id="${uniqueId}" onclick="togglePreCard('${uniqueId}')">
                    <!-- FRONT -->
                    <div class="pre-face pre-front">
                        <div class="pre-header">
                            <div class="pre-prov">${p.proveedor}</div>
                            <div class="pre-time">${new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div class="pre-carousel">
                            ${carouselHtml}
                        </div>
                        <div class="pre-footer">
                            <div class="pre-comment" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">"${p.comentario || 'Sin comentario'}"</div>
                            <span class="pre-badge">${p.estado || 'PENDIENTE'}</span>
                        </div>
                    </div>
                    
                    <!-- BACK (FULL INFO) -->
                    <div class="pre-face pre-back">
                        <div style="width:100%; padding:20px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
                             <h4 style="color:var(--text-muted); margin:0; font-size:11px; text-transform:uppercase;">Proveedor</h4>
                             <div style="font-size:14px; font-weight:bold; color:white;">${p.proveedor}</div>
                             
                             <h4 style="color:var(--text-muted); margin:5px 0 0 0; font-size:11px; text-transform:uppercase;">Monto Ref.</h4>
                             <div style="font-size:14px; font-weight:bold; color:#4ade80;">S/ ${p.monto || '0.00'}</div>
                             
                             <h4 style="color:var(--text-muted); margin:5px 0 0 0; font-size:11px; text-transform:uppercase;">Comentario Completo</h4>
                             <div style="font-size:13px; color:#e2e8f0; font-style:italic; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
                                ${p.comentario || 'Sin comentario registrado.'}
                             </div>
                        </div>
                        
                        <div style="display:flex; width:100%; justify-content:space-around; padding:15px; border-top:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);">
                            <button class="action-btn-large" onclick="event.stopPropagation(); printTicket('PRE', '${p.idPreingreso}')">
                                <i class="fas fa-print"></i> <span>Ticket</span>
                            </button>
                            <button class="action-btn-large" onclick="event.stopPropagation(); openEditPreingreso('${p.idPreingreso}')">
                                <i class="fas fa-pen"></i> <span>Editar</span>
                            </button>
                        </div>
                    </div>
                </div>
             `;
            grid.appendChild(cardWrapper);
        });
        container.appendChild(grid);
    });
}

function renderGuias(data) {
    const container = document.getElementById('guias-container');
    if (!container) return;
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
        const header = document.createElement('div');
        header.className = 'logistics-group-header';
        header.innerHTML = `<span><i class="far fa-calendar-alt"></i> ${dateKey}</span>`;
        container.appendChild(header);

        groups[dateKey].forEach(g => {
            const isIngreso = String(g.tipo).toUpperCase().includes('INGRESO');
            const colorClass = isIngreso ? 'guia-type-ingreso' : 'guia-type-salida';
            const neonColor = isIngreso ? 'neon-text-blue' : 'neon-text-orange';
            const btnClass = isIngreso ? 'btn-neon-blue' : 'btn-neon-ghost';
            const uniqueId = 'card-' + g.idGuia;

            // Incident Badge
            let incidentBadge = '';
            if (g.hasIncidents) incidentBadge = `<div class="alert-neon"><i class="fas fa-bolt"></i> ${g.incidents ? g.incidents.length : ''} ALERTAS</div>`;

            // Image
            let imgHtml = `<div class="guia-no-img"><i class="fas fa-cube"></i></div>`;
            if (g.foto) imgHtml = `<img src="${fixDriveLink(g.foto)}" class="guia-img-thumb">`;

            // Connection to Preingreso
            let preingresoComment = 'No vinculado';
            let linkedPreId = '';
            if (g.idPreingreso) {
                const foundPre = LOGISTICS_CACHE.preingresos ? LOGISTICS_CACHE.preingresos.find(p => String(p.idPreingreso) === String(g.idPreingreso)) : null;
                if (foundPre) preingresoComment = foundPre.comentario || 'Sin comentario';
                linkedPreId = g.idPreingreso;
            }

            const cardContainer = document.createElement('div');
            cardContainer.className = 'guia-card-container';
            cardContainer.innerHTML = `
                <div class="guia-card ${colorClass}" id="${uniqueId}">
                    <!-- FRONT -->
                    <div class="guia-face guia-front">
                        <button class="flip-toggle-btn" onclick="flipCard('${uniqueId}')"><i class="fas fa-sync-alt"></i></button>
                        <div class="guia-img-col">${imgHtml}</div>
                        <div class="guia-info-col">
                            <div>
                                <h4 class="${neonColor}" style="margin:0; font-size:16px;">${g.proveedor || g.usuario}</h4>
                                <div style="font-size:11px; opacity:0.7; margin-bottom:5px;">${g.tipo} | ${new Date(g.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                ${incidentBadge}
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                                <span class="status-badge-pill status-${g.estado === 'COMPLETADO' ? 'success' : 'pending'}">${g.estado}</span>
                                <button class="${btnClass} btn-neon-round" onclick="event.stopPropagation(); openGuiaDetails('${g.idGuia}')">
                                    DETALLES <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- BACK -->
                    <div class="guia-face guia-back">
                         <button class="flip-toggle-btn" onclick="flipCard('${uniqueId}')"><i class="fas fa-undo"></i></button>
                         <div>
                             <h5 style="color:white; margin:0 0 10px 0;">Notas y Conexiones</h5>
                             <div class="guia-comment-box">
                                 <span class="guia-comment-label">COMENTARIO DE GUÍA (INGRESO)</span>
                                 ${g.comentario || 'Sin comentarios'}
                             </div>
                             <div class="guia-comment-box">
                                 <span class="guia-comment-label">COMENTARIO DE PRE-INGRESO (RESPALDO)</span>
                                 ${preingresoComment}
                             </div>
                         </div>
                         <div style="display:flex; gap:10px; justify:center;">
                             ${linkedPreId ? `<button class="btn-neon-ghost btn-neon-round" onclick="openLinkedEvidence('${linkedPreId}')"><i class="fas fa-camera"></i> FOTOS</button>` : ''}
                             <button class="btn-neon-ghost btn-neon-round" onclick="printTicket('GUIA', '${g.idGuia}')"><i class="fas fa-print"></i> TICKET</button>
                             <button class="btn-neon-ghost btn-neon-round" onclick="copyToClipboard('${g.idGuia}')"><i class="far fa-copy"></i> ID</button>
                         </div>
                    </div>
                </div>
            `;
            container.appendChild(cardContainer);
        });
    });
}

// Function to open linked Pre-ingreso photos
window.openLinkedEvidence = function (idPre) {
    if (!LOGISTICS_CACHE.preingresos) return alert("Cargando datos...");
    // Robust search (trim)
    const target = String(idPre).trim();
    const item = LOGISTICS_CACHE.preingresos.find(p => String(p.idPreingreso).trim() === target);

    if (item) {
        let photos = [];
        try {
            if (item.fotos && item.fotos.startsWith('[')) photos = JSON.parse(item.fotos);
            else if (item.fotos) photos = [item.fotos];
        } catch (e) { }

        if (photos.length > 0) openProtoGallery(photos);
        else alert("Este pre-ingreso no tiene fotos adjuntas.");
    } else {
        alert("Pre-ingreso no encontrado en la lista actual (" + idPre + ")");
    }
}


window.openGuiaDetails = async function (idGuia) {
    const modal = document.getElementById('guia-modal');
    modal.classList.add('open');

    // Set loading
    const prodsContainer = document.getElementById('guia-details-body');
    const incidentContainer = document.getElementById('guia-new-body');

    // 2. CHECK CACHE (INCIDENTS & STANDARD DETAILS)
    incidentContainer.innerHTML = '';
    prodsContainer.innerHTML = '';

    const cachedGuia = LOGISTICS_CACHE.guias.find(g => String(g.idGuia) === String(idGuia));
    const cachedDetails = LOGISTICS_CACHE.detailsMap ? LOGISTICS_CACHE.detailsMap[String(idGuia).trim()] : null;

    // A) Incidents (Instant)
    if (cachedGuia && cachedGuia.incidents && cachedGuia.incidents.length > 0) {
        renderIncidentsList(cachedGuia.incidents, incidentContainer, idGuia);
    } else {
        incidentContainer.innerHTML = '<div style="padding:10px; color:var(--text-muted);">Sin incidencias</div>';
    }

    // B) Standard Details (Instant - Preloaded)
    if (cachedDetails && cachedDetails.length > 0) {
        renderDetailsList(cachedDetails, prodsContainer);
    } else {
        // Fallback or Empty
        if (cachedDetails && cachedDetails.length === 0) {
            prodsContainer.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">No hay productos registrados.</div>';
        } else {
            // Not in cache? Fetch. (Should be rare)
            prodsContainer.innerHTML = '<div class="spinner"></div>';
            fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getGuiaDetails', payload: { idGuia } }) })
                .then(r => r.json()).then(res => {
                    if (res.details && res.details.length > 0) renderDetailsList(res.details, prodsContainer);
                    else prodsContainer.innerHTML = 'Sin detalles';
                });
        }
    }
};

// Helper for Incidents
function renderIncidentsList(list, container, idGuia) { // Added idGuia parameter
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'table-modern';
    table.style.width = '100%';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Descripción</th>
                <th>Cant</th>
                <th>Código Barra</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    list.forEach(item => {
        const tr = document.createElement('tr');
        // JSON can be serialized in button safely
        const itemStr = JSON.stringify(item).replace(/"/g, '&quot;');
        tr.innerHTML = `
            <td>${item.DescripcionProducto || 'Sin nombre'}</td>
            <td>${item.Cantidad}</td>
            <td><code>${item.CodigoBarra}</code></td>
            <td>
                <button class="btn-primary" style="padding:2px 8px; font-size:11px;" onclick="openIncidentResolve(${itemStr}, '${idGuia}')">
                    Procesar
                </button>
            </td>
        `;
        table.querySelector('tbody').appendChild(tr);
    });
    container.appendChild(table);
}

// Helper for Standard Details
function renderDetailsList(list, container) {
    const table = document.createElement('table');
    table.className = 'table-modern';
    // ... logic for standard details ...
    table.innerHTML = `<thead><tr><th>Código</th><th>Cant</th><th>Vencimiento</th></tr></thead><tbody></tbody>`;
    list.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
           <td>
               <div style="font-weight:bold; font-size:12px;">${d.productName || d.codigoProducto}</div>
               <div style="font-size:10px; opacity:0.7;">${d.codigoProducto}</div>
           </td>
           <td>${d.cantidad}</td>
           <td>${d.FechaVencimientoProducto ? new Date(d.FechaVencimientoProducto).toLocaleDateString() : '-'}</td>
        `;
        table.querySelector('tbody').appendChild(tr);
    });
    container.appendChild(table);
}


// --- TICKET PRINTING SYSTEM ---
window.copyToClipboard = function (text) {
    navigator.clipboard.writeText(text).then(() => {
        // Optional: Toast notification instead of alert?
        // alert("ID Copiado: " + text); 
    }).catch(err => console.error('Error copying:', err));
};

window.printTicket = function (type, id) {
    const dateStr = new Date().toLocaleString();
    let content = '';

    if (type === 'PRE') {
        const p = LOGISTICS_CACHE.preingresos.find(x => String(x.idPreingreso) === String(id));
        if (!p) return alert("Datos no encontrados");

        content = `
            <div class="ticket">
                <div class="header">
                    <h2>CONSTANCIA DE RECEPCIÓN</h2>
                    <p style="margin-bottom:10px;">${dateStr}</p>
                </div>
                <div class="dashed-line"></div>
                <div class="row">
                    <span class="label">ID:</span>
                    <span class="value">${p.idPreingreso}</span>
                </div>
                <div class="row">
                    <span class="label">PROVEEDOR:</span>
                    <span class="value">${p.proveedor}</span>
                </div>
                <div class="row">
                    <span class="label">MONTO REF:</span>
                    <span class="value">S/ ${p.monto || '0.00'}</span>
                </div>
                <div class="dashed-line"></div>
                <div class="section-title">NOTA / COMENTARIO:</div>
                <div class="comment-box">
                    ${p.comentario || 'Sin comentarios.'}
                </div>
                <div class="dashed-line"></div>
                <div class="footer">
                    <p>Recibido Conforme</p>
                    <br><br>
                    <div style="border-top:1px solid #000; width:60%; margin:0 auto;">Firma</div>
                    <p style="margin-top:15px; font-size:10px;">LevoWeb ERP System</p>
                </div>
            </div>
        `;
    } else {
        // Fallback for Guia or Other
        content = `<p>Impresión no disponible para ${type}</p>`;
        // If we want detailed Print for Guias too, we can add it here.
    }

    // Print Window (80mm Thermal Optimized)
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
        <html>
        <head>
            <title>Ticket ${id}</title>
            <style>
                @page { margin: 0; size: 80mm auto; }
                body { 
                    font-family: 'Courier New', monospace; 
                    margin: 0; 
                    padding: 10px; 
                    width: 76mm; /* Margins safety */
                    color: #000;
                    background: #fff;
                }
                .ticket { width: 100%; }
                .header { text-align: center; }
                h2 { font-size: 16px; margin: 0 0 5px 0; text-transform: uppercase; }
                p { margin: 0; font-size: 12px; }
                .dashed-line { border-bottom: 1px dashed #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                .label { font-weight: bold; }
                .value { text-align: right; max-width: 60%; word-wrap: break-word; }
                .section-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; text-transform: uppercase; }
                .comment-box { font-size: 12px; white-space: pre-wrap; word-wrap: break-word; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${content}
        </body>
        </html>
    `);
    win.document.close();
};

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

    // Create or show the modal
    let modal = document.getElementById('incident-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'incident-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card">
                <h3>Procesar Incidencia</h3>
                <p id="inc-prod-desc" style="font-weight:bold; color:var(--primary);"></p>
                <p id="inc-prod-meta" style="font-size:12px; color:var(--text-muted); margin-bottom:15px;"></p>
                
                <input type="hidden" id="inc-id-guia">
                <input type="hidden" id="inc-old-barcode">
                <input type="hidden" id="inc-id-producto"> <!-- NEW: Original Product ID -->
                
                <label style="font-size:12px;">Producto Real (Catálogo)</label>
                <input list="prod-list" id="inc-new-code" class="input-field" placeholder="Buscar código o nombre...">
                <datalist id="prod-list"></datalist>
                
                <label style="font-size:12px;">Cantidad Real</label>
                <input type="number" id="inc-new-qty" class="input-field">
                
                <label style="font-size:12px;">Vencimiento</label>
                <input type="date" id="inc-new-expiry" class="input-field">
                
                <div style="margin-top:20px; display:flex; gap:10px;">
                     <button class="btn button-secondary" onclick="closeModal('incident-modal')">Cancelar</button>
                     <button class="btn button-primary" onclick="submitIncidentResolve()">Guardar y Procesar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Set Hidden Values
    document.getElementById('inc-id-guia').value = idGuia;
    document.getElementById('inc-old-barcode').value = item.CodigoBarra;
    document.getElementById('inc-id-producto').value = item.IdProducto; // Store Original ID

    // Set Visuals
    document.getElementById('inc-prod-desc').innerText = item.DescripcionProducto;
    document.getElementById('inc-prod-meta').innerText = `Cant: ${item.Cantidad} | Barra: ${item.CodigoBarra}`;

    // Pre-fill inputs
    document.getElementById('inc-new-code').value = item.CodigoBarra || '';
    document.getElementById('inc-new-qty').value = item.Cantidad;
    document.getElementById('inc-new-expiry').value = ''; // Clear expiry or pre-fill if available

    // Update datalist options
    document.getElementById('prod-list').innerHTML = options;

    modal.classList.add('open');
}

// Helper to close any modal
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

window.submitIncidentResolve = async function () {
    const newCode = document.getElementById('inc-new-code').value;
    const newQty = document.getElementById('inc-new-qty').value;
    const newExpiry = document.getElementById('inc-new-expiry').value;

    // Hidden Fields
    const idGuia = document.getElementById('inc-id-guia').value;
    const oldBarcode = document.getElementById('inc-old-barcode').value; // Keep for finding row if needed
    const idProductoOriginal = document.getElementById('inc-id-producto').value; // CRITICAL: Original ID

    if (!newCode || !newQty) { alert("Completa código y cantidad"); return; }

    const btn = document.querySelector('#incident-modal .btn-primary');
    const OriginalText = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'processIncident',
                payload: {
                    idGuia,
                    oldBarcode,
                    idProductoOriginal, // New Field
                    newCode,
                    newQty,
                    newExpiry
                }
            })
        }).then(r => r.json());

        if (res.success) {
            closeModal('incident-modal');
            // Refresh Logistics to update lists and remove badge if empty
            loadLogistics();
            // Re-open details? Maybe just notify.
            alert("Procesado correctamente");
            // Optionally re-open details to show it's gone from list
            openGuiaDetails(idGuia);
        } else {
            alert("Error: " + res.error);
        }
    } catch (e) {
        alert("Error de red");
    } finally {
        btn.innerText = OriginalText;
        btn.disabled = false;
    }
}
// EDIT PRE-INGRESO (Real Modal)
window.openEditPreingreso = function (idPre) {
    const item = LOGISTICS_CACHE.preingresos.find(p => String(p.idPreingreso) === String(idPre));
    if (!item) return alert("Error: No encontrado");

    // Remove existing modal to ensure fresh state
    const existing = document.getElementById('edit-pre-modal');
    if (existing) existing.remove();

    // Modal HTML
    let modal = document.createElement('div');
    modal.id = 'edit-pre-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <h3 style="margin-top:0;">Editar Pre-Ingreso</h3>
            <input type="hidden" id="edit-pre-id" value="${item.idPreingreso || ''}">
            
            <label>Proveedor / Origen</label>
            <input type="text" id="edit-pre-prov" class="input-field" value="${item.proveedor || ''}">
            
            <label>Comentario / Detalle</label>
            <textarea id="edit-pre-comm" class="input-field" rows="4">${item.comentario || ''}</textarea>
            
            <label>Monto Referencial</label>
            <input type="number" id="edit-pre-monto" class="input-field" value="${item.monto || ''}">
            
            <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
                 <button class="btn button-secondary" onclick="document.getElementById('edit-pre-modal').remove()">Cancelar</button>
                 <button class="btn button-primary" onclick="submitEditPreingreso()">Guardar Cambios</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Force Open
    setTimeout(() => modal.classList.add('open'), 10);
};

window.submitEditPreingreso = async function () {
    const id = document.getElementById('edit-pre-id').value;
    const prov = document.getElementById('edit-pre-prov').value;
    const comm = document.getElementById('edit-pre-comm').value;
    const mont = document.getElementById('edit-pre-monto').value;

    const btn = document.querySelector('#edit-pre-modal .button-primary');
    const originalText = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updatePreingreso',
                payload: { idPreingreso: id, proveedor: prov, comentario: comm, monto: mont }
            })
        }).then(r => r.json());

        if (res.success) {
            alert("Actualizado correctamente.");
            document.getElementById('edit-pre-modal').remove();
            loadLogistics(); // Refresh UI
        } else {
            alert("Error: " + res.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión");
    } finally {
        if (btn) {
            btn.innerText = "Guardar Cambios";
            btn.disabled = false;
        }
    }
};

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

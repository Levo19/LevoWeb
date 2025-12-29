// CONFIG & CONSTANTS
const CREDENTIALS = { user: 'levo', pass: "666" };
const API_URL = 'https://script.google.com/macros/s/AKfycbw1qKTFZ7KH55Q1FxdXb1s29UqRZnw7tQs03K8yo529ZN9WA0uRZVK8yioSBP5lik8How/exec';

// STATE
let currentUser = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupNav();
    setupLogin();
});

function checkSession() {
    const u = localStorage.getItem('levo_user');
    if (u === CREDENTIALS.user) {
        currentUser = u;
        showApp();
    } else {
        showLogin();
    }
}

function setupLogin() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('username').value === CREDENTIALS.user &&
            document.getElementById('password').value === CREDENTIALS.pass) {
            localStorage.setItem('levo_user', CREDENTIALS.user);
            checkSession();
        } else {
            const err = document.getElementById('login-error');
            err.innerText = "Credenciales incorrectas";
            setTimeout(() => err.innerText = '', 2000);
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('levo_user');
        location.reload();
    });
}

function showApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    loadModule('dashboard');
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

// NAVIGATION SYSTEM
const MODULES = {
    dashboard: renderDashboard,
    'prod-solicitudes': renderSolicitudes,
    'prod-envasados': renderPlaceholder,
    'prod-ajustes': renderPlaceholder,
    'prod-auditorias': renderPlaceholder,
    'mov-guias': renderPlaceholder,
    'mov-preingresos': renderPlaceholder,
    'usuarios': renderPlaceholder,
    'compras': renderPlaceholder,
    'settings': renderSettings
};

function setupNav() {
    // Top Level toggles
    document.querySelectorAll('.nav-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.parentElement;
            group.classList.toggle('open');
            const icon = header.querySelector('.fa-chevron-right');
            if (icon) icon.style.transform = group.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
        });
    });

    // Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const mod = link.dataset.module;
            loadModule(mod);
        });
    });
}

function loadModule(moduleName) {
    const container = document.getElementById('module-content');
    const title = document.getElementById('page-title');

    // Set Title
    if (moduleName.includes('-')) {
        const parts = moduleName.split('-');
        title.innerText = parts[0].toUpperCase() + ': ' + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    } else {
        title.innerText = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    }

    if (MODULES[moduleName]) {
        MODULES[moduleName](container);
    } else {
        container.innerHTML = `<div class="card" style="text-align:center; padding:50px; color:var(--text-muted);">
            <i class="fas fa-tools" style="font-size:3rem; margin-bottom:20px; color:var(--border);"></i>
            <h3>Módulo en Desarrollo</h3>
        </div>`;
    }
}

// RENDERERS
function renderDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-label">Solicitudes Pendientes</div>
                <div class="stat-val" style="color:var(--neon-orange)">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Stock Crítico</div>
                <div class="stat-val" style="color:var(--danger)">5</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ventas Hoy</div>
                <div class="stat-val" style="color:var(--neon-green)">S/ 0.00</div>
            </div>
        </div>
        
         <div class="card">
            <div class="card-header">
                <h3>Bienvenido a LevoWeb 2.0</h3>
            </div>
            <p style="padding:20px; color:var(--text-muted)">Seleccione una opción del menú lateral para comenzar.</p>
        </div>
    `;
}

async function renderSolicitudes(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-file-invoice" style="color:var(--neon-orange)"></i> Gestión de Solicitudes</h3>
                <button class="btn-neon" onclick="openImportModal()"><i class="fas fa-file-import"></i> Importar Ventas</button>
            </div>
            <div style="overflow-x:auto">
                <table id="solTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Producto</th>
                            <th>Zona</th>
                            <th>Cantidad</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody id="solicitudes-body">
                        <tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">
                            <i class="fas fa-spinner fa-spin"></i> Cargando datos...
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- IMPORT MODAL -->
        <div id="import-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; justify-content:center; align-items:center;">
             <div class="card" style="width:600px; background:var(--primary-light);">
                <div class="card-header">
                    <h3>Importar Reporte de Ventas</h3>
                    <button onclick="closeImportModal()" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:20px;">
                    <div style="margin-bottom:15px;">
                        <label style="color:var(--text-muted); font-size:0.8rem;">Seleccione Zona (para asignar a estos pedidos)</label>
                        <select id="import-zone" style="width:100%; padding:10px; background:var(--primary); color:white; border:1px solid var(--border); border-radius:6px; margin-top:5px;">
                            <option value="Zona 1">Zona 1</option>
                            <option value="Zona 2">Zona 2</option>
                            <option value="General">General</option>
                        </select>
                    </div>

                    <div class="upload-area" style="border:2px dashed var(--border); padding:20px; text-align:center; margin-bottom:20px; border-radius:8px;">
                        <p style="color:var(--text-muted); margin-bottom:10px;">Copie desde Excel (Ctrl+C) y Pegue aquí (Ctrl+V)</p>
                        <textarea id="paste-area" placeholder="Pegue las filas aquí..." style="width:100%; height:150px; background:var(--primary); color:white; border:none; padding:10px; font-family:monospace; font-size:0.8rem; border-radius:6px;"></textarea>
                    </div>
                    
                    <div style="display:flex; justify-content:flex-end;">
                        <button class="btn-neon" onclick="processImport()">Procesar e Importar</button>
                    </div>
                </div>
             </div>
        </div>
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getSolicitudes' })
        });

        const text = await response.text(); // Get raw text first
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Server Response was not JSON:", text);
            throw new Error("Respuesta del servidor no válida (posible error HTML o Versión Antigua sin actualizar). Revisar Consola.");
        }

        const tbody = document.getElementById('solicitudes-body');
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(item => {
                const badgeClass = item.estado === 'Pendiente' ? 'badge-pending' : 'badge-completed';
                const borderColor = item.estado === 'Pendiente' ? 'var(--neon-orange)' : 'var(--neon-green)';

                tbody.innerHTML += `
                    <tr>
                        <td style="border-left-color:${borderColor}">${item.id}</td>
                        <td style="font-weight:600">${item.producto}</td>
                        <td>${item.zona}</td>
                        <td>${item.cantidad}</td>
                        <td><span class="badge ${badgeClass}">${item.estado}</span></td>
                        <td><button class="btn-neon" style="padding:4px 8px; font-size:0.7rem;">Ver</button></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">${result.error || 'No hay solicitudes registradas.'}</td></tr>`;
        }
    } catch (error) {
        document.getElementById('solicitudes-body').innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger)">Error: ${error.message}</td></tr>`;
    }
}

function renderPlaceholder(container) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:50px; color:var(--text-muted);">
        <i class="fas fa-tools" style="font-size:3rem; margin-bottom:20px; color:var(--border);"></i>
        <h3>Módulo en Desarrollo</h3>
    </div>`;
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Configuración</h3>
            </div>
            <div style="padding:20px;">
                <label style="display:block; margin-bottom:5px; color:var(--text-muted)">Google Apps Script API URL</label>
                <input type="text" id="api-url-input" value="${API_URL}" readonly 
                       style="width:100%; padding:10px; background:var(--primary); border:1px solid var(--border); color:var(--text-muted); border-radius:6px; cursor:not-allowed">
                <p style="font-size:0.8rem; margin-top:5px; color:var(--neon-green)">Conectado</p>
            </div>
        </div>
    `;
}

// LOGIC IMPORT
window.openImportModal = function () { document.getElementById('import-modal').style.display = 'flex'; }
window.closeImportModal = function () { document.getElementById('import-modal').style.display = 'none'; }

window.processImport = async function () {
    const raw = document.getElementById('paste-area').value;
    const zone = document.getElementById('import-zone').value;
    const btn = document.querySelector('#import-modal .btn-neon');

    if (!raw.trim()) return alert("No hay datos pegados");

    const lines = raw.trim().split('\n').map(l => l.split('\t'));
    if (lines.length < 2) return alert("Pega también los encabezados para detectar las columnas.");

    // Detect Columns by Header Name
    // User Headers: "Cod. Interno", "Producto", "Cantidad Total", "Total de venta"
    let idxCode = -1, idxName = -1, idxQty = -1, idxTotal = -1;

    // Scan first few rows to find header row
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const rowStr = lines[i].join(' ').toLowerCase();
        if (rowStr.includes('cod') && rowStr.includes('producto')) {
            headerRowIdx = i;
            // Map indices
            lines[i].forEach((cell, cellIdx) => {
                const c = cell.toLowerCase().trim();
                // "Cod. Interno" or similar
                if (c.includes('cod') && c.includes('interno')) idxCode = cellIdx;
                else if (c.includes('cod') && idxCode === -1) idxCode = cellIdx; // Fallback

                if (c === 'producto' || c === 'descripción' || c === 'descripcion') idxName = cellIdx;

                // "Cantidad Total"
                if (c.includes('cantidad') && (c.includes('total') || c === 'cantidad')) idxQty = cellIdx;

                // "Total de venta" or just "Total"
                if ((c.includes('total') && c.includes('venta')) || (c === 'total' && idxTotal === -1)) idxTotal = cellIdx;
            });
            break;
        }
    }

    if (idxCode === -1 || idxQty === -1 || idxTotal === -1) {
        return alert("No se pudieron identificar las columnas: 'Cod. Interno', 'Cantidad Total' y 'Total de venta'. Asegurate de copiar los encabezados.");
    }

    const items = [];
    // Start parsing from next row
    for (let i = headerRowIdx + 1; i < lines.length; i++) {
        const row = lines[i];
        if (!row[idxCode]) continue;

        const code = row[idxCode].replace(/'/g, '').trim(); // Remove excel apostrophe
        const name = row[idxName] || "Producto Desconocido";
        const qty = parseFloat(row[idxQty].replace(/,/g, '')); // Handle "1,000"
        const total = parseFloat(row[idxTotal].replace(/[S/$,]/g, '')); // Remove Currency

        if (code && !isNaN(qty) && !isNaN(total)) {
            items.push({
                code: code,
                productName: name,
                qty: qty,
                total: total
            });
        }
    }

    if (items.length === 0) return alert("No se encontraron filas de productos válidas.");

    const confirmMsg = `Se procesarán ${items.length} líneas.\n\nEl sistema calculará el factor basándose en el precio unitario.\n\n¿Enviar a procesar?`;
    if (confirm(confirmMsg)) {
        btn.innerText = "Calculando índices...";
        btn.disabled = true;

        try {
            // Use standard fetch if CORS allows, otherwise basic 'no-cors' wont return data
            // We assume deployed as "Anyone".
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'processSalesImport', // New Action
                    items: items,
                    zona: zone
                })
            });

            const text = await response.text();
            let result;
            try { result = JSON.parse(text); }
            catch (e) { throw new Error("Respuesta del servidor corrupta: " + text.substring(0, 50) + "..."); }

            if (result.success) {
                alert(`¡Éxito! Se generaron ${result.inserted} solicitudes.`);
                closeImportModal();
                // Refresh table
                const mod = document.querySelector('.nav-link.active');
                if (mod && mod.dataset.module === 'prod-solicitudes') loadModule('prod-solicitudes');
            } else {
                alert("Error del servidor: " + result.error);
            }

        } catch (error) {
            alert("Error comunicación: " + error.message);
        } finally {
            btn.innerText = "Procesar e Importar";
            btn.disabled = false;
        }
    }
}

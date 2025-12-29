// CONFIG & CONSTANTS
const CREDENTIALS = { user: 'levo', pass: "666" };
// Placeholder URL - User needs to Deploy GAS and paste it here
// We will prompt user for this.
let API_URL = localStorage.getItem('levo_api_url') || '';

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

function renderSolicitudes(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-file-invoice" style="color:var(--neon-orange)"></i> Gestión de Solicitudes</h3>
                <button class="btn-neon" onclick="openImportModal()"><i class="fas fa-file-import"></i> Importar Ventas</button>
            </div>
            <div style="overflow-x:auto">
                <table>
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
                            <i class="fas fa-spinner fa-spin"></i> Cargando...
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

    // Simulate Fetch for now (Real connection needs API_URL)
    // In real implementation, we would call fetch(API_URL, {body: JSON.stringify({action:'getSolicitudes'})})
    setTimeout(() => {
        document.getElementById('solicitudes-body').innerHTML = `
            <tr>
                <td style="border-left-color:var(--neon-green)">SOL-001</td>
                <td>AJI NOMOTO 50GR</td>
                <td>Zona 1</td>
                <td>20</td>
                <td><span class="badge badge-completed">Completado</span></td>
                <td><button class="btn-neon" style="padding:4px 8px; font-size:0.7rem;">Ver</button></td>
            </tr>
            <tr>
                <td style="border-left-color:var(--neon-orange)">SOL-002</td>
                <td>AJI PANCA ESPECIAL</td>
                <td>Zona 2</td>
                <td>50</td>
                <td><span class="badge badge-pending">Pendiente</span></td>
                <td><button class="btn-neon" style="padding:4px 8px; font-size:0.7rem;">Ver</button></td>
            </tr>
        `;
    }, 500);
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
                <input type="text" id="api-url-input" value="${API_URL}" placeholder="https://script.google.com/..." 
                       style="width:100%; padding:10px; background:var(--primary); border:1px solid var(--border); color:white; border-radius:6px;">
                <button class="btn-neon" style="margin-top:10px;" onclick="saveConfig()">Guardar Configuración</button>
            </div>
        </div>
    `;
}

window.saveConfig = function () {
    const url = document.getElementById('api-url-input').value;
    localStorage.setItem('levo_api_url', url);
    API_URL = url;
    alert("Configuración guardada");
}

// LOGIC IMPORT
window.openImportModal = function () { document.getElementById('import-modal').style.display = 'flex'; }
window.closeImportModal = function () { document.getElementById('import-modal').style.display = 'none'; }

window.processImport = function () {
    const raw = document.getElementById('paste-area').value;
    const zone = document.getElementById('import-zone').value;

    if (!raw.trim()) return alert("No hay datos pegados");

    // PARSE LOGIC (Tab Separate Values)
    const lines = raw.trim().split('\n');
    const items = [];

    lines.forEach(line => {
        const cols = line.split('\t');
        if (cols.length < 2) return; // Skip empty or invalid lines

        // Heuristics based on typical Excel usage
        let product = cols[0];
        let qty = 1;

        // If we have specific known columns, we'd map them by index. 
        // Based on user image: "Documento | Cod | Producto | Unidad | Categoria | ... | Cantidad | Total"
        // If they paste the whole table, it has many cols.
        // We look for the "Producto" (text) and "Cantidad" (number)

        // Simple logic: If we have > 3 cols, assume standard report format:
        // Col Index 2 (0-based) is often Code or Name?
        // Let's rely on user validating validation for now or generic:

        // Attempt to find the longest string (Name) and a number (Qty)
        let maxLen = 0;
        let pIndex = -1;
        cols.forEach((c, i) => {
            if (c.length > maxLen && isNaN(c)) {
                maxLen = c.length;
                pIndex = i;
            }
        });

        if (pIndex !== -1) product = cols[pIndex];

        // Find Qty: usually a number < 10000, distinct from Prices? 
        // Or assume it's right before Total?
        // Let's assume user copies just Product and Qty for now? 
        // Or we just grab the last number?

        // Better: Grab the last numeric column that is < 10000 (Quantities usually smaller than total Price in soles)
        let qIndex = -1;
        for (let i = cols.length - 1; i >= 0; i--) {
            // Replace commas? e.g. "1,00"
            let val = parseFloat(cols[i].replace(',', '.'));
            if (!isNaN(val) && i !== pIndex) {
                qIndex = i;
                // Ideally we want Quantity, not Price. 
                // Often Quantity is integer-like or smaller.
                // This is risky without strict indexes.
                // For Phase 1: We will trust the last column is Qty or Total. 
                // If the user pastes "Product | Qty", index 1 is Qty.
                break;
            }
        }

        if (qIndex !== -1) qty = cols[qIndex];

        items.push({
            producto: product,
            cantidad: qty,
            zona: zone
        });
    });

    console.log("Parsed Items:", items);

    const confirmMsg = `Se detectaron ${items.length} productos.\nEjemplo: ${items[0].producto} - ${items[0].cantidad}\n\n¿Enviar a Solicitudes?`;
    if (confirm(confirmMsg)) {
        // Send to backend
        alert("Simulación: Enviando datos...");
        closeImportModal();
        // Trigger generic refresh in real app
    }
}

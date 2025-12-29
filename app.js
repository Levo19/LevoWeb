// CONFIG
const CREDENTIALS = {
    user: 'levo',
    pass: '666'
};

const MODULES = {
    dashboard: renderDashboard,
    solicitudes: renderSolicitudes,
    warehouse: renderWarehouse,
    imos: renderImos,
    settings: renderSettings
};

// STATE
let currentUser = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    // Check session
    const storedUser = localStorage.getItem('levo_user');
    if (storedUser === CREDENTIALS.user) {
        loginSuccess();
    } else {
        document.getElementById('login-container').style.display = 'flex';
    }

    // Login Form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;

        if (u === CREDENTIALS.user && p === CREDENTIALS.pass) {
            localStorage.setItem('levo_user', u);
            loginSuccess();
        } else {
            const err = document.getElementById('login-error');
            err.innerText = "Credenciales incorrectas";
            setTimeout(() => err.innerText = "", 2000);
        }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('levo_user');
        location.reload();
    });

    // Nav
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            const mod = link.dataset.module;
            loadModule(mod);
        });
    });

    updateDate();
});

function loginSuccess() {
    currentUser = CREDENTIALS.user;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    loadModule('dashboard'); // Start
}

function loadModule(moduleName) {
    const title = document.getElementById('page-title');
    const container = document.getElementById('module-content');

    // Capitalize
    title.innerText = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

    if (MODULES[moduleName]) {
        MODULES[moduleName](container);
    } else {
        container.innerHTML = `<div class="card">Módulo en construcción</div>`;
    }
}

function updateDate() {
    const d = new Date();
    document.getElementById('date-display').innerText = d.toLocaleDateString('es-PE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// ================= RENDERERS =================

function renderDashboard(container) {
    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-label">Solicitudes Pendientes</div>
                <div class="stat-val">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ventas Hoy (iMos)</div>
                <div class="stat-val">S/ 0.00</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Alertas Warehouse</div>
                <div class="stat-val" style="color:var(--warning)">0</div>
            </div>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-chart-line"></i> Resumen de Operaciones</h3>
            <p style="color:var(--text-muted); margin-top:10px;">El sistema está listo para importar datos.</p>
        </div>
    `;
}

function renderSolicitudes(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3>Gestión de Solicitudes (Reposición)</h3>
            <button class="btn-primary" onclick="openImportModal()"><i class="fas fa-file-import"></i> Importar Reporte Ventas</button>
        </div>

        <div class="card">
            <table id="solicitudes-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Producto</th>
                        <th>Zona / Vendedor</th>
                        <th>Cantidad Solicitada</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
                            No hay solicitudes pendientes. Importe un reporte para generar.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- HIDDEN IMPORT MODAL (Simple implementation within the renderer for now) -->
        <div id="import-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; justify-content:center; align-items:center;">
             <div class="card" style="width:500px; background:var(--bg-card);">
                <h3 style="margin-bottom:20px;">Importar Reporte de Ventas</h3>
                <div class="upload-area" id="drop-zone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Arrastre el Excel aquí o haga clic para pegar los datos</p>
                </div>
                <!-- Simulating a text area for paste as parsing excel in pure JS requires libraries I might not have included yet -->
                <textarea id="paste-area" placeholder="O pegue el contenido de las columnas (Producto | Cantidad | Vendedor) aquí..." style="width:100%; height:150px; background:var(--primary-light); color:white; border:1px solid var(--border); border-radius:6px; padding:10px; margin-bottom:20px;"></textarea>
                
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button class="btn-primary" style="background:transparent; border:1px solid var(--border);" onclick="closeImportModal()">Cancelar</button>
                    <button class="btn-primary" onclick="processImport()">Procesar Datos</button>
                </div>
             </div>
        </div>
    `;
}

function renderWarehouse(container) {
    container.innerHTML = `<div class="card"><h3>Warehouse Integration</h3><p>Conexión pendiente con bdWarehouseWeb...</p></div>`;
}

function renderImos(container) {
    container.innerHTML = `<div class="card"><h3>iMos Integration</h3><p>Conexión pendiente con bdiMosWeb...</p></div>`;
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="card">
            <h3>Configuración del Sistema</h3>
            <div style="margin-top:20px;">
                <label style="display:block; margin-bottom:5px;">Sheet ID (LevoWeb)</label>
                <input type="text" value="PENDING" style="width:100%; padding:10px; background:var(--primary-light); border:1px solid var(--border); color:white; border-radius:6px;">
            </div>
        </div>
    `;
}

// ================= LOGIC =================

window.openImportModal = function () {
    document.getElementById('import-modal').style.display = 'flex';
}

window.closeImportModal = function () {
    document.getElementById('import-modal').style.display = 'none';
}

window.processImport = function () {
    const rawData = document.getElementById('paste-area').value;
    if (!rawData) {
        alert("Por favor pegue datos o suba un archivo (simulado).");
        return;
    }

    // MOCK PARSING LOGIC (To be refined with real data structure)
    // Assume Tab separated from Excel copy-paste
    const lines = rawData.trim().split('\n');
    console.log(`Procesando ${lines.length} líneas...`);

    alert(`Se han detectado ${lines.length} registros. Generando solicitudes...`);
    closeImportModal();
    // Here we would actually call the backend to insert into Sheet
}

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
                <div class="stat-val" style="color:var(--text-main)">0</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width:0%; background:var(--warning-neon)"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Stock Crítico</div>
                <div class="stat-val" style="color:var(--text-main)">5</div>
                 <div class="progress-container">
                    <div class="progress-bar" style="width:60%; background:var(--danger-neon)"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Ventas Hoy</div>
                <div class="stat-val" style="color:var(--text-main)">S/ 0.00</div>
                 <div class="progress-container">
                    <div class="progress-bar" style="width:15%; background:var(--success-neon)"></div>
                </div>
            </div>
        </div>
        
         <div class="card" style="min-height:300px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <div style="text-align:center; padding:40px;">
                <i class="fas fa-network-wired" style="font-size:4rem; color:var(--primary-neon); opacity:0.8; margin-bottom:20px; filter: drop-shadow(0 0 10px var(--primary-neon));"></i>
                <h2 style="font-family:'Rajdhani'; font-size:2rem; margin-bottom:10px;">BIENVENIDO A LEVOWEB 2.0</h2>
                <p style="color:var(--text-muted); max-width:500px; margin:0 auto; line-height:1.6;">
                    Sistema de Gestión Integrado optimizado. Seleccione un módulo del menú lateral para comenzar sus operaciones.
                </p>
            </div>
            <div style="width:100%; border-top:1px solid var(--border-color); padding:15px; text-align:center; font-size:0.8rem; color:var(--text-muted);">
                SYSTEM STATUS: <span style="color:var(--success-neon)">ONLINE</span> // LAST SYNC: <span id="last-sync-time">--:--</span>
            </div>
        </div>
    `;

    // Update sync time
    const now = new Date();
    setTimeout(() => {
        const el = document.getElementById('last-sync-time');
        if (el) el.innerText = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    }, 100);
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
                            <th>Código</th> <!-- Added Column -->
                            <th>Producto</th>
                            <th>Zona</th>
                            <th>Cantidad</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody id="solicitudes-body">
                        <tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">
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

                    <div id="drop-zone" class="file-drop-zone">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--primary-neon); margin-bottom: 10px;"></i>
                        <p style="margin-bottom: 10px; color:var(--text-main);">Arrastra tu Excel aquí o haz clic para buscar</p>
                        <input type="file" id="import-file" accept=".xlsx, .xls" style="display:none">
                        <button class="btn-neon" onclick="document.getElementById('import-file').click()">Buscar Archivo</button>
                        <p id="file-name" style="margin-top: 10px; color: var(--success-neon); font-size: 0.9rem; font-weight:bold; min-height:1.2em;"></p>
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
            // GLOBALLY STORE DATA FOR VIEWING
            window.currentSolicitudes = result.data;

            tbody.innerHTML = '';
            result.data.forEach(item => {
                const badgeClass = item.estado === 'Pendiente' ? 'badge-pending' : 'badge-completed';
                const borderColor = item.estado === 'Pendiente' ? 'var(--neon-orange)' : 'var(--neon-green)';

                tbody.innerHTML += `
                    <tr>
                        <td style="border-left-color:${borderColor}">${item.id}</td>
                        <td style="font-family:var(--font-mono); color:var(--text-muted);">${item.codigo || '-'}</td> <!-- CODE -->
                        <td style="font-weight:600">${item.producto}</td>
                        <td>${item.zona}</td>
                        <td>${item.cantidad}</td>
                        <td><span class="badge ${badgeClass}">${item.estado}</span></td>
                        <td><button class="btn-neon" onclick="showSolDetail('${item.id}')" style="padding:4px 8px; font-size:0.7rem;">Ver</button></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">${result.error || 'No hay solicitudes registradas.'}</td></tr>`;
        }
    } catch (error) {
        document.getElementById('solicitudes-body').innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger)">Error: ${error.message}</td></tr>`;
    }
}

window.showSolDetail = function (id) {
    const item = window.currentSolicitudes.find(i => i.id === id);
    if (item) {
        alert(`DETALLES SOLICITUD\n\nID: ${item.id} \nProducto: ${item.producto} \nZona: ${item.zona} \nCantidad Calc: ${item.cantidad} \n\nNOTAS DEL SISTEMA: \n${item.notas} \n\nFecha: ${item.fecha} `);
    }
}

function renderPlaceholder(container) {
    container.innerHTML = `< div class="card" style = "text-align:center; padding:50px; color:var(--text-muted);" >
        <i class="fas fa-tools" style="font-size:3rem; margin-bottom:20px; color:var(--border);"></i>
        <h3>Módulo en Desarrollo</h3>
    </div > `;
}

function renderSettings(container) {
    container.innerHTML = `
                    < div class="card" >
            <div class="card-header">
                <h3>Configuración</h3>
            </div>
            <div style="padding:20px;">
                <label style="display:block; margin-bottom:5px; color:var(--text-muted)">Google Apps Script API URL</label>
                <input type="text" id="api-url-input" value="${API_URL}" readonly 
                       style="width:100%; padding:10px; background:var(--primary); border:1px solid var(--border); color:var(--text-muted); border-radius:6px; cursor:not-allowed">
                <p style="font-size:0.8rem; margin-top:5px; color:var(--neon-green)">Conectado</p>
            </div>
        </div >
                    `;
}

// LOGIC IMPORT
window.openImportModal = function () {
    document.getElementById('import-modal').style.display = 'flex';
    // Reset inputs
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.value = '';
    const fileName = document.getElementById('file-name');
    if (fileName) fileName.innerText = '';

    setupDragDrop(); // Ensure listeners are attached
}
window.closeImportModal = function () { document.getElementById('import-modal').style.display = 'none'; }

function setupDragDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('import-file');

    if (!dropZone || dropZone.dataset.ready === 'true') return; // Prevent double binding
    dropZone.dataset.ready = 'true';

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
    });
}

function handleFileSelect(file) {
    const fnDisplay = document.getElementById('file-name');
    fnDisplay.innerText = "Archivo: " + file.name;
    fnDisplay.classList.add('pulse-anim'); // Optional visual cue
}

window.processImport = async function () {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    const zone = document.getElementById('import-zone').value;
    const btn = document.querySelector('#import-modal .btn-neon');

    if (!file) return alert("Por favor, selecciona o arrastra un archivo Excel.");

    btn.innerText = "Leyendo Excel...";
    btn.disabled = true;

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Use header:1 to get raw array of arrays
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            // Scan for Header Row (Cod + Producto)
            let headerRowIdx = -1;
            // Scan first 30 rows
            for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                const rowStr = JSON.stringify(jsonData[i]).toLowerCase();
                if (rowStr.includes('cod') && rowStr.includes('producto')) {
                    headerRowIdx = i;
                    break;
                }
            }

            if (headerRowIdx === -1) throw new Error("No se encontraron los encabezados 'Cod. Interno' y 'Producto' en las primeras 30 filas.");

            // Map Columns
            const headers = jsonData[headerRowIdx];
            let idxCode = -1, idxName = -1, idxQty = -1, idxTotal = -1;

            headers.forEach((h, i) => {
                if (!h) return;
                const txt = String(h).toLowerCase().trim();

                if (txt.includes('cod') && txt.includes('interno')) idxCode = i;
                else if (txt.includes('producto')) idxName = i;
                else if (txt.includes('cantidad') && (txt.includes('total') || txt === 'cantidad')) idxQty = i;
                else if ((txt.includes('total') && txt.includes('venta')) || txt === 'total') idxTotal = i;
            });

            if (idxCode === -1 || idxQty === -1 || idxTotal === -1) {
                throw new Error(`Faltan columnas clave.Detectadas: Código(${idxCode !== -1}), Cantidad(${idxQty !== -1}), Total(${idxTotal !== -1}).`);
            }

            const items = [];

            // Process Rows
            for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                // Handle Code as Text
                let rawCode = row[idxCode];
                if (rawCode === undefined || rawCode === null || rawCode === "") continue;

                let codeStr = String(rawCode).trim().replace(/'/g, '');

                const name = row[idxName] || "Desconocido";

                // Clean numbers
                let rawQty = String(row[idxQty]).replace(/,/g, '');
                let rawTotal = String(row[idxTotal]).replace(/[S/$,]/g, '');

                const qty = parseFloat(rawQty);
                const total = parseFloat(rawTotal);

                if (codeStr && !isNaN(qty) && !isNaN(total)) {
                    // Filter out header repetition or empty junk
                    items.push({
                        code: codeStr,
                        productName: name,
                        qty: qty,
                        total: total
                    });
                }
            }

            if (items.length === 0) throw new Error("No se encontraron productos válidos en el archivo.");

            const confirmMsg = `Se detectaron ${items.length} productos.\n\n¿Enviar al servidor ? `;

            if (confirm(confirmMsg)) {
                btn.innerText = "Calculando Factores...";

                // Fetch
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'processSalesImport',
                        items: items,
                        zona: zone
                    })
                });

                const text = await response.text();
                let result;
                try { result = JSON.parse(text); }
                catch (e) { throw new Error("Respuesta inválida servidor: " + text.substring(0, 50)); }

                if (result.success) {
                    alert(`¡Éxito! Importados: ${result.inserted} registros.`);
                    closeImportModal();
                    // Refresh if needed
                    const mod = document.querySelector('.nav-link.active');
                    if (mod && mod.dataset.module === 'prod-solicitudes') loadModule('prod-solicitudes');
                } else {
                    alert("Error servidor: " + result.error);
                }
            }

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            btn.innerText = "Procesar e Importar";
            btn.disabled = false;
        }
    };

    reader.readAsArrayBuffer(file);
}

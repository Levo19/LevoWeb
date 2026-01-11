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
            'warehouse': 'Gestión de Almacén',
            'movements': 'Movimientos',
            'purchases': 'Compras',
            'users': 'Usuarios'
        };
        titleEl.innerText = titles[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
    }

    // 6. Trigger Data Load
    if (viewName === 'warehouse') loadWarehouseData();
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

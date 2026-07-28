// ==========================================
// 🔗 การตั้งค่า API (เชื่อมต่อ Node.js Backend)
// ==========================================
const API_URL = 'http://localhost:3000/api';

// ==========================================
// 🔄 คืนค่า Session เมื่อรีเฟรชหน้าเว็บ
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userName = localStorage.getItem('userName'); // 🔴 เรียกใช้ userName
    
    if (token && role) {
        document.getElementById('display-role').innerText = role;
        document.getElementById('display-name').innerText = userName || 'ผู้ใช้งาน';
        
        setupRoleUI(role);
        loadDashboardState(); // เรียกคืนข้อมูลที่กรอกค้างไว้
    }
});

// ==========================================
// 💾 ระบบบันทึกสถานะ Live Dashboard ชั่วคราว 
// ==========================================
function saveDashboardState() {
    const mode = document.querySelector('input[name="input_mode"]:checked').value;
    const temp = document.getElementById('val-temp').value;
    const weight = document.getElementById('val-weight').value;
    const height = document.getElementById('val-height').value;
    const sys = document.getElementById('val-sys').value;
    const dia = document.getElementById('val-dia').value;
    const bpm = document.getElementById('val-bpm').value;
    
    // เพิ่มการจำ ID ผู้ป่วยในคิว
    const activePatientId = el.activePatientId.value;
    const activePatientName = el.activePatientId.dataset.name || '';

    localStorage.setItem('dashboard_state', JSON.stringify({
        mode, temp, weight, height, sys, dia, bpm, activePatientId, activePatientName
    }));
}

function loadDashboardState() {
    const stateStr = localStorage.getItem('dashboard_state');
    if (stateStr) {
        const state = JSON.parse(stateStr);
        
        // 1. คืนค่า โหมด (Mode 1 / Mode 2)
        const radio = document.querySelector(`input[name="input_mode"][value="${state.mode}"]`);
        if(radio) {
            radio.checked = true;
            const isManual = state.mode === '2';
            el.manualInputs.forEach(input => input.disabled = !isManual);
            el.btnSaveManual.style.display = isManual ? 'flex' : 'none';
        }
        
        // 2. คืนค่า คิวผู้ป่วย และ ล็อกฟอร์มสมัครทันที
        if (state.activePatientId) {
            el.activePatientId.readOnly = true; // 🔴 ล็อกช่องไม่ให้พิมพ์
            el.activePatientId.style.background = '#e2e8f0'; // 🔴 เปลี่ยนสีพื้นหลังให้ดูเป็นสีเทา
            
            el.activePatientId.value = state.activePatientId;
            el.activePatientId.dataset.name = state.activePatientName;
            currentActivePatientId = state.activePatientId; // ดึงตัวแปรกลับมา เพื่อไม่ให้ระบบคิดว่าเป็นคนใหม่

            const btnRegister = document.querySelector('#officer-register-form .save-btn');
            const officerInputs = document.querySelectorAll('#officer-register-form input');
            if (btnRegister) {
                btnRegister.disabled = true;
                btnRegister.innerHTML = '<i class="fa-solid fa-lock"></i> มีผู้ป่วยอยู่ในคิว (รอตรวจเสร็จ)';
                btnRegister.style.opacity = '0.5';
                btnRegister.style.cursor = 'not-allowed';
                officerInputs.forEach(input => input.disabled = true);
            }
        }

        // 3. คืนค่า ตัวเลขเซนเซอร์
        document.getElementById('val-temp').value = state.temp || 0;
        document.getElementById('val-weight').value = state.weight || 0;
        document.getElementById('val-height').value = state.height || 0;
        document.getElementById('val-sys').value = state.sys || 0;
        document.getElementById('val-dia').value = state.dia || 0;
        document.getElementById('val-bpm').value = state.bpm || 0;
    }
}

// ==========================================
// 💾 ระบบบันทึก/ล้างสถานะ Live Dashboard
// ==========================================
function clearDashboardState() {
    localStorage.removeItem('dashboard_state'); 
    el.manualInputs.forEach(input => input.value = 0); 
    
    el.activePatientId.value = '';
    el.activePatientId.readOnly = false; // 🔴 ปลดล็อกให้สแกนใหม่ได้
    el.activePatientId.style.background = '#ffffff'; // 🔴 เปลี่ยนสีพื้นหลังเป็นปกติ
    if(el.activePatientId.dataset) el.activePatientId.dataset.name = '';

    const btnRegister = document.querySelector('#officer-register-form .save-btn');
    const officerInputs = document.querySelectorAll('#officer-register-form input');
    
    // 🔴 บังคับปลดล็อกฟอร์มให้กรอกใหม่ได้อย่างสมบูรณ์
    if (btnRegister) {
        btnRegister.disabled = false;
        btnRegister.innerHTML = '<i class="fa-solid fa-check"></i> สมัครให้ผู้ป่วยและเตรียมคิว';
        btnRegister.style.opacity = '1';
        btnRegister.style.cursor = 'pointer';
        officerInputs.forEach(input => input.disabled = false);
    }
    
    const btnCancelQueue = document.getElementById('btn-cancel-queue');
    if (btnCancelQueue) btnCancelQueue.style.display = 'none';
}
// --- DOM Elements ---
const el = {
    loginPage: document.getElementById('login-page'),
    signupPage: document.getElementById('signup-page'),
    appContainer: document.getElementById('app-container'),
    toast: document.getElementById('toast'),
    
    // Auth Buttons
    btnLogin: document.getElementById('btn-login'),
    btnLogout: document.getElementById('btn-logout'),
    linkToSignup: document.getElementById('link-to-signup'),
    linkToLogin: document.getElementById('link-to-login'),

    // Sections
    secLive: document.getElementById('live-section'),
    secHistory: document.getElementById('history-section'),
    secPatients: document.getElementById('patients-section'),
    secStation: document.getElementById('station-section'),
    secAdmin: document.getElementById('admin-section'),

    // Nav Buttons
    navLive: document.getElementById('btn-live'),
    navHistory: document.getElementById('btn-history'),
    navPatients: document.getElementById('btn-patients'),
    navStation: document.getElementById('btn-station'),
    navAdmin: document.getElementById('btn-admin'),

    // Input Mode Fields
    activePatientId: document.getElementById('active-patient-id'),
    radioModes: document.getElementsByName('input_mode'),
    manualInputs: document.querySelectorAll('.manual-input'),
    btnSaveManual: document.getElementById('btn-save-manual')
};


// ==========================================
// 🛠️ UI Helpers
// ==========================================
function showToast(message, type = 'success') {
    el.toast.innerText = message;
    el.toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), 3000);
}

function getToken() { return localStorage.getItem('token'); }
function getRole() { return localStorage.getItem('role'); }

// ==========================================
// 🔑 ระบบ Login / Auth
// ==========================================
el.btnLogin.addEventListener('click', async () => {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    if(!user || !pass) return showToast('กรุณากรอก Username และ Password', 'error');

    el.btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('userId', data.userId);
            
            // 🔴 จับเอาชื่อและนามสกุลมาต่อกัน แทนการเรียก data.name
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            localStorage.setItem('userName', fullName);
            
            document.getElementById('display-role').innerText = data.role;
            document.getElementById('display-name').innerText = fullName;
            
            showToast('เข้าสู่ระบบสำเร็จ');
            setupRoleUI(data.role);
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    } finally {
        el.btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    }
});

el.btnLogout.addEventListener('click', () => {
    localStorage.clear();
    location.reload(); // รีเฟรชหน้าเพื่อล้าง State
});

el.linkToSignup.addEventListener('click', () => {
    el.loginPage.style.display = 'none';
    el.signupPage.style.display = 'flex';
});
el.linkToLogin.addEventListener('click', () => {
    el.signupPage.style.display = 'none';
    el.loginPage.style.display = 'flex';
});
// ==========================================
// 📝 ระบบสมัครสมาชิกผู้ป่วย (ลงทะเบียนด้วยตนเอง)
// ==========================================
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🔴 ดึงค่าโรคและยา ถ้าเลือกอื่นๆ ให้ไปดึงจากช่องพิมพ์แทน
    let finalDisease = document.getElementById('signup-disease').value;
    if (finalDisease === 'อื่นๆ') finalDisease = document.getElementById('signup-disease-other').value;
    
    let finalAllergy = document.getElementById('signup-allergy').value;
    if (finalAllergy === 'อื่นๆ') finalAllergy = document.getElementById('signup-allergy-other').value;

    const body = {
        firstName: document.getElementById('signup-firstname').value,
        lastName: document.getElementById('signup-lastname').value,
        nationalId: document.getElementById('signup-nationalId').value,
        dob: document.getElementById('signup-dob').value,
        gender: document.getElementById('signup-gender').value,
        disease: finalDisease, // ใช้ค่าที่กรองแล้ว
        allergy: finalAllergy, // ใช้ค่าที่กรองแล้ว
        username: document.getElementById('signup-username').value,
        password: document.getElementById('signup-password').value,
    };

    try {
        const res = await fetch(`${API_URL}/patient/register`, { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify(body) 
        });
        const data = await res.json();
        
        if (res.ok) { 
            showToast('สมัครสำเร็จ กรุณาเข้าสู่ระบบ!'); 
            document.getElementById('link-to-login').click(); 
            document.getElementById('signup-form').reset();
        } else { 
            showToast(data.error, 'error'); 
        }
    } catch(err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
});

// ==========================================
// 🛡️ จัดการสิทธิ์การแสดงผลเมนู (Role-Based UI)
// ==========================================
// ==========================================
// 🛡️ จัดการสิทธิ์การแสดงผลเมนู (Role-Based UI)
// ==========================================
function setupRoleUI(role) {
    el.loginPage.style.display = 'none';
    el.appContainer.style.display = 'block';

    // 🔴 1. เพิ่มปุ่ม btn-my-health เข้าไปในคำสั่งซ่อนเมนู
    [el.navLive, el.navHistory, el.navPatients, el.navStation, el.navAdmin, document.getElementById('btn-my-health')].forEach(n => {
        if(n) n.style.display = 'none';
    });

    const roleFilter = document.getElementById('role-filter-container');

 // 🔴 แก้ไขบล็อก PATIENT ให้โชว์ทั้งปุ่ม "ข้อมูลสุขภาพ" และปุ่ม "History"
    if (role === 'PATIENT') {
        const btnMyHealth = document.getElementById('btn-my-health');
        if(btnMyHealth) btnMyHealth.style.display = 'block'; // โชว์ปุ่ม Dashboard
        
        el.navHistory.style.display = 'block'; // 🔴 โชว์ปุ่มตารางประวัติ
        el.navHistory.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> ประวัติการตรวจ'; // เปลี่ยนชื่อให้เข้าใจง่าย
        
        // สั่งให้โหลดและโชว์หน้า Dashboard ส่วนตัวทันทีที่ล็อกอิน
        viewPatientRecord(localStorage.getItem('userId'));
    }
    
    // ... โค้ดของ OFFICER และ ADMIN ด้านล่างคงเดิม ...
    else if (role === 'OFFICER') {
        el.navLive.style.display = 'block';
        el.navHistory.style.display = 'block';
        el.navPatients.style.display = 'block';
        el.navStation.style.display = 'block';
        
        // บังคับเปลี่ยนชื่อเมนูของ Officer
        el.navPatients.innerHTML = '<i class="fa-solid fa-users"></i> Patients';
        const titleEl = document.getElementById('user-management-title');
        if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-users"></i> จัดการข้อมูลผู้ป่วย';
        if(roleFilter) roleFilter.style.display = 'none'; // ซ่อนตัวกรอง

        showSection('live');
        startBypassChecker();
    }
    else if (role === 'ADMIN') {
        el.navLive.style.display = 'block';
        el.navHistory.style.display = 'block';
        el.navPatients.style.display = 'block';
        el.navStation.style.display = 'block';
        el.navAdmin.style.display = 'block';
        
        // บังคับเปลี่ยนชื่อเมนูของ Admin ถาวร
        el.navPatients.innerHTML = '<i class="fa-solid fa-users"></i> OFFICER / Patients';
        const titleEl = document.getElementById('user-management-title');
        if(titleEl) titleEl.innerHTML = '<i class="fa-solid fa-users-gear"></i> จัดการข้อมูล (OFFICER & Patients)';
        if(roleFilter) roleFilter.style.display = 'flex'; // เปิดตัวกรอง

        showSection('admin');
    }
}

// Navigation Logic
// ==========================================
// 🧭 ระบบสลับหน้าจอ (Navigation Logic)
// ==========================================
function showSection(sec) {
    // 1. ซ่อนทุกหน้าก่อน
    const sections = [el.secLive, el.secHistory, el.secPatients, el.secStation, el.secAdmin, document.getElementById('patient-detail-section')];
    sections.forEach(s => { if(s) s.style.display = 'none'; });

    // 🔴 2. เพิ่มปุ่มใหม่เข้าไปในคำสั่งเอาไฮไลท์ออก
    const navs = [el.navLive, el.navHistory, el.navPatients, el.navStation, el.navAdmin, document.getElementById('btn-my-health')];
    navs.forEach(n => { if(n) n.classList.remove('active'); });

    // 3. โชว์หน้าที่เลือก
    if (sec === 'live') { el.secLive.style.display = 'block'; el.navLive.classList.add('active'); }
    if (sec === 'history') { el.secHistory.style.display = 'block'; el.navHistory.classList.add('active'); fetchHistory(); }
    if (sec === 'patients') { el.secPatients.style.display = 'block'; el.navPatients.classList.add('active'); }
    if (sec === 'station') { el.secStation.style.display = 'block'; el.navStation.classList.add('active'); }
    if (sec === 'admin') { el.secAdmin.style.display = 'block'; el.navAdmin.classList.add('active'); }
    if (sec === 'patient-detail-section') { 
        document.getElementById('patient-detail-section').style.display = 'block'; 
        // 🔴 3. เปลี่ยนให้ไฮไลท์ปุ่ม "ข้อมูลสุขภาพ" แทน สำหรับผู้ป่วย
        if (getRole() === 'PATIENT' && document.getElementById('btn-my-health')) document.getElementById('btn-my-health').classList.add('active');
        else if (el.navPatients) el.navPatients.classList.add('active');
    }
}

// ==========================================
// 🖱️ รวมคำสั่งคลิกเมนูและการค้นหา (ลบส่วนที่ซ้ำซ้อนออก)
// ==========================================
// 1. การคลิกเปลี่ยนหน้าเมนูหลัก
el.navLive.addEventListener('click', () => showSection('live'));
el.navHistory.addEventListener('click', () => { showSection('history'); fetchHistory(); });
el.navStation.addEventListener('click', () => showSection('station'));
el.navAdmin.addEventListener('click', () => showSection('admin'));
// ทำให้ปุ่ม "ข้อมูลสุขภาพ" กดได้ (ดึงประวัติมาประมวลผลใหม่)
const btnMyHealth = document.getElementById('btn-my-health');
if (btnMyHealth) {
    btnMyHealth.addEventListener('click', () => {
        viewPatientRecord(localStorage.getItem('userId'));
    });
}

// 2. การคลิกเข้าหน้า OFFICER / Patients
el.navPatients.addEventListener('click', () => { 
    showSection('patients'); 
    // โหลดตารางใหม่ทุกครั้งที่กดเข้ามาหน้านี้ โดยอ่านค่าจากช่อง Filter
    fetchUsers(document.getElementById('search-user-input').value); 
});

// 3. ปุ่มค้นหาผู้ใช้
document.getElementById('btn-search-user').addEventListener('click', () => {
    fetchUsers(document.getElementById('search-user-input').value);
});

// 4. เมื่อ Admin กดเปลี่ยนตัวกรองบทบาท (Dropdown) ให้ตารางรีเฟรชทันที
const roleSelect = document.getElementById('filter-role-select');
if (roleSelect) {
    roleSelect.addEventListener('change', () => {
        fetchUsers(document.getElementById('search-user-input').value);
    });
}

// ==========================================
// 📡 1. Live Dashboard (2 Modes + Bypass Register)
// ==========================================

// สมัครให้ผู้ป่วย (Bypass 1 รอบ)
document.getElementById('officer-register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 🔴 เปลี่ยนมาเช็ค readOnly แทน เพื่อป้องกันบักเวลาเผลอพิมพ์เว้นวรรคทิ้งไว้ในช่องสแกน
    if (el.activePatientId.readOnly) {
        return showToast('ไม่สามารถสมัครได้! มีผู้ป่วยรอตรวจอยู่ในคิว', 'error');
    }

    // 🔴 ดึงค่าโรคและยา ถ้าเลือกอื่นๆ ให้ไปดึงจากช่องพิมพ์แทน
    let finalOffDisease = document.getElementById('off-disease').value;
    if (finalOffDisease === 'อื่นๆ') finalOffDisease = document.getElementById('off-disease-other').value;
    
    let finalOffAllergy = document.getElementById('off-allergy').value;
    if (finalOffAllergy === 'อื่นๆ') finalOffAllergy = document.getElementById('off-allergy-other').value;

    const body = {
        firstName: document.getElementById('off-fname').value,
        lastName: document.getElementById('off-lname').value,
        nationalId: document.getElementById('off-nid').value,
        dob: document.getElementById('off-dob').value,
        gender: document.getElementById('off-gender').value,
        disease: finalOffDisease, // ใช้ค่าที่กรองแล้ว
        allergy: finalOffAllergy, // ใช้ค่าที่กรองแล้ว
        username: document.getElementById('off-username').value,
        password: document.getElementById('off-password').value,
    };
    
    try {
        const res = await fetch(`${API_URL}/officer/register-patient`, {
            method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`},
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('สมัครผู้ป่วยและเตรียมคิวสำเร็จ!');
            document.getElementById('officer-register-form').reset();
            checkActiveQueue(); 
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Error', 'error'); }
});

// สลับโหมด 1 (IoT) / 2 (Manual)
el.radioModes.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isManual = e.target.value === '2';
        el.manualInputs.forEach(input => input.disabled = !isManual);
        el.btnSaveManual.style.display = isManual ? 'flex' : 'none';
        
        if (!isManual) {
            // โหมด 1: ล้างค่าออก เพื่อรอรับจาก ESP32
            clearDashboardState();
        } else {
            // โหมด 2: จำโหมดปัจจุบันไว้
            saveDashboardState();
        }
    });
});

// บันทึกค่าทันทีที่มีการพิมพ์ตัวเลข (สำหรับ Mode 2)
el.manualInputs.forEach(input => {
    input.addEventListener('input', saveDashboardState);
});

let currentActivePatientId = null;

async function checkActiveQueue() {
    if(getRole() === 'PATIENT') return;
    try {
        // 🟢 เปลี่ยนกลับเป็นคำสั่งเช็คคิวที่ถูกต้อง
        const res = await fetch(`${API_URL}/iot/check-bypass`);
        const data = await res.json();
        
        const btnReg = document.querySelector('#officer-register-form .save-btn');
        const offInp = document.querySelectorAll('#officer-register-form input');
        const btnCan = document.getElementById('btn-cancel-queue');
        
        if (data.status === 'ready_bypass' || data.status === 'ready') {
            el.activePatientId.readOnly = true; // 🔴 ล็อกช่องไม่ให้พิมพ์แทรกตอนมีคิว
            el.activePatientId.style.background = '#e2e8f0'; // 🔴 เปลี่ยนสีพื้นหลังให้ดูเป็นสีเทา
            
            el.activePatientId.value = data.patientId;
            el.activePatientId.dataset.name = data.name;
            
            if (btnReg) { 
                btnReg.disabled = true; 
                btnReg.innerHTML = '<i class="fa-solid fa-lock"></i> มีผู้ป่วยอยู่ในคิว (รอตรวจเสร็จ)'; 
                btnReg.style.opacity = '0.5';
                btnReg.style.cursor = 'not-allowed';
                offInp.forEach(i => i.disabled = true); 
            }
            if (btnCan) btnCan.style.display = 'block';
            
            if (currentActivePatientId !== data.patientId) {
                currentActivePatientId = data.patientId;
                if (document.querySelector('input[name="input_mode"]:checked').value === '1') {
                    clearDashboardState();
                }
                saveDashboardState(); 
            }
        } else {
            // 🟢 คิวว่างลง
            if (currentActivePatientId) {
                showToast('คิวตรวจเสร็จสิ้นแล้ว! ระบบพร้อมรับคิวใหม่', 'success');
                currentActivePatientId = null; 
            }
            // 🔴 บังคับเคลียร์หน้าจอทั้งหมด รีเซ็ตตัวเลขกลับเป็น 0 ทันที
            clearDashboardState();
        }
    } catch (e) {}
}

// ฟังก์ชันดึงข้อมูลมาแสดงบนหน้าจอและจำค่าไว้
async function fetchLatestRecordAndDisplay(patientId) {
    try {
        const res = await fetch(`${API_URL}/iot/latest-record?patientId=${patientId}`);
        if (res.ok) {
            const record = await res.json();
            if (record && (record.temp || record.weight || record.sys)) {
                document.getElementById('val-temp').value = record.temp || 0;
                document.getElementById('val-weight').value = record.weight || 0;
                document.getElementById('val-height').value = record.height || 0;
                document.getElementById('val-sys').value = record.sys || 0;
                document.getElementById('val-dia').value = record.dia || 0;
                document.getElementById('val-bpm').value = record.bpm || 0;
                
                saveDashboardState(); // <--- จำค่าที่ดึงมาลง localStorage รีเฟรชก็ไม่หาย
                showToast('อัปเดตผลตรวจจากตู้ IoT ขึ้นหน้าจอสำเร็จ!', 'success');
            }
        }
    } catch(e) {}
}

// // ฟังก์ชันดึงข้อมูลมาแสดงบนหน้าจอ
// async function fetchLatestRecordAndDisplay(patientId) {
//     try {
//         const res = await fetch(`${API_URL}/iot/latest-record?patientId=${patientId}`);
//         if (res.ok) {
//             const record = await res.json();
//             if (record && record.temp) {
//                 document.getElementById('val-temp').value = record.temp || 0;
//                 document.getElementById('val-weight').value = record.weight || 0;
//                 document.getElementById('val-height').value = record.height || 0;
//                 document.getElementById('val-sys').value = record.sys || 0;
//                 document.getElementById('val-dia').value = record.dia || 0;
//                 showToast('อัปเดตผลตรวจขึ้นหน้าจอสำเร็จ!', 'success');
//             }
//         }
//     } catch(e) {}
// }

function startBypassChecker() {
    checkActiveQueue();
    setInterval(checkActiveQueue, 5000); // เช็คทุก 5 วินาที
}

// โหมด 2: บันทึกข้อมูลแบบ Manual
el.btnSaveManual.addEventListener('click', async () => {
    const patientId = el.activePatientId.value;
    if (!patientId) return showToast('ไม่มีผู้ป่วยอยู่ในคิว หรือ ไม่ได้สแกน Barcode', 'error');

    // 🔴 สร้างแพ็กเกจข้อมูลตัวเลขที่จะส่งไป Database (ของเดิมหายไป)
    const body = {
        patientId: patientId,
        temp: parseFloat(document.getElementById('val-temp').value) || 0,
        weight: parseFloat(document.getElementById('val-weight').value) || 0,
        height: parseFloat(document.getElementById('val-height').value) || 0,
        sys: parseInt(document.getElementById('val-sys').value) || 0,
        dia: parseInt(document.getElementById('val-dia').value) || 0,
        bpm: parseInt(document.getElementById('val-bpm').value) || 0
    };

    try {
        const res = await fetch(`${API_URL}/iot/save-data`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if (res.ok) {
            showToast('บันทึกข้อมูลโหมดแมนนวลสำเร็จ จบรอบ!');
            el.activePatientId.value = ''; 
            clearDashboardState(); 
        } else showToast('บันทึกไม่สำเร็จ', 'error');
    } catch (err) { showToast('Error', 'error'); }
});

// ==========================================
// 🕰️ 2. History Section (ดึงประวัติการบันทึก)
// ==========================================
async function fetchHistory() {
    try {
        const res = await fetch(`${API_URL}/history`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        const data = await res.json();
        
        const tbody = document.getElementById('history-body');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">ไม่มีประวัติการบันทึกข้อมูล</td></tr>';
            return;
        }

        data.forEach(record => {
            const date = new Date(record.recordedAt).toLocaleString();
            const name = record.patient ? `${record.patient.firstName} ${record.patient.lastName}` : 'N/A';
            const barcode = record.patient ? record.patient.barcode : '-';
            
            // นำ BPM ออก และใส่ค่า height คั่นระหว่าง weight กับ BP
            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${barcode}</td>
                    <td>${name}</td>
                    <td>${record.temp || '-'} °C</td>
                    <td>${record.weight || '-'} kg</td>
                    <td>${record.height || '-'} cm</td>
                    <td>${record.sys || '-'}/${record.dia || '-'}</td>
                </tr>
            `;
        });
    } catch (err) { showToast('ดึงข้อมูลประวัติไม่ได้', 'error'); }
}
document.getElementById('refresh-history').addEventListener('click', fetchHistory);

// ==========================================
// 👥 3. Patients / Users Section (จัดการข้อมูล)
// ==========================================

// ฟังก์ชันดึงรายชื่อมาโชว์ในตาราง
async function fetchUsers(searchQuery = '') {
    try {
        const token = localStorage.getItem('token'); 
        const currentRole = localStorage.getItem('role'); 
        
        const res = await fetch(`${API_URL}/users?search=${searchQuery}`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        const data = await res.json();
        
        // 🔴 1. เช็คว่าเลือก Dropdown กรองบทบาทไหนอยู่
        const filterRole = document.getElementById('filter-role-select') ? document.getElementById('filter-role-select').value : 'ALL';
        
        // 🔴 2. คัดกรองข้อมูลจาก Database ตามบทบาทที่เลือก
        let filteredData = data;
        if (currentRole === 'ADMIN' && filterRole !== 'ALL') {
            filteredData = data.filter(user => user.role === filterRole);
        }

        const tbody = document.getElementById('user-table-body');
        tbody.innerHTML = '';
        
        // ใช้ข้อมูลที่ผ่านการกรอง (filteredData) มาแสดงผล
        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
            return;
        }

        filteredData.forEach(user => {
            // 🔴 เพิ่มปุ่ม "ประวัติ" (สีเขียว) ให้ Admin/Officer กดเข้าไปดู Dashboard ของคนๆ นั้นได้
            let actionBtns = `<button class="save-btn" onclick="viewPatientRecord('${user.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; background: #10b981; margin-right: 5px;"><i class="fa-solid fa-chart-pie"></i> ประวัติ</button>`;
            
            // ปุ่มแก้ไข
            actionBtns += `<button class="save-btn btn-edit-user" data-id="${user.id}" data-fname="${user.firstName}" data-lname="${user.lastName}" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; background: #3b82f6;"><i class="fa-solid fa-pen"></i> แก้ไข</button>`;
            
            // ปุ่มลบ (เฉพาะ Admin)
            if (currentRole === 'ADMIN') {
                actionBtns += ` <button class="save-btn btn-delete-user" data-id="${user.id}" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; background: #ef4444; margin-left: 5px;"><i class="fa-solid fa-trash"></i> ลบ</button>`;
            }

            const roleColor = user.role === 'OFFICER' ? '#f59e0b' : '#10b981';

            tbody.innerHTML += `
                <tr>
                    <td><span style="font-size: 0.8rem; font-weight:bold; padding: 0.3rem 0.5rem; border-radius: 5px; color: white; background: ${roleColor}">${user.role}</span></td>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.username}</td>
                    <td>${user.nationalId || '-'}</td>
                    <td>${actionBtns}</td>
                </tr>
            `;
        });
    } catch (err) { showToast('ดึงข้อมูลไม่ได้', 'error'); }
}

// ==========================================
// ตรวจจับการกดปุ่ม "แก้ไข" และ "ลบ" จากในตาราง
// ==========================================
document.getElementById('user-table-body').addEventListener('click', async (e) => {
    
    // 1. ถ้าสิ่งที่กดคือ "ปุ่มแก้ไข" หรือ ไอคอนรูปปากกาข้างในปุ่ม
    const editBtn = e.target.closest('.btn-edit-user');
    
    if (editBtn) {
        // ดึงค่าต่างๆ ออกมาจาก data- attributes (เอาเฉพาะที่ใช้)
        const id = editBtn.getAttribute('data-id');
        const fname = editBtn.getAttribute('data-fname');
        const lname = editBtn.getAttribute('data-lname');
        
        console.log("Edit Clicked: ID =", id); 

        // เอาค่าไปใส่ในช่อง Input บน Popup
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-fname').value = fname || '';
        document.getElementById('edit-lname').value = lname || '';
        
        // โชว์ Popup
        document.getElementById('edit-user-modal').style.display = 'flex';
        return; 
    }

    // 2. ถ้าสิ่งที่กดคือ "ปุ่มลบ" หรือ ไอคอนถังขยะข้างในปุ่ม
    const deleteBtn = e.target.closest('.btn-delete-user');
    if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        if(!confirm('คุณแน่ใจหรือไม่ที่จะลบบัญชีนี้? ข้อมูลประวัติการตรวจสุขภาพทั้งหมดของผู้ใช้นี้จะหายไปด้วย')) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE', headers: {'Authorization': `Bearer ${token}`}
            });
            if (res.ok) {
                showToast('ลบข้อมูลสำเร็จ', 'success');
                fetchUsers(document.getElementById('search-user-input').value);
            } else {
                showToast('ลบไม่สำเร็จ (อาจไม่มีสิทธิ์)', 'error');
            }
        } catch(err) { showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error'); }
    }
});

// ==========================================
// ผูกปุ่มค้นหา และ โหลดรายชื่อเมื่อคลิกเมนู
// ==========================================
document.getElementById('btn-search-user').addEventListener('click', () => {
    fetchUsers(document.getElementById('search-user-input').value);
});

// 🔴 เพิ่ม: เมื่อ Admin กดเปลี่ยนตัวกรองบทบาท ให้ตารางโหลดใหม่ทันที
document.getElementById('filter-role-select').addEventListener('change', () => {
    fetchUsers(document.getElementById('search-user-input').value);
});

el.navPatients.addEventListener('click', () => { 
    showSection('patients'); 
    fetchUsers(); 
});

// ==========================================
// ปิดหน้าต่าง Popup และ ยืนยันการบันทึกแก้ไข
// ==========================================
document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    document.getElementById('edit-user-modal').style.display = 'none';
});

document.getElementById('btn-save-edit').addEventListener('click', async () => {
    const id = document.getElementById('edit-user-id').value;
    
    // 🔴 ปรับให้ส่งข้อมูลไป Server แค่ ชื่อ และ นามสกุล เท่านั้น
    const body = {
        firstName: document.getElementById('edit-fname').value,
        lastName: document.getElementById('edit-lname').value
    };
   
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('อัปเดตชื่อ-นามสกุลสำเร็จ', 'success');
            document.getElementById('edit-user-modal').style.display = 'none';
            fetchUsers(document.getElementById('search-user-input').value); 
        } else showToast(data.error, 'error');
    } catch (err) { showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error'); }
});

// ==========================================
// 🛡️ 4. Admin Panel (สร้างบัญชีเจ้าหน้าที่)
// ==========================================
document.getElementById('admin-create-officer').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ส่งไปแค่ ชื่อ นามสกุล Username และ Password
    const body = {
        firstName: document.getElementById('adm-off-fname').value,
        lastName: document.getElementById('adm-off-lname').value,
        username: document.getElementById('adm-off-user').value,
        password: document.getElementById('adm-off-pass').value,
    };
    
    try {
        const res = await fetch(`${API_URL}/admin/create-officer`, {
            method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`},
            body: JSON.stringify(body)
        });
        
        if (res.ok) {
            const data = await res.json();
            // โชว์แจ้งเตือนพร้อมรหัสที่ระบบสร้างให้
            showToast(`สร้างบัญชีเจ้าหน้าที่สำเร็จ! ID: ${data.officerId}`);
            document.getElementById('admin-create-officer').reset();
            
            // สั่งอัปเดตตารางรายชื่อเผื่อว่า Admin เปิดดูอยู่
            fetchUsers(document.getElementById('search-user-input').value);
        } else {
            showToast('Username นี้มีในระบบแล้ว', 'error');
        }
    } catch (err) { 
        showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error'); 
    }
});
// ปุ่มยกเลิกคิวที่ค้างอยู่
const btnCancelQueue = document.getElementById('btn-cancel-queue');
btnCancelQueue.addEventListener('click', async () => {
    const patientId = el.activePatientId.value;
    if (!patientId) return;

    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคิวผู้ป่วยคนนี้?')) return;

    try {
        const res = await fetch(`${API_URL}/iot/cancel-queue`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ patientId })
        });
        
        if (res.ok) {
            showToast('ยกเลิกคิวสำเร็จ!', 'success');
            el.activePatientId.value = '';
            clearDashboardState();
            checkActiveQueue(); // อัปเดตหน้าจอทันที
        } else {
            showToast('ไม่สามารถยกเลิกคิวได้', 'error');
            if (currentActivePatientId) {
                fetchLatestRecordAndDisplay(currentActivePatientId);
                fetch(`${API_URL}/iot/clear-live-sensor`, { method: 'POST' }); // <--- เพิ่มบรรทัดนี้
                currentActivePatientId = null; 
            }
            el.activePatientId.value = '';
        }
    } catch (err) {
        showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    }
});
// ==========================================
// 📡 ดึงข้อมูล Live Sensor Data & Serial Logs
// ==========================================
async function fetchLiveSensorData() {
    if (el.secLive.style.display === 'none' || document.querySelector('input[name="input_mode"]:checked').value !== '1') return;
    try {
        // 🔴 ป้องกัน Cache
        const res = await fetch(`${API_URL}/iot/live-sensor?_t=${Date.now()}`, { cache: 'no-store' });
        const d = await res.json();
        if (d.temp > 0) el.manualInputs[0].value = d.temp;
        if (d.weight > 0) el.manualInputs[1].value = d.weight;
        if (d.height > 0) el.manualInputs[2].value = d.height;
        if (d.sys > 0) el.manualInputs[3].value = d.sys;
        if (d.dia > 0) el.manualInputs[4].value = d.dia;
        if (d.bpm > 0) el.manualInputs[5].value = d.bpm;
    } catch(e) {}
}

async function fetchSerialLogs() {
    if (el.secLive.style.display === 'none') return;
    try {
        // 🔴 ป้องกัน Cache
        const res = await fetch(`${API_URL}/iot/logs?_t=${Date.now()}`, { cache: 'no-store' });
        const logs = await res.json();
        const screen = document.getElementById('serial-monitor-screen');
        if (logs.length > 0) {
            const isScrolledToBottom = screen.scrollHeight - screen.clientHeight <= screen.scrollTop + 10;
            screen.innerHTML = logs.join('<br>');
            if (isScrolledToBottom) screen.scrollTop = screen.scrollHeight;
        }
    } catch(e) {}
}
// ==========================================
// 📅 ระบบล็อกปฏิทิน: ป้องกันการเลือกวันเกิดในอนาคต
// ==========================================
function setMaxDateForDOB() {
    // 1. หาค่าวันที่ปัจจุบัน (Local Time) ในรูปแบบ YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;

    // 2. นำไปล็อกที่ช่องกรอกวันเกิดต่างๆ ในระบบ
    const offDob = document.getElementById('off-dob');             // หน้า Bypass
    const signupDob = document.getElementById('signup-dob');       // หน้า สมัครสมาชิกผู้ป่วย
    const admOffDob = document.getElementById('adm-off-dob');      // หน้า สร้างเจ้าหน้าที่

    if (offDob) offDob.max = localToday;
    if (signupDob) signupDob.max = localToday;
    if (admOffDob) admOffDob.max = localToday;
}

// ==========================================
// 💡 ระบบตรวจจับการเลือก "อื่นๆ" เพื่อกรอกข้อมูลเอง
// ==========================================
function setupOtherInputToggle(selectId, otherInputId) {
    const selectEl = document.getElementById(selectId);
    const otherInputEl = document.getElementById(otherInputId);
    
    if (selectEl && otherInputEl) {
        selectEl.addEventListener('change', (e) => {
            if (e.target.value === 'อื่นๆ') {
                otherInputEl.style.display = 'block';
                otherInputEl.required = true; // บังคับให้พิมพ์ถ้าเปิดขึ้นมา
            } else {
                otherInputEl.style.display = 'none';
                otherInputEl.required = false;
                otherInputEl.value = ''; // ล้างค่าทิ้งถ้าไม่ได้เลือก "อื่นๆ"
            }
        });
    }
}

// ==========================================
// 📊 ระบบ Patient Health Dashboard (ประมวลผล & กราฟ)
// ==========================================
let patientChartInstance = null;
let currentPatientRecordsForChart = []; // เก็บประวัติไว้ใช้วาดกราฟ

// ฟังก์ชันหลัก: โหลดข้อมูลโปรไฟล์
async function viewPatientRecord(patientId) {
    showSection('patient-detail-section');
    if (getRole() !== 'PATIENT') document.getElementById('btn-back-members').style.display = 'inline-block';
    else document.getElementById('btn-back-members').style.display = 'none';
    
    try {
        // 🔴 ย้ายคำสั่งป้องกัน Cache มาใส่ตรงนี้ (ดึงข้อมูลใหม่เสมอ)
        const res = await fetch(`${API_URL}/users/${patientId}/records?t=${new Date().getTime()}`, { 
            headers: { 'Authorization': `Bearer ${getToken()}` } 
        });
        if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
        const { user, records } = await res.json();
        
        // 🔴 ปรับสูตรคำนวณอายุให้แม่นยำขึ้น
        let ageText = 'ไม่ระบุ';
        if (user.dob) {
            const birthDate = new Date(user.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; 
            
            ageText = age > 0 ? `${age} ปี` : 'น้อยกว่า 1 ปี'; 
        }

        // ใส่ข้อมูลโปรไฟล์
        document.getElementById('detail-name').innerText = `${user.firstName} ${user.lastName}`;
        document.getElementById('detail-id').innerText = `ID: ${user.nationalId || user.barcode || '-'}`;
        document.getElementById('detail-age').innerText = ageText;
        document.getElementById('detail-gender').innerText = user.gender || 'ไม่ระบุ';
        document.getElementById('detail-disease').innerText = user.disease || 'ไม่มี';
        document.getElementById('detail-allergy').innerText = user.allergy || 'ไม่มี';
        
        // ป้องกัน Error วาดบาร์โค้ด
        try {
            if (user.barcode && typeof JsBarcode !== 'undefined') {
                document.getElementById('patient-personal-barcode').style.display = 'inline-block';
                JsBarcode("#patient-personal-barcode", user.barcode, { height: 40, displayValue: true, fontSize: 14 });
            } else {
                document.getElementById('patient-personal-barcode').style.display = 'none';
            }
        } catch(err) { console.log('ข้ามการสร้างบาร์โค้ด'); }

        // เติมตารางและกราฟ
        const tbody = document.getElementById('patient-history-body');
        if (records && records.length > 0) {
            tbody.innerHTML = records.map(r => {
                const bmi = (r.weight && r.height) ? (r.weight / ((r.height/100)**2)).toFixed(1) : '-';
                const dateStr = new Date(r.recordedAt).toLocaleDateString('th-TH', { year:'2-digit', month:'short', day:'numeric' });
                return `<tr><td style="padding:8px;">${dateStr}</td><td>${bmi}</td><td>${r.sys||'-'}/${r.dia||'-'}</td><td>${r.temp||'-'}</td></tr>`;
            }).join('');

            analyzeHealthData(records[0]);
            
            try {
                currentPatientRecordsForChart = [...records].reverse(); 
                if (typeof Chart !== 'undefined') renderChart('bp');
            } catch(err) { console.log('ข้ามการสร้างกราฟ'); }

        } else {
            // กรณีไม่มีประวัติเลย
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1rem; color: #94a3b8;">ยังไม่มีประวัติการตรวจ</td></tr>';
            document.getElementById('latest-results-grid').innerHTML = '<div style="grid-column: span 3; text-align: center; padding: 2.5rem; background: #f8fafc; border-radius: 10px; color: #64748b; font-size: 1.1rem;"><br>ยังไม่มีประวัติการตรวจสุขภาพ<br><span style="font-size: 0.9rem;">โปรดทำการวัดสัญญาณชีพที่สถานี (Live Dashboard) และกด Save Record</span></div>';
            document.getElementById('health-summary-list').innerHTML = '<li>รอรับข้อมูลจากสถานีตรวจสุขภาพ...</li>';
            document.getElementById('latest-status-badge').className = 'badge bg-warning';
            document.getElementById('latest-status-badge').innerHTML = 'รอการตรวจ';
            
            if (patientChartInstance) { patientChartInstance.destroy(); patientChartInstance = null; }
        }
    } catch(e) { 
        console.error("Dashboard Error:", e); 
        showToast('ดึงข้อมูลผิดพลาด', 'error');
    }
}

// 🧠 ฟังก์ชันย่อย: ประมวลผลและทำนายข้อมูลสุขภาพ (คัดกรองเบื้องต้นเชิงลึก)
function analyzeHealthData(latest) {
    const grid = document.getElementById('latest-results-grid');
    const summaryList = document.getElementById('health-summary-list');
    let summaryHTML = "";
    let alertLevel = 0; // 0=ปกติ, 1=เตือน, 2=อันตราย

    // ==========================================
    // 1. ประเมินดัชนีมวลกาย (BMI) - เกณฑ์เอเชีย
    // ==========================================
    let bmiVal = '-', bmiDesc = '-', bmiColor = 'text-muted-light';
    if (latest.weight > 0 && latest.height > 0) {
        const bmi = latest.weight / ((latest.height/100)**2);
        bmiVal = bmi.toFixed(1);
        if (bmi < 18.5) { 
            bmiDesc = "ผอมเกินไป"; bmiColor = "text-warning"; 
            summaryHTML += `<li><strong style="color:#f59e0b;">ดัชนีมวลกาย (BMI):</strong> น้ำหนักน้อยเกินไป (${bmiVal}) เสี่ยงขาดสารอาหารหรือภูมิคุ้มกันต่ำ ควรเพิ่มปริมาณอาหารที่มีประโยชน์และโปรตีน</li>`; 
            alertLevel = Math.max(alertLevel, 1);
        } else if (bmi <= 22.9) { 
            bmiDesc = "ปกติ (สมส่วน)"; bmiColor = "text-normal"; 
            summaryHTML += `<li><strong style="color:#10b981;">ดัชนีมวลกาย (BMI):</strong> สมส่วน (${bmiVal}) อยู่ในเกณฑ์สุขภาพดี รักษาระดับนี้ไว้</li>`; 
        } else if (bmi <= 24.9) { 
            bmiDesc = "ท้วม (เริ่มอ้วน)"; bmiColor = "text-warning"; 
            summaryHTML += `<li><strong style="color:#f59e0b;">ดัชนีมวลกาย (BMI):</strong> น้ำหนักเริ่มเกินเกณฑ์ (${bmiVal}) ควรเริ่มควบคุมอาหารประเภทแป้ง ของทอด และน้ำตาล</li>`; 
            alertLevel = Math.max(alertLevel, 1);
        } else if (bmi <= 29.9) { 
            bmiDesc = "อ้วนระดับ 1"; bmiColor = "text-danger"; 
            summaryHTML += `<li><strong style="color:#ef4444;">ดัชนีมวลกาย (BMI):</strong> อ้วน (${bmiVal}) มีความเสี่ยงสูงต่อโรคเบาหวานและความดัน ควรออกกำลังกายและคุมอาหารอย่างจริงจัง</li>`; 
            alertLevel = Math.max(alertLevel, 2);
        } else { 
            bmiDesc = "อ้วนระดับ 2 (วิกฤต)"; bmiColor = "text-danger"; 
            summaryHTML += `<li><strong style="color:#ef4444;">ดัชนีมวลกาย (BMI):</strong> อ้วนมาก (${bmiVal}) อันตราย! เสี่ยงต่อโรคร้ายแรงสูง ควรปรึกษาแพทย์เพื่อลดน้ำหนักอย่างถูกวิธี</li>`; 
            alertLevel = 2;
        }
    } else {
        summaryHTML += `<li><strong>ดัชนีมวลกาย (BMI):</strong> ข้อมูลน้ำหนักหรือส่วนสูงไม่ครบถ้วน</li>`;
    }

    // ==========================================
    // 2. ประเมินความดันโลหิต (Blood Pressure)
    // ==========================================
    let bpVal = (latest.sys > 0 && latest.dia > 0) ? `${latest.sys}/${latest.dia}` : '-';
    let bpDesc = '-', bpColor = 'text-muted-light';
    if (latest.sys > 0 && latest.dia > 0) {
        if (latest.sys < 90 || latest.dia < 60) {
            bpDesc = "ความดันต่ำ"; bpColor = "text-warning";
            summaryHTML += `<li><strong style="color:#f59e0b;">ความดันโลหิต:</strong> ต่ำกว่าปกติ (${bpVal}) อาจมีอาการหน้ามืด วิงเวียน อ่อนเพลีย ควรพักผ่อนและดื่มน้ำให้เพียงพอ</li>`;
            alertLevel = Math.max(alertLevel, 1);
        } else if (latest.sys <= 120 && latest.dia <= 80) {
            bpDesc = "ปกติ"; bpColor = "text-normal";
            summaryHTML += `<li><strong style="color:#10b981;">ความดันโลหิต:</strong> ปกติ (${bpVal}) การทำงานของหัวใจและหลอดเลือดอยู่ในเกณฑ์ดีเยี่ยม</li>`;
        } else if (latest.sys <= 139 || latest.dia <= 89) {
            bpDesc = "เริ่มสูง (เฝ้าระวัง)"; bpColor = "text-warning";
            summaryHTML += `<li><strong style="color:#f59e0b;">ความดันโลหิต:</strong> ค่อนข้างสูง (${bpVal}) ควรเฝ้าระวัง ลดอาหารเค็มจัด/โซเดียม และพักผ่อนให้เพียงพอ</li>`;
            alertLevel = Math.max(alertLevel, 1);
        } else if (latest.sys <= 159 || latest.dia <= 99) {
            bpDesc = "สูงระดับ 1"; bpColor = "text-danger";
            summaryHTML += `<li><strong style="color:#ef4444;">ความดันโลหิต:</strong> สูงระดับ 1 (${bpVal}) มีความเสี่ยงต่อโรคหลอดเลือด ควรพบแพทย์เพื่อประเมินอาการ</li>`;
            alertLevel = 2;
        } else {
            bpDesc = "สูงระดับ 2 (วิกฤต)"; bpColor = "text-danger";
            summaryHTML += `<li><strong style="color:#ef4444;">ความดันโลหิต:</strong> สูงระดับอันตราย (${bpVal})! ต้องพบแพทย์ทันที อาจเสี่ยงต่อภาวะแทรกซ้อนเฉียบพลัน</li>`;
            alertLevel = 2;
        }
    } else {
        summaryHTML += `<li><strong>ความดันโลหิต:</strong> ไม่มีข้อมูลความดันโลหิต</li>`;
    }

    // ==========================================
    // 3. ประเมินอุณหภูมิร่างกาย (Body Temp)
    // ==========================================
    let tempVal = latest.temp > 0 ? latest.temp.toFixed(1) : '-';
    let tempDesc = '-', tempColor = 'text-muted-light';
    if (latest.temp > 0) {
        if (latest.temp < 35.5) {
            tempDesc = "อุณหภูมิต่ำ"; tempColor = "text-warning";
            summaryHTML += `<li><strong style="color:#f59e0b;">อุณหภูมิ:</strong> ร่างกายเย็นผิดปกติ (${tempVal}°C) ควรทำความอบอุ่นให้ร่างกาย</li>`;
            alertLevel = Math.max(alertLevel, 1);
        } else if (latest.temp <= 37.4) {
            tempDesc = "ปกติ"; tempColor = "text-normal";
            summaryHTML += `<li><strong style="color:#10b981;">อุณหภูมิ:</strong> ปกติ (${tempVal}°C) ไม่มีไข้</li>`;
        } else if (latest.temp <= 38.4) {
            tempDesc = "มีไข้ต่ำ"; tempColor = "text-warning";
            summaryHTML += `<li><strong style="color:#f59e0b;">อุณหภูมิ:</strong> มีไข้ต่ำ (${tempVal}°C) ร่างกายอาจกำลังต่อสู้กับการติดเชื้อ ควรดื่มน้ำและพักผ่อนมากๆ</li>`;
            alertLevel = Math.max(alertLevel, 1);
        } else {
            tempDesc = "มีไข้สูง"; tempColor = "text-danger";
            summaryHTML += `<li><strong style="color:#ef4444;">อุณหภูมิ:</strong> มีไข้สูง (${tempVal}°C)! เสี่ยงภาวะชักหรือติดเชื้อรุนแรง ควรเช็ดตัว ทานยาลดไข้ และรีบพบแพทย์</li>`;
            alertLevel = 2;
        }
    } else {
        summaryHTML += `<li><strong>อุณหภูมิ:</strong> ไม่มีข้อมูลอุณหภูมิร่างกาย</li>`;
    }

    // ==========================================
    // 4. ประเมินอัตราการเต้นของหัวใจ (Heart Rate)
    // ==========================================
    let bpmVal = latest.bpm > 0 ? latest.bpm : '-';
    let bpmDesc = '-', bpmColor = 'text-muted-light';
    if (latest.bpm > 0) {
        if (latest.bpm < 60) {
            bpmDesc = "เต้นช้าผิดปกติ"; bpmColor = "text-warning";
            summaryHTML += `<li><strong style="color:#f59e0b;">ชีพจร (Pulse):</strong> เต้นช้ากว่าปกติ (${bpmVal} bpm) หากไม่ใช่นักกีฬา อาจบ่งบอกถึงการทำงานผิดปกติของหัวใจ</li>`;
            alertLevel = Math.max(alertLevel, 1);
        } else if (latest.bpm <= 100) {
            bpmDesc = "ปกติ"; bpmColor = "text-normal";
            summaryHTML += `<li><strong style="color:#10b981;">ชีพจร (Pulse):</strong> ปกติ (${bpmVal} bpm) จังหวะการเต้นของหัวใจอยู่ในเกณฑ์มาตรฐาน</li>`;
        } else {
            bpmDesc = "เต้นเร็วผิดปกติ"; bpmColor = "text-danger";
            summaryHTML += `<li><strong style="color:#ef4444;">ชีพจร (Pulse):</strong> เต้นเร็วผิดปกติ (${bpmVal} bpm) อาจเกิดจากความเหนื่อย ไข้สูง หรือโรคหัวใจ ให้นั่งพักสักครู่แล้ววัดซ้ำ หากไม่ลดลงควรพบแพทย์</li>`;
            alertLevel = Math.max(alertLevel, 1); 
        }
    } else {
         summaryHTML += `<li><strong>ชีพจร (Pulse):</strong> ไม่มีข้อมูลอัตราการเต้นของหัวใจ</li>`;
    }

    // ==========================================
    // นำผลลัพธ์ยัดใส่กล่องบนหน้าจอ (เรียงใหม่ให้สวยงาม)
    // ==========================================
    grid.innerHTML = `
        <div class="info-box"><span class="info-title">ความดันโลหิต (BP)</span><span class="info-val ${bpColor}">${bpVal}</span><span class="info-desc ${bpColor}">${bpDesc}</span></div>
        <div class="info-box"><span class="info-title">ดัชนีมวลกาย (BMI)</span><span class="info-val ${bmiColor}">${bmiVal}</span><span class="info-desc ${bmiColor}">${bmiDesc}</span></div>
        <div class="info-box"><span class="info-title">อุณหภูมิ (Temp)</span><span class="info-val ${tempColor}">${tempVal} <small style="font-size:0.8rem">°C</small></span><span class="info-desc ${tempColor}">${tempDesc}</span></div>
        <div class="info-box"><span class="info-title">ชีพจร (Pulse)</span><span class="info-val ${bpmColor}">${bpmVal} <small style="font-size:0.8rem">bpm</small></span><span class="info-desc ${bpmColor}">${bpmDesc}</span></div>
        <div class="info-box"><span class="info-title">น้ำหนัก (Weight)</span><span class="info-val">${latest.weight||'-'} <small style="font-size:0.8rem">kg</small></span><span class="info-desc text-muted-light">น้ำหนักล่าสุด</span></div>
        <div class="info-box"><span class="info-title">ส่วนสูง (Height)</span><span class="info-val">${latest.height||'-'} <small style="font-size:0.8rem">cm</small></span><span class="info-desc text-muted-light">ส่วนสูงล่าสุด</span></div>
    `;

    // อัปเดตคำแนะนำรวมด้านล่าง
    summaryList.innerHTML = summaryHTML || "<li>ไม่มีข้อมูลเพียงพอสำหรับประเมินผลเบื้องต้น</li>";
    
    // อัปเดต ป้าย Badge แจ้งเตือนสถานะสุขภาพรวม
    const badge = document.getElementById('latest-status-badge');
    if (alertLevel === 2) { 
        badge.className = 'badge bg-danger'; 
        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> พบความเสี่ยงสุขภาพสูง ควรพบแพทย์'; 
    }
    else if (alertLevel === 1) { 
        badge.className = 'badge bg-warning'; 
        badge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> มีค่าบางประการผิดปกติ ควรเฝ้าระวัง'; 
    }
    else { 
        badge.className = 'badge bg-normal'; 
        badge.innerHTML = '<i class="fa-solid fa-check-circle"></i> สุขภาพโดยรวมอยู่ในเกณฑ์ปกติ'; 
    }
}

// 📈 ฟังก์ชันย่อย: ควบคุมและวาดกราฟ (Chart.js)
function renderChart(filterType) {
    const ctx = document.getElementById('patientChart').getContext('2d');
    if (patientChartInstance) patientChartInstance.destroy(); // เคลียร์กราฟเก่าทิ้ง

    // เตรียมแกน X (วันที่)
    const labels = currentPatientRecordsForChart.map(r => new Date(r.recordedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }));
    let datasets = [];

    // ดึงค่าแกน Y ตาม Filter ที่เลือก
    if (filterType === 'bp') {
        const sysData = currentPatientRecordsForChart.map(r => r.sys || null);
        const diaData = currentPatientRecordsForChart.map(r => r.dia || null);
        datasets = [
            { label: 'SYS (ตัวบน)', data: sysData, borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.3 },
            { label: 'DIA (ตัวล่าง)', data: diaData, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3 }
        ];
    } else if (filterType === 'bmi') {
        const bmiData = currentPatientRecordsForChart.map(r => (r.weight && r.height) ? (r.weight / ((r.height/100)**2)).toFixed(1) : null);
        datasets = [{ label: 'BMI', data: bmiData, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.3, fill: true, backgroundColor: 'rgba(245, 158, 11, 0.1)' }];
    } else if (filterType === 'weight') {
        const wData = currentPatientRecordsForChart.map(r => r.weight || null);
        datasets = [{ label: 'Weight (kg)', data: wData, borderColor: '#10b981', tension: 0.3 }];
    } else if (filterType === 'height') {
        const hData = currentPatientRecordsForChart.map(r => r.height || null);
        datasets = [{ label: 'Height (cm)', data: hData, borderColor: '#8b5cf6', tension: 0.3 }];
    } else if (filterType === 'temp') {
        const tData = currentPatientRecordsForChart.map(r => r.temp || null);
        datasets = [{ label: 'Temp (°C)', data: tData, borderColor: '#ec4899', tension: 0.3 }];
    }

    patientChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: false, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ผูก Event Listener เมื่อเปลี่ยนค่า Dropdown ให้วาดกราฟใหม่
document.getElementById('chart-filter').addEventListener('change', (e) => {
    if (currentPatientRecordsForChart.length > 0) {
        renderChart(e.target.value);
    }
});

// ==========================================
// 📷 รับค่าจากการสแกน Barcode / พิมพ์เองในหน้าเว็บ
// ==========================================
el.activePatientId.addEventListener('keyup', async (e) => {
    // เมื่อกดปุ่ม Enter (เครื่องสแกนบาร์โค้ดจะส่งค่า Enter มาให้เสมอเมื่อสแกนเสร็จ)
    if (e.key === 'Enter') {
        const barcodeVal = e.target.value.trim();
        if (!barcodeVal) return;

        // ถ้าระบบล็อกอยู่ (มีคิวแล้ว) ไม่ให้สแกนทับ
        if (el.activePatientId.readOnly) return; 

        showToast('กำลังค้นหาผู้ป่วยและสร้างคิว...', 'success');
        
        try {
            // ยิง API ไปจำลองเหมือนว่าตู้ IoT สแกนเจอผู้ป่วย
            const res = await fetch(`${API_URL}/iot/scan-barcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: barcodeVal })
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast(`✅ พบผู้ป่วย: ${data.name} เข้าคิวแล้ว!`, 'success');
                // สั่งให้ระบบเช็คคิวและล็อกหน้าจอทันที
                checkActiveQueue(); 
            } else {
                showToast(data.error || '❌ ไม่พบ Barcode นี้ในระบบ', 'error');
                e.target.value = ''; // เคลียร์ช่องให้สแกนใหม่
            }
        } catch (err) {
            showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        }
    }
});

// สั่งให้ทำงานเมื่อหน้าเว็บโหลดเสร็จ
window.addEventListener('DOMContentLoaded', () => {
    // ผูกคำสั่งให้กับ Dropdown ทั้ง 4 จุด
    setupOtherInputToggle('signup-disease', 'signup-disease-other');
    setupOtherInputToggle('signup-allergy', 'signup-allergy-other');
    setupOtherInputToggle('off-disease', 'off-disease-other');
    setupOtherInputToggle('off-allergy', 'off-allergy-other');
});

// 3. สั่งให้ทำงานทันทีเมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', setMaxDateForDOB);

// ประกาศให้ HTML มองเห็นฟังก์ชันนี้เวลาคลิกปุ่มจากตาราง
window.viewPatientRecord = viewPatientRecord;

// ปุ่มย้อนกลับจากหน้า Dashboard ไปหน้าตารางสมาชิก (สำหรับ Admin/Officer)
document.getElementById('btn-back-members').addEventListener('click', () => {
    showSection('patients');
});

// สั่งให้รันทุก 1-1.5 วินาที
setInterval(fetchLiveSensorData, 1000);
setInterval(fetchSerialLogs, 1500);
import { supabase } from './supabase-config.js';

const authModal = new bootstrap.Modal(document.getElementById('authModal'));

// ===========================================
// 1. ตรวจสอบสถานะ (อัปเกรด: ดึงข้อมูลสดจาก DB)
// ===========================================
checkLoginStatus();

async function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    const authSection = document.getElementById('authSection');

    if (userId) {
        // --- [เพิ่ม] ดึงข้อมูลล่าสุดจาก Database เผื่อ Admin เปลี่ยน Role ---
        const { data: user, error } = await supabase
            .from('users')
            .select('role, full_name, username')
            .eq('id', userId)
            .single();

        if (user && !error) {
            // อัปเดตข้อมูลในเครื่องให้ตรงกับ Server
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_name', user.full_name || user.username);
            
            renderLoggedInState(user.full_name || user.username, user.role);
        } else {
            // ถ้าหาไม่เจอ (เช่น โดนลบ) ให้ Logout
            logout(); 
        }
    } else {
        renderLoggedOutState();
    }
}

function renderLoggedInState(name, role) {
    const authSection = document.getElementById('authSection');
    let adminLink = '';
    
    // ถ้าเป็น Admin ให้โชว์ปุ่มเข้าหลังบ้าน
    if (role === 'admin') {
        adminLink = `<a href="admin.html" class="dropdown-item text-danger fw-bold"><i class="bi bi-shield-lock"></i> ไปหน้า Admin</a>`;
    }

    // ถ้าเป็น Teacher ให้โชว์สถานะเท่ๆ
    let roleBadge = role === 'teacher' ? '<span class="badge bg-primary ms-2">TEACHER</span>' : '';

    authSection.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-outline-primary rounded-pill px-3 dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle me-1"></i> ${name}
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 p-2">
                <li><h6 class="dropdown-header text-secondary">สถานะ: ${role.toUpperCase()}</h6></li>
                ${adminLink}
                <li><hr class="dropdown-divider"></li>
                <li><button onclick="logout()" class="dropdown-item text-secondary rounded"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</button></li>
            </ul>
        </div>
    `;
}

function renderLoggedOutState() {
    const authSection = document.getElementById('authSection');
    authSection.innerHTML = `
        <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" onclick="openAuthModal()">
            <i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
        </button>
    `;
}

// เปิด Modal
window.openAuthModal = () => {
    authModal.show();
}

// ===========================================
// 2. ระบบล็อกอิน
// ===========================================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', user)
        .eq('password', pass)
        .single();

    if (error || !data) {
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } else {
        localStorage.setItem('user_id', data.id);
        alert(`ยินดีต้อนรับคุณ ${data.full_name}`);
        authModal.hide();
        checkLoginStatus(); // รีเฟรช Navbar
    }
});

// ===========================================
// 3. ระบบสมัครสมาชิก
// ===========================================
document.getElementById('regForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;

    const { data: exist } = await supabase.from('users').select('id').eq('username', user).single();
    if(exist) return alert('Username นี้มีคนใช้แล้ว');

    const { error } = await supabase.from('users').insert({
        username: user,
        password: pass,
        full_name: name
    });

    if (!error) {
        alert('สมัครสมาชิกสำเร็จ! กรุณา Login');
        document.querySelector('a[href="#tabLogin"]').click();
        document.getElementById('regForm').reset();
    } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
});

// ===========================================
// 4. Logout
// ===========================================
window.logout = () => {
    if(confirm('ยืนยันออกจากระบบ?')) {
        localStorage.clear();
        location.reload();
    }
}

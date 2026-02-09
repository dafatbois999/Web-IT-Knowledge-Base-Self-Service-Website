import { supabase } from './supabase-config.js';

const authModal = new bootstrap.Modal(document.getElementById('authModal'));

// ===========================================
// 1. ตรวจสอบสถานะการ Login (เมื่อโหลดหน้าเว็บ)
// ===========================================
checkLoginStatus();

function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    const userRole = localStorage.getItem('user_role');
    const authSection = document.getElementById('authSection');

    if (userId && userName) {
        // --- กรณีล็อกอินแล้ว ---
        let adminLink = '';
        
        // ถ้าเป็น Admin ให้โชว์ปุ่มเข้าหลังบ้าน
        if (userRole === 'admin') {
            adminLink = `<a href="admin.html" class="dropdown-item text-danger fw-bold"><i class="bi bi-shield-lock"></i> ไปหน้า Admin</a>`;
        }

        authSection.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-primary rounded-pill px-3 dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-1"></i> ${userName}
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                    <li><h6 class="dropdown-header text-secondary">สถานะ: ${userRole.toUpperCase()}</h6></li>
                    ${adminLink}
                    <li><hr class="dropdown-divider"></li>
                    <li><button onclick="logout()" class="dropdown-item text-secondary"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</button></li>
                </ul>
            </div>
        `;
    } else {
        // --- กรณีไม่ได้ล็อกอิน ---
        authSection.innerHTML = `
            <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" onclick="openAuthModal()">
                <i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
            </button>
        `;
    }
}

// เปิด Modal
window.openAuthModal = () => {
    authModal.show();
}

// ===========================================
// 2. ระบบล็อกอิน (Login)
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
        // บันทึกลงเครื่อง
        localStorage.setItem('user_id', data.id);
        localStorage.setItem('user_role', data.role);
        localStorage.setItem('user_name', data.full_name || data.username);
        
        alert(`ยินดีต้อนรับคุณ ${data.full_name}`);
        authModal.hide();
        checkLoginStatus(); // รีเฟรช Navbar
    }
});

// ===========================================
// 3. ระบบสมัครสมาชิก (Register)
// ===========================================
document.getElementById('regForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;

    // เช็คก่อนว่าชื่อซ้ำไหม
    const { data: exist } = await supabase.from('users').select('id').eq('username', user).single();
    if(exist) return alert('Username นี้มีคนใช้แล้ว');

    // บันทึก (Role default คือ student จาก database)
    const { error } = await supabase.from('users').insert({
        username: user,
        password: pass,
        full_name: name
    });

    if (!error) {
        alert('สมัครสมาชิกสำเร็จ! กรุณา Login');
        // สลับไปแท็บ Login แบบบ้านๆ
        document.querySelector('a[href="#tabLogin"]').click();
        document.getElementById('regForm').reset();
    } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
});

// ===========================================
// 4. ระบบออกจากระบบ (Logout)
// ===========================================
window.logout = () => {
    if(confirm('ยืนยันออกจากระบบ?')) {
        localStorage.clear();
        // ถ้าเป็น Dark mode อาจจะอยากเก็บไว้ (Optional)
        // localStorage.setItem('theme', ...); 
        location.reload();
    }
}

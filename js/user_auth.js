import { supabase } from './supabase-config.js';

// Init Modal
const authModalElement = document.getElementById('authModal');
const authModal = authModalElement ? new bootstrap.Modal(authModalElement) : null;

// ===========================================
// 1. ตรวจสอบสถานะเมื่อโหลดหน้าเว็บ
// ===========================================
checkLoginStatus();

async function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    
    if (userId) {
        // ดึงข้อมูลล่าสุดจาก DB เสมอ (เผื่อโดนเปลี่ยน Role)
        const { data: user, error } = await supabase
            .from('users')
            .select('role, full_name, username')
            .eq('id', userId)
            .single();

        if (user && !error) {
            // อัปเดตข้อมูลในเครื่อง
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_name', user.full_name || user.username);
            renderLoggedInState(user.full_name || user.username, user.role);
        } else {
            // ถ้าหาไม่เจอใน DB ให้เคลียร์ค่าทิ้ง
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            renderLoggedOutState();
        }
    } else {
        renderLoggedOutState();
    }
}

function renderLoggedInState(name, role) {
    const authSection = document.getElementById('authSection');
    if (!authSection) return;

    let menuLink = '';
    let roleBadge = '';
    
    // ถ้าเป็น Admin -> ปุ่มไปหลังบ้าน
    if (role === 'admin') {
        roleBadge = '<span class="badge bg-dark ms-2">ADMIN</span>';
        menuLink = `<li><a href="admin.html" class="dropdown-item text-danger fw-bold"><i class="bi bi-shield-lock"></i> ไปหน้า Admin</a></li>`;
    } 
    // ถ้าเป็น Teacher -> ปุ่มไปหน้าสร้างคอร์ส
    else if (role === 'teacher') {
        roleBadge = '<span class="badge bg-primary ms-2">TEACHER</span>';
        menuLink = `<li><a href="teacher.html" class="dropdown-item text-primary fw-bold"><i class="bi bi-mortarboard"></i> จัดการคอร์สเรียน</a></li>`;
    }
    // Student
    else {
        roleBadge = '<span class="badge bg-secondary ms-2">STUDENT</span>';
    }

    authSection.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-outline-primary rounded-pill px-3 dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle me-1"></i> ${name} ${roleBadge}
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 p-2">
                ${menuLink}
                <li><hr class="dropdown-divider"></li>
                <li><button onclick="logout()" class="dropdown-item text-secondary rounded"><i class="bi bi-box-arrow-right"></i> ออกจากระบบ</button></li>
            </ul>
        </div>
    `;
}

function renderLoggedOutState() {
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.innerHTML = `
            <button class="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" onclick="openAuthModal()">
                <i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ
            </button>
        `;
    }
}

window.openAuthModal = () => {
    if (authModal) authModal.show();
}

// ===========================================
// 2. ระบบล็อกอิน (LOGIN) - จุดที่แก้ไข
// ===========================================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = 'กำลังตรวจสอบ...';
    btn.disabled = true;

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
        btn.innerText = oldText;
        btn.disabled = false;
    } else {
        // 1. บันทึก Session
        localStorage.setItem('user_id', data.id);
        localStorage.setItem('user_role', data.role); // สำคัญ
        localStorage.setItem('user_name', data.full_name || data.username);
        
        // 2. ซ่อน Modal
        if (authModal) authModal.hide();

        // 3. ตรวจสอบ Role และเปลี่ยนหน้า (Redirect)
        // ใส่ console.log เพื่อ debug ถ้ายังไม่เด้ง
        console.log("Login Success! Role is:", data.role);

        if (data.role === 'teacher') {
            window.location.href = 'teacher.html'; 
        } else if (data.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            // ถ้าเป็นนักเรียน ให้รีเฟรชหน้าเดิมเพื่อให้ Navbar อัปเดต
            window.location.reload(); 
        }
    }
});

// ===========================================
// 3. ระบบสมัครสมาชิก (REGISTER)
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
        full_name: name,
        role: 'student' // สมัครใหม่เป็น student เสมอ
    });

    if (!error) {
        alert('สมัครสมาชิกสำเร็จ! กรุณา Login');
        const loginTabBtn = document.querySelector('a[href="#tabLogin"]');
        if(loginTabBtn) loginTabBtn.click();
        document.getElementById('regForm').reset();
    } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
});

// ===========================================
// 4. LOGOUT
// ===========================================
window.logout = () => {
    if(confirm('ยืนยันออกจากระบบ?')) {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        window.location.href = 'index.html'; // เด้งกลับหน้าแรก
    }
}

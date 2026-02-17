import { supabase } from './supabase-config.js';

// Init Modal (Bootstrap 5)
const authModalElement = document.getElementById('authModal');
const authModal = authModalElement ? new bootstrap.Modal(authModalElement) : null;

// ===========================================
// 1. ตรวจสอบสถานะเมื่อโหลดหน้าเว็บ
// ===========================================
checkLoginStatus();

async function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    
    if (userId) {
        // ดึงข้อมูลล่าสุดจาก DB เสมอ (เผื่อโดนเปลี่ยน Role จาก Admin)
        const { data: user, error } = await supabase
            .from('users')
            .select('role, full_name, username')
            .eq('id', userId)
            .single();

        if (user && !error) {
            // อัปเดตข้อมูลใน LocalStorage
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_name', user.full_name || user.username);
            renderLoggedInState(user.full_name || user.username, user.role);
        } else {
            // ถ้าหาไม่เจอใน DB (โดนลบ) ให้เคลียร์ค่าทิ้ง
            logout(false); // logout แบบไม่ถาม
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
    
    // Admin -> ไปหน้า Admin
    if (role === 'admin') {
        roleBadge = '<span class="badge bg-dark ms-2">ADMIN</span>';
        menuLink = `<li><a href="admin.html" class="dropdown-item text-danger fw-bold"><i class="bi bi-shield-lock"></i> ไปหน้า Admin</a></li>`;
    } 
    // Teacher -> ไปหน้าจัดการคอร์ส
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
// 2. ระบบล็อกอิน (LOGIN)
// ===========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = 'กำลังตรวจสอบ...';
        btn.disabled = true;

        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value.trim();

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', user)
            .eq('password', pass)
            .single();

        if (error || !data) {
            alert('❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            btn.innerText = oldText;
            btn.disabled = false;
        } else {
            // Login สำเร็จ
            localStorage.setItem('user_id', data.id);
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('user_name', data.full_name || data.username);
            
            if (authModal) authModal.hide();

            // Redirect ตาม Role
            console.log("Login Success! Role:", data.role);
            if (data.role === 'teacher') {
                window.location.href = 'teacher.html'; 
            } else if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.reload(); 
            }
        }
    });
}

// ===========================================
// 3. ระบบสมัครสมาชิก (REGISTER) - [แก้ไข: เช็คชื่อซ้ำ]
// ===========================================
const regForm = document.getElementById('regForm');
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('regUser').value.trim();
        const password = document.getElementById('regPass').value.trim();
        const fullName = document.getElementById('regName').value.trim();
        const btn = e.target.querySelector('button');

        if (!username || !password || !fullName) {
            return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        const oldText = btn.innerText;
        btn.innerText = "กำลังตรวจสอบ...";
        btn.disabled = true;

        try {
            // 1. เช็คก่อนว่ามี Username นี้หรือยัง
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .maybeSingle(); 

            if (existingUser) {
                alert('❌ ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว กรุณาตั้งชื่อใหม่');
                return; // หยุดการทำงาน
            }

            // 2. ถ้าไม่มีซ้ำ ให้บันทึก
            const { error: insertError } = await supabase
                .from('users')
                .insert({ 
                    username: username, 
                    password: password, 
                    full_name: fullName, 
                    role: 'student' // default role
                });

            if (insertError) throw insertError;

            alert('✅ สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            
            // สลับไปหน้า Login
            const loginTabBtn = document.querySelector('a[href="#tabLogin"]');
            if(loginTabBtn) loginTabBtn.click();
            
            document.getElementById('regForm').reset();

        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });
}

// ===========================================
// 4. LOGOUT
// ===========================================
window.logout = (confirmLogout = true) => {
    if(!confirmLogout || confirm('ยืนยันออกจากระบบ?')) {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        window.location.href = 'index.html';
    }
}

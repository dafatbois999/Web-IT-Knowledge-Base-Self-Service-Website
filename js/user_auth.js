import { supabase } from './supabase-config.js';

const authModalElement = document.getElementById('authModal');
const authModal = authModalElement ? new bootstrap.Modal(authModalElement) : null;

checkLoginStatus();

async function checkLoginStatus() {
    const userId = localStorage.getItem('user_id');
    
    if (userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('role, full_name, username')
            .eq('id', userId)
            .single();

        if (user && !error) {
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('user_name', user.full_name || user.username);
            renderLoggedInState(user.full_name || user.username, user.role);
        } else {
            logout(false); 
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
    // Teacher -> ไปหน้าจัดการคอร์ส + เพิ่มปุ่มดูคอร์สของฉันให้ Teacher ด้วย
    else if (role === 'teacher') {
        roleBadge = '<span class="badge bg-primary ms-2">TEACHER</span>';
        menuLink = `
            <li><a href="teacher.html" class="dropdown-item text-primary fw-bold"><i class="bi bi-mortarboard"></i> จัดการคอร์สเรียน</a></li>
            <li><a href="student.html" class="dropdown-item text-success fw-bold"><i class="bi bi-book-half"></i> คอร์สเรียนของฉัน</a></li>
        `;
    }
    // Student -> ไปหน้าคอร์สของฉัน
    else {
        roleBadge = '<span class="badge bg-secondary ms-2">STUDENT</span>';
        menuLink = `<li><a href="student.html" class="dropdown-item text-success fw-bold"><i class="bi bi-book-half"></i> คอร์สเรียนของฉัน</a></li>`;
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
            localStorage.setItem('user_id', data.id);
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('user_name', data.full_name || data.username);
            
            if (authModal) authModal.hide();

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

const regForm = document.getElementById('regForm');
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('regUser').value.trim();
        const password = document.getElementById('regPass').value.trim();
        const fullName = document.getElementById('regName').value.trim();
        const empId = document.getElementById('regEmpId').value.trim(); 
        const dept = document.getElementById('regDept').value.trim();   
        const btn = e.target.querySelector('button');

        if (!username || !password || !fullName || !empId || !dept) {
            return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        }

        if (password.length < 8) {
            return alert('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        }

        if (empId.length !== 8) {
            return alert('รหัสพนักงานต้องมี 8 ตัวอักษรพอดี');
        }

        const oldText = btn.innerText;
        btn.innerText = "กำลังตรวจสอบ...";
        btn.disabled = true;

        try {
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .maybeSingle(); 

            if (existingUser) {
                alert('❌ ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว กรุณาตั้งชื่อใหม่');
                return;
            }

            const { data: existingEmp } = await supabase
                .from('users')
                .select('id')
                .eq('employee_id', empId)
                .maybeSingle(); 
            
            if (existingEmp) {
                alert('❌ รหัสพนักงานนี้ถูกลงทะเบียนในระบบแล้ว');
                return;
            }

            const { error: insertError } = await supabase
                .from('users')
                .insert({ 
                    username: username, 
                    password: password, 
                    full_name: fullName, 
                    employee_id: empId,   
                    department: dept,     
                    role: 'student' 
                });

            if (insertError) throw insertError;

            alert('✅ สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            
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

window.logout = (confirmLogout = true) => {
    if(!confirmLogout || confirm('ยืนยันออกจากระบบ?')) {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        window.location.href = 'index.html';
    }
}

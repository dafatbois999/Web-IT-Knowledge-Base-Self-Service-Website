import { supabase } from './supabase-config.js';

// Init Modals
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const regModal = new bootstrap.Modal(document.getElementById('regModal'));

// ==========================================
// 1. SYSTEM INIT & AUTH
// ==========================================
checkAuth();

async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // ยังไม่ล็อกอิน -> โชว์ Modal
        loginModal.show();
    } else {
        // ล็อกอินแล้ว -> เช็คสิทธิ์ Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        
        if (profile?.role !== 'admin') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Role: ' + (profile?.role || 'unknown') + ')');
            await supabase.auth.signOut();
            loginModal.show();
        } else {
            // สิทธิ์ผ่าน -> เริ่มโหลดข้อมูลบทความ
            loginModal.hide();
            document.getElementById('adminEmail').innerText = user.email;
            loadTable(); 
        }
    }
}

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLogin');

    btn.disabled = true; btn.innerText = "กำลังตรวจสอบ...";

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        alert('ล็อกอินไม่สำเร็จ: ' + error.message);
        btn.disabled = false; btn.innerText = "เข้าสู่ระบบ";
    } else {
        location.reload(); 
    }
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if(confirm('ยืนยันออกจากระบบ?')) {
        await supabase.auth.signOut();
        location.reload();
    }
});


// ==========================================
// 2. ARTICLE MANAGEMENT (ระบบบทความ)
// ==========================================
function updateStats(data) {
    document.getElementById('statTotal').innerText = data.length;
    document.getElementById('statHardware').innerText = data.filter(i => i.category === 'Hardware').length;
    document.getElementById('statSoftware').innerText = data.filter(i => i.category === 'Software').length;
    document.getElementById('statNetwork').innerText = data.filter(i => i.category === 'Network').length;
}

window.loadTable = async function() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">กำลังโหลด...</td></tr>';
    
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    if(data) updateStats(data);
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">ไม่มีข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
        let badgeClass = 'bg-secondary';
        if(item.category === 'Hardware') badgeClass = 'bg-danger';
        if(item.category === 'Software') badgeClass = 'bg-info text-dark';
        if(item.category === 'Network') badgeClass = 'bg-success';

        tbody.innerHTML += `
            <tr>
                <td class="ps-3">
                    <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${item.title}</div>
                    <span class="badge ${badgeClass} opacity-75" style="font-size:0.7rem;">${item.category}</span>
                </td>
                <td class="text-center">
                    <a href="article.html?id=${item.id}" target="_blank" class="btn btn-sm btn-light border text-info me-1"><i class="bi bi-eye-fill"></i></a>
                    <button onclick="editItem(${item.id})" class="btn btn-sm btn-light border text-warning me-1"><i class="bi bi-pencil-fill"></i></button>
                    <button onclick="delItem(${item.id})" class="btn btn-sm btn-light border text-danger"><i class="bi bi-trash-fill"></i></button>
                </td>
            </tr>`;
    });
}

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const oldText = btn.innerText;
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;

    try {
        const editId = document.getElementById('editId').value;
        const file = document.getElementById('inpImg').files[0];
        let imageUrl = null;

        if (file) {
            const fileName = Date.now() + '-' + file.name;
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (!error) {
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }
        }

        const payload = {
            title: document.getElementById('inpTitle').value,
            category: document.getElementById('inpCat').value,
            content: document.getElementById('inpDesc').value,
            solution: document.getElementById('inpSol').value,
            video_url: document.getElementById('inpVid').value,
        };
        if (imageUrl) payload.image_url = imageUrl;

        if (editId) {
            await supabase.from('articles').update(payload).eq('id', editId);
            alert('แก้ไขข้อมูลเรียบร้อย');
        } else {
            payload.status = 'Published';
            await supabase.from('articles').insert(payload);
            alert('เพิ่มบทความสำเร็จ');
        }
        cancelEdit();
        loadTable();

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.innerText = oldText; btn.disabled = false;
    }
});

window.editItem = async (id) => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('editId').value = data.id;
        document.getElementById('inpTitle').value = data.title;
        document.getElementById('inpCat').value = data.category;
        document.getElementById('inpDesc').value = data.content;
        document.getElementById('inpSol').value = data.solution;
        document.getElementById('inpVid').value = data.video_url || '';
        document.getElementById('formHeader').innerHTML = `<i class="bi bi-pencil-square text-warning"></i> แก้ไขบทความ`;
        document.getElementById('submitBtn').innerText = "อัปเดตข้อมูล";
        document.getElementById('submitBtn').classList.replace('btn-dark', 'btn-warning');
        document.getElementById('cancelBtn').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formHeader').innerHTML = `<i class="bi bi-plus-lg"></i> เพิ่มบทความใหม่`;
    document.getElementById('submitBtn').innerText = "บันทึกข้อมูล";
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-dark');
    document.getElementById('submitBtn').classList.add('btn-dark');
    document.getElementById('cancelBtn').classList.add('d-none');
}

window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

document.getElementById('insertImgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = e.target.nextElementSibling;
    const originalText = btn.innerHTML;
    btn.innerHTML = `...`; btn.disabled = true;
    try {
        const fileName = `content_${Date.now()}_${file.name}`;
        await supabase.storage.from('images').upload(fileName, file);
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        const imgTag = `\n<img src="${data.publicUrl}" class="img-fluid rounded shadow-sm my-3 d-block mx-auto" style="max-width:100%; max-height:400px;">\n`;
        const ta = document.getElementById('inpSol');
        ta.value += imgTag;
    } catch (err) { alert(err.message); } finally { btn.innerHTML = originalText; btn.disabled = false; }
});


// ==========================================
// 3. USER MANAGEMENT (จัดการผู้ใช้ + สร้าง Teacher)
// ==========================================

window.openRegModal = () => {
    document.getElementById('regForm').reset();
    regModal.show();
}

document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;
    const role = document.getElementById('regRole').value;

    if(confirm(`ยืนยันสร้างบัญชี ${email} เป็น ${role} ?`)) {
        // 1. สร้าง Auth User
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: pass,
            options: { data: { full_name: name } }
        });

        if(error) return alert('Error: ' + error.message);

        // 2. อัปเดต Role
        if(data.user) {
            setTimeout(async () => {
                await supabase.from('profiles').update({ 
                    full_name: name, 
                    role: role 
                }).eq('id', data.user.id);
                
                alert('สร้างบัญชีสำเร็จ!');
                regModal.hide();
                if(window.loadUsers) loadUsers();
            }, 1000);
        }
    }
});

window.loadUsers = async function() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">กำลังโหลด...</td></tr>';

    const { data: users, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>';
        return;
    }

    users.forEach(u => {
        let badge = 'bg-secondary';
        if (u.role === 'admin') badge = 'bg-dark';
        else if (u.role === 'teacher') badge = 'bg-primary';
        else if (u.role === 'student') badge = 'bg-success';

        tbody.innerHTML += `
            <tr>
                <td class="ps-4">${u.email}</td>
                <td>${u.full_name || '-'}</td>
                <td><span class="badge ${badge}">${u.role.toUpperCase()}</span></td>
                <td class="text-end pe-4">
                    ${u.role !== 'admin' ? `
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">เปลี่ยนสิทธิ์</button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="updateRole('${u.id}', 'student')">🎓 Student</a></li>
                            <li><a class="dropdown-item" href="#" onclick="updateRole('${u.id}', 'teacher')">👨‍🏫 Teacher</a></li>
                        </ul>
                    </div>` : '<span class="text-muted small">Super Admin</span>'}
                </td>
            </tr>
        `;
    });
}

window.updateRole = async (uid, newRole) => {
    if(confirm(`เปลี่ยนสิทธิ์ผู้ใช้นี้เป็น ${newRole} ?`)) {
        await supabase.from('profiles').update({ role: newRole }).eq('id', uid);
        loadUsers();
    }
}

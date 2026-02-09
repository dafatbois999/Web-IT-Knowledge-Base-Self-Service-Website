import { supabase } from './supabase-config.js';

// ==========================================
// 1. AUTHENTICATION (ระบบเดิม)
// ==========================================
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable(); // โหลดบทความก่อน
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    
    // เช็คจากตาราง admins (Admin สูงสุด)
    const { data } = await supabase.from('admins').select('*').eq('username', u).eq('password', p).single();
    if (data) { 
        localStorage.setItem('admin_token', 'true'); 
        location.reload(); 
    } else { 
        alert('รหัสผิด!'); 
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});


// ==========================================
// 2. ARTICLE MANAGEMENT (ระบบเดิม)
// ==========================================
// ... (ส่วนจัดการบทความคงเดิม ไม่แตะต้อง logic เก่า) ...

function updateStats(data) {
    document.getElementById('statTotal').innerText = data.length;
    document.getElementById('statHardware').innerText = data.filter(i => i.category === 'Hardware').length;
    document.getElementById('statSoftware').innerText = data.filter(i => i.category === 'Software').length;
    document.getElementById('statNetwork').innerText = data.filter(i => i.category === 'Network').length;
}

async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">กำลังโหลด...</td></tr>';
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if(data) updateStats(data);
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">ไม่มีข้อมูล</td></tr>'; return;
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
window.loadTable = loadTable;

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
            if (!error) { const { data } = supabase.storage.from('images').getPublicUrl(fileName); imageUrl = data.publicUrl; }
        }
        const payload = {
            title: document.getElementById('inpTitle').value,
            category: document.getElementById('inpCat').value,
            content: document.getElementById('inpDesc').value,
            solution: document.getElementById('inpSol').value,
            video_url: document.getElementById('inpVid').value,
        };
        if (imageUrl) payload.image_url = imageUrl;
        if (editId) { await supabase.from('articles').update(payload).eq('id', editId); alert('แก้ไขเรียบร้อย'); }
        else { payload.status = 'Published'; await supabase.from('articles').insert(payload); alert('เพิ่มสำเร็จ'); }
        cancelEdit(); loadTable();
    } catch (err) { alert('Error: ' + err.message); } 
    finally { btn.innerText = oldText; btn.disabled = false; }
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
        document.getElementById('submitBtn').innerText = "อัปเดตข้อมูล";
        document.getElementById('submitBtn').classList.replace('btn-dark', 'btn-warning');
        document.getElementById('cancelBtn').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('submitBtn').innerText = "บันทึกข้อมูล";
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-dark');
    document.getElementById('cancelBtn').classList.add('d-none');
}
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) { await supabase.from('articles').delete().eq('id', id); loadTable(); }
}
document.getElementById('insertImgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `content_${Date.now()}_${file.name}`;
    await supabase.storage.from('images').upload(fileName, file);
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    document.getElementById('inpSol').value += `\n<img src="${data.publicUrl}" class="img-fluid rounded my-3 d-block mx-auto" style="max-height:300px;">\n`;
});


// ==========================================
// 3. USER MANAGEMENT (LMS System) - [NEW]
// ==========================================

// ฟังก์ชันโหลดรายชื่อ User จากตาราง users
window.loadUsers = async function() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">กำลังโหลดรายชื่อ...</td></tr>';
    
    // ดึงเฉพาะ role student และ teacher
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin') // ไม่ต้องโชว์ Admin ในหน้านี้
        .order('id', { ascending: true });

    tbody.innerHTML = '';
    if (error) { alert('Error: ' + error.message); return; }
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">ยังไม่มีผู้ใช้งาน</td></tr>';
        return;
    }

    users.forEach(u => {
        let roleBadge = u.role === 'teacher' ? 'bg-primary' : 'bg-success';
        let actionBtn = '';

        // ถ้าเป็น student -> ปุ่ม Promote เป็น Teacher
        if (u.role === 'student') {
            actionBtn = `<button onclick="toggleRole(${u.id}, 'teacher')" class="btn btn-sm btn-outline-primary fw-bold">⬆ เลื่อนเป็นครู</button>`;
        } 
        // ถ้าเป็น teacher -> ปุ่ม Demote เป็น Student
        else {
            actionBtn = `<button onclick="toggleRole(${u.id}, 'student')" class="btn btn-sm btn-outline-warning fw-bold">⬇ ปรับเป็นนักเรียน</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-dark">${u.username}</td>
                <td>${u.full_name || '-'}</td>
                <td><span class="badge ${roleBadge}">${u.role.toUpperCase()}</span></td>
                <td class="text-end pe-4">${actionBtn}</td>
            </tr>
        `;
    });
}

// ฟังก์ชันสลับ Role
window.toggleRole = async (id, newRole) => {
    if(confirm(`ยืนยันการเปลี่ยนสิทธิ์เป็น ${newRole.toUpperCase()} ?`)) {
        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id);
        if(!error) {
            loadUsers(); // โหลดตารางใหม่
        } else {
            alert('Error: ' + error.message);
        }
    }
}

import { supabase } from './supabase-config.js';

// 1. เช็ค Login
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable();
}

// 2. ระบบ Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const { data } = await supabase.from('admins').select('*').eq('username', u).eq('password', p).single();
    if (data) { localStorage.setItem('admin_token', 'true'); location.reload(); } else { alert('รหัสผิด!'); }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});

// Register Modal Logic
document.getElementById('regForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const { error } = await supabase.from('admins').insert({ username: u, password: p });
    if (!error) { alert('สร้างสำเร็จ!'); document.getElementById('regModal').style.display='none'; }
    else { alert('Error: ' + error.message); }
});

// 3. ระบบบันทึก (Add/Edit)
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
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
            // Update
            const { error } = await supabase.from('articles').update(payload).eq('id', editId);
            if (error) throw error;
            alert('แก้ไขข้อมูลเรียบร้อย!');
        } else {
            // Insert
            payload.status = 'Published';
            const { error } = await supabase.from('articles').insert(payload);
            if (error) throw error;
            alert('เพิ่มบทความใหม่เรียบร้อย!');
        }

        cancelEdit();
        loadTable();

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// 4. [อัปเดตใหม่] โหลดตาราง + ปุ่ม Preview
async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center p-3 text-muted">กำลังโหลดข้อมูล...</td></tr>';
    
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center p-3">ยังไม่มีข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 text-truncate" style="max-width: 200px;">
                    <div class="fw-bold text-dark">${item.title}</div>
                    <small class="text-muted badge bg-light text-secondary border">${item.category}</small>
                </td>
                <td class="text-end pe-4">
                    <a href="article.html?id=${item.id}" target="_blank" class="btn btn-sm btn-info text-white me-1" title="ดูหน้าเว็บจริง">
                        <i class="bi bi-eye-fill"></i>
                    </a>

                    <button onclick="editItem(${item.id})" class="btn btn-sm btn-warning text-dark me-1" title="แก้ไข">
                        <i class="bi bi-pencil-square"></i>
                    </button>

                    <button onclick="delItem(${item.id})" class="btn btn-sm btn-outline-danger" title="ลบ">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// 5. Edit Function
window.editItem = async (id) => {
    const { data } = await supabase.from('articles').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('editId').value = data.id;
        document.getElementById('inpTitle').value = data.title;
        document.getElementById('inpCat').value = data.category;
        document.getElementById('inpDesc').value = data.content;
        document.getElementById('inpSol').value = data.solution;
        document.getElementById('inpVid').value = data.video_url || '';
        
        document.getElementById('formHeader').innerHTML = `<i class="bi bi-pencil-square"></i> แก้ไขบทความ ID: ${id}`;
        document.getElementById('formHeader').classList.add('text-warning');
        document.getElementById('submitBtn').innerHTML = '<i class="bi bi-check-circle"></i> อัปเดตข้อมูล';
        document.getElementById('submitBtn').classList.replace('btn-primary', 'btn-warning');
        document.getElementById('cancelBtn').classList.remove('d-none');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 6. Cancel Edit
window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    
    document.getElementById('formHeader').innerHTML = '<i class="bi bi-plus-circle"></i> เพิ่มบทความใหม่';
    document.getElementById('formHeader').classList.remove('text-warning');
    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-save"></i> บันทึก';
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-primary');
    document.getElementById('cancelBtn').classList.add('d-none');
}

// 7. Delete Function
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

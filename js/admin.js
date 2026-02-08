import { supabase } from './supabase-config.js';

// 1. เช็ค Login
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable();
}

// 2. ระบบ Login / Logout / Register (เหมือนเดิม)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const { data } = await supabase.from('admins').select('*').eq('username', u).eq('password', p).single();
    if (data) { localStorage.setItem('admin_token', 'true'); location.reload(); } else { alert('รหัสผิด!'); }
});

document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const { error } = await supabase.from('admins').insert({ username: u, password: p });
    if (!error) { alert('สร้างสำเร็จ!'); document.getElementById('regModal').style.display='none'; }
    else { alert('Error: ' + error.message); }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});


// 3. [ไฮไลท์] ระบบบันทึก (รองรับทั้ง เพิ่มใหม่ และ แก้ไข)
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;

    try {
        const editId = document.getElementById('editId').value; // เช็คว่ามี ID ไหม
        const file = document.getElementById('inpImg').files[0];
        let imageUrl = null;

        // ถ้ามีการเลือกไฟล์ใหม่ ให้อัปโหลด
        if (file) {
            const fileName = Date.now() + '-' + file.name;
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (!error) {
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }
        }

        // เตรียมข้อมูลที่จะบันทึก
        const payload = {
            title: document.getElementById('inpTitle').value,
            category: document.getElementById('inpCat').value,
            content: document.getElementById('inpDesc').value,
            solution: document.getElementById('inpSol').value,
            video_url: document.getElementById('inpVid').value,
        };
        // ถ้ามีรูปใหม่ให้อัปเดตลิงก์รูปด้วย
        if (imageUrl) payload.image_url = imageUrl;


        if (editId) {
            // --- กรณีแก้ไข (Update) ---
            const { error } = await supabase.from('articles').update(payload).eq('id', editId);
            if (error) throw error;
            alert('แก้ไขข้อมูลเรียบร้อย!');
        } else {
            // --- กรณีเพิ่มใหม่ (Insert) ---
            payload.status = 'Published'; // เพิ่มสถานะเฉพาะตอนสร้างใหม่
            const { error } = await supabase.from('articles').insert(payload);
            if (error) throw error;
            alert('เพิ่มบทความใหม่เรียบร้อย!');
        }

        cancelEdit(); // ล้างฟอร์ม
        loadTable();

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});


// 4. โหลดตาราง
async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center">Loading...</td></tr>';
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 text-truncate" style="max-width: 200px;">${item.title}</td>
                <td class="text-end pe-4">
                    <button onclick="editItem(${item.id})" class="btn btn-sm btn-warning text-dark me-1"><i class="bi bi-pencil-square"></i></button>
                    <button onclick="delItem(${item.id})" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

// 5. [ใหม่] ฟังก์ชันกดปุ่มแก้ไข
window.editItem = async (id) => {
    // ดึงข้อมูลเก่ามาใส่ฟอร์ม
    const { data } = await supabase.from('articles').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('editId').value = data.id;
        document.getElementById('inpTitle').value = data.title;
        document.getElementById('inpCat').value = data.category;
        document.getElementById('inpDesc').value = data.content;
        document.getElementById('inpSol').value = data.solution;
        document.getElementById('inpVid').value = data.video_url || '';
        
        // ปรับหน้าตาฟอร์มให้รู้ว่ากำลังแก้
        document.getElementById('formHeader').innerHTML = `<i class="bi bi-pencil-square"></i> แก้ไขบทความ ID: ${id}`;
        document.getElementById('formHeader').classList.add('text-warning');
        document.getElementById('submitBtn').innerHTML = '<i class="bi bi-check-circle"></i> อัปเดตข้อมูล';
        document.getElementById('submitBtn').classList.replace('btn-primary', 'btn-warning');
        document.getElementById('cancelBtn').classList.remove('d-none'); // โชว์ปุ่มยกเลิก
        
        // เลื่อนหน้าจอขึ้นไปหาฟอร์ม
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 6. [ใหม่] ฟังก์ชันยกเลิกการแก้ไข
window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    
    // คืนค่าหน้าตาฟอร์ม
    document.getElementById('formHeader').innerHTML = '<i class="bi bi-plus-circle"></i> เพิ่มบทความใหม่';
    document.getElementById('formHeader').classList.remove('text-warning');
    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-save"></i> บันทึก';
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-primary');
    document.getElementById('cancelBtn').classList.add('d-none');
}

// 7. ลบข้อมูล
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

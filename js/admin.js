import { supabase } from './supabase-config.js';

// --- Login Check ---
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable(); // โหลดข้อมูลทันที
}

// --- Auth Functions ---
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

document.getElementById('regForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const { error } = await supabase.from('admins').insert({ username: u, password: p });
    if (!error) { alert('สร้างสำเร็จ!'); document.getElementById('regModal').style.display='none'; }
    else { alert('Error: ' + error.message); }
});


// --- [ใหม่] ฟังก์ชันอัปเดต Dashboard Stats ---
function updateStats(data) {
    // นับจำนวนทั้งหมด
    document.getElementById('statTotal').innerText = data.length;

    // นับแยกหมวดหมู่
    const hwCount = data.filter(item => item.category === 'Hardware').length;
    const swCount = data.filter(item => item.category === 'Software').length;
    const nwCount = data.filter(item => item.category === 'Network').length;

    document.getElementById('statHardware').innerText = hwCount;
    document.getElementById('statSoftware').innerText = swCount;
    document.getElementById('statNetwork').innerText = nwCount;
}


// --- Main Functions (Load, Add, Edit, Delete) ---
async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">กำลังโหลด...</td></tr>';
    
    // ดึงข้อมูลทั้งหมด
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    // [เรียกใช้] อัปเดตตัวเลข Dashboard
    if(data) updateStats(data);

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">ไม่มีข้อมูล</td></tr>';
        return;
    }

    data.forEach(item => {
        // กำหนดสีป้ายหมวดหมู่
        let badgeClass = 'bg-secondary';
        if(item.category === 'Hardware') badgeClass = 'bg-danger';
        if(item.category === 'Software') badgeClass = 'bg-info text-dark';
        if(item.category === 'Network') badgeClass = 'bg-success';

        tbody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark mb-1 text-truncate" style="max-width: 300px;">${item.title}</div>
                    <span class="badge ${badgeClass} bg-opacity-10 border border-opacity-25 rounded-pill px-2" style="font-weight:500;">
                        ${item.category}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <a href="article.html?id=${item.id}" target="_blank" class="btn btn-sm btn-light text-primary border me-1" title="ดูตัวอย่าง">
                        <i class="bi bi-eye-fill"></i>
                    </a>
                    <button onclick="editItem(${item.id})" class="btn btn-sm btn-light text-warning border me-1" title="แก้ไข">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button onclick="delItem(${item.id})" class="btn btn-sm btn-light text-danger border" title="ลบ">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// ฟังก์ชันบันทึก (เพิ่ม/แก้ไข)
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
            alert('แก้ไขเรียบร้อย');
        } else {
            payload.status = 'Published';
            await supabase.from('articles').insert(payload);
            alert('เพิ่มสำเร็จ');
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
        
        // ปรับ UI
        document.getElementById('formHeader').innerHTML = `<span class="text-warning"><i class="bi bi-pencil-square"></i> แก้ไขบทความ</span>`;
        document.getElementById('submitBtn').className = 'btn btn-warning w-100 fw-bold';
        document.getElementById('submitBtn').innerText = 'อัปเดตข้อมูล';
        document.getElementById('cancelBtn').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    
    // คืนค่า UI
    document.getElementById('formHeader').innerHTML = `<i class="bi bi-plus-circle-fill text-primary"></i> เพิ่มบทความใหม่`;
    document.getElementById('submitBtn').className = 'btn btn-primary w-100 fw-bold';
    document.getElementById('submitBtn').innerText = 'บันทึกข้อมูล';
    document.getElementById('cancelBtn').classList.add('d-none');
}

window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

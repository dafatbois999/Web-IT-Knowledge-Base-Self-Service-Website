import { supabase } from './supabase-config.js';

// ==========================================
// 1. Authentication
// ==========================================
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable();
}

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    const { data } = await supabase.from('admins').select('*').eq('username', u).eq('password', p).single();
    if (data) { localStorage.setItem('admin_token', 'true'); location.reload(); } else { alert('รหัสผิด!'); }
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});

// Register Handler (รองรับปุ่มเพิ่มแอดมิน)
document.getElementById('regForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const { error } = await supabase.from('admins').insert({ username: u, password: p });
    if (!error) { 
        alert('สร้างบัญชีแอดมินสำเร็จ!'); 
        document.getElementById('regModal').style.display='none'; 
        document.getElementById('regForm').reset();
    }
    else { alert('Error: ' + error.message); }
});

// ==========================================
// 2. Dashboard Stats
// ==========================================
function updateStats(data) {
    document.getElementById('statTotal').innerText = data.length;
    document.getElementById('statHardware').innerText = data.filter(i => i.category === 'Hardware').length;
    document.getElementById('statSoftware').innerText = data.filter(i => i.category === 'Software').length;
    document.getElementById('statNetwork').innerText = data.filter(i => i.category === 'Network').length;
}

// ==========================================
// 3. Table Management
// ==========================================
async function loadTable() {
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
                    <a href="article.html?id=${item.id}" target="_blank" class="btn btn-sm btn-light border text-info me-1" title="ดูตัวอย่าง">
                        <i class="bi bi-eye-fill"></i>
                    </a>
                    <button onclick="editItem(${item.id})" class="btn btn-sm btn-light border text-warning me-1" title="แก้ไข">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button onclick="delItem(${item.id})" class="btn btn-sm btn-light border text-danger" title="ลบ">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// ==========================================
// 4. Add / Edit Logic
// ==========================================
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

// Helper Functions (Global Scope)
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
    document.getElementById('cancelBtn').classList.add('d-none');
}

window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

// ==========================================
// 5. Inline Image Logic (แทรกรูปใน Textarea)
// ==========================================
const insertFileConfig = document.getElementById('insertImgFile');
const textareaSol = document.getElementById('inpSol');

insertFileConfig?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = e.target.nextElementSibling;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>...`;
    btn.disabled = true;

    try {
        const fileName = `content_${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);
        if (error) throw error;

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        const imgTag = `\n<img src="${urlData.publicUrl}" class="img-fluid rounded shadow-sm my-3 d-block mx-auto" style="max-width:100%; max-height:400px;">\n`;

        if (textareaSol.selectionStart || textareaSol.selectionStart == '0') {
            const startPos = textareaSol.selectionStart;
            const endPos = textareaSol.selectionEnd;
            textareaSol.value = textareaSol.value.substring(0, startPos) + imgTag + textareaSol.value.substring(endPos, textareaSol.value.length);
        } else {
            textareaSol.value += imgTag;
        }
    } catch (err) {
        alert('เกิดข้อผิดพลาดในการแทรกรูป: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        insertFileConfig.value = ''; 
    }
});

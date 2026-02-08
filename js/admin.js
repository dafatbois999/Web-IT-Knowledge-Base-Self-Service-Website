import { supabase } from './supabase-config.js';

// ==========================================
// 1. Authentication & Init
// ==========================================
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable();
}

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

        // อัปโหลดรูปปก (ถ้ามี)
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

// ฟังก์ชันดึงข้อมูลมาแก้ไข
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
        
        // Scroll ไปบนสุด
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ฟังก์ชันยกเลิกแก้ไข
window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    
    document.getElementById('formHeader').innerHTML = `<i class="bi bi-plus-lg"></i> เพิ่มบทความใหม่`;
    document.getElementById('submitBtn').innerText = "บันทึกข้อมูล";
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-dark');
    document.getElementById('cancelBtn').classList.add('d-none');
}

// ฟังก์ชันลบ
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

// ==========================================
// 5. [NEW] Insert Image Logic (แทรกรูประหว่างข้อความ)
// ==========================================
const insertFileConfig = document.getElementById('insertImgFile');
const textareaSol = document.getElementById('inpSol');

insertFileConfig?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // เปลี่ยนปุ่มเป็น Loading
    const btn = e.target.nextElementSibling;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> อัปโหลด...`;
    btn.disabled = true;

    try {
        // 1. อัปโหลดรูป content_...
        const fileName = `content_${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);

        if (error) throw error;

        // 2. ดึงลิงก์รูป
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        const imgUrl = urlData.publicUrl;

        // 3. สร้าง Tag HTML สำหรับรูปภาพ
        const imgTag = `\n<img src="${imgUrl}" class="img-fluid rounded shadow-sm my-3 d-block mx-auto" style="max-width:100%; max-height:400px;">\n`;

        // 4. แทรกรูปลงใน Textarea ตรงตำแหน่ง Cursor
        if (textareaSol.selectionStart || textareaSol.selectionStart == '0') {
            const startPos = textareaSol.selectionStart;
            const endPos = textareaSol.selectionEnd;
            textareaSol.value = textareaSol.value.substring(0, startPos)
                + imgTag
                + textareaSol.value.substring(endPos, textareaSol.value.length);
            
            // ย้ายเคอร์เซอร์ไปหลังรูปที่เพิ่งแทรก
            textareaSol.selectionStart = startPos + imgTag.length;
            textareaSol.selectionEnd = startPos + imgTag.length;
        } else {
            textareaSol.value += imgTag;
        }
        textareaSol.focus();

    } catch (err) {
        alert('เกิดข้อผิดพลาดในการแทรกรูป: ' + err.message);
    } finally {
        // คืนค่าปุ่มเดิม
        btn.innerHTML = originalText;
        btn.disabled = false;
        insertFileConfig.value = ''; // Reset input
    }
});

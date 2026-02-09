import { supabase } from './supabase-config.js';

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

function updateStats(data) {
    document.getElementById('statTotal').innerText = data.length;
    document.getElementById('statHardware').innerText = data.filter(i => i.category === 'Hardware').length;
    document.getElementById('statSoftware').innerText = data.filter(i => i.category === 'Software').length;
    document.getElementById('statNetwork').innerText = data.filter(i => i.category === 'Network').length;
}

async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4">Loading...</td></tr>';
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    if(data) updateStats(data);
    tbody.innerHTML = '';
    
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
        } else {
            payload.status = 'Published';
            await supabase.from('articles').insert(payload);
        }
        cancelEdit();
        loadTable();
    } catch (err) { alert(err.message); } 
    finally { btn.innerText = "บันทึก"; btn.disabled = false; }
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
        document.getElementById('submitBtn').innerText = "อัปเดต";
        document.getElementById('submitBtn').classList.replace('btn-dark', 'btn-warning');
        document.getElementById('cancelBtn').classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.cancelEdit = () => {
    document.getElementById('addForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formHeader').innerHTML = `<i class="bi bi-plus-lg"></i> เพิ่มบทความใหม่`;
    document.getElementById('submitBtn').innerText = "บันทึก";
    document.getElementById('submitBtn').classList.replace('btn-warning', 'btn-dark');
    document.getElementById('cancelBtn').classList.add('d-none');
}

window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

// Inline Image Logic
document.getElementById('insertImgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = e.target.nextElementSibling;
    btn.innerHTML = `...`; btn.disabled = true;

    try {
        const fileName = `content_${Date.now()}_${file.name}`;
        await supabase.storage.from('images').upload(fileName, file);
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        
        const imgTag = `\n<img src="${data.publicUrl}" class="img-fluid rounded shadow-sm my-3 d-block mx-auto" style="max-width:100%; max-height:400px;">\n`;
        const textarea = document.getElementById('inpSol');
        textarea.value += imgTag;
    } catch (err) { alert(err.message); }
    finally { btn.innerHTML = `<i class="bi bi-image"></i> แทรกรูป`; btn.disabled = false; }
});

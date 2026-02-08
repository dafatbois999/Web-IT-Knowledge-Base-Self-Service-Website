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
    
    if (data) {
        localStorage.setItem('admin_token', 'true');
        location.reload();
    } else {
        alert('รหัสผ่านไม่ถูกต้อง!');
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});

// 3. ระบบบันทึก + อัปโหลดรูป (พระเอกของเรา)
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "กำลังอัปโหลด..."; 
    btn.disabled = true;

    try {
        let finalImageUrl = "";
        const file = document.getElementById('inpImg').files[0];

        // --- ขั้นตอนอัปรูป ---
        if (file) {
            const fileName = Date.now() + '-' + file.name; // ตั้งชื่อไฟล์ไม่ให้ซ้ำ

            // อัปขึ้นถัง images
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;

            // ขอลิงก์รูปมาใช้
            const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
                
            finalImageUrl = data.publicUrl;
        }

        // --- ขั้นตอนบันทึกข้อมูล ---
        const { error: dbError } = await supabase.from('articles').insert({
            title: document.getElementById('inpTitle').value,
            category: document.getElementById('inpCat').value,
            content: document.getElementById('inpDesc').value,
            solution: document.getElementById('inpSol').value,
            video_url: document.getElementById('inpVid').value,
            image_url: finalImageUrl, // เก็บลิงก์รูปลง Database
            status: 'Published'
        });

        if (dbError) throw dbError;

        alert('บันทึกสำเร็จ!');
        e.target.reset();
        loadTable();

    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        btn.innerText = "บันทึกข้อมูล";
        btn.disabled = false;
    }
});

// 4. โหลดข้อมูลลงตาราง
async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = 'Loading...';
    
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.title}</td>
                <td><button onclick="delItem(${item.id})" class="btn btn-sm btn-danger">ลบ</button></td>
            </tr>`;
    });
}

// ฟังก์ชันลบ (ต้องผูกกับ Window)
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}
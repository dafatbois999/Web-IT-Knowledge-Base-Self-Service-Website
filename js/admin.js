import { supabase } from './supabase-config.js';

// 1. ตรวจสอบสถานะ Login
if (!localStorage.getItem('admin_token')) {
    document.getElementById('loginModal').style.display = 'block';
} else {
    document.getElementById('loginModal').style.display = 'none';
    loadTable();
}

// 2. ระบบ Login (เข้าสู่ระบบ)
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

// [ใหม่!] 3. ระบบ Register Admin (สร้างแอดมินใหม่)
document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newUser = document.getElementById('regUser').value;
    const newPass = document.getElementById('regPass').value;

    // เช็คก่อนว่าชื่อซ้ำไหม
    const { data: existingUser } = await supabase
        .from('admins')
        .select('*')
        .eq('username', newUser)
        .single();

    if (existingUser) {
        alert("ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น");
        return;
    }

    // บันทึกลง Supabase
    const { error } = await supabase.from('admins').insert({
        username: newUser,
        password: newPass
    });

    if (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
        alert("สร้างบัญชีแอดมินใหม่สำเร็จ!");
        document.getElementById('regModal').style.display = 'none'; // ปิด Modal
        document.getElementById('regForm').reset(); // ล้างฟอร์ม
    }
});

// 4. Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    location.reload();
});

// 5. บันทึกบทความ + อัปรูป
document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "กำลังบันทึก..."; 
    btn.disabled = true;

    try {
        let finalImageUrl = "";
        const file = document.getElementById('inpImg').files[0];

        // อัปโหลดรูป (ถ้ามี)
        if (file) {
            const fileName = Date.now() + '-' + file.name;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            finalImageUrl = data.publicUrl;
        }

        // บันทึกลง Database
        const { error: dbError } = await supabase.from('articles').insert({
            title: document.getElementById('inpTitle').value,
            category: document.getElementById('inpCat').value,
            content: document.getElementById('inpDesc').value,
            solution: document.getElementById('inpSol').value,
            video_url: document.getElementById('inpVid').value,
            image_url: finalImageUrl,
            status: 'Published'
        });

        if (dbError) throw dbError;

        alert('บันทึกบทความเรียบร้อย!');
        e.target.reset();
        loadTable();

    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        btn.innerHTML = '<i class="bi bi-save"></i> บันทึกบทความ';
        btn.disabled = false;
    }
});

// 6. โหลดตารางบทความ
async function loadTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-center">Loading...</td></tr>';
    
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td class="ps-4">${item.title}</td>
                <td class="text-end pe-4"><button onclick="delItem(${item.id})" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i> ลบ</button></td>
            </tr>`;
    });
}

// 7. ลบบทความ
window.delItem = async (id) => {
    if(confirm('ยืนยันลบ?')) {
        await supabase.from('articles').delete().eq('id', id);
        loadTable();
    }
}

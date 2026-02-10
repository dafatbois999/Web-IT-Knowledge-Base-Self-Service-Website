import { supabase } from './supabase-config.js';

const createModal = new bootstrap.Modal(document.getElementById('createModal'));
let currentTeacherId = null;

// ===========================================
// 1. ตรวจสอบสิทธิ์ (Security Check)
// ===========================================
checkTeacherAuth();

async function checkTeacherAuth() {
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');

    if (!userId || userRole !== 'teacher') {
        alert('หน้านี้สำหรับคุณครูเท่านั้น!');
        window.location.href = 'index.html';
        return;
    }

    // ดึงชื่อมาแสดง
    const { data: user } = await supabase.from('users').select('full_name, id').eq('id', userId).single();
    if (user) {
        currentTeacherId = user.id;
        document.getElementById('teacherName').innerText = `สวัสดี, คุณครู ${user.full_name}`;
        loadMyCourses(); // โหลดข้อมูล
    }
}

// ===========================================
// 2. โหลดคอร์สของฉัน
// ===========================================
async function loadMyCourses() {
    const grid = document.getElementById('courseGrid');
    
    // ดึงเฉพาะคอร์สที่ teacher_id ตรงกับคนล็อกอิน
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', currentTeacherId)
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        return;
    }

    if (courses.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-folder-plus display-1 text-muted opacity-25"></i>
                <h4 class="text-muted mt-3">ยังไม่มีคอร์สเรียน</h4>
                <button onclick="openCreateModal()" class="btn btn-outline-primary mt-2">เริ่มต้นสร้างคอร์สแรก</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    courses.forEach(c => {
        const img = c.thumbnail_url || 'https://via.placeholder.com/400x225?text=No+Image';
        grid.innerHTML += `
            <div class="col-md-4 col-sm-6">
                <div class="card h-100 border-0 shadow-sm card-hover">
                    <div class="position-relative">
                        <img src="${img}" class="card-img-top" style="height: 200px; object-fit: cover;">
                        <span class="badge bg-primary position-absolute top-0 end-0 m-2">Course</span>
                    </div>
                    <div class="card-body">
                        <h5 class="fw-bold text-dark mb-2 text-truncate">${c.title}</h5>
                        <p class="text-muted small text-truncate-2" style="min-height: 40px;">
                            ${c.description || 'ไม่มีรายละเอียด'}
                        </p>
                        <hr class="opacity-25">
                        <div class="d-flex justify-content-between align-items-center">
                            <button onclick="manageCourse(${c.id})" class="btn btn-outline-primary btn-sm w-100 me-2">
                                <i class="bi bi-gear-fill"></i> จัดการบทเรียน
                            </button>
                            <button onclick="deleteCourse(${c.id})" class="btn btn-light btn-sm text-danger border">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// ===========================================
// 3. สร้างคอร์สใหม่ (อัปโหลดรูป)
// ===========================================
window.openCreateModal = () => {
    document.getElementById('createForm').reset();
    createModal.show();
}

document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // เปลี่ยนปุ่มเป็น Loading
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "กำลังบันทึก...";
    btn.disabled = true;

    try {
        const title = document.getElementById('cTitle').value;
        const desc = document.getElementById('cDesc').value;
        const fileInput = document.getElementById('cImgFile');
        const file = fileInput.files[0];
        let imgUrl = null;

        // 1. อัปโหลดรูป (ถ้ามี)
        if (file) {
            const fileName = `course_${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
            
            if (uploadError) throw uploadError;

            // ดึง URL รูป
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            imgUrl = data.publicUrl;
        }

        // 2. บันทึกข้อมูลคอร์ส
        const { error } = await supabase.from('courses').insert({
            title: title,
            description: desc,
            thumbnail_url: imgUrl,
            teacher_id: currentTeacherId
        });

        if (error) throw error;

        alert('สร้างคอร์สสำเร็จ! 🎉');
        createModal.hide();
        loadMyCourses();

    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        // คืนค่าปุ่ม
        btn.innerText = oldText;
        btn.disabled = false;
    }
});

// ===========================================
// 4. ฟังก์ชันเสริม (ลบ / Logout)
// ===========================================
window.deleteCourse = async (id) => {
    if(confirm('ยืนยันที่จะลบคอร์สนี้? (บทเรียนข้างในจะหายไปด้วย)')) {
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if(!error) loadMyCourses();
    }
}

window.manageCourse = (id) => {
    // พาไปหน้าจัดการคอร์ส พร้อมส่ง id ไปด้วย
    window.location.href = `manage_course.html?id=${id}`;
}

window.logout = () => {
    if(confirm('ออกจากระบบ?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

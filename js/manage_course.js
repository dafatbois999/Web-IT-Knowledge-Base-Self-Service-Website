import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

// ตรวจสอบว่ามี ID ไหม
if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'teacher.html';
}

// ==========================================
// 1. เริ่มต้นทำงาน (Init)
// ==========================================
loadCourseInfo();
loadLessons();

// โหลดข้อมูลหัวข้อคอร์ส
async function loadCourseInfo() {
    const { data, error } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (data) {
        document.getElementById('courseTitle').innerText = data.title;
    }
}

// โหลดรายการบทเรียน (List)
async function loadLessons() {
    const listContainer = document.getElementById('lessonList');
    listContainer.innerHTML = '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm"></div></div>';

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }) // เรียงตามลำดับ (เดี๋ยวทำระบบเรียงทีหลังได้)
        .order('created_at', { ascending: true });

    listContainer.innerHTML = '';

    if (!lessons || lessons.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-4 text-muted small">ยังไม่มีบทเรียน</div>';
        return;
    }

    lessons.forEach((l, index) => {
        listContainer.innerHTML += `
            <button onclick="editLesson('${l.id}')" class="list-group-item list-group-item-action py-3 border-bottom">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <span class="fw-bold text-dark">
                        <span class="badge bg-light text-dark border me-2">${index + 1}</span> ${l.title}
                    </span>
                    <i class="bi bi-chevron-right text-muted small"></i>
                </div>
            </button>
        `;
    });
}

// ==========================================
// 2. จัดการฟอร์ม (Add / Edit Mode)
// ==========================================

// โหมดเพิ่มใหม่ (เคลียร์ฟอร์ม)
window.resetForm = () => {
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonId').value = ''; // เคลียร์ ID
    document.getElementById('formTitle').innerText = 'เพิ่มบทเรียนใหม่';
    document.getElementById('btnDelete').classList.add('d-none'); // ซ่อนปุ่มลบ
    document.getElementById('lTitle').focus();
}

// โหมดแก้ไข (ดึงข้อมูลมาใส่ฟอร์ม)
window.editLesson = async (id) => {
    // 1. ดึงข้อมูล
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single();
    
    if (data) {
        // 2. ใส่ค่าลงฟอร์ม
        document.getElementById('lessonId').value = data.id;
        document.getElementById('lTitle').value = data.title;
        document.getElementById('lVideo').value = data.video_url || '';
        document.getElementById('lContent').value = data.content || '';

        // 3. ปรับ UI
        document.getElementById('formTitle').innerText = 'แก้ไขบทเรียน';
        document.getElementById('btnDelete').classList.remove('d-none'); // โชว์ปุ่มลบ
    }
}

// ==========================================
// 3. บันทึกข้อมูล (Save)
// ==========================================
document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerText;
    btn.innerText = 'กำลังบันทึก...'; btn.disabled = true;

    const id = document.getElementById('lessonId').value;
    const title = document.getElementById('lTitle').value;
    const video = document.getElementById('lVideo').value;
    const content = document.getElementById('lContent').value;

    let error;

    if (id) {
        // --- Update ---
        const { error: updateError } = await supabase
            .from('lessons')
            .update({ title, video_url: video, content })
            .eq('id', id);
        error = updateError;
    } else {
        // --- Insert ---
        const { error: insertError } = await supabase
            .from('lessons')
            .insert({ 
                course_id: courseId, 
                title, 
                video_url: video, 
                content 
            });
        error = insertError;
    }

    if (!error) {
        // alert('บันทึกเรียบร้อย');
        loadLessons(); // รีโหลดลิสต์ซ้ายมือ
        if (!id) resetForm(); // ถ้าเพิ่มใหม่ ให้เคลียร์ฟอร์มรอเพิ่มต่อ
    } else {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }

    btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล'; btn.disabled = false;
});

// ==========================================
// 4. ลบบทเรียน (Delete)
// ==========================================
window.deleteLesson = async () => {
    const id = document.getElementById('lessonId').value;
    if (!id) return;

    if (confirm('ยืนยันที่จะลบบทเรียนนี้?')) {
        const { error } = await supabase.from('lessons').delete().eq('id', id);
        if (!error) {
            resetForm();
            loadLessons();
        } else {
            alert('ลบไม่สำเร็จ: ' + error.message);
        }
    }
}

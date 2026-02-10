import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

// เช็ค ID คอร์ส
if (!courseId) {
    alert('ไม่พบ ID คอร์ส (URL ผิดปกติ)');
    window.location.href = 'teacher.html';
} else {
    console.log("Current Course ID:", courseId);
}

// 1. Init
loadCourseInfo();
loadLessons();

// โหลดชื่อคอร์ส
async function loadCourseInfo() {
    const { data, error } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (data) document.getElementById('courseTitle').innerText = data.title;
}

// โหลดบทเรียน
async function loadLessons() {
    console.log("Loading lessons...");
    const listContainer = document.getElementById('lessonList');
    listContainer.innerHTML = '<div class="text-center py-3">Loading...</div>';

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Load Error:", error);
        listContainer.innerHTML = `<div class="text-danger p-3">Error: ${error.message}</div>`;
        return;
    }

    listContainer.innerHTML = '';
    if (!lessons || lessons.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีบทเรียน</div>';
        return;
    }

    lessons.forEach((l, index) => {
        listContainer.innerHTML += `
            <button onclick="editLesson('${l.id}')" class="list-group-item list-group-item-action py-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <span><span class="badge bg-light text-dark border me-2">${index + 1}</span> ${l.title}</span>
                    <i class="bi bi-pencil-square text-muted"></i>
                </div>
            </button>
        `;
    });
}

// 2. Form Functions
window.resetForm = () => {
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonId').value = '';
    document.getElementById('formTitle').innerText = 'เพิ่มบทเรียนใหม่';
    document.getElementById('btnDelete').classList.add('d-none');
}

window.editLesson = async (id) => {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('lessonId').value = data.id;
        document.getElementById('lTitle').value = data.title;
        document.getElementById('lVideo').value = data.video_url || '';
        document.getElementById('lContent').value = data.content || '';
        
        document.getElementById('formTitle').innerText = 'แก้ไขบทเรียน';
        document.getElementById('btnDelete').classList.remove('d-none');
    }
}

// 3. Save Logic
document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Saving...");
    
    // UI Loading
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerText;
    btn.innerText = 'กำลังบันทึก...';
    btn.disabled = true;

    // Get Values
    const id = document.getElementById('lessonId').value;
    const title = document.getElementById('lTitle').value;
    const video = document.getElementById('lVideo').value;
    const content = document.getElementById('lContent').value;

    let error;

    if (id) {
        // Update
        const { error: upErr } = await supabase
            .from('lessons')
            .update({ title, video_url: video, content })
            .eq('id', id);
        error = upErr;
    } else {
        // Insert
        const { error: inErr } = await supabase
            .from('lessons')
            .insert({ 
                course_id: courseId, 
                title: title, 
                video_url: video, 
                content: content 
            });
        error = inErr;
    }

    if (error) {
        console.error("Save Error:", error);
        alert('บันทึกไม่สำเร็จ: ' + error.message);
    } else {
        console.log("Saved Success");
        loadLessons(); // รีโหลดลิสต์
        if(!id) resetForm(); // ถ้าเพิ่มใหม่ ให้เคลียร์ฟอร์ม
    }

    // Restore Button
    btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล';
    btn.disabled = false;
});

// 4. Delete Logic
window.deleteLesson = async () => {
    const id = document.getElementById('lessonId').value;
    if(!id) return;
    
    if(confirm('ลบนะ?')) {
        const { error } = await supabase.from('lessons').delete().eq('id', id);
        if(!error) {
            resetForm();
            loadLessons();
        } else {
            alert(error.message);
        }
    }
}

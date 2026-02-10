import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'teacher.html';
}

// 1. Init
loadCourseInfo();
loadLessons();

// โหลดข้อมูลคอร์ส
async function loadCourseInfo() {
    const { data } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (data) document.getElementById('courseTitle').innerText = data.title;
}

// โหลดรายการ
async function loadLessons() {
    const list = document.getElementById('lessonList');
    list.innerHTML = '<div class="text-center py-3">Loading...</div>';

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
        .order('id', { ascending: true });

    if (error) return alert(error.message);

    list.innerHTML = '';
    if (!lessons || lessons.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีเนื้อหา</div>';
        return;
    }

    lessons.forEach((l, index) => {
        let icon = l.type === 'quiz' ? '<i class="bi bi-patch-question-fill text-warning"></i>' : '<i class="bi bi-play-btn-fill text-primary"></i>';
        
        list.innerHTML += `
            <button onclick="editLesson('${l.id}')" class="list-group-item list-group-item-action py-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <span>
                        <span class="badge bg-light text-dark border me-2">${index + 1}</span> 
                        ${icon} ${l.title}
                    </span>
                    <i class="bi bi-pencil-square text-muted"></i>
                </div>
            </button>
        `;
    });
}

// --- UI Management ---

window.switchType = (type) => {
    document.getElementById('lessonType').value = type;
    
    // ปรับ Tab Active
    document.getElementById('tabLesson').classList.toggle('active', type === 'lesson');
    document.getElementById('tabQuiz').classList.toggle('active', type === 'quiz');

    // Show/Hide Sections
    document.getElementById('sectionLesson').style.display = type === 'lesson' ? 'block' : 'none';
    document.getElementById('sectionQuiz').style.display = type === 'quiz' ? 'block' : 'none';
};

window.resetForm = () => {
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonId').value = '';
    document.getElementById('formTitle').innerText = 'เพิ่มเนื้อหาใหม่';
    document.getElementById('btnDelete').classList.add('d-none');
    document.getElementById('questionContainer').innerHTML = ''; // เคลียร์ข้อสอบ
    
    // Default เป็น Lesson
    switchType('lesson');
};

// เพิ่มกล่องคำถาม (Quiz Builder)
window.addQuestionUI = (data = null) => {
    const container = document.getElementById('questionContainer');
    const qIndex = container.children.length + 1;
    
    // ค่าเริ่มต้น (กรณีเพิ่มใหม่) หรือค่าเดิม (กรณีแก้ไข)
    const qText = data ? data.q : '';
    const opt0 = data ? data.options[0] : '';
    const opt1 = data ? data.options[1] : '';
    const opt2 = data ? data.options[2] : '';
    const opt3 = data ? data.options[3] : '';
    const correct = data ? data.answer : 0;

    const html = `
        <div class="card mb-3 border bg-light question-box">
            <div class="card-body position-relative">
                <button type="button" class="btn-close position-absolute top-0 end-0 m-2" onclick="this.closest('.question-box').remove()"></button>
                <h6 class="fw-bold text-primary mb-2">ข้อที่ <span class="q-num"></span></h6>
                
                <input class="form-control mb-2 fw-bold q-text" placeholder="ตั้งคำถาม..." value="${qText}" required>
                
                <div class="input-group mb-2">
                    <div class="input-group-text"><input type="radio" name="ans${Date.now()}" class="q-correct" value="0" ${correct == 0 ? 'checked' : ''}></div>
                    <input class="form-control q-opt" placeholder="ตัวเลือก A" value="${opt0}" required>
                </div>
                <div class="input-group mb-2">
                    <div class="input-group-text"><input type="radio" name="ans${Date.now()}" class="q-correct" value="1" ${correct == 1 ? 'checked' : ''}></div>
                    <input class="form-control q-opt" placeholder="ตัวเลือก B" value="${opt1}" required>
                </div>
                <div class="input-group mb-2">
                    <div class="input-group-text"><input type="radio" name="ans${Date.now()}" class="q-correct" value="2" ${correct == 2 ? 'checked' : ''}></div>
                    <input class="form-control q-opt" placeholder="ตัวเลือก C" value="${opt2}" required>
                </div>
                <div class="input-group mb-2">
                    <div class="input-group-text"><input type="radio" name="ans${Date.now()}" class="q-correct" value="3" ${correct == 3 ? 'checked' : ''}></div>
                    <input class="form-control q-opt" placeholder="ตัวเลือก D" value="${opt3}" required>
                </div>
                <div class="form-text small text-danger">* ติ๊กเลือกข้อที่ถูกต้องเป็นเฉลย</div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    updateQuestionNumbers();
};

function updateQuestionNumbers() {
    document.querySelectorAll('.question-box .q-num').forEach((el, index) => {
        el.innerText = index + 1;
    });
}

// --- Edit Mode ---
window.editLesson = async (id) => {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('lessonId').value = data.id;
        document.getElementById('lTitle').value = data.title;
        document.getElementById('formTitle').innerText = 'แก้ไขข้อมูล';
        document.getElementById('btnDelete').classList.remove('d-none');

        // เช็คประเภท
        if (data.type === 'quiz') {
            switchType('quiz');
            // Load คำถามจาก JSON
            const questions = JSON.parse(data.content || '[]');
            const container = document.getElementById('questionContainer');
            container.innerHTML = '';
            questions.forEach(q => addQuestionUI(q));
        } else {
            switchType('lesson');
            document.getElementById('lVideo').value = data.video_url || '';
            document.getElementById('lContent').value = data.content || '';
        }
    }
};

// --- Save Logic ---
document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerText = "กำลังบันทึก...";

    const id = document.getElementById('lessonId').value;
    const type = document.getElementById('lessonType').value;
    const title = document.getElementById('lTitle').value;
    
    let content = '';
    let video_url = null;

    if (type === 'lesson') {
        video_url = document.getElementById('lVideo').value;
        content = document.getElementById('lContent').value;
    } else {
        // Quiz: รวบรวมคำถามเป็น JSON
        const questions = [];
        document.querySelectorAll('.question-box').forEach(box => {
            const qText = box.querySelector('.q-text').value;
            const opts = Array.from(box.querySelectorAll('.q-opt')).map(i => i.value);
            
            // หาว่า Radio อันไหนถูกเลือก
            let correct = 0;
            box.querySelectorAll('.q-correct').forEach((radio, idx) => {
                if (radio.checked) correct = idx;
            });

            questions.push({ q: qText, options: opts, answer: correct });
        });
        
        if(questions.length === 0) {
            alert('กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ');
            btn.disabled = false; btn.innerText = "บันทึกข้อมูล";
            return;
        }
        content = JSON.stringify(questions); // แปลงเป็น Text เพื่อเก็บใน DB
    }

    const payload = { title, type, video_url, content, course_id: courseId };

    let error;
    if (id) {
        const { error: upErr } = await supabase.from('lessons').update(payload).eq('id', id);
        error = upErr;
    } else {
        const { error: inErr } = await supabase.from('lessons').insert(payload);
        error = inErr;
    }

    if (!error) {
        loadLessons();
        if (!id) resetForm();
        alert('บันทึกเรียบร้อย');
    } else {
        alert('Error: ' + error.message);
    }
    
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล';
});

// Delete
window.deleteLesson = async () => {
    const id = document.getElementById('lessonId').value;
    if(id && confirm('ยืนยันลบ?')) {
        await supabase.from('lessons').delete().eq('id', id);
        resetForm();
        loadLessons();
    }
};

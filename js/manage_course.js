import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'teacher.html';
}

loadCourseInfo();
loadLessons();

async function loadCourseInfo() {
    const { data } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (data) document.getElementById('courseTitle').innerText = data.title;
}

async function loadLessons() {
    const list = document.getElementById('lessonList');
    list.innerHTML = '<div class="text-center py-3">Loading...</div>';

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) return alert(error.message);

    list.innerHTML = '';
    if (!lessons || lessons.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-muted">ยังไม่มีเนื้อหา</div>';
        return;
    }

    lessons.forEach((l, index) => {
        let icon = l.type === 'quiz' ? '<i class="bi bi-patch-question-fill text-warning"></i>' : '<i class="bi bi-play-btn-fill text-primary"></i>';
        
        list.innerHTML += `
            <div class="list-group-item list-group-item-action py-3 border-bottom d-flex justify-content-between align-items-center" data-id="${l.id}" onclick="editLesson('${l.id}')">
                <span>
                    <i class="bi bi-grip-vertical text-muted me-2 handle" style="cursor:grab"></i>
                    ${icon} <span class="ms-1">${l.title}</span>
                </span>
                <i class="bi bi-pencil-square text-muted"></i>
            </div>
        `;
    });
    initSortable();
}

function initSortable() {
    const el = document.getElementById('lessonList');
    new Sortable(el, {
        animation: 150, ghostClass: 'sortable-ghost', handle: '.list-group-item',
        onEnd: async function () { await saveOrder(); }
    });
}

async function saveOrder() {
    const items = document.querySelectorAll('#lessonList .list-group-item');
    const updates = [];
    items.forEach((item, index) => {
        const id = item.getAttribute('data-id');
        updates.push({ id: parseInt(id), order_index: index });
    });
    for (const update of updates) {
        await supabase.from('lessons').update({ order_index: update.order_index }).eq('id', update.id);
    }
}

window.switchType = (type) => {
    document.getElementById('lessonType').value = type;
    document.getElementById('tabLesson').classList.toggle('active', type === 'lesson');
    document.getElementById('tabQuiz').classList.toggle('active', type === 'quiz');
    document.getElementById('sectionLesson').style.display = type === 'lesson' ? 'block' : 'none';
    document.getElementById('sectionQuiz').style.display = type === 'quiz' ? 'block' : 'none';
};

window.resetForm = () => {
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonId').value = '';
    document.getElementById('formTitle').innerText = 'เพิ่มเนื้อหาใหม่';
    document.getElementById('btnDelete').classList.add('d-none');
    document.getElementById('questionContainer').innerHTML = ''; 
    document.getElementById('qPassScore').value = 50; // Reset เป็น 50
    switchType('lesson');
};

window.addQuestionUI = (data = null) => {
    const container = document.getElementById('questionContainer');
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
                <h6 class="fw-bold text-primary mb-2">คำถาม</h6>
                <input class="form-control mb-2 fw-bold q-text" placeholder="ตั้งคำถาม..." value="${qText}" required>
                ${[0,1,2,3].map(i => `
                <div class="input-group mb-2">
                    <div class="input-group-text"><input type="radio" name="ans${Date.now()}" class="q-correct" value="${i}" ${correct == i ? 'checked' : ''}></div>
                    <input class="form-control q-opt" placeholder="ตัวเลือก" value="${eval('opt'+i)}" required>
                </div>`).join('')}
                <div class="form-text small text-danger">* เลือกข้อที่ถูกต้อง</div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
};

window.editLesson = async (id) => {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('lessonId').value = data.id;
        document.getElementById('lTitle').value = data.title;
        document.getElementById('formTitle').innerText = 'แก้ไขข้อมูล';
        document.getElementById('btnDelete').classList.remove('d-none');

        if (data.type === 'quiz') {
            switchType('quiz');
            // [ใหม่] โหลดเกณฑ์คะแนน
            document.getElementById('qPassScore').value = data.passing_score || 50;
            
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

document.getElementById('lessonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerText = "กำลังบันทึก...";

    const id = document.getElementById('lessonId').value;
    const type = document.getElementById('lessonType').value;
    const title = document.getElementById('lTitle').value;
    
    let content = '';
    let video_url = null;
    let passing_score = 50; // Default

    if (type === 'lesson') {
        video_url = document.getElementById('lVideo').value;
        content = document.getElementById('lContent').value;
    } else {
        // [ใหม่] รับค่า Passing Score
        passing_score = parseInt(document.getElementById('qPassScore').value) || 50;

        const questions = [];
        document.querySelectorAll('.question-box').forEach(box => {
            const qText = box.querySelector('.q-text').value;
            const opts = Array.from(box.querySelectorAll('.q-opt')).map(i => i.value);
            let correct = 0;
            box.querySelectorAll('.q-correct').forEach((radio, idx) => { if (radio.checked) correct = idx; });
            questions.push({ q: qText, options: opts, answer: correct });
        });
        
        if(questions.length === 0) {
            alert('กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ');
            btn.disabled = false; btn.innerText = "บันทึกข้อมูล";
            return;
        }
        content = JSON.stringify(questions);
    }

    let orderIndex = 0;
    if (!id) {
        const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
        orderIndex = count || 0;
    }

    const payload = { title, type, video_url, content, course_id: courseId, passing_score }; // เพิ่ม passing_score ใน payload
    if (!id) payload.order_index = orderIndex;

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
    } else {
        alert('Error: ' + error.message);
    }
    
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล';
});

window.deleteLesson = async () => {
    const id = document.getElementById('lessonId').value;
    if(id && confirm('ยืนยันลบ?')) {
        await supabase.from('lessons').delete().eq('id', id);
        resetForm();
        loadLessons();
    }
};

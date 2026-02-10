import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');
const userId = localStorage.getItem('user_id');

let allLessons = [];
let completedLessonIds = new Set();
let currentLessonIndex = 0;
let currentQuizData = []; // เก็บเฉลยของบทปัจจุบัน

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'index.html';
}

initClassroom();

async function initClassroom() {
    try {
        // 1. ดึงชื่อคอร์ส
        const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
        if (course) {
            const nameEl = document.getElementById('courseName');
            if(nameEl) nameEl.innerText = course.title;
            document.title = `${course.title} - ห้องเรียนออนไลน์`;
        }

        // 2. ดึงบทเรียน
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        allLessons = lessons || [];

        // 3. ดึง Progress
        if (userId) {
            const { data: progress } = await supabase
                .from('student_progress')
                .select('lesson_id')
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            if (progress) {
                progress.forEach(p => completedLessonIds.add(p.lesson_id));
            }
        }

        renderPlaylist();
        updateProgressBar();
        
        if (allLessons.length > 0) {
            loadLesson(0);
        } else {
            document.getElementById('playlist').innerHTML = '<div class="p-5 text-center text-muted">ยังไม่มีเนื้อหา</div>';
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

function renderPlaylist() {
    const list = document.getElementById('playlist');
    if (!list) return;
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const isCompleted = completedLessonIds.has(l.id) ? 'completed' : '';
        const checkIcon = completedLessonIds.has(l.id) ? '<i class="bi bi-check-lg"></i>' : '';
        
        // ไอคอนแยกประเภท
        let typeIcon = l.type === 'quiz' 
            ? '<i class="bi bi-patch-question-fill text-warning" title="แบบทดสอบ"></i>' 
            : '<i class="bi bi-play-circle-fill text-muted" title="วิดีโอ"></i>';

        list.innerHTML += `
            <div class="lesson-item ${isActive}">
                <div class="check-btn ${isCompleted}" ${l.type !== 'quiz' ? `onclick="toggleComplete(event, ${l.id})"` : 'style="cursor: default; opacity: 0.5;"'}>
                    ${checkIcon}
                </div>
                <div class="d-flex align-items-center flex-grow-1" onclick="changeLesson(${index})">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold" style="font-size: 0.95rem;">${l.title}</div>
                    </div>
                    ${typeIcon}
                </div>
            </div>
        `;
    });
}

// อัปเดต Progress
window.toggleComplete = async (e, lessonId) => {
    e.stopPropagation();
    if (!userId) return alert('กรุณาเข้าสู่ระบบเพื่อบันทึกความคืบหน้า');

    // ถ้าเป็น Quiz ห้ามติ๊กเอง ต้องสอบผ่านเท่านั้น
    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson && lesson.type === 'quiz' && !completedLessonIds.has(lessonId)) {
        return alert('ต้องทำแบบทดสอบให้ผ่านก่อน ระบบจึงจะบันทึกให้ครับ');
    }

    if (completedLessonIds.has(lessonId)) {
        completedLessonIds.delete(lessonId);
        await supabase.from('student_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
    } else {
        completedLessonIds.add(lessonId);
        await supabase.from('student_progress').insert({
            user_id: userId, lesson_id: lessonId, course_id: courseId
        });
    }
    renderPlaylist();
    updateProgressBar();
};

function updateProgressBar() {
    if (allLessons.length === 0) return;
    const percent = Math.round((completedLessonIds.size / allLessons.length) * 100);
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressPercent');
    if(bar) bar.style.width = `${percent}%`;
    if(txt) txt.innerText = `${percent}%`;
}

window.changeLesson = (index) => {
    currentLessonIndex = index;
    renderPlaylist();
    loadLesson(index);
};

function loadLesson(index) {
    const lesson = allLessons[index];
    if (!lesson) return;

    document.getElementById('lessonTitle').innerText = lesson.title;
    const contentEl = document.getElementById('lessonContent');
    const videoBox = document.getElementById('videoContainer');
    const quizBox = document.getElementById('quizContainer');
    const iframe = document.getElementById('mainVideo');

    // Reset view
    videoBox.classList.add('d-none');
    quizBox.classList.add('d-none');
    iframe.src = "";
    contentEl.innerHTML = "";

    // --- กรณีเป็น Quiz ---
    if (lesson.type === 'quiz') {
        try {
            currentQuizData = JSON.parse(lesson.content || '[]');
            renderQuiz(currentQuizData);
            quizBox.classList.remove('d-none');
            contentEl.innerHTML = `<div class="alert alert-warning"><i class="bi bi-info-circle"></i> กรุณาทำแบบทดสอบด้านบนให้ครบทุกข้อ</div>`;
        } catch (e) {
            contentEl.innerText = "เกิดข้อผิดพลาดในการโหลดข้อสอบ";
        }
        return; 
    }

    // --- กรณีเป็นบทเรียนปกติ (VDO) ---
    contentEl.innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา";
    
    if (lesson.video_url && lesson.video_url.length > 5) {
        let videoId = "";
        try {
            if (lesson.video_url.includes('v=')) videoId = lesson.video_url.split('v=')[1].split('&')[0];
            else if (lesson.video_url.includes('youtu.be/')) videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
            else if (lesson.video_url.includes('embed/')) videoId = lesson.video_url.split('embed/')[1].split('?')[0];
        } catch (e) {}

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            videoBox.classList.remove('d-none');
        }
    }
}

// สร้างหน้าตาข้อสอบ
function renderQuiz(questions) {
    const container = document.getElementById('quizBody');
    container.innerHTML = '';

    if (questions.length === 0) {
        container.innerHTML = '<div class="text-center">ไม่พบข้อคำถาม</div>';
        return;
    }

    questions.forEach((q, index) => {
        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            optionsHtml += `
                <div class="form-check p-3 border rounded mb-2 quiz-option">
                    <input class="form-check-input" type="radio" name="q${index}" id="q${index}_${optIndex}" value="${optIndex}">
                    <label class="form-check-label w-100" for="q${index}_${optIndex}">
                        ${opt}
                    </label>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="mb-4">
                <h5 class="fw-bold mb-3">${index + 1}. ${q.q}</h5>
                ${optionsHtml}
            </div>
        `;
    });
}

// ตรวจคำตอบ
window.submitQuiz = async () => {
    if (!currentQuizData || currentQuizData.length === 0) return;
    if (!userId) return alert('กรุณาเข้าสู่ระบบก่อนทำแบบทดสอบ');

    let score = 0;
    let total = currentQuizData.length;
    let allAnswered = true;

    // ตรวจทีละข้อ
    currentQuizData.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) {
            allAnswered = false;
        } else if (parseInt(selected.value) === parseInt(q.answer)) {
            score++;
        }
    });

    if (!allAnswered) {
        return alert('กรุณาตอบคำถามให้ครบทุกข้อ');
    }

    // คำนวณผล (ต้องได้ 50% ขึ้นไปถึงจะผ่าน)
    const percent = (score / total) * 100;
    const isPassed = percent >= 50;
    
    let msg = `คุณได้คะแนน ${score} / ${total} (${Math.round(percent)}%)`;
    if (isPassed) {
        msg += "\n\n🎉 ยินดีด้วย! คุณผ่านบทเรียนนี้แล้ว";
        alert(msg);

        // บันทึกผ่าน (Mark as complete)
        const currentLesson = allLessons[currentLessonIndex];
        if (!completedLessonIds.has(currentLesson.id)) {
            completedLessonIds.add(currentLesson.id);
            await supabase.from('student_progress').insert({
                user_id: userId, lesson_id: currentLesson.id, course_id: courseId
            });
            renderPlaylist(); // อัปเดต UI ให้เป็นสีเขียว
            updateProgressBar();
        }
    } else {
        msg += "\n\n❌ ยังไม่ผ่านเกณฑ์ (ต้องได้ 50% ขึ้นไป) ลองใหม่นะครับ";
        alert(msg);
    }
};

import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');
const userId = localStorage.getItem('user_id');

let allLessons = [];
let completedLessonIds = new Set(); 
let studentProgressMap = {}; 
let currentLessonIndex = 0;
let currentQuizData = [];

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'index.html';
}

initClassroom();

async function initClassroom() {
    try {
        const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
        if (course) {
            document.getElementById('courseName').innerText = course.title;
            document.title = `${course.title} - ห้องเรียนออนไลน์`;
        }

        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
            .order('id', { ascending: true });

        if (error) throw error;
        allLessons = lessons || [];

        if (userId) {
            // [อัปเดตใหม่] บันทึกประวัติว่านักเรียนเคยกดเข้ามาเรียนคอร์สนี้
            // ถ้าเคยมีอยู่แล้ว Supabase จะคืนค่า Error ให้เราเพิกเฉยได้เพราะตั้งค่า UNIQUE ไว้
            await supabase.from('enrollments').insert({ user_id: userId, course_id: courseId }).catch(() => {});

            // ดึงข้อมูล Progress (สอบและติ๊กถูก)
            const { data: progress } = await supabase
                .from('student_progress')
                .select('lesson_id, quiz_data') 
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            if (progress) {
                progress.forEach(p => {
                    completedLessonIds.add(p.lesson_id);
                    if (p.quiz_data) studentProgressMap[p.lesson_id] = p.quiz_data; 
                });
            }
        }

        renderPlaylist();
        updateProgressBar(false); // false = ไม่เด้ง popup ตอนโหลด
        if (allLessons.length > 0) loadLesson(0);
        else document.getElementById('playlist').innerHTML = '<div class="p-5 text-center text-muted">ยังไม่มีเนื้อหา</div>';

    } catch (err) { console.error("Error:", err); }
}

function renderPlaylist() {
    const list = document.getElementById('playlist');
    if (!list) return;
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const isCompleted = completedLessonIds.has(l.id) ? 'completed' : '';
        const checkIcon = completedLessonIds.has(l.id) ? '<i class="bi bi-check-lg"></i>' : '';
        let typeIcon = l.type === 'quiz' ? '<i class="bi bi-patch-question-fill text-warning"></i>' : '<i class="bi bi-file-earmark-text-fill text-muted"></i>';

        list.innerHTML += `
            <div class="lesson-item ${isActive}">
                <div class="check-btn ${isCompleted}" ${l.type !== 'quiz' ? `onclick="toggleComplete(event, ${l.id})"` : 'style="cursor: default; opacity: 0.5;"'}>${checkIcon}</div>
                <div class="d-flex align-items-center flex-grow-1" onclick="changeLesson(${index})">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1"><div class="fw-bold" style="font-size: 0.95rem;">${l.title}</div></div>
                    ${typeIcon}
                </div>
            </div>`;
    });
}

window.toggleComplete = async (e, lessonId) => {
    e.stopPropagation();
    if (!userId) return alert('กรุณาเข้าสู่ระบบเพื่อบันทึกความคืบหน้า');

    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson && lesson.type === 'quiz' && !completedLessonIds.has(lessonId)) {
        return alert('ต้องทำแบบทดสอบให้ผ่านก่อน ระบบจึงจะบันทึกให้ครับ');
    }

    if (completedLessonIds.has(lessonId)) {
        completedLessonIds.delete(lessonId);
        await supabase.from('student_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
    } else {
        completedLessonIds.add(lessonId);
        await supabase.from('student_progress').insert({ user_id: userId, lesson_id: lessonId, course_id: courseId });
    }
    renderPlaylist();
    updateProgressBar(true); // true = เช็ค popup
};

function updateProgressBar(isUpdate = false) {
    if (allLessons.length === 0) return;
    const percent = Math.round((completedLessonIds.size / allLessons.length) * 100);
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressPercent');
    if(bar) bar.style.width = `${percent}%`;
    if(txt) txt.innerText = `${percent}%`;

    if (percent === 100 && isUpdate) {
        const modalEl = document.getElementById('congratsModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }
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

    videoBox.classList.add('d-none');
    quizBox.classList.add('d-none');
    iframe.src = "";
    contentEl.innerHTML = "";

    if (lesson.type === 'quiz') {
        try {
            currentQuizData = JSON.parse(lesson.content || '[]');
            renderQuiz(currentQuizData);
            quizBox.classList.remove('d-none');
            
            const resultBox = document.getElementById('quizResult');
            const btnSubmit = document.getElementById('btnSubmitQuiz');
            const btnRetry = document.getElementById('btnRetryQuiz');
            
            resultBox.classList.add('d-none');
            btnSubmit.classList.remove('d-none');
            btnRetry.classList.add('d-none');
            
            const passScore = lesson.passing_score || 50; 
            const quizSub = document.getElementById('quizSubtitle');
            if(quizSub) quizSub.innerText = `ตอบคำถามให้ถูกต้องเพื่อผ่านบทเรียนนี้ (เกณฑ์ ${passScore}%)`;

            contentEl.innerHTML = `<div class="alert alert-warning"><i class="bi bi-info-circle"></i> แบบทดสอบ: ต้องได้คะแนน ${passScore}% ขึ้นไปถึงจะผ่าน</div>`;

            if (completedLessonIds.has(lesson.id)) {
                const savedData = studentProgressMap[lesson.id];
                if (savedData) restoreQuizState(savedData);
            }
        } catch (e) { contentEl.innerText = "เกิดข้อผิดพลาดในการโหลดข้อสอบ"; }
        return; 
    }

    contentEl.innerHTML = lesson.content ? lesson.content.replace(/\n/g, '<br>') : "ไม่มีรายละเอียดเนื้อหา";
    if (lesson.video_url && lesson.video_url.length > 5) {
        let videoId = "";
        try {
            if (lesson.video_url.includes('v=')) videoId = lesson.video_url.split('v=')[1].split('&')[0];
            else if (lesson.video_url.includes('youtu.be/')) videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
            else if (lesson.video_url.includes('embed/')) videoId = lesson.video_url.split('embed/')[1].split('?')[0];
        } catch (e) {}
        if (videoId) { iframe.src = `https://www.youtube.com/embed/${videoId}`; videoBox.classList.remove('d-none'); }
    }

    if (lesson.pdf_url) {
        contentEl.innerHTML += `
            <div class="mt-4 pt-4 border-top">
                <a href="${lesson.pdf_url}" target="_blank" class="btn btn-outline-danger w-100 rounded-pill py-2 fw-bold shadow-sm">
                    <i class="bi bi-file-earmark-pdf-fill me-2"></i> ดาวน์โหลดเอกสารประกอบการเรียน (PDF)
                </a>
            </div>
        `;
    }
}

function renderQuiz(questions) {
    const container = document.getElementById('quizBody');
    container.innerHTML = '';
    if (questions.length === 0) { container.innerHTML = '<div class="text-center">ไม่พบข้อคำถาม</div>'; return; }

    questions.forEach((q, index) => {
        let optionsHtml = '';
        q.options.forEach((opt, optIndex) => {
            optionsHtml += `
                <label class="quiz-option-card d-flex align-items-center p-3 mb-3 border rounded-3 w-100" id="opt_${index}_${optIndex}">
                    <input class="d-none" type="radio" name="q${index}" value="${optIndex}">
                    <div class="option-circle d-flex align-items-center justify-content-center rounded-circle border me-3 flex-shrink-0" 
                         style="width: 40px; height: 40px; font-weight: bold; color: #6c757d; border-color: #dee2e6; transition:0.2s;">
                        ${optIndex + 1}
                    </div>
                    <span class="option-text text-dark" style="font-size: 1rem;">${opt}</span>
                </label>`;
        });
        container.innerHTML += `<div class="mb-5"><h5 class="fw-bold mb-3 text-dark">${index + 1}. ${q.q}</h5>${optionsHtml}</div>`;
    });
}

function restoreQuizState(savedData) {
    if (!savedData || !savedData.answers) return;
    const inputs = document.querySelectorAll('#quizBody input');
    inputs.forEach(inp => inp.disabled = true);

    savedData.answers.forEach((ansIndex, qIndex) => {
        const radio = document.querySelector(`input[name="q${qIndex}"][value="${ansIndex}"]`);
        if (radio) radio.checked = true;
        const correctAns = parseInt(currentQuizData[qIndex].answer);
        const correctBox = document.getElementById(`opt_${qIndex}_${correctAns}`);
        if(correctBox) correctBox.classList.add('correct');
        if (ansIndex !== correctAns) {
            const wrongBox = document.getElementById(`opt_${qIndex}_${ansIndex}`);
            if(wrongBox) wrongBox.classList.add('wrong');
        }
    });

    const resultBox = document.getElementById('quizResult');
    resultBox.classList.remove('d-none', 'alert-danger');
    resultBox.classList.add('alert-success');
    resultBox.innerHTML = `
        <h4 class="alert-heading fw-bold"><i class="bi bi-check-circle-fill"></i> คุณสอบผ่านบทเรียนนี้แล้ว</h4>
        <p class="mb-0">คะแนนที่ได้: <strong>${savedData.score} / ${savedData.total}</strong></p>
    `;
    document.getElementById('btnSubmitQuiz').classList.add('d-none');
    document.getElementById('btnRetryQuiz').classList.add('d-none');
}

window.submitQuiz = async () => {
    if (!currentQuizData || currentQuizData.length === 0) return;
    if (!userId) return alert('กรุณาเข้าสู่ระบบก่อนทำแบบทดสอบ');

    let score = 0;
    let total = currentQuizData.length;
    let allAnswered = true;
    let userAnswers = [];

    currentQuizData.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) { allAnswered = false; userAnswers.push(null); }
        else { userAnswers.push(parseInt(selected.value)); }
    });

    if (!allAnswered) return alert('กรุณาตอบคำถามให้ครบทุกข้อ');

    const inputs = document.querySelectorAll('#quizBody input');
    inputs.forEach(inp => inp.disabled = true);

    currentQuizData.forEach((q, index) => {
        const userAns = userAnswers[index];
        const correctAns = parseInt(q.answer);
        const correctBox = document.getElementById(`opt_${index}_${correctAns}`);
        if(correctBox) correctBox.classList.add('correct');
        if (userAns === correctAns) { score++; }
        else { const wrongBox = document.getElementById(`opt_${index}_${userAns}`); if(wrongBox) wrongBox.classList.add('wrong'); }
    });

    const percent = (score / total) * 100;
    const currentLesson = allLessons[currentLessonIndex];
    const passScore = currentLesson.passing_score || 50; 
    const isPassed = percent >= passScore;
    
    const resultBox = document.getElementById('quizResult');
    resultBox.classList.remove('d-none', 'alert-success', 'alert-danger');
    
    if (isPassed) {
        resultBox.classList.add('alert-success');
        resultBox.innerHTML = `
            <h4 class="alert-heading fw-bold"><i class="bi bi-trophy-fill"></i> ยินดีด้วย! คุณสอบผ่าน</h4>
            <p class="mb-0">คะแนนของคุณ: <strong>${score} / ${total}</strong> (${Math.round(percent)}%)</p>
        `;
        document.getElementById('btnSubmitQuiz').classList.add('d-none');

        const quizDataToSave = { score: score, total: total, answers: userAnswers };
        if (!completedLessonIds.has(currentLesson.id)) {
            completedLessonIds.add(currentLesson.id);
            studentProgressMap[currentLesson.id] = quizDataToSave;
            await supabase.from('student_progress').insert({
                user_id: userId, lesson_id: currentLesson.id, course_id: courseId, quiz_data: quizDataToSave
            });
            renderPlaylist(); 
            updateProgressBar(true); // true = เช็ค popup
        }

    } else {
        resultBox.classList.add('alert-danger');
        resultBox.innerHTML = `
            <h4 class="alert-heading fw-bold"><i class="bi bi-x-circle-fill"></i> ยังไม่ผ่านเกณฑ์</h4>
            <p>คะแนนของคุณ: <strong>${score} / ${total}</strong> (${Math.round(percent)}%)</p>
            <hr>
            <p class="mb-0 small">ต้องได้คะแนน ${passScore}% ขึ้นไป ลองทำใหม่อีกครั้งนะครับ</p>
        `;
        document.getElementById('btnSubmitQuiz').classList.add('d-none');
        document.getElementById('btnRetryQuiz').classList.remove('d-none');
    }
};

window.retryQuiz = () => {
    document.querySelectorAll('.quiz-option-card').forEach(el => el.classList.remove('correct', 'wrong'));
    document.querySelectorAll('#quizBody input').forEach(inp => { inp.disabled = false; inp.checked = false; });
    document.getElementById('quizResult').classList.add('d-none');
    document.getElementById('btnSubmitQuiz').classList.remove('d-none');
    document.getElementById('btnRetryQuiz').classList.add('d-none');
    document.getElementById('quizContainer').scrollIntoView({ behavior: 'smooth' });
};

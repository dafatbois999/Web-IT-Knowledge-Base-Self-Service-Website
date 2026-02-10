import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');
const userId = localStorage.getItem('user_id');

let allLessons = [];
let completedLessonIds = new Set(); 
let studentProgressMap = {}; // [ใหม่] เก็บข้อมูลผลสอบของแต่ละบท
let currentLessonIndex = 0;
let currentQuizData = [];

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

        // 3. ดึง Progress (เพิ่มการดึง quiz_data)
        if (userId) {
            const { data: progress } = await supabase
                .from('student_progress')
                .select('lesson_id, quiz_data') // ดึงข้อมูลคำตอบมาด้วย
                .eq('user_id', userId)
                .eq('course_id', courseId);
            
            if (progress) {
                progress.forEach(p => {
                    completedLessonIds.add(p.lesson_id);
                    // เก็บผลสอบไว้ใช้ตอนโหลดบทเรียน
                    if (p.quiz_data) {
                        studentProgressMap[p.lesson_id] = p.quiz_data; 
                    }
                });
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

// ติ๊กถูกสำหรับบทเรียน VDO (Quiz ห้ามกดเอง)
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

    // Reset UI Elements
    videoBox.classList.add('d-none');
    quizBox.classList.add('d-none');
    iframe.src = "";
    contentEl.innerHTML = "";

    // === QUIZ MODE ===
    if (lesson.type === 'quiz') {
        try {
            currentQuizData = JSON.parse(lesson.content || '[]');
            renderQuiz(currentQuizData);
            quizBox.classList.remove('d-none');
            
            // รีเซ็ตปุ่มและผลลัพธ์
            const resultBox = document.getElementById('quizResult');
            const btnSubmit = document.getElementById('btnSubmitQuiz');
            const btnRetry = document.getElementById('btnRetryQuiz');
            
            resultBox.classList.add('d-none');
            btnSubmit.classList.remove('d-none');
            btnRetry.classList.add('d-none');
            contentEl.innerHTML = `<div class="alert alert-warning"><i class="bi bi-info-circle"></i> แบบทดสอบ: ต้องได้คะแนน 50% ขึ้นไปถึงจะผ่าน</div>`;

            // [ใหม่] ตรวจสอบว่าเคยสอบผ่านหรือยัง?
            if (completedLessonIds.has(lesson.id)) {
                const savedData = studentProgressMap[lesson.id];
                if (savedData) {
                    restoreQuizState(savedData); // คืนค่าคำตอบเดิม
                }
            }

        } catch (e) {
            console.error(e);
            contentEl.innerText = "เกิดข้อผิดพลาดในการโหลดข้อสอบ";
        }
        return; 
    }

    // === LESSON MODE (VDO) ===
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
                <div class="form-check p-3 border rounded mb-2 quiz-option" id="opt_${index}_${optIndex}">
                    <input class="form-check-input" type="radio" name="q${index}" id="radio_${index}_${optIndex}" value="${optIndex}">
                    <label class="form-check-label w-100" style="cursor:pointer;" for="radio_${index}_${optIndex}">
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

// === [ใหม่] ฟังก์ชันคืนค่าคำตอบเดิม (Restore) ===
function restoreQuizState(savedData) {
    if (!savedData || !savedData.answers) return;

    // 1. ติ๊กคำตอบเดิมและล็อก
    const inputs = document.querySelectorAll('#quizBody input');
    inputs.forEach(inp => inp.disabled = true); // ล็อกทั้งหมด

    savedData.answers.forEach((ansIndex, qIndex) => {
        const radio = document.querySelector(`input[name="q${qIndex}"][value="${ansIndex}"]`);
        if (radio) radio.checked = true;

        // เฉลยสีเขียว/แดง
        const correctAns = parseInt(currentQuizData[qIndex].answer);
        const correctBox = document.getElementById(`opt_${qIndex}_${correctAns}`);
        if(correctBox) correctBox.classList.add('correct'); // เฉลยข้อถูกเสมอ

        if (ansIndex !== correctAns) {
            const wrongBox = document.getElementById(`opt_${qIndex}_${ansIndex}`);
            if(wrongBox) wrongBox.classList.add('wrong'); // ถ้าตอบผิดให้แดง
        }
    });

    // 2. โชว์ผลคะแนน
    const resultBox = document.getElementById('quizResult');
    resultBox.classList.remove('d-none', 'alert-danger');
    resultBox.classList.add('alert-success');
    resultBox.innerHTML = `
        <h4 class="alert-heading fw-bold"><i class="bi bi-check-circle-fill"></i> คุณสอบผ่านบทเรียนนี้แล้ว</h4>
        <p class="mb-0">คะแนนที่ได้: <strong>${savedData.score} / ${savedData.total}</strong></p>
    `;

    // 3. ซ่อนปุ่มส่ง
    document.getElementById('btnSubmitQuiz').classList.add('d-none');
    document.getElementById('btnRetryQuiz').classList.add('d-none'); // สอบผ่านแล้วไม่ต้อง Retry
}


// === ตรวจข้อสอบ และ บันทึก ===
window.submitQuiz = async () => {
    if (!currentQuizData || currentQuizData.length === 0) return;
    if (!userId) return alert('กรุณาเข้าสู่ระบบก่อนทำแบบทดสอบ');

    let score = 0;
    let total = currentQuizData.length;
    let allAnswered = true;
    let userAnswers = []; // เก็บคำตอบที่เลือก [0, 2, 1, ...]

    // 1. ตรวจว่าตอบครบไหม
    currentQuizData.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) {
            allAnswered = false;
            userAnswers.push(null);
        } else {
            userAnswers.push(parseInt(selected.value));
        }
    });

    if (!allAnswered) return alert('กรุณาตอบคำถามให้ครบทุกข้อ');

    // 2. ล็อกคำตอบและตรวจทีละข้อ
    const inputs = document.querySelectorAll('#quizBody input');
    inputs.forEach(inp => inp.disabled = true);

    currentQuizData.forEach((q, index) => {
        const userAns = userAnswers[index];
        const correctAns = parseInt(q.answer);

        const correctBox = document.getElementById(`opt_${index}_${correctAns}`);
        if(correctBox) correctBox.classList.add('correct');

        if (userAns === correctAns) {
            score++;
        } else {
            const wrongBox = document.getElementById(`opt_${index}_${userAns}`);
            if(wrongBox) wrongBox.classList.add('wrong');
        }
    });

    // 3. แสดงผล
    const percent = (score / total) * 100;
    const isPassed = percent >= 50;
    const resultBox = document.getElementById('quizResult');
    
    resultBox.classList.remove('d-none', 'alert-success', 'alert-danger');
    
    if (isPassed) {
        // --- ผ่าน ---
        resultBox.classList.add('alert-success');
        resultBox.innerHTML = `
            <h4 class="alert-heading fw-bold"><i class="bi bi-trophy-fill"></i> ยินดีด้วย! คุณสอบผ่าน</h4>
            <p class="mb-0">คะแนนของคุณ: <strong>${score} / ${total}</strong> (${Math.round(percent)}%)</p>
        `;
        document.getElementById('btnSubmitQuiz').classList.add('d-none');

        // บันทึกลง Database (รวมคำตอบไปด้วย)
        const currentLesson = allLessons[currentLessonIndex];
        
        // ข้อมูลที่จะบันทึก
        const quizDataToSave = {
            score: score,
            total: total,
            answers: userAnswers
        };

        // ถ้ายังไม่เคยผ่าน หรือ อยากอัปเดตคะแนน
        if (!completedLessonIds.has(currentLesson.id)) {
            completedLessonIds.add(currentLesson.id);
            // อัปเดต Map ในเครื่องด้วย
            studentProgressMap[currentLesson.id] = quizDataToSave;

            await supabase.from('student_progress').insert({
                user_id: userId, 
                lesson_id: currentLesson.id, 
                course_id: courseId,
                quiz_data: quizDataToSave // บันทึก JSON คำตอบ
            });
            
            renderPlaylist(); 
            updateProgressBar();
        }

    } else {
        // --- ตก ---
        resultBox.classList.add('alert-danger');
        resultBox.innerHTML = `
            <h4 class="alert-heading fw-bold"><i class="bi bi-x-circle-fill"></i> ยังไม่ผ่านเกณฑ์</h4>
            <p>คะแนนของคุณ: <strong>${score} / ${total}</strong> (${Math.round(percent)}%)</p>
            <hr>
            <p class="mb-0 small">ต้องได้คะแนน 50% ขึ้นไป ลองทำใหม่อีกครั้งนะครับ</p>
        `;
        document.getElementById('btnSubmitQuiz').classList.add('d-none');
        document.getElementById('btnRetryQuiz').classList.remove('d-none');
    }
};

window.retryQuiz = () => {
    document.querySelectorAll('.quiz-option').forEach(el => {
        el.classList.remove('correct', 'wrong');
    });
    const inputs = document.querySelectorAll('#quizBody input');
    inputs.forEach(inp => {
        inp.disabled = false;
        inp.checked = false;
    });
    document.getElementById('quizResult').classList.add('d-none');
    document.getElementById('btnSubmitQuiz').classList.remove('d-none');
    document.getElementById('btnRetryQuiz').classList.add('d-none');
    document.getElementById('quizContainer').scrollIntoView({ behavior: 'smooth' });
};

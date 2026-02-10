import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');
const userId = localStorage.getItem('user_id');

let allLessons = [];
let completedLessonIds = new Set();
let currentLessonIndex = 0;

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

        list.innerHTML += `
            <div class="lesson-item ${isActive}">
                <div class="check-btn ${isCompleted}" onclick="toggleComplete(event, ${l.id})">
                    ${checkIcon}
                </div>
                <div class="d-flex align-items-center flex-grow-1" onclick="changeLesson(${index})">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold" style="font-size: 0.95rem;">${l.title}</div>
                    </div>
                    ${l.video_url ? '<i class="bi bi-play-circle-fill text-muted"></i>' : '<i class="bi bi-file-text-fill text-muted"></i>'}
                </div>
            </div>
        `;
    });
}

window.toggleComplete = async (e, lessonId) => {
    e.stopPropagation();
    if (!userId) return alert('กรุณาเข้าสู่ระบบเพื่อบันทึกความคืบหน้า');

    const btn = e.currentTarget;
    
    if (completedLessonIds.has(lessonId)) {
        completedLessonIds.delete(lessonId);
        await supabase.from('student_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId);
    } else {
        completedLessonIds.add(lessonId);
        await supabase.from('student_progress').insert({
            user_id: userId,
            lesson_id: lessonId,
            course_id: courseId
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
    if(txt) {
        txt.innerText = `${percent}%`;
        if (percent === 100) {
            txt.classList.replace('bg-success', 'bg-warning');
            txt.innerText = '🎉 100%';
        } else {
            txt.classList.replace('bg-warning', 'bg-success');
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

    const titleEl = document.getElementById('lessonTitle');
    if(titleEl) titleEl.innerText = lesson.title;
    
    const contentEl = document.getElementById('lessonContent');
    if(contentEl) contentEl.innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา";

    const videoBox = document.getElementById('videoContainer');
    const iframe = document.getElementById('mainVideo');

    if (lesson.video_url && lesson.video_url.length > 5) {
        let videoId = "";
        try {
            if (lesson.video_url.includes('v=')) videoId = lesson.video_url.split('v=')[1].split('&')[0];
            else if (lesson.video_url.includes('youtu.be/')) videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
            else if (lesson.video_url.includes('embed/')) videoId = lesson.video_url.split('embed/')[1].split('?')[0];
        } catch (e) { console.error("URL Error", e); }

        if (videoId && iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            if(videoBox) videoBox.classList.remove('d-none');
        } else {
            hideVideo();
        }
    } else {
        hideVideo();
    }

    function hideVideo() {
        if(iframe) iframe.src = "";
        if(videoBox) videoBox.classList.add('d-none');
    }
}

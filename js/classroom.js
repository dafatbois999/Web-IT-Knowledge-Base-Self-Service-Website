import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

let allLessons = [];
let currentLessonIndex = 0;

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'index.html';
}

initClassroom();

async function initClassroom() {
    try {
        console.log("Start loading course ID:", courseId);

        // 1. ดึงชื่อคอร์ส
        const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
        if (course) {
            // ใส่ชื่อคอร์สตรงเนื้อหา
            const nameEl = document.getElementById('courseName');
            if(nameEl) nameEl.innerText = course.title;
            document.title = `${course.title} - ห้องเรียนออนไลน์`;
        }

        // 2. ดึงบทเรียน (ปรับใหม่: เรียงตาม ID แทน created_at เพื่อแก้ปัญหา Database ไม่ตรง)
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true }) 
            .order('id', { ascending: true }); // ใช้ ID แทน created_at ชั่วคราว

        if (error) throw error;

        // 3. แสดงผล Playlist
        const playlistBox = document.getElementById('playlist');
        
        if (!lessons || lessons.length === 0) {
            if(playlistBox) playlistBox.innerHTML = '<div class="p-5 text-center text-muted">ยังไม่มีเนื้อหาในคอร์สนี้</div>';
            
            const titleEl = document.getElementById('lessonTitle');
            if(titleEl) titleEl.innerText = "ยังไม่มีบทเรียน";
            
            const contentEl = document.getElementById('lessonContent');
            if(contentEl) contentEl.innerText = "คุณครูยังไม่ได้เพิ่มเนื้อหา";
            
            const noVid = document.getElementById('noVideoPlaceholder');
            if(noVid) noVid.style.display = 'flex';
            return;
        }

        allLessons = lessons;
        renderPlaylist();
        loadLesson(0); // เล่นบทแรกอัตโนมัติ

    } catch (err) {
        console.error("Error Detail:", err);
        // แจ้งเตือนถ้าเป็น Error จาก SQL
        if (err.code === '42703') {
            alert('Database Error: คอลัมน์ไม่ครบ กรุณารัน SQL เพิ่มคอลัมน์ (ดูใน Console)');
        }
    }
}

function renderPlaylist() {
    const list = document.getElementById('playlist');
    if (!list) return;
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const icon = l.video_url ? '<i class="bi bi-play-circle-fill lesson-icon"></i>' : '<i class="bi bi-file-text-fill lesson-icon"></i>';

        list.innerHTML += `
            <div class="lesson-item ${isActive}" onclick="changeLesson(${index})">
                <div class="d-flex align-items-center w-100">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold" style="font-size: 0.95rem;">${l.title}</div>
                    </div>
                    ${icon}
                </div>
            </div>
        `;
    });
}

window.changeLesson = (index) => {
    currentLessonIndex = index;
    renderPlaylist();
    loadLesson(index);
}

function loadLesson(index) {
    const lesson = allLessons[index];
    if (!lesson) return;

    // ใส่เนื้อหา
    const titleEl = document.getElementById('lessonTitle');
    if(titleEl) titleEl.innerText = lesson.title;
    
    const contentEl = document.getElementById('lessonContent');
    if(contentEl) contentEl.innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา";

    // จัดการวิดีโอ
    const videoBox = document.getElementById('videoContainer');
    const noVideoBox = document.getElementById('noVideoPlaceholder');
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
            if(noVideoBox) noVideoBox.style.display = 'none';
        } else {
            showNoVideo();
        }
    } else {
        showNoVideo();
    }

    function showNoVideo() {
        if(iframe) iframe.src = "";
        if(videoBox) videoBox.classList.add('d-none');
        if(noVideoBox) noVideoBox.style.display = 'flex';
    }
}

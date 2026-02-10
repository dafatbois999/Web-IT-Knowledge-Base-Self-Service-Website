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
        // 1. ดึงชื่อคอร์ส
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();
        
        if (course) {
            document.getElementById('courseName').innerText = course.title;
            // ถ้าอยากแก้ Title ของ Tab Browser ด้วย
            document.title = `${course.title} - ห้องเรียนออนไลน์`;
        }

        // 2. ดึงบทเรียน
        const { data: lessons, error: lessonError } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (lessonError) throw lessonError;

        const playlistBox = document.getElementById('playlist');
        
        if (!lessons || lessons.length === 0) {
            playlistBox.innerHTML = '<div class="p-5 text-center text-muted">ยังไม่มีเนื้อหาในคอร์สนี้</div>';
            document.getElementById('lessonTitle').innerText = "ยังไม่มีบทเรียน";
            document.getElementById('lessonContent').innerText = "คุณครูยังไม่ได้เพิ่มเนื้อหาในคอร์สนี้";
            document.getElementById('noVideoPlaceholder').style.display = 'flex'; 
            document.getElementById('noVideoPlaceholder').innerHTML = '<h4 class="text-muted">ไม่มีข้อมูล</h4>';
            return;
        }

        allLessons = lessons;
        renderPlaylist();
        loadLesson(0); // เล่นบทแรก

    } catch (err) {
        console.error("Error:", err);
        // alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message); 
    }
}

function renderPlaylist() {
    const list = document.getElementById('playlist');
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const icon = l.video_url ? '<i class="bi bi-play-circle-fill lesson-icon me-3"></i>' : '<i class="bi bi-file-text-fill lesson-icon me-3"></i>';

        list.innerHTML += `
            <div class="lesson-item ${isActive}" onclick="changeLesson(${index})">
                <div class="d-flex align-items-center w-100">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold" style="font-size: 0.95rem;">${l.title}</div>
                        <small class="opacity-75" style="font-size: 0.8rem;">
                            ${l.video_url ? 'วิดีโอ' : 'บทความ'}
                        </small>
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

    document.getElementById('lessonTitle').innerText = lesson.title;
    document.getElementById('lessonContent').innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา";

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

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            videoBox.classList.remove('d-none');
            noVideoBox.style.display = 'none';
        } else {
            showNoVideo();
        }
    } else {
        showNoVideo();
    }

    function showNoVideo() {
        iframe.src = "";
        videoBox.classList.add('d-none');
        noVideoBox.style.display = 'flex';
    }
}

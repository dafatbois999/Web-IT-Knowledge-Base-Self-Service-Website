import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

let allLessons = [];
let currentLessonIndex = 0;

// เช็คว่ามี ID คอร์สไหม
if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'index.html';
}

initClassroom();

async function initClassroom() {
    try {
        console.log("Start loading course:", courseId);

        // 1. ดึงชื่อคอร์ส
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();
        
        if (course) {
            document.getElementById('courseHeader').innerText = course.title; // ตรง Navbar
            document.getElementById('courseName').innerText = course.title;   // ตรงเนื้อหา
        }

        // 2. ดึงบทเรียน
        const { data: lessons, error: lessonError } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (lessonError) throw lessonError;

        // 3. ตรวจสอบข้อมูล
        const playlistBox = document.getElementById('playlist');
        
        if (!lessons || lessons.length === 0) {
            playlistBox.innerHTML = '<div class="p-5 text-center text-muted">ยังไม่มีเนื้อหาในคอร์สนี้</div>';
            document.getElementById('lessonTitle').innerText = "ยังไม่มีบทเรียน";
            document.getElementById('lessonContent').innerText = "คุณครูยังไม่ได้เพิ่มเนื้อหาในคอร์สนี้";
            // ซ่อน Loading ของจอซ้าย
            document.getElementById('noVideoPlaceholder').style.display = 'flex'; 
            document.getElementById('noVideoPlaceholder').innerHTML = '<h4 class="text-muted">ไม่มีข้อมูล</h4>';
            return;
        }

        console.log("Lessons loaded:", lessons.length);
        allLessons = lessons;
        renderPlaylist();
        
        // เล่นบทแรกสุด
        loadLesson(0);

    } catch (err) {
        console.error("Error:", err);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
    }
}

// สร้างรายการ Playlist (ขวา)
function renderPlaylist() {
    const list = document.getElementById('playlist');
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const icon = l.video_url ? '<i class="bi bi-play-circle-fill text-danger me-2"></i>' : '<i class="bi bi-file-text-fill text-primary me-2"></i>';

        list.innerHTML += `
            <div class="lesson-item ${isActive}" onclick="changeLesson(${index})">
                <div class="d-flex align-items-center w-100">
                    <span class="small text-muted me-3 fw-bold">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold text-dark" style="font-size: 0.95rem;">${l.title}</div>
                        <small class="text-muted" style="font-size: 0.8rem;">
                            ${l.video_url ? 'วิดีโอ' : 'บทความ'}
                        </small>
                    </div>
                    <div class="fs-5">${icon}</div>
                </div>
            </div>
        `;
    });
}

// เปลี่ยนบทเรียน (Global Scope)
window.changeLesson = (index) => {
    currentLessonIndex = index;
    renderPlaylist(); // อัปเดตสี Active
    loadLesson(index);
}

// โหลดเนื้อหาเข้าจอ (ซ้าย)
function loadLesson(index) {
    const lesson = allLessons[index];
    if (!lesson) return;

    // 1. ใส่เนื้อหา Text
    document.getElementById('lessonTitle').innerText = lesson.title;
    document.getElementById('lessonContent').innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา";

    // 2. จัดการวิดีโอ
    const videoBox = document.getElementById('videoContainer');
    const noVideoBox = document.getElementById('noVideoPlaceholder');
    const iframe = document.getElementById('mainVideo');

    if (lesson.video_url && lesson.video_url.length > 5) {
        // แกะ ID YouTube
        let videoId = "";
        try {
            if (lesson.video_url.includes('v=')) videoId = lesson.video_url.split('v=')[1].split('&')[0];
            else if (lesson.video_url.includes('youtu.be/')) videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
            else if (lesson.video_url.includes('embed/')) videoId = lesson.video_url.split('embed/')[1].split('?')[0];
        } catch (e) { console.error("Video URL Error", e); }

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            videoBox.classList.remove('d-none');
            noVideoBox.style.display = 'none'; // ซ่อนตัวว่าง
        } else {
            showNoVideo();
        }
    } else {
        showNoVideo();
    }

    function showNoVideo() {
        iframe.src = "";
        videoBox.classList.add('d-none');
        noVideoBox.style.display = 'flex'; // โชว์ตัวว่าง
    }
}

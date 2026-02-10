import { supabase } from './supabase-config.js';

const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

let allLessons = [];
let currentLessonIndex = 0;

if (!courseId) {
    alert('ไม่พบข้อมูลคอร์ส');
    window.location.href = 'index.html';
}

// 1. เริ่มต้นโหลดข้อมูล
initClassroom();

async function initClassroom() {
    // 1.1 ดึงชื่อคอร์ส
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (course) document.getElementById('courseHeader').innerText = course.title;

    // 1.2 ดึงบทเรียนทั้งหมด
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true }); // กรณี order_index เท่ากัน ให้เรียงตามเวลาที่สร้าง

    if (error || !lessons || lessons.length === 0) {
        document.getElementById('playlist').innerHTML = '<div class="p-4 text-center text-muted">ยังไม่มีเนื้อหาในคอร์สนี้</div>';
        return;
    }

    allLessons = lessons;
    renderPlaylist();
    
    // เล่นบทแรกสุดอัตโนมัติ
    loadLesson(0);
}

// 2. สร้างรายการ Playlist ด้านขวา
function renderPlaylist() {
    const list = document.getElementById('playlist');
    list.innerHTML = '';

    allLessons.forEach((l, index) => {
        const isActive = index === currentLessonIndex ? 'active' : '';
        const icon = l.video_url ? '<i class="bi bi-play-circle-fill text-danger me-2"></i>' : '<i class="bi bi-file-text-fill text-primary me-2"></i>';

        list.innerHTML += `
            <div class="list-group-item list-group-item-action lesson-item p-3 ${isActive}" onclick="changeLesson(${index})">
                <div class="d-flex align-items-center">
                    <span class="small text-muted me-3" style="min-width: 20px;">${index + 1}.</span>
                    <div class="flex-grow-1">
                        <div class="fw-medium" style="font-size: 0.95rem;">${l.title}</div>
                        <small class="text-muted" style="font-size: 0.8rem;">
                            ${l.video_url ? 'วิดีโอ + เนื้อหา' : 'บทความ'}
                        </small>
                    </div>
                    ${icon}
                </div>
            </div>
        `;
    });
}

// 3. ฟังก์ชันเปลี่ยนบทเรียน (Global Scope เพื่อให้ HTML เรียกได้)
window.changeLesson = (index) => {
    currentLessonIndex = index;
    renderPlaylist(); // อัปเดตสี Active
    loadLesson(index);
    
    // เลื่อน Scrollbar ไปหาตัวที่เลือก (Optional UX)
    // document.querySelector('.lesson-item.active').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 4. โหลดเนื้อหาเข้าจอใหญ่
function loadLesson(index) {
    const lesson = allLessons[index];
    if (!lesson) return;

    // ใส่ชื่อและเนื้อหา
    document.getElementById('lessonTitle').innerText = lesson.title;
    document.getElementById('lessonContent').innerText = lesson.content || "ไม่มีรายละเอียดเนื้อหา"; // ถ้าจะรองรับ HTML ให้ใช้ .innerHTML

    // จัดการวิดีโอ
    const videoBox = document.getElementById('videoContainer');
    const noVideoBox = document.getElementById('noVideoPlaceholder');
    const iframe = document.getElementById('mainVideo');

    if (lesson.video_url) {
        // แกะ YouTube ID
        let videoId = "";
        if (lesson.video_url.includes('v=')) {
            videoId = lesson.video_url.split('v=')[1].split('&')[0];
        } else if (lesson.video_url.includes('youtu.be/')) {
            videoId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
        } else if (lesson.video_url.includes('embed/')) {
            videoId = lesson.video_url.split('embed/')[1].split('?')[0];
        }

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`; // Auto play เมื่อเปลี่ยนคลิป
            videoBox.classList.remove('d-none');
            noVideoBox.classList.add('d-none');
        } else {
            // URL ผิด
            iframe.src = "";
            videoBox.classList.add('d-none');
            noVideoBox.classList.remove('d-none');
        }
    } else {
        // ไม่มีวิดีโอ
        iframe.src = "";
        videoBox.classList.add('d-none');
        noVideoBox.classList.remove('d-none');
    }
}

import { supabase } from './supabase-config.js';

const userId = localStorage.getItem('user_id');
const userName = localStorage.getItem('user_name');

// 1. เช็คว่าล็อกอินหรือยัง
if (!userId) {
    window.location.href = 'index.html';
}

document.getElementById('studentName').innerText = `สวัสดี, ${userName || 'นักเรียน'}`;

// 2. ฟังก์ชันโหลดคอร์สที่เรียนอยู่
async function loadMyCourses() {
    const grid = document.getElementById('myCoursesGrid');

    // ดึงประวัติการลงทะเบียนของ User นี้
    const { data: enrolls, error } = await supabase
        .from('enrollments')
        .select('course_id, courses(*, users(full_name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error || !enrolls || enrolls.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5 fade-in">
                <i class="bi bi-journal-x display-1 text-muted opacity-25"></i>
                <h4 class="text-muted mt-3">คุณยังไม่ได้เข้าเรียนคอร์สใดเลย</h4>
                <a href="index.html" class="btn btn-primary mt-3 rounded-pill px-4 fw-bold shadow-sm">ค้นหาคอร์สเรียน</a>
            </div>`;
        return;
    }

    grid.innerHTML = '';

    for (const item of enrolls) {
        const c = item.courses;
        if (!c) continue;

        const img = c.thumbnail_url || 'https://via.placeholder.com/400x225?text=Course';
        const teacherName = c.users?.full_name || 'Teacher';

        // คำนวณความคืบหน้า (%)
        const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
        const { count: completedLessons } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('course_id', c.id).eq('user_id', userId);
        
        let percent = 0;
        if (totalLessons > 0) percent = Math.round((completedLessons / totalLessons) * 100);

        grid.innerHTML += `
            <div class="col-md-4 mb-4 fade-in">
                <div class="card h-100 shadow-sm border-0 card-hover">
                    <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="fw-bold text-truncate">${c.title}</h5>
                        <p class="small text-muted mb-3">โดย: ${teacherName}</p>
                        
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between small mb-1">
                                <span class="text-muted">ความคืบหน้า</span>
                                <span class="fw-bold ${percent >= 100 ? 'text-success' : 'text-primary'}">${percent}%</span>
                            </div>
                            <div class="progress mb-3" style="height: 8px;">
                                <div class="progress-bar ${percent >= 100 ? 'bg-success' : 'bg-primary'}" style="width: ${percent}%"></div>
                            </div>
                            <a href="classroom.html?id=${c.id}" class="btn ${percent >= 100 ? 'btn-outline-success' : 'btn-primary'} w-100 rounded-pill fw-bold shadow-sm">
                                ${percent >= 100 ? '<i class="bi bi-arrow-repeat"></i> ทบทวนบทเรียน' : '<i class="bi bi-play-fill"></i> เรียนต่อ'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.logout = () => {
    if(confirm('ยืนยันออกจากระบบ?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

loadMyCourses();

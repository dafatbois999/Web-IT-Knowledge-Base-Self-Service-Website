import { supabase } from './supabase-config.js';

const userId = localStorage.getItem('user_id');

// 1. โหลดข้อมูลเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
    loadCourses(); // โหลดคอร์ส
    // loadArticles(); // ถ้ามีฟังก์ชันโหลดบทความปัญหาก็ใส่ตรงนี้ (อันนี้ผมเว้นไว้เพราะคุณไม่ได้ขอ)
    
    // ซ่อน Loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
    }, 500);
});

// 2. ฟังก์ชันโหลดคอร์ส พร้อมเช็ค Checkmark
async function loadCourses() {
    const container = document.getElementById('courseListContainer');
    if (!container) return;

    // ดึงคอร์สจาก DB
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="col-12 text-center text-danger">Error loading courses</div>`;
        return;
    }

    if (!courses || courses.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">ยังไม่มีคอร์สเรียน</div>`;
        return;
    }

    container.innerHTML = '';

    // วนลูปสร้างการ์ด
    for (const course of courses) {
        let isCompleted = false;

        // เช็ค Progress ถ้าล็อกอินอยู่
        if (userId) {
            // นับจำนวนบทเรียนทั้งหมดในคอร์ส
            const { count: totalLessons } = await supabase
                .from('lessons')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id);

            // นับจำนวนบทเรียนที่เรียนจบแล้ว
            const { count: completedLessons } = await supabase
                .from('student_progress')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id)
                .eq('user_id', userId);
            
            // ถ้าจบครบทุกบท (และมีบทเรียนอย่างน้อย 1 บท)
            if (totalLessons > 0 && completedLessons >= totalLessons) {
                isCompleted = true;
            }
        }

        // กำหนดหน้าตาปุ่ม (สีเขียว + ติ๊กถูก ถ้าจบแล้ว)
        const btnClass = isCompleted ? 'btn-success text-white' : 'btn-outline-primary';
        const btnText = isCompleted ? 'เรียนจบแล้ว' : 'เข้าเรียนทันที';
        const checkIcon = isCompleted ? '<i class="bi bi-check-circle-fill ms-2 bg-white text-success rounded-circle"></i>' : '';

        // HTML Card (ใช้ดีไซน์เดียวกับหน้าเว็บคุณ)
        const html = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden course-card">
                    <img src="${course.cover_url || 'https://via.placeholder.com/400x225?text=No+Image'}" class="card-img-top" alt="${course.title}" style="height: 200px; object-fit: cover;">
                    <div class="card-body p-4 d-flex flex-column">
                        <span class="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill align-self-start mb-3" style="font-weight: 600;">
                            ${course.category || 'General'}
                        </span>
                        <h5 class="card-title fw-bold text-dark mb-2">${course.title}</h5>
                        <p class="card-text text-muted small flex-grow-1" style="line-height: 1.6;">
                            ${course.description ? course.description.substring(0, 100) + '...' : '-'}
                        </p>
                        <a href="classroom.html?id=${course.id}" class="btn ${btnClass} w-100 rounded-pill py-2 fw-bold mt-3 d-flex align-items-center justify-content-center">
                            ${btnText} ${checkIcon}
                        </a>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    }
}

// Global functions สำหรับปุ่ม Search/Filter (เผื่อใช้)
window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    box.classList.toggle('search-box-hidden');
    if (!box.classList.contains('search-box-hidden')) {
        document.getElementById('navSearchInput').focus();
    }
};

window.filterCat = (cat) => {
    // โค้ดสำหรับ Filter บทความด้านบน (ถ้ามี)
    console.log("Filter category:", cat);
    // document.querySelectorAll('#grid .col').forEach... (ตาม logic เดิมของคุณ)
};

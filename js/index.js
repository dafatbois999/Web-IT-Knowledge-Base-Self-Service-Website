import { supabase } from './supabase-config.js';

const userId = localStorage.getItem('user_id');

loadCourses();

async function loadCourses() {
    // ต้องมี div id="courseContainer" ใน index.html (ตรงที่แสดงรายการคอร์ส)
    const container = document.getElementById('courseContainer'); 
    if (!container) return;

    // 1. ดึงคอร์สทั้งหมด
    const { data: courses, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="col-12 text-center text-danger">Error loading courses</div>`;
        return;
    }

    if (!courses || courses.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">ยังไม่มีคอร์สเรียน</div>`;
        return;
    }

    container.innerHTML = '';

    // 2. วนลูปสร้างการ์ด
    for (const course of courses) {
        let isCompleted = false;

        // เช็คว่าจบหรือยัง (ถ้าล็อกอินอยู่)
        if (userId) {
            // นับบทเรียนทั้งหมด
            const { count: totalLessons } = await supabase
                .from('lessons')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id);

            // นับบทเรียนที่เรียนจบ
            const { count: completedLessons } = await supabase
                .from('student_progress')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id)
                .eq('user_id', userId);
            
            // ถ้าเท่ากันและมีบทเรียน -> จบ
            if (totalLessons > 0 && totalLessons === completedLessons) {
                isCompleted = true;
            }
        }

        // HTML เครื่องหมายถูก (ถ้าจบ)
        const checkMark = isCompleted ? '<i class="bi bi-check-circle-fill text-success ms-2 bg-white rounded-circle fs-5"></i>' : '';
        const btnClass = isCompleted ? 'btn-success text-white' : 'btn-outline-primary';
        const btnText = isCompleted ? 'เรียนจบแล้ว' : 'เข้าเรียนทันที';

        // HTML การ์ด
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
                            ${btnText} ${checkMark}
                        </a>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    }
}

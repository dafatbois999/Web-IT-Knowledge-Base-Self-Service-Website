import { supabase } from './supabase-config.js';

const userId = localStorage.getItem('user_id');

loadCourses();

async function loadCourses() {
    const container = document.getElementById('courseContainer'); 
    if (!container) return;

    // 1. ดึงคอร์สทั้งหมด
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="col-12 text-center text-danger">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
        return;
    }

    if (!courses || courses.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">ยังไม่มีคอร์สเรียน</div>`;
        return;
    }

    container.innerHTML = '';

    // 2. วนลูปสร้างการ์ด และเช็คความคืบหน้า
    for (const course of courses) {
        let isCompleted = false;

        // ถ้าล็อกอินอยู่ ให้เช็ค Progress
        if (userId) {
            // A. นับบทเรียนทั้งหมดในคอร์สนี้
            const { count: totalLessons } = await supabase
                .from('lessons')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id);

            // B. นับบทเรียนที่ User คนนี้เรียนจบแล้ว (มีในตาราง student_progress)
            const { count: completedLessons } = await supabase
                .from('student_progress')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id)
                .eq('user_id', userId);
            
            // Debug: ดูค่าใน Console (กด F12 ดูได้)
            console.log(`Course: ${course.title}, Total: ${totalLessons}, Completed: ${completedLessons}`);

            // C. เปรียบเทียบ: ถ้าเรียนจบมากกว่าหรือเท่ากับจำนวนบทเรียน (และต้องมีบทเรียนอย่างน้อย 1 บท)
            if (totalLessons > 0 && completedLessons >= totalLessons) {
                isCompleted = true;
            }
        }

        // --- สร้าง HTML ---
        // ถ้าจบ: ปุ่มสีเขียว + ข้อความ "เรียนจบแล้ว" + ติ๊กถูก
        // ถ้ายังไม่จบ: ปุ่มสีน้ำเงิน + ข้อความ "เข้าเรียนทันที"
        const btnClass = isCompleted ? 'btn-success text-white' : 'btn-outline-primary';
        const btnText = isCompleted ? 'เรียนจบแล้ว' : 'เข้าเรียนทันที';
        const checkMark = isCompleted ? '<i class="bi bi-check-circle-fill ms-2 bg-white text-success rounded-circle"></i>' : '';

        const html = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden course-card">
                    <img src="${course.cover_url || 'https://via.placeholder.com/400x225?text=No+Image'}" class="card-img-top" alt="${course.title}" style="height: 200px; object-fit: cover;">
                    <div class="card-body p-4 d-flex flex-column">
                        <span class="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill align-self-start mb-3" style="font-weight: 600;">
                            ${course.category || 'ทั่วไป'}
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

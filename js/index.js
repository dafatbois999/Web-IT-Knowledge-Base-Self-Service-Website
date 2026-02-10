import { supabase } from './supabase-config.js';

const userId = localStorage.getItem('user_id');

// เรียกฟังก์ชันโหลดข้อมูล
loadCourses();

async function loadCourses() {
    const container = document.getElementById('courseContainer'); 
    if (!container) return;

    // 1. ดึงคอร์สทั้งหมดจาก Database
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false }); // เรียงจากใหม่ไปเก่า

    if (error) {
        container.innerHTML = `<div class="col-12 text-center text-danger">โหลดข้อมูลไม่สำเร็จ: ${error.message}</div>`;
        return;
    }

    // ถ้าไม่มีข้อมูลใน Database เลย
    if (!courses || courses.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-5">
            <i class="bi bi-inbox display-4 mb-3 d-block"></i>
            ยังไม่มีคอร์สเรียนในระบบ
        </div>`;
        return;
    }

    container.innerHTML = '';

    // 2. วนลูปสร้างการ์ดคอร์ส
    for (const course of courses) {
        
        // --- ส่วนเช็คความคืบหน้า (Progress) ---
        let isCompleted = false;
        if (userId) {
            const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', course.id);
            const { count: completedLessons } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('course_id', course.id).eq('user_id', userId);
            
            if (totalLessons > 0 && completedLessons >= totalLessons) {
                isCompleted = true;
            }
        }

        // --- ส่วนตกแต่งดีไซน์ (ให้เหมือนอันเก่า) ---
        
        // 1. สีป้ายหมวดหมู่ (Badge Color)
        let badgeClass = 'bg-secondary';
        const cat = (course.category || 'General').toLowerCase();
        if (cat.includes('software')) badgeClass = 'bg-info text-dark';
        else if (cat.includes('hardware')) badgeClass = 'bg-danger text-white';
        else if (cat.includes('network')) badgeClass = 'bg-success text-white';
        else if (cat.includes('security')) badgeClass = 'bg-warning text-dark';

        // 2. รูปภาพปก (ถ้าไม่มีให้ใช้ภาพ Default)
        const coverImg = course.cover_url || 'https://via.placeholder.com/400x225?text=No+Image';

        // 3. ปุ่มและสถานะเรียนจบ
        let btnHtml = '';
        if (isCompleted) {
            // ปุ่มสีเขียว + ติ๊กถูก (ตามที่คุณขอ)
            btnHtml = `
                <a href="classroom.html?id=${course.id}" class="btn btn-outline-success w-100 rounded-pill fw-bold mt-3 d-flex align-items-center justify-content-center">
                    เข้าเรียนทันที <i class="bi bi-check-circle-fill ms-2 fs-5"></i>
                </a>`;
        } else {
            // ปุ่มสีฟ้าปกติ
            btnHtml = `
                <a href="classroom.html?id=${course.id}" class="btn btn-outline-primary w-100 rounded-pill fw-bold mt-3">
                    เข้าเรียนทันที
                </a>`;
        }

        // 4. จำนวนคนดู (สุ่มเลข หรือดึงจาก DB ถ้ามีฟิลด์ views)
        const views = course.views || Math.floor(Math.random() * 100); 

        // --- สร้าง HTML (โครงสร้างแบบการ์ดสวยงาม) ---
        const html = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden course-card" style="transition: transform 0.2s;">
                    
                    <div class="position-relative">
                        <img src="${coverImg}" class="card-img-top" alt="${course.title}" style="height: 220px; object-fit: cover;">
                    </div>

                    <div class="card-body p-4 d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge rounded-pill ${badgeClass} px-3 py-2">${course.category || 'General'}</span>
                            <small class="text-muted"><i class="bi bi-eye-fill me-1"></i> ${views}</small>
                        </div>

                        <h5 class="card-title fw-bold text-dark mb-2">${course.title}</h5>
                        
                        <p class="card-text text-muted small flex-grow-1" style="line-height: 1.6;">
                            ${course.description ? course.description.substring(0, 100) + '...' : 'ไม่มีคำอธิบาย'}
                        </p>

                        ${btnHtml}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    }
}

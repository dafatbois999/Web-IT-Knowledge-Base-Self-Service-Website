import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
const userId = localStorage.getItem('user_id');

// ตัวแปร Pagination - บทความ
let allArticlesData = [];       // เก็บข้อมูลบทความทั้งหมด
let filteredArticles = [];      // เก็บข้อมูลที่ผ่านการกรอง (Search/Category)
let currentArticlePage = 1;
const articlesPerPage = 6;      // จำนวนบทความต่อหน้า

// ตัวแปร Pagination - คอร์ส
let currentCoursePage = 1;
const coursesPerPage = 6;       // จำนวนคอร์สต่อหน้า

// =========================================================
// PART 1: บทความ (Articles) - Client-side Pagination
// =========================================================

async function loadArticles() {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('status', 'Published')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allArticlesData = data || [];
        filteredArticles = allArticlesData; // เริ่มต้นโชว์ทั้งหมด
        
        renderArticles(); // แสดงผลหน้าแรก

    } catch (err) {
        console.error(err);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

// ฟังก์ชันเปลี่ยนหน้าบทความ
window.changeArticlePage = (direction) => {
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    const newPage = currentArticlePage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentArticlePage = newPage;
        renderArticles();
    }
};

function renderArticles() {
    if(!grid) return;
    grid.innerHTML = '';

    // ถ้าไม่มีข้อมูล
    if (filteredArticles.length === 0) {
        if(noResult) noResult.classList.remove('d-none');
        document.getElementById('articlePagination').classList.add('d-none');
        return;
    } else {
        if(noResult) noResult.classList.add('d-none');
    }

    // คำนวณ Slice ข้อมูลตามหน้า
    const start = (currentArticlePage - 1) * articlesPerPage;
    const end = start + articlesPerPage;
    const pageData = filteredArticles.slice(start, end);

    // วนลูปสร้างการ์ด
    pageData.forEach((item, index) => {
        const imgHTML = item.image_url 
            ? `<img src="${item.image_url}" class="card-img-top" loading="lazy" style="height:200px; object-fit:cover;">`
            : `<div class="bg-light d-flex align-items-center justify-content-center text-secondary" style="height:200px;"><i class="bi bi-image fs-1 opacity-25"></i></div>`;

        let badgeColor = 'bg-primary';
        if (item.category === 'Hardware') badgeColor = 'bg-danger';
        if (item.category === 'Network') badgeColor = 'bg-success';
        if (item.category === 'Software') badgeColor = 'bg-info text-dark';

        grid.innerHTML += `
        <div class="col-md-4 fade-in">
            <a href="article.html?id=${item.id}" class="text-decoration-none text-dark">
                <div class="card card-hover h-100 shadow-sm border-0">
                    ${imgHTML}
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge ${badgeColor} badge-custom">${item.category}</span>
                            <small class="text-muted" style="font-size: 0.8rem;">
                                <i class="bi bi-eye-fill"></i> ${item.views || 0}
                            </small>
                        </div>
                        <h5 class="fw-bold text-truncate mb-2">${item.title}</h5>
                        <p class="text-muted small text-truncate-2 mb-0">${item.content}</p>
                    </div>
                </div>
            </a>
        </div>`;
    });

    // อัปเดตปุ่ม Pagination บทความ
    updateArticlePaginationUI();
}

function updateArticlePaginationUI() {
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    const paginationBox = document.getElementById('articlePagination');
    const indicator = document.getElementById('articlePageIndicator');
    const btnPrev = document.getElementById('btnArtPrev');
    const btnNext = document.getElementById('btnArtNext');

    if (totalPages <= 1) {
        paginationBox.classList.add('d-none');
    } else {
        paginationBox.classList.remove('d-none');
        indicator.innerText = `${currentArticlePage} / ${totalPages}`;
        
        btnPrev.disabled = currentArticlePage === 1;
        btnNext.disabled = currentArticlePage === totalPages;
    }
}

// Search Logic (กรองบทความ)
const mainSearchInput = document.getElementById('searchInput');
if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();
        // กรองจากข้อมูลทั้งหมด
        filteredArticles = allArticlesData.filter(item => 
            (item.title && item.title.toLowerCase().includes(txt)) ||
            (item.content && item.content.toLowerCase().includes(txt)) ||
            (item.category && item.category.toLowerCase().includes(txt))
        );
        currentArticlePage = 1; // รีเซ็ตไปหน้า 1
        renderArticles();
    });
}

window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    if(box) {
        box.classList.toggle('search-box-active');
        if (box.classList.contains('search-box-active')) input.focus();
    }
};

window.filterCat = (cat) => {
    // เปลี่ยนสีปุ่ม
    document.querySelectorAll('.btn-light').forEach(btn => btn.classList.remove('active', 'fw-bold'));
    document.getElementById(`btn${cat}`)?.classList.add('active', 'fw-bold');
    
    // กรองข้อมูล
    if (cat === 'All') {
        filteredArticles = allArticlesData;
    } else {
        filteredArticles = allArticlesData.filter(item => item.category === cat);
    }
    currentArticlePage = 1; // รีเซ็ตไปหน้า 1
    renderArticles();
};


// =========================================================
// PART 2: คอร์สเรียน (Courses) - Server-side Pagination
// =========================================================

// ฟังก์ชันเปลี่ยนหน้าคอร์ส
window.changeCoursePage = (direction) => {
    currentCoursePage += direction;
    loadCourses(currentCoursePage);
};

async function loadCourses(page = 1) {
    const courseGrid = document.getElementById('courseListContainer');
    const paginationBox = document.getElementById('coursePagination');
    
    if (!courseGrid) return;

    // คำนวณช่วงข้อมูล (Range)
    const from = (page - 1) * coursesPerPage;
    const to = from + coursesPerPage - 1;

    // ดึงข้อมูล + จำนวนรวม
    const { data: courses, count, error } = await supabase
        .from('courses')
        .select('*, users(full_name)', { count: 'exact' }) 
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error(error);
        courseGrid.innerHTML = `<div class="col-12 text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
        return;
    }

    if (!courses || courses.length === 0) {
        courseGrid.innerHTML = '<div class="col-12 text-center text-muted py-5">ยังไม่มีคอร์สเรียนในขณะนี้</div>';
        if(paginationBox) paginationBox.classList.add('d-none');
        return;
    }

    courseGrid.innerHTML = '';
    
    for (const c of courses) {
        const img = c.thumbnail_url || 'https://via.placeholder.com/400x225?text=Course';
        const teacherName = c.users?.full_name || 'Teacher';
        
        // เช็ค Progress
        let isCompleted = false;
        if (userId) {
            const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id);
            const { count: completedLessons } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('course_id', c.id).eq('user_id', userId);
            if (totalLessons > 0 && completedLessons >= totalLessons) {
                isCompleted = true;
            }
        }

        const checkMark = isCompleted ? '<i class="bi bi-check-circle-fill text-success fs-5 ms-2"></i>' : '';
        const btnClass = isCompleted ? 'btn-outline-success' : 'btn-outline-primary';
        const btnText = isCompleted ? 'เรียนจบแล้ว' : 'เข้าเรียนทันที';

        courseGrid.innerHTML += `
            <div class="col-md-4 fade-in">
                <div class="card h-100 shadow-sm border-0 card-hover">
                    <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <span class="badge bg-light text-secondary border">${c.category || 'General'}</span>
                        </div>
                        <h5 class="fw-bold text-truncate">${c.title}</h5>
                        <p class="small text-muted mb-2">โดย: ${teacherName}</p>
                        <p class="card-text small text-secondary text-truncate-2 flex-grow-1">${c.description || '-'}</p>
                        
                        <div class="d-flex align-items-center mt-3">
                            <a href="classroom.html?id=${c.id}" class="btn ${btnClass} w-100 rounded-pill">
                                ${btnText}
                            </a>
                            ${checkMark}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // อัปเดต UI ปุ่มเปลี่ยนหน้าคอร์ส
    if(paginationBox) {
        paginationBox.classList.remove('d-none');
        const btnPrev = document.getElementById('btnCoursePrev');
        const btnNext = document.getElementById('btnCourseNext');
        const pageIndicator = document.getElementById('coursePageIndicator');

        pageIndicator.innerText = `หน้า ${currentCoursePage}`;

        // ปุ่มก่อนหน้า
        if (currentCoursePage === 1) {
            btnPrev.disabled = true;
            btnPrev.classList.add('disabled');
        } else {
            btnPrev.disabled = false;
            btnPrev.classList.remove('disabled');
        }

        // ปุ่มถัดไป
        if (to + 1 >= count) {
            btnNext.disabled = true;
            btnNext.classList.add('disabled');
        } else {
            btnNext.disabled = false;
            btnNext.classList.remove('disabled');
        }
    }
}

// เริ่มทำงาน
loadArticles();
loadCourses(1);

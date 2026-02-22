import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
const userId = localStorage.getItem('user_id');

let allArticlesData = [];       // เก็บข้อมูลบทความทั้งหมด
let filteredArticles = [];      // เก็บข้อมูลที่ผ่านการกรอง (Search/Category)

// ฟังก์ชันสำหรับเลื่อน Slider ซ้าย-ขวา
window.scrollCarousel = (containerId, direction) => {
    const container = document.getElementById(containerId);
    if (container && container.firstElementChild) {
        // เลื่อนทีละ 1 การ์ด + ช่องว่าง
        const cardWidth = container.firstElementChild.offsetWidth + 24; 
        container.scrollBy({ left: cardWidth * direction, behavior: 'smooth' });
    }
};

// =========================================================
// PART 1: บทความ (Articles)
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
        filteredArticles = allArticlesData; 
        renderArticles(); 

    } catch (err) {
        console.error(err);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

function renderArticles() {
    if(!grid) return;
    grid.innerHTML = '';

    if (filteredArticles.length === 0) {
        if(noResult) noResult.classList.remove('d-none');
        return;
    } else {
        if(noResult) noResult.classList.add('d-none');
    }

    filteredArticles.forEach((item, index) => {
        const imgHTML = item.image_url 
            ? `<img src="${item.image_url}" class="card-img-top" loading="lazy" style="height:200px; object-fit:cover;">`
            : `<div class="bg-light d-flex align-items-center justify-content-center text-secondary" style="height:200px;"><i class="bi bi-image fs-1 opacity-25"></i></div>`;

        let badgeColor = 'bg-primary';
        if (item.category === 'Hardware') badgeColor = 'bg-danger';
        if (item.category === 'Network') badgeColor = 'bg-success';
        if (item.category === 'Software') badgeColor = 'bg-info text-dark';

        // [เปลี่ยน] คลาสจาก col-md-4 เป็น carousel-item-card
        grid.innerHTML += `
        <div class="carousel-item-card fade-in" style="animation-delay: ${index * 0.05}s">
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
}

// Search Logic (กรองบทความ)
const mainSearchInput = document.getElementById('searchInput');
if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();
        filteredArticles = allArticlesData.filter(item => 
            (item.title && item.title.toLowerCase().includes(txt)) ||
            (item.content && item.content.toLowerCase().includes(txt)) ||
            (item.category && item.category.toLowerCase().includes(txt))
        );
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
    document.querySelectorAll('.btn-light').forEach(btn => btn.classList.remove('active', 'fw-bold'));
    document.getElementById(`btn${cat}`)?.classList.add('active', 'fw-bold');
    
    if (cat === 'All') {
        filteredArticles = allArticlesData;
    } else {
        filteredArticles = allArticlesData.filter(item => item.category === cat);
    }
    renderArticles();
};


// =========================================================
// PART 2: คอร์สเรียน (Courses)
// =========================================================
async function loadCourses() {
    const courseGrid = document.getElementById('courseListContainer');
    if (!courseGrid) return;

    // โหลดคอร์สล่าสุดมาแสดงสัก 15 คอร์ส (ให้มีไว้เลื่อนซ้ายขวา)
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*, users(full_name)') 
        .order('created_at', { ascending: false })
        .limit(15); 

    if (error) {
        console.error(error);
        courseGrid.innerHTML = `<div class="col-12 text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
        return;
    }

    if (!courses || courses.length === 0) {
        courseGrid.innerHTML = '<div class="col-12 text-center text-muted py-5 w-100">ยังไม่มีคอร์สเรียนในขณะนี้</div>';
        return;
    }

    courseGrid.innerHTML = '';
    
    for (const c of courses) {
        const img = c.thumbnail_url || 'https://via.placeholder.com/400x225?text=Course';
        const teacherName = c.users?.full_name || 'Teacher';
        
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

        // [เปลี่ยน] คลาสจาก col-md-4 เป็น carousel-item-card
        courseGrid.innerHTML += `
            <div class="carousel-item-card fade-in">
                <div class="card h-100 shadow-sm border-0 card-hover">
                    <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2 d-flex justify-content-between align-items-center">
                            <span class="badge bg-light text-secondary border">${c.category || 'General'}</span>
                            <span class="badge bg-dark opacity-75" style="font-size: 0.75rem;">ID: ${c.id}</span>
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
}

// เริ่มทำงาน
loadArticles();
loadCourses();

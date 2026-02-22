import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
const userId = localStorage.getItem('user_id');

let allArticlesData = [];       // เก็บข้อมูลบทความทั้งหมด
let filteredArticles = [];      // เก็บข้อมูลที่ผ่านการกรอง (Search/Category)

// =========================================================
// ระบบเลื่อนม้าหมุนอัตโนมัติ (Auto-scroll)
// =========================================================
let autoScrollTimers = {};

window.scrollCarousel = (containerId, direction) => {
    const container = document.getElementById(containerId);
    if (container && container.firstElementChild) {
        const cardWidth = container.firstElementChild.offsetWidth + 24; 
        container.scrollBy({ left: cardWidth * direction, behavior: 'smooth' });
        
        // หากผู้ใช้กดปุ่มเลื่อนเอง ให้รีเซ็ตเวลานับถอยหลังใหม่
        resetAutoScroll(containerId); 
    }
};

function startAutoScroll(containerId) {
    clearInterval(autoScrollTimers[containerId]); // ล้างเวลาเก่าทิ้งก่อน
    autoScrollTimers[containerId] = setInterval(() => {
        const container = document.getElementById(containerId);
        if (!container || !container.firstElementChild) return;
        
        // เช็คว่าสกอร์ลเลื่อนไปจนสุดขอบขวาหรือยัง (ลบ 10px เผื่อความคลาดเคลื่อนของทศนิยม)
        const isAtEnd = Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 10;
        
        if (isAtEnd) {
            // ถ้าเลื่อนจนสุดแล้ว ให้ตีกลับไปตำแหน่งแรกสุด
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            // ถ้ายังไม่สุด ให้เลื่อนไปขวา 1 การ์ด
            const cardWidth = container.firstElementChild.offsetWidth + 24;
            container.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 10000); // 10000 มิลลิวินาที = 10 วินาที
}

function resetAutoScroll(containerId) {
    startAutoScroll(containerId);
}

// ฟังก์ชันเพิ่ม Event เมื่อเอาเมาส์ชี้ ให้หยุดเลื่อนชั่วคราว
function setupAutoScrollEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Desktop: เมาส์ชี้หยุด, เมาส์ออกเลื่อนต่อ
    container.addEventListener('mouseenter', () => clearInterval(autoScrollTimers[containerId]));
    container.addEventListener('mouseleave', () => startAutoScroll(containerId));
    
    // Mobile: เอานิ้วแตะหยุด, เอานิ้วออกเลื่อนต่อ
    container.addEventListener('touchstart', () => clearInterval(autoScrollTimers[containerId]), {passive: true});
    container.addEventListener('touchend', () => startAutoScroll(containerId));
}


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

    // เริ่มทำงาน Auto-scroll ให้ฝั่งบทความ
    startAutoScroll('grid');
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

    // เริ่มทำงาน Auto-scroll ให้ฝั่งคอร์ส
    startAutoScroll('courseListContainer');
}

// =========================================================
// เริ่มทำงานเมื่อโหลดไฟล์
// =========================================================
loadArticles();
loadCourses();

// ติดตั้ง Event ล่วงหน้า (สำหรับหยุดเวลาเอาเมาส์ชี้)
setupAutoScrollEvents('grid');
setupAutoScrollEvents('courseListContainer');

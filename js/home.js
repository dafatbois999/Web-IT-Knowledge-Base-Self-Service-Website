import { supabase } from './supabase-config.js';

// --- ตัวแปรหลัก ---
const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
let allData = []; // เก็บข้อมูลทั้งหมดไว้ในตัวแปร (เพื่อให้ค้นหาเร็ว ไม่ต้องโหลดใหม่)

// ==========================================
// 1. ส่วนโหลดข้อมูล (Data Loading)
// ==========================================
async function loadArticles() {
    try {
        // ดึงข้อมูลบทความที่สถานะเป็น Published
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('status', 'Published')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data || [];
        render(allData); // แสดงผลครั้งแรก

    } catch (err) {
        console.error("Error loading articles:", err);
        grid.innerHTML = `<div class="col-12 text-center text-danger"><i class="bi bi-exclamation-triangle"></i> โหลดข้อมูลไม่สำเร็จ</div>`;
    } finally {
        // ปิดหน้าจอ Loading
        if(loader) loader.style.display = 'none';
    }
}

// ==========================================
// 2. ส่วนแสดงผล (Render Cards)
// ==========================================
function render(list) {
    grid.innerHTML = '';
    
    // กรณีไม่พบข้อมูล
    if (list.length === 0) {
        if(noResult) noResult.classList.remove('d-none');
        return;
    } else {
        if(noResult) noResult.classList.add('d-none');
    }

    // วนลูปสร้างการ์ด
    list.forEach((item, index) => {
        // จัดการรูปภาพ (ถ้าไม่มีรูป ให้ใช้ Placeholder)
        const imgHTML = item.image_url 
            ? `<img src="${item.image_url}" class="card-img-top" loading="lazy" style="height:200px; object-fit:cover;">`
            : `<div class="bg-light d-flex align-items-center justify-content-center text-secondary" style="height:200px;"><i class="bi bi-image fs-1 opacity-25"></i></div>`;

        // จัดการสีป้ายหมวดหมู่
        let badgeColor = 'bg-primary'; // สีน้ำเงิน (Default)
        if (item.category === 'Hardware') badgeColor = 'bg-danger'; // สีแดง
        if (item.category === 'Network') badgeColor = 'bg-success'; // สีเขียว
        if (item.category === 'Software') badgeColor = 'bg-info text-dark'; // สีฟ้า

        // สร้าง HTML การ์ด (เพิ่ม Animation fade-in)
        // delay เล็กน้อยเพื่อให้การ์ดค่อยๆ โผล่มาทีละใบ (index * 50ms)
        const cardHTML = `
        <div class="col-md-4 fade-in" style="animation-delay: ${index * 0.05}s">
            <a href="article.html?id=${item.id}" class="text-decoration-none text-dark">
                <div class="card card-hover h-100 shadow-sm border-0">
                    ${imgHTML}
                    <div class="card-body">
                        <span class="badge ${badgeColor} badge-custom mb-2">${item.category}</span>
                        <h5 class="fw-bold text-truncate mb-2">${item.title}</h5>
                        <p class="text-muted small text-truncate-2 mb-0">${item.content}</p>
                    </div>
                </div>
            </a>
        </div>`;

        grid.innerHTML += cardHTML;
    });
}

// ==========================================
// 3. ระบบค้นหา (Search Logic)
// ==========================================
// ฟังก์ชันค้นหาหลัก (ทำงานเมื่อพิมพ์ในช่องใหญ่ หรือถูกสั่งจากช่องเล็ก)
const mainSearchInput = document.getElementById('searchInput');

if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();

        // กรองข้อมูลจาก allData
        const filtered = allData.filter(item => {
            return (item.title && item.title.toLowerCase().includes(txt)) ||
                   (item.content && item.content.toLowerCase().includes(txt)) ||
                   (item.solution && item.solution.toLowerCase().includes(txt)) ||
                   (item.category && item.category.toLowerCase().includes(txt));
        });

        render(filtered);
    });
}

// ==========================================
// 4. Navbar Search (ช่องค้นหาเล็กบนเมนู)
// ==========================================
// ปุ่มแว่นขยาย: กดแล้วช่องค้นหายืดออกมา
window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    
    if(box) {
        box.classList.toggle('search-box-active'); // คลาสนี้อยู่ใน CSS ที่ให้ไป
        if (box.classList.contains('search-box-active') && input) {
            input.focus(); // ให้เคอร์เซอร์กระพริบพร้อมพิมพ์
        }
    }
};

// ซิงค์ข้อมูล: พิมพ์ข้างบน ให้ไปค้นหาข้างล่างด้วย
const navInput = document.getElementById('navSearchInput');
if (navInput) {
    navInput.addEventListener('input', (e) => {
        if(mainSearchInput) {
            mainSearchInput.value = e.target.value; // ก๊อปข้อความไปใส่ช่องใหญ่
            mainSearchInput.dispatchEvent(new Event('input')); // สั่งให้ช่องใหญ่ทำงาน
        }
        
        // ถ้าพิมพ์แล้ว ให้เลื่อนหน้าจอลงมาดูผลลัพธ์นิดนึง
        if(e.target.value.length > 0 && window.scrollY < 200) {
            window.scrollTo({ top: 350, behavior: 'smooth' });
        }
    });
}

// ==========================================
// 5. Navbar Scroll Effect (สไลด์ขึ้น-ลง)
// ==========================================
let lastScrollTop = 0;
const navbar = document.getElementById('mainNav');

window.addEventListener('scroll', () => {
    if(!navbar) return;
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // ถ้าเลื่อนลงเยอะกว่า 100px ให้ซ่อน Navbar
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        navbar.style.transform = 'translateY(-100%)'; // เลื่อนขึ้นไปซ่อน
    } else {
        navbar.style.transform = 'translateY(0)'; // เลื่อนลงมาโชว์
    }
    lastScrollTop = scrollTop;
});

// ==========================================
// 6. ระบบกรองหมวดหมู่ (Category Filter)
// ==========================================
window.filterCat = (cat) => {
    // เปลี่ยนสีปุ่มให้รู้ว่ากดอันไหนอยู่
    document.querySelectorAll('.btn-outline-primary').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn${cat}`);
    if(activeBtn) activeBtn.classList.add('active');

    // กรองข้อมูล
    if (cat === 'All') {
        render(allData);
    } else {
        const filtered = allData.filter(item => item.category === cat);
        render(filtered);
    }
};

// เริ่มต้นทำงาน
loadArticles();

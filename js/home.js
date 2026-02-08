import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
let allData = []; // ตัวแปรเก็บข้อมูลทั้งหมด (เพื่อไม่ต้องโหลดใหม่ทุกครั้งที่ค้นหา)

// 1. โหลดข้อมูลทั้งหมดมาเก็บไว้ก่อน (Fetch Once)
async function loadArticles() {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('status', 'Published')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allData = data || [];
        render(allData); // แสดงผลทั้งหมดตอนแรก

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p class="text-center text-danger">โหลดข้อมูลไม่สำเร็จ</p>`;
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

// 2. ฟังก์ชันแสดงผล (Render Cards)
function render(list) {
    grid.innerHTML = '';
    
    if (list.length === 0) {
        noResult.classList.remove('d-none'); // โชว์ว่าไม่พบ
        return;
    } else {
        noResult.classList.add('d-none');
    }

    list.forEach(item => {
        // เช็คว่ามีรูปไหม ถ้าไม่มีใช้รูป Placeholder
        const imgHTML = item.image_url 
            ? `<img src="${item.image_url}" class="card-img-top" style="height:200px; object-fit:cover;">`
            : `<div class="bg-light d-flex align-items-center justify-content-center text-muted" style="height:200px;"><i class="bi bi-image fs-1"></i></div>`;

        // สร้างสีป้ายตามหมวดหมู่
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
                        <span class="badge ${badgeColor} badge-custom mb-2">${item.category}</span>
                        <h5 class="fw-bold text-truncate">${item.title}</h5>
                        <p class="text-muted small text-truncate-2">${item.content}</p>
                    </div>
                </div>
            </a>
        </div>`;
    });
}

// 3. [ระบบ Live Search] ค้นหาทันทีที่พิมพ์
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase().trim();

    // กรองข้อมูลจาก allData
    const filtered = allData.filter(item => {
        // ค้นหาคำใน Title, Content, Solution และ Category
        return (item.title && item.title.toLowerCase().includes(searchText)) ||
               (item.content && item.content.toLowerCase().includes(searchText)) ||
               (item.solution && item.solution.toLowerCase().includes(searchText)) ||
               (item.category && item.category.toLowerCase().includes(searchText));
    });

    render(filtered);
});

// 4. ระบบ Filter หมวดหมู่ (ปุ่มกด)
window.filterCat = (cat) => {
    // ปรับสีปุ่ม Active
    document.querySelectorAll('.btn-outline-primary').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn${cat}`).classList.add('active');

    if (cat === 'All') {
        render(allData);
    } else {
        const filtered = allData.filter(item => item.category === cat);
        render(filtered);
    }
};

// เริ่มทำงาน
loadArticles();

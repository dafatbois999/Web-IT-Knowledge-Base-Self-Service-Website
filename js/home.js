import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
let allData = []; 

// 1. โหลดข้อมูล
async function loadArticles() {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('status', 'Published')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allData = data || [];
        render(allData);

    } catch (err) {
        console.error("Error:", err);
        grid.innerHTML = `<div class="col-12 text-center text-danger">โหลดข้อมูลไม่สำเร็จ</div>`;
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

// 2. แสดงผล (Render)
function render(list) {
    grid.innerHTML = '';
    
    if (list.length === 0) {
        if(noResult) noResult.classList.remove('d-none');
        return;
    } else {
        if(noResult) noResult.classList.add('d-none');
    }

    list.forEach((item, index) => {
        const imgHTML = item.image_url 
            ? `<img src="${item.image_url}" class="card-img-top" loading="lazy" style="height:200px; object-fit:cover;">`
            : `<div class="bg-light d-flex align-items-center justify-content-center text-secondary" style="height:200px;"><i class="bi bi-image fs-1 opacity-25"></i></div>`;

        let badgeColor = 'bg-primary';
        if (item.category === 'Hardware') badgeColor = 'bg-danger';
        if (item.category === 'Network') badgeColor = 'bg-success';
        if (item.category === 'Software') badgeColor = 'bg-info text-dark';

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

// 3. ระบบค้นหา (Live Search)
const mainSearchInput = document.getElementById('searchInput');
if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();
        const filtered = allData.filter(item => {
            return (item.title && item.title.toLowerCase().includes(txt)) ||
                   (item.content && item.content.toLowerCase().includes(txt)) ||
                   (item.solution && item.solution.toLowerCase().includes(txt)) ||
                   (item.category && item.category.toLowerCase().includes(txt));
        });
        render(filtered);
    });
}

// 4. Navbar Search Toggle (กดแว่นขยายแล้วเด้ง)
window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    if(box) {
        box.classList.toggle('search-box-active');
        if (box.classList.contains('search-box-active') && input) input.focus();
    }
};

// ซิงค์ช่องค้นหาเล็กกับใหญ่
const navInput = document.getElementById('navSearchInput');
if (navInput) {
    navInput.addEventListener('input', (e) => {
        if(mainSearchInput) {
            mainSearchInput.value = e.target.value;
            mainSearchInput.dispatchEvent(new Event('input'));
        }
        if(e.target.value.length > 0 && window.scrollY < 200) {
            window.scrollTo({ top: 350, behavior: 'smooth' });
        }
    });
}

// 5. กรองหมวดหมู่
window.filterCat = (cat) => {
    document.querySelectorAll('.btn-light').forEach(btn => btn.classList.remove('active', 'fw-bold'));
    const activeBtn = document.getElementById(`btn${cat}`);
    if(activeBtn) activeBtn.classList.add('active', 'fw-bold');

    if (cat === 'All') render(allData);
    else {
        const filtered = allData.filter(item => item.category === cat);
        render(filtered);
    }
};

loadArticles();

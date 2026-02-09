import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
const noResult = document.getElementById('noResult');
const loader = document.getElementById('loader');
let allData = []; 

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
        console.error(err);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

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

        grid.innerHTML += `
        <div class="col-md-4 fade-in" style="animation-delay: ${index * 0.05}s">
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

// Search Logic
const mainSearchInput = document.getElementById('searchInput');
if (mainSearchInput) {
    mainSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toLowerCase().trim();
        const filtered = allData.filter(item => 
            (item.title && item.title.toLowerCase().includes(txt)) ||
            (item.content && item.content.toLowerCase().includes(txt)) ||
            (item.category && item.category.toLowerCase().includes(txt))
        );
        render(filtered);
    });
}

window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    box.classList.toggle('search-box-active');
    if (box.classList.contains('search-box-active')) input.focus();
};

window.filterCat = (cat) => {
    document.querySelectorAll('.btn-light').forEach(btn => btn.classList.remove('active', 'fw-bold'));
    document.getElementById(`btn${cat}`)?.classList.add('active', 'fw-bold');
    render(cat === 'All' ? allData : allData.filter(item => item.category === cat));
};

loadArticles();

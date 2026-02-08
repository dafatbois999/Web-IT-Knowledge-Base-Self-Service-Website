import { supabase } from './supabase-config.js';

const grid = document.getElementById('grid');
let allData = [];

async function loadArticles() {
    const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'Published')
        .order('created_at', { ascending: false });

    if (data) {
        allData = data;
        render(allData);
    }
    document.getElementById('loader').style.display = 'none';
}

function render(list) {
    grid.innerHTML = list.length ? '' : '<p class="text-center text-muted col-12">ไม่พบข้อมูล</p>';
    list.forEach(item => {
        grid.innerHTML += `
        <div class="col-md-4">
            <a href="article.html?id=${item.id}" class="text-decoration-none text-dark">
                <div class="card card-hover h-100 shadow-sm">
                    ${item.image_url ? `<img src="${item.image_url}" style="height:200px; object-fit:cover;" class="card-img-top">` : ''}
                    <div class="card-body">
                        <span class="badge ${item.category === 'Hardware' ? 'bg-danger' : 'bg-primary'} badge-custom mb-2">${item.category}</span>
                        <h5 class="fw-bold">${item.title}</h5>
                        <p class="text-muted small text-truncate">${item.content}</p>
                    </div>
                </div>
            </a>
        </div>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const txt = e.target.value.toLowerCase();
    render(allData.filter(i => i.title.toLowerCase().includes(txt)));
});

loadArticles();
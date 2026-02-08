import { supabase } from './supabase-config.js';

const id = new URLSearchParams(window.location.search).get('id');

// --- 1. Navbar Search Toggle (เพิ่มส่วนนี้เข้ามา) ---
window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    if(box) {
        box.classList.toggle('search-box-active');
        if (box.classList.contains('search-box-active') && input) {
            input.focus();
        }
    }
};

// ถ้า User กด Enter ในช่องค้นหา ให้กลับไปหน้าแรกพร้อมคำค้น
document.getElementById('navSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        // (Optional) กลับไปหน้าแรกเพื่อค้นหา จริงๆ
        window.location.href = `index.html`; 
    }
});
// ---------------------------------------------------

// --- 2. Load Content (โค้ดเดิม) ---
async function loadDetail() {
    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            document.getElementById('cat').innerText = data.category;
            // ปรับสี Badge
            let badgeClass = 'bg-primary';
            if (data.category === 'Hardware') badgeClass = 'bg-danger';
            if (data.category === 'Network') badgeClass = 'bg-success';
            if (data.category === 'Software') badgeClass = 'bg-info text-dark';
            
            document.getElementById('cat').className = `badge badge-custom mb-3 ${badgeClass}`;
            
            document.getElementById('title').innerText = data.title;
            document.getElementById('desc').innerText = data.content;
            document.getElementById('sol').innerText = data.solution;

            if (data.image_url) {
                const img = document.getElementById('img');
                img.src = data.image_url;
                img.classList.remove('d-none');
            }

            if (data.video_url) {
                const url = data.video_url;
                let videoId = "";
                if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
                else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];

                if (videoId) {
                    document.getElementById('vid').src = `https://www.youtube.com/embed/${videoId}`;
                    document.getElementById('vidBox').classList.remove('d-none');
                }
            }
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        }
    } catch (err) {
        console.error("Error:", err);
        document.getElementById('loading').innerHTML = `<p class="text-danger">ไม่พบข้อมูล</p>`;
    }
}

loadDetail();

import { supabase } from './supabase-config.js';

const id = new URLSearchParams(window.location.search).get('id');

// --- 1. Navbar Search Toggle ---
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

document.getElementById('navSearchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        window.location.href = `index.html`; 
    }
});

// --- 2. Load Content ---
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
            
            let badgeClass = 'bg-primary';
            if (data.category === 'Hardware') badgeClass = 'bg-danger';
            if (data.category === 'Network') badgeClass = 'bg-success';
            if (data.category === 'Software') badgeClass = 'bg-info text-dark';
            
            document.getElementById('cat').className = `badge badge-custom mb-3 ${badgeClass}`;
            document.getElementById('title').innerText = data.title;

            // [จุดที่แก้ไข] เปลี่ยน innerText -> innerHTML เพื่อให้แสดงรูปภาพได้
            document.getElementById('desc').innerHTML = data.content; 
            document.getElementById('sol').innerHTML = data.solution; 

            if (data.image_url) {
                const img = document.getElementById('img');
                img.src = data.image_url;
                img.classList.remove('d-none');
            }

            if (data.video_url) {
                const url = data.video_url;
                let videoId = "";
                // รองรับลิงก์ YouTube หลายแบบ
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

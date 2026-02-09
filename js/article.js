import { supabase } from './supabase-config.js';

const id = new URLSearchParams(window.location.search).get('id');

window.toggleSearch = () => {
    const box = document.getElementById('navSearchBox');
    const input = document.getElementById('navSearchInput');
    box.classList.toggle('search-box-active');
    if (box.classList.contains('search-box-active')) input.focus();
};

async function loadDetail() {
    if (!id) { window.location.href = 'index.html'; return; }

    try {
        const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
        if (error) throw error;

        if (data) {
            // Count View
            incrementView(data.id, data.views);

            // Render
            let badgeClass = 'bg-primary';
            if (data.category === 'Hardware') badgeClass = 'bg-danger';
            if (data.category === 'Network') badgeClass = 'bg-success';
            if (data.category === 'Software') badgeClass = 'bg-info text-dark';
            
            document.getElementById('cat').innerText = data.category;
            document.getElementById('cat').className = `badge badge-custom ${badgeClass}`;
            document.getElementById('viewCountDisplay').innerHTML = `<i class="bi bi-eye-fill"></i> ${ (data.views || 0) + 1 }`;

            document.getElementById('title').innerText = data.title;
            document.getElementById('desc').innerHTML = data.content; // innerHTML for images
            document.getElementById('sol').innerHTML = data.solution; // innerHTML for images

            if (data.image_url) {
                const img = document.getElementById('img');
                img.src = data.image_url;
                img.classList.remove('d-none');
            }
            
            // Video Logic
            if (data.video_url) {
                let videoId = "";
                if (data.video_url.includes('v=')) videoId = data.video_url.split('v=')[1].split('&')[0];
                else if (data.video_url.includes('youtu.be/')) videoId = data.video_url.split('youtu.be/')[1].split('?')[0];
                if (videoId) {
                    document.getElementById('vid').src = `https://www.youtube.com/embed/${videoId}`;
                    document.getElementById('vidBox').classList.remove('d-none');
                }
            }
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('loading').innerHTML = `<p class="text-danger">ไม่พบข้อมูล</p>`;
    }
}

async function incrementView(articleId, currentViews) {
    const newViews = (currentViews || 0) + 1;
    await supabase.from('articles').update({ views: newViews }).eq('id', articleId);
}

loadDetail();

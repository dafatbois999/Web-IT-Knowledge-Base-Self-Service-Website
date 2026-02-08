import { supabase } from './supabase-config.js';

const id = new URLSearchParams(window.location.search).get('id');

async function load() {
    if(!id) return;
    
    const { data } = await supabase.from('articles').select('*').eq('id', id).single();
    
    if(data) {
        document.getElementById('title').innerText = data.title;
        document.getElementById('cat').innerText = data.category;
        document.getElementById('desc').innerText = data.content;
        document.getElementById('sol').innerText = data.solution;

        // แสดงรูป
        if(data.image_url) {
            const img = document.getElementById('img');
            img.src = data.image_url;
            img.style.display = 'block';
        }

        // แปลง YouTube Link เป็น Embed
        if(data.video_url) {
            let vidId = "";
            if (data.video_url.includes('v=')) vidId = data.video_url.split('v=')[1].split('&')[0];
            else if (data.video_url.includes('youtu.be/')) vidId = data.video_url.split('youtu.be/')[1].split('?')[0];

            if(vidId) {
                document.getElementById('vid').src = `https://www.youtube.com/embed/${vidId}`;
                document.getElementById('vidBox').style.display = 'block';
            }
        }
        
        document.getElementById('content').style.display = 'block';
    }
}
load();
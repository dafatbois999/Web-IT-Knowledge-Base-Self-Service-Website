import { supabase } from './supabase-config.js';

const id = new URLSearchParams(window.location.search).get('id');

async function loadDetail() {
    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // ดึงข้อมูลบทความ
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            // ใส่ข้อมูลข้อความ
            document.getElementById('cat').innerText = data.category;
            // เปลี่ยนสีป้ายตามหมวดหมู่
            document.getElementById('cat').className = `badge badge-custom mb-3 ${data.category === 'Hardware' ? 'bg-danger' : 'bg-primary'}`;
            
            document.getElementById('title').innerText = data.title;
            document.getElementById('desc').innerText = data.content;
            document.getElementById('sol').innerText = data.solution;

            // จัดการรูปภาพ
            if (data.image_url) {
                const img = document.getElementById('img');
                img.src = data.image_url;
                img.classList.remove('d-none');
            }

            // จัดการวิดีโอ YouTube
            if (data.video_url) {
                const url = data.video_url;
                let videoId = "";

                // รองรับลิงก์ทั้ง 2 รูปแบบ
                if (url.includes('v=')) {
                    // แบบยาว: youtube.com/watch?v=XXXX
                    videoId = url.split('v=')[1].split('&')[0];
                } else if (url.includes('youtu.be/')) {
                    // แบบสั้น: youtu.be/XXXX
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                }

                if (videoId) {
                    document.getElementById('vid').src = `https://www.youtube.com/embed/${videoId}`;
                    document.getElementById('vidBox').classList.remove('d-none');
                }
            }
            
            // ปิด Loading เปิด Content
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        }
    } catch (err) {
        console.error("Error:", err);
        document.getElementById('loading').innerHTML = `<p class="text-danger">ไม่พบข้อมูล หรือเกิดข้อผิดพลาด</p>`;
    }
}

loadDetail();

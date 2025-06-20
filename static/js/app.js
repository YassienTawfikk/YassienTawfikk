// ==============================
// 0. Modal for CV View & Download
// ==============================
const modal = document.createElement('div');
modal.id = 'cv-modal';
modal.innerHTML = `
    <div class="viewer">
        <div class="modal-controls">
            <button class="close-btn" aria-label="Close">✕</button>
            <a class="download-btn" href="" download target="_blank" rel="noopener">Download</a>
        </div>
        <iframe title="CV PDF Viewer"></iframe>
    </div>`;
document.body.appendChild(modal);

const iframe = modal.querySelector('iframe');
const closeBtn = modal.querySelector('.close-btn');
const downloadBtn = modal.querySelector('.download-btn');

closeBtn.onclick = () => modal.classList.remove('show');
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeBtn.click();
});

function openCVModal(url) {
    iframe.src = url;
    downloadBtn.href = url;
    modal.classList.add('show');
}

// ==============================
// 1. Fetch Data & Build UI
// ==============================
fetch('static/data/data.json')
    .then(r => r.json())
    .then(data => {
        document.querySelector('.name').textContent = data.Name;
        document.querySelector('.tagline').textContent = data.tagline;

        const iconMap = {
            'CV (PDF)': 'fas fa-file-pdf',
            GitHub: 'fab fa-github',
            LinkedIn: 'fab fa-linkedin',
            LeetCode: 'fas fa-code',
            Tinkercad: 'fas fa-cogs',
            Certificates: 'fab fa-google-drive',
            Email: 'fas fa-envelope',
            Phone: 'fas fa-phone'
        };

        const list = document.querySelector('.link-list');

        Object.entries(data.links).forEach(([label, info]) => {
            const li = document.createElement('li');
            li.className = 'link-item';

            const icon = iconMap[label] || 'fas fa-link';
            const labelHTML = `<span class="label"><i class="${icon}"></i>${label}</span>`;

            if (info.href) {
                const isCV = label.toLowerCase().includes('cv');
                const isDownload = info.href.endsWith('.pdf') && !isCV;

                li.innerHTML = isCV
                    ? `${labelHTML}
                        <button class="action-btn" onclick="openCVModal('${info.href}')">
                            <i class="fas fa-eye"></i>View
                        </button>`
                    : `${labelHTML}
                        <a class="action-btn" href="${info.href}"
                           ${isDownload ? 'download' : 'target="_blank" rel="noopener"'}>
                           <i class="${isDownload ? 'fas fa-download' : 'fas fa-arrow-up-right-from-square'}"></i>
                           ${isDownload ? 'Download' : 'Visit'}
                        </a>`;
            } else if (info.copyText) {
                li.innerHTML = `${labelHTML}
                    <button class="action-btn copy-btn" data-copy="${info.copyText}">
                        <i class="fas fa-copy"></i>Copy
                    </button>`;
            }

            if (label === 'Tinkercad') li.classList.add('tinkercad-item');
            list.appendChild(li);
        });

        list.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(btn.dataset.copy);
                    toast(`Copied: ${btn.dataset.copy}`);
                } catch {
                    toast('Copy failed');
                }
            };
        });
    });

// ==============================
// 2. Toast Notifications
// ==============================
function toast(msg) {
    const box = document.createElement('div');
    box.textContent = msg;
    box.role = 'alert';
    box.style.cssText = `
        position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        background:var(--highlight);color:var(--bg);padding:.6rem 1rem;
        border-radius:6px;font-size:.85rem;z-index:1200;opacity:0;
        transition:opacity .3s;pointer-events:none;backdrop-filter:blur(4px);
        box-shadow:0 2px 8px rgba(0,0,0,.3)`;
    document.body.appendChild(box);
    requestAnimationFrame(() => (box.style.opacity = 1));
    setTimeout(() => {
        box.style.opacity = 0;
        box.addEventListener('transitionend', () => box.remove());
    }, 2000);
}

// ==============================
// 3. EmailJS Contact Form
// ==============================
document.getElementById('contact-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.from_email.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast('Invalid email address');
        return;
    }

    try {
        await emailjs.send('service_2k9xyz', 'template_d4ryemm', {from_email: email});
        await emailjs.send('service_2k9xyz', 'template_bir13y8', {
            from_email: email,
            to_email: email
        });
        toast("Thanks! I'll reach out soon.");
        e.target.reset();
    } catch (err) {
        console.error(err);
        toast('Error — please try again');
    }
});

// ==============================
// 4. Cairo Clock Badge
// ==============================
function updateClock() {
    const time = new Intl.DateTimeFormat('en-EG', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Cairo',
        hour12: false
    }).format(new Date());
    document.getElementById('clock').textContent = `Cairo – ${time}`;
}

updateClock();
setInterval(updateClock, 60_000);

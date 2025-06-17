// --- Fetch tagline and links from JSON ---
fetch('static/data/data.json')
    .then(res => res.json())
    .then(data => {
        // Set Title
        document.querySelector('.name').textContent = data.Name;

        // Set tagline
        document.querySelector('.tagline').textContent = data.tagline;

        // Icons map
        const iconMap = {
            "CV (PDF)": "fas fa-file-pdf",
            "GitHub": "fab fa-github",
            "LinkedIn": "fab fa-linkedin",
            "LeetCode": "fas fa-code",
            "Tinkercad": "fas fa-cogs",
            "Certificates": "fab fa-google-drive",
            "Email": "fas fa-envelope",
            "Phone": "fas fa-phone"
        };

        // Build link items
        const container = document.querySelector('.link-list');
        Object.entries(data.links).forEach(([label, info]) => {
            const li = document.createElement('li');
            li.className = 'link-item';

            const icon = iconMap[label] || 'fas fa-link';
            const labelHTML = `<span class="label"><i class="${icon}"></i>${label}</span>`;

            // External/download link
            if (info.href) {
                const isDownload = label.toLowerCase().includes('cv') || info.href.endsWith('.pdf');
                li.innerHTML = `
                    ${labelHTML}
                    <a class="action-btn" href="${info.href}" ${isDownload ? 'download' : 'target="_blank" rel="noopener"'}>
                        <i class="${isDownload ? 'fas fa-download' : 'fas fa-arrow-up-right-from-square'}"></i>
                        ${isDownload ? 'Download' : 'Visit'}
                    </a>`;
            }

            // Copy button
            else if (info.copyText) {
                li.innerHTML = `
                    ${labelHTML}
                    <button class="action-btn copy-btn" data-copy="${info.copyText}">
                        <i class="fas fa-copy"></i>Copy
                    </button>`;
            }

            if (label === "Tinkercad") {
                li.classList.add('tinkercad-item');
            }
            container.appendChild(li);
        });

        // Re-bind copy button functionality for dynamically added elements
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const text = btn.dataset.copy;
                try {
                    await navigator.clipboard.writeText(text);
                    showToast(`Copied: ${text}`);
                } catch {
                    showToast('Copy failed');
                }
            });
        });
    })
    .catch(err => console.error('Failed to load JSON:', err));

// --- Toast function ---
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--highlight)',
        color: 'var(--bg)',
        padding: '0.6rem 1rem',
        borderRadius: '6px',
        fontSize: '0.85rem',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity .3s'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 2000);
}

// --- EmailJS contact form ---
document.getElementById('contact-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.from_email.value.trim();
    if (!email) return;

    try {
        await emailjs.send('service_2k9xyz', 'template_d4ryemm', {from_email: email});
        await emailjs.send('service_2k9xyz', 'template_bir13y8', {
            from_email: email,
            to_email: email
        });

        showToast("Thanks! I'll reach out soon.");
        e.target.reset();
    } catch (err) {
        showToast('Error — please try again.');
        console.error(err);
    }
});

// --- Cairo local time badge ---
function updateClock() {
    const offset = 2;
    const nowUTC = new Date(Date.now() + new Date().getTimezoneOffset() * 60000);
    const cairo = new Date(nowUTC.getTime() + offset * 3600000);
    const hh = cairo.getHours().toString().padStart(2, '0');
    const mm = cairo.getMinutes().toString().padStart(2, '0');
    document.getElementById('clock').textContent = `Cairo - ${hh}:${mm}`;
}

updateClock();
setInterval(updateClock, 60000);

// ==============================
// 0. Modal for CV View & Download
// ==============================
const modal = document.getElementById('cv-modal');
const cvViewer = document.querySelector('.cv-viewer');
// Updated selector for the notification modal container
const notificationViewer = document.getElementById('confirm-modal-content').closest('.notification-viewer');

const iframe = document.querySelector('.cv-viewer iframe');
const closeBtn = document.querySelector('.cv-viewer .close-btn');
const downloadBtn = document.querySelector('.cv-viewer .download-btn');

closeBtn.onclick = () => modal.classList.remove('show');
// Default ESC behavior for CV modal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') modal.classList.remove('show');
});

function openCVModal(url) {
    // Setup for CV viewing
    cvViewer.style.display = 'flex';
    notificationViewer.style.display = 'none';
    iframe.src = url;
    downloadBtn.href = url;
    modal.classList.add('show');
}

// ==============================
// 0.1 Custom Notification Handler (Single Button, Backdrop Dismiss)
// ==============================
const confirmMessageText = document.getElementById('confirm-message-text');
const confirmOk = document.getElementById('confirm-ok');
// Note: confirmCancel button is removed from HTML but referenced here for clarity

// Function to handle the custom notification dialog
function customNotification(message) {
    return new Promise(resolve => {
        // Setup Modal for notification
        cvViewer.style.display = 'none';
        notificationViewer.style.display = 'flex';
        confirmMessageText.textContent = message;
        modal.classList.add('show');

        // This function cleans up listeners and resolves the promise
        const cleanup = (shouldNavigate) => {
            confirmOk.onclick = null;
            modal.removeEventListener('click', handleCloseOrAction);
            document.removeEventListener('keydown', handleCloseOrAction);
            modal.classList.remove('show');
            resolve(shouldNavigate);
        };

        // Combined handler for OK button, Backdrop click, and ESC key press
        const handleCloseOrAction = (e) => {
            // Case 1: OK Button Clicked (Continue to Site)
            if (e.target === confirmOk) {
                e.preventDefault();
                cleanup(true);
                return;
            }

            // Case 2: Backdrop Clicked or ESC Pressed (Stay Here)
            // Check if click target is the modal backdrop itself OR the ESC key is pressed
            if (e.target === modal || e.key === 'Escape') {
                e.preventDefault();
                cleanup(false);
                return;
            }

            // Case 3: Click inside the notification-viewer box (do nothing, prevent close)
            if (notificationViewer.contains(e.target) && e.target !== modal && e.type === 'click') {
                e.stopPropagation();
            }
        };

        // Attach listeners
        modal.addEventListener('click', handleCloseOrAction);
        document.addEventListener('keydown', handleCloseOrAction);
        confirmOk.onclick = handleCloseOrAction;

        // Prevent click/key events inside the CV modal from affecting the notification logic
        // (though CV modal is display:none, this ensures separation)
        document.querySelector('.cv-viewer').style.pointerEvents = 'none';
    });
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
        // Final user-approved message text
        const tinkercadMessage = "Tinkercad requires a free account to ensure projects are visible. Log in to the website to view the projects.";


        Object.entries(data.links).forEach(([label, info]) => {
            const li = document.createElement('li');
            li.className = 'link-item';

            const icon = iconMap[label] || 'fas fa-link';
            const isTinkercad = label === 'Tinkercad';

            const labelHTML = `<span class="label"><i class="${icon}"></i>${label}</span>`;

            if (info.href) {
                const isCV = label.toLowerCase().includes('cv');
                const isDownload = info.href.endsWith('.pdf') && !isCV;

                const dataAttribute = isTinkercad ? 'data-requires-login="true"' : '';

                li.innerHTML = isCV
                    ? `${labelHTML}
                        <button class="action-btn" onclick="openCVModal('${info.href}')">
                            <i class="fas fa-eye"></i>View
                        </button>`
                    : `${labelHTML}
                        <a class="action-btn" href="${info.href}"
                           ${dataAttribute}
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

            list.appendChild(li);
        });

        // Click handler now uses the customNotification function
        list.querySelectorAll('.action-btn[data-requires-login="true"]').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();

                // *** Using the new customNotification() function ***
                const confirmation = await customNotification(tinkercadMessage);

                if (confirmation) {
                    // Navigate if confirmed
                    window.open(button.href, '_blank');
                }
            });
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

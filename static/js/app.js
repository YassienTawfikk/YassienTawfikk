// ==============================
// 0. Modal Functionality
// ==============================
const modal = document.getElementById('cv-modal');
const cvViewer = document.querySelector('.cv-viewer');
const notificationViewer = document.getElementById('confirm-modal-content').closest('.notification-viewer');

const iframe = document.querySelector('.cv-viewer iframe');
const closeBtn = document.querySelector('.cv-viewer .close-btn');
const downloadBtn = document.querySelector('.cv-viewer .download-btn');

closeBtn.onclick = () => modal.classList.remove('show');

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') modal.classList.remove('show');
});

function openCVModal(url) {
    cvViewer.style.display = 'flex';
    notificationViewer.style.display = 'none';
    iframe.src = url;
    downloadBtn.href = url;
    modal.classList.add('show');
}

// ==============================
// 0.1 Custom Notification Handler
// ==============================
const notificationTitleEl = document.getElementById('notification-title');
const confirmMessageText = document.getElementById('confirm-message-text');
const confirmOk = document.getElementById('confirm-ok');

function customNotification(title, message) {
    return new Promise(resolve => {
        // Setup Modal for notification
        cvViewer.style.display = 'none';
        notificationViewer.style.display = 'flex';

        // Dynamically set title and message
        notificationTitleEl.textContent = title;
        confirmMessageText.textContent = message;

        modal.classList.add('show');

        const cleanup = (shouldNavigate) => {
            confirmOk.onclick = null;
            modal.removeEventListener('click', handleCloseOrAction);
            document.removeEventListener('keydown', handleCloseOrAction);
            modal.classList.remove('show');
            resolve(shouldNavigate);
        };

        const handleCloseOrAction = (e) => {
            if (e.target === confirmOk) {
                e.preventDefault();
                cleanup(true);
                return;
            }

            if (e.target === modal || e.key === 'Escape') {
                e.preventDefault();
                cleanup(false);
                return;
            }

            if (notificationViewer.contains(e.target) && e.target !== modal && e.type === 'click') {
                e.stopPropagation();
            }
        };

        // Attach listeners
        modal.addEventListener('click', handleCloseOrAction);
        document.addEventListener('keydown', handleCloseOrAction);
        confirmOk.onclick = handleCloseOrAction;

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

        // List to hold elements that require custom notification handling
        const notificationButtons = [];

        Object.entries(data.links).forEach(([label, info]) => {
            const li = document.createElement('li');
            li.className = 'link-item';

            const icon = iconMap[label] || 'fas fa-link';
            const hasNotification = info.notification_title && info.notification_description;

            const labelHTML = `<span class="label"><i class="${icon}"></i>${label}</span>`;

            if (info.href) {
                const isCV = label.toLowerCase().includes('cv');
                const isDownload = info.href.endsWith('.pdf') && !isCV;

                // Use a data attribute to flag links requiring notification
                const dataAttribute = hasNotification ? 'data-requires-notification="true"' : '';

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

                // If a notification is required, save the button and its associated data
                if (hasNotification) {
                    // Need to find the dynamically created anchor tag for the notification
                    // Wait for it to be appended to the DOM to ensure we capture the element
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = li.innerHTML;
                    const button = tempDiv.querySelector('[data-requires-notification="true"]');

                    if (button) {
                        notificationButtons.push({
                            element: button,
                            title: info.notification_title,
                            description: info.notification_description,
                            href: info.href
                        });
                    }
                }

            } else if (info.copyText) {
                li.innerHTML = `${labelHTML}
                    <button class="action-btn copy-btn" data-copy="${info.copyText}">
                        <i class="fas fa-copy"></i>Copy
                    </button>`;
            }

            list.appendChild(li);
        });

        // ==============================
        // ATTACH DYNAMIC NOTIFICATION LISTENERS
        // ==============================
        list.querySelectorAll('[data-requires-notification="true"]').forEach(button => {
            // Find the corresponding data object
            const dataObject = notificationButtons.find(item => item.element.href === button.href);

            if (dataObject) {
                button.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent default link navigation

                    const confirmation = await customNotification(dataObject.title, dataObject.description);

                    if (confirmation) {
                        window.open(dataObject.href, '_blank');
                    }
                });
            }
        });

        // ==============================
        // ENHANCED COPY BUTTON LOGIC
        // ==============================
        list.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = async () => {
                const originalHTML = btn.innerHTML;
                const copyValue = btn.dataset.copy;

                const resetStyles = () => {
                    if (btn.innerHTML.includes('fas fa-check') || btn.innerHTML.includes('fas fa-times')) {
                        btn.innerHTML = originalHTML;
                        btn.style.cssText = '';
                    }
                };

                try {
                    btn.style.cssText = 'background: #4CAF50; border-color: #4CAF50; color: var(--bg-deep);';
                    await navigator.clipboard.writeText(copyValue);

                    btn.innerHTML = '<i class="fas fa-check"></i>Copied';
                    toast(`Copied: ${copyValue}`);

                    setTimeout(resetStyles, 1500);

                } catch (err) {
                    console.error('Copy failed:', err);
                    btn.style.cssText = 'background: #F44336; border-color: #F44336; color: var(--bg-deep);';

                    toast('Copy failed. Please copy manually.');

                    btn.innerHTML = '<i class="fas fa-times"></i>Failed';

                    setTimeout(resetStyles, 1500);
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

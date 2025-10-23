// ==============================
// 1. DOM ELEMENTS AND INITIAL SETUP
// ==============================
const modal = document.getElementById('cv-modal');
const cvViewer = document.querySelector('.cv-viewer');
const notificationViewer = document.getElementById('confirm-modal-content').closest('.notification-viewer');
const iframe = document.querySelector('.cv-viewer iframe');
const downloadBtn = document.querySelector('.cv-viewer .download-btn');

// Notification Elements
const notificationTitleEl = document.getElementById('notification-title');
const confirmMessageText = document.getElementById('confirm-message-text');
const confirmOk = document.getElementById('confirm-ok');

// ==============================
// 2. MODAL & DIALOG FUNCTIONALITY
// ==============================
function openCVModal(url) {
    cvViewer.style.display = 'flex';
    notificationViewer.style.display = 'none';

    iframe.src = url;
    downloadBtn.href = url;

    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

function customNotification(title, message) {
    return new Promise(resolve => {
        cvViewer.style.display = 'none';
        notificationViewer.style.display = 'flex';

        notificationTitleEl.textContent = title;
        confirmMessageText.textContent = message;

        modal.classList.add('show');
        document.body.classList.add('modal-open');

        const cleanup = (shouldNavigate) => {
            confirmOk.onclick = null;
            document.removeEventListener('keydown', handleCloseOrAction);
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            resolve(shouldNavigate);
        };

        const handleCloseOrAction = (e) => {
            if (e.target === confirmOk || e.type === 'click' && confirmOk.contains(e.target)) {
                e.preventDefault();
                cleanup(true);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                cleanup(false);
                return;
            }

            if (notificationViewer.contains(e.target) && e.target !== modal && e.type === 'click') {
                e.stopPropagation();
            }
        };

        document.addEventListener('keydown', handleCloseOrAction);
        confirmOk.onclick = handleCloseOrAction;
    });
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !notificationViewer.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
});

modal.addEventListener('click', e => {
    if (e.target === modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
});

// ==============================
// 3. TOAST NOTIFICATIONS
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
// 4. DATA FETCHING AND UI RENDERING
// ==============================
const isMobileScreen = () => window.innerWidth <= 480;

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
                const dataAttribute = hasNotification ? 'data-requires-notification="true"' : '';

                if (isCV) {
                    // Check for mobile screen size to force download link
                    if (isMobileScreen()) {
                        li.innerHTML = `${labelHTML}
                            <a class="action-btn" href="${info.href}" download target="_blank" rel="noopener">
                                <i class="fas fa-download"></i>View
                            </a>`;
                    } else {
                        // Desktop: Keep View Modal
                        li.innerHTML = `${labelHTML}
                            <button class="action-btn" onclick="openCVModal('${info.href}')">
                                <i class="fas fa-eye"></i>View
                            </button>`;
                    }
                } else {
                    li.innerHTML = `${labelHTML}
                        <a class="action-btn" href="${info.href}"
                           ${dataAttribute}
                           ${isDownload ? 'download' : 'target="_blank" rel="noopener"'}>
                           <i class="${isDownload ? 'fas fa-download' : 'fas fa-arrow-up-right-from-square'}"></i>
                           ${isDownload ? 'Download' : 'Visit'}
                        </a>`;
                }

                if (hasNotification) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = li.innerHTML;
                    // Note: If on mobile, the link is an <a> tag now, not a button, so check for both.
                    const selector = isMobileScreen() ? `[href="${info.href}"]` : '[data-requires-notification="true"]';
                    const button = tempDiv.querySelector(selector);

                    // Revert CV link on mobile to button to capture notification click if one is defined
                    if (isCV && isMobileScreen() && hasNotification) {
                        li.innerHTML = `${labelHTML}
                            <button class="action-btn" data-requires-notification="true" data-href="${info.href}">
                                <i class="fas fa-download"></i>Download
                            </button>`;

                        // We must re-select the new button element
                        const newButton = li.querySelector('button');
                        if (newButton) {
                            notificationButtons.push({
                                element: newButton,
                                title: info.notification_title,
                                description: info.notification_description,
                                href: info.href
                            });
                        }
                    } else if (button) {
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

        // Attach Dynamic Notification Listeners
        list.querySelectorAll('[data-requires-notification="true"]').forEach(button => {
            // Use href from data-href attribute if it's a mobile CV button
            const targetHref = button.dataset.href || button.href;
            const dataObject = notificationButtons.find(item => item.href === targetHref);

            if (dataObject) {
                button.addEventListener('click', async (event) => {
                    event.preventDefault();

                    const confirmation = await customNotification(dataObject.title, dataObject.description);

                    if (confirmation) {
                        // Use a direct download link on mobile, or window.open for others
                        if (isMobileScreen() && dataObject.element.tagName === 'BUTTON') {
                            const tempLink = document.createElement('a');
                            tempLink.href = dataObject.href;
                            tempLink.download = true;
                            document.body.appendChild(tempLink);
                            tempLink.click();
                            document.body.removeChild(tempLink);
                        } else {
                            window.open(dataObject.href, '_blank');
                        }
                    }
                });
            }
        });

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
// 5. EMAILJS CONTACT FORM SUBMISSION
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
// 6. CAIRO CLOCK BADGE
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
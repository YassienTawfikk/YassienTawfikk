// ==============================
// 1. DOM ELEMENTS AND INITIAL SETUP
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    // We wrap everything in DOMContentLoaded to ensure elements exist
    initApp();
});

function initApp() {
    const resumeModal = document.getElementById('resume-modal');
    const notificationModal = document.getElementById('notification-modal');
    const downloadBtn = document.getElementById('download-cv-btn');
    const closeResumeBtn = document.querySelector('.close-modal-btn');

    // Notification Elements
    constnotificationTitleEl = document.getElementById('notification-title');
    const confirmMessageText = document.getElementById('confirm-message-text');
    const confirmOk = document.getElementById('confirm-ok');

    // ==============================
    // 2. MODAL & DIALOG FUNCTIONALITY
    // ==============================

    // Open CV Modal Function
    window.openCVModal = function (url) {

        if (downloadBtn) downloadBtn.href = url;

        // Set Global VAR for pdf_viewer.js
        window.RESUME_URL = url;

        if (resumeModal) {
            // Ensure it overrides inline display: none
            resumeModal.style.display = 'block';

            resumeModal.classList.add('show');
            setTimeout(() => resumeModal.classList.add('in'), 10); // Fade in effect
            document.body.classList.add('modal-open');

            // Manually Dispatch Bootstrap Event (since we don't have bootstrap.js)
            // This triggers the listener in pdf_viewer.js
            setTimeout(() => {
                const event = new Event('shown.bs.modal');
                resumeModal.dispatchEvent(event);
            }, 150);
        }
    };

    function closeResumeModal() {
        if (resumeModal) {
            resumeModal.classList.remove('in');
            setTimeout(() => {
                resumeModal.classList.remove('show');
                resumeModal.style.display = 'none'; // Re-apply display: none
                document.body.classList.remove('modal-open');
            }, 300); // 300ms transition
        }
    }

    if (closeResumeBtn) {
        closeResumeBtn.addEventListener('click', closeResumeModal);
    }

    // Close when clicking outside modal content (on the backdrop)
    if (resumeModal) {
        resumeModal.addEventListener('click', e => {
            if (e.target === resumeModal) {
                closeResumeModal();
            }
        });
    }

    // Global Notification Function
    window.customNotification = function (title, message) {
        return new Promise(resolve => {
            const notificationTitleEl = document.getElementById('notification-title');
            const confirmMessageText = document.getElementById('confirm-message-text');
            const confirmOk = document.getElementById('confirm-ok');

            if (!notificationModal) return resolve(true); // Fallback if modal missing

            notificationModal.classList.add('show');
            document.body.classList.add('modal-open');

            if (notificationTitleEl) notificationTitleEl.textContent = title;
            if (confirmMessageText) confirmMessageText.textContent = message;

            const cleanup = (shouldNavigate) => {
                if (confirmOk) confirmOk.onclick = null;
                document.removeEventListener('keydown', handleCloseOrAction);
                notificationModal.classList.remove('show');
                document.body.classList.remove('modal-open');
                resolve(shouldNavigate);
            };

            const handleCloseOrAction = (e) => {
                if ((confirmOk && (e.target === confirmOk || (e.type === 'click' && confirmOk.contains(e.target))))) {
                    e.preventDefault();
                    cleanup(true);
                    return;
                }

                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(false);
                    return;
                }
            };

            document.addEventListener('keydown', handleCloseOrAction);
            if (confirmOk) confirmOk.onclick = handleCloseOrAction;
        });
    };

    // Escape Key Handler for Modals
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (notificationModal && notificationModal.classList.contains('show')) {
                // Handled by customNotification listener usually
            } else if (resumeModal && resumeModal.classList.contains('show')) {
                closeResumeModal();
            }
        }
    });


    // ==============================
    // 3. TOAST NOTIFICATIONS
    // ==============================
    window.toast = function (msg) {
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
    };


    // ==============================
    // 4. DATA FETCHING AND UI RENDERING
    // ==============================
    const isMobileScreen = () => window.innerWidth <= 480;

    fetch('static/data/data.json')
        .then(r => r.json())
        .then(data => {
            // Populate Name and Tagline
            const nameEl = document.querySelector('.name');
            const taglineEl = document.querySelector('.tagline');
            if (nameEl) nameEl.textContent = data.Name;
            if (taglineEl) taglineEl.textContent = data.tagline;

            const iconMap = {
                'CV (PDF)': 'fas fa-file-pdf',
                Portfolio: 'fas fa-briefcase',
                GitHub: 'fab fa-github',
                LinkedIn: 'fab fa-linkedin',
                LeetCode: 'fas fa-code',
                Tinkercad: 'fas fa-cogs',
                Certificates: 'fa-solid fa-scroll social-icons',
                Email: 'fas fa-envelope',
                Phone: 'fas fa-phone'
            };

            const list = document.querySelector('.link-list');
            if (!list) return; // Exit if list doesn't exist

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
                        // Always show View Modal for CV, for both Mobile and Desktop
                        li.innerHTML = `${labelHTML}
                            <button class="action-btn" onclick="openCVModal('${info.href}')">
                                <i class="fas fa-eye"></i>View
                            </button>`;
                    } else {
                        li.innerHTML = `${labelHTML}
                            <a class="action-btn" href="${info.href}"
                               ${dataAttribute}
                               ${isDownload ? 'download' : 'target="_blank" rel="noopener"'}>
                               <i class="${isDownload ? 'fas fa-download' : 'fas fa-arrow-up-right-from-square'}"></i>
                               ${isDownload ? 'Download' : 'Visit'}
                            </a>`;
                    }

                    // Notification Logic
                    if (hasNotification) {
                        // Select the element we just created (either button or a tag)
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = li.innerHTML;

                        // We need to identify if we are targeting the button or the link
                        // If it's the CV button, it does NOT have notification logical attached directly in the onclick above
                        // But if the JSON says it needs notification, we might need to handle it.
                        // However, for CV, openCVModal handles the action.
                        // If standard link:
                        const selector = '[data-requires-notification="true"]';
                        const el = tempDiv.querySelector(selector);

                        if (el) {
                            notificationButtons.push({
                                element: null, // Will bind later
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
                const targetHref = button.dataset.href || button.getAttribute('href');
                const dataObject = notificationButtons.find(item => item.href === targetHref);

                if (dataObject) {
                    button.addEventListener('click', async (event) => {
                        event.preventDefault();

                        const confirmation = await window.customNotification(dataObject.title, dataObject.description);

                        if (confirmation) {
                            if (isMobileScreen() && button.tagName === 'BUTTON') {
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

            // Copy Button Logic
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

            // Start Clock
            setInterval(updateClock, 1000);
            updateClock();

        })
        .catch(err => {
            console.error('Failed to load data:', err);
            const list = document.querySelector('.link-list');
            if (list) list.innerHTML = '<p style="color:red; text-align:center;">Failed to load profile data.</p>';
        });

    // ==============================
    // 6. CAIRO CLOCK BADGE
    // ==============================
    function updateClock() {
        const clockEl = document.getElementById('clock');
        if (!clockEl) return;

        const time = new Intl.DateTimeFormat('en-EG', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Cairo',
            hour12: false
        }).format(new Date());

        clockEl.innerHTML = `<i class="fas fa-clock"></i> Cairo, Egypt: ${time}`;
    }
}
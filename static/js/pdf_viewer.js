document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("pdf-container");
    const zoomWrapper = document.getElementById("zoom-wrapper");
    const fallback = document.getElementById("pdf-fallback");

    // Force scroll behavior to auto to prevent zoom jank
    if (container) container.style.scrollBehavior = 'auto';

    let pdfDoc = null;

    // Zoom State
    let currentZoom = 1.0;
    let minZoom = 0.5;
    let maxZoom = 10000.0;
    let baseWidth = 0;

    // Initial Load
    const resumeModal = document.getElementById('resume-modal');
    if (resumeModal) {
        resumeModal.addEventListener('shown.bs.modal', function () {
            // Force layout recalculation
            if (pdfDoc) {
                renderAllPages();
            }

            if (!pdfDoc) {
                if (typeof RESUME_URL !== 'undefined' && RESUME_URL) {
                    console.log("PDFViewer: Loading RESUME_URL", RESUME_URL);
                    pdfjsLib.getDocument(RESUME_URL).promise.then(function (pdfDoc_) {
                        pdfDoc = pdfDoc_;
                        renderAllPages();
                    }).catch(function (error) {
                        console.error('Error loading PDF:', error);
                        if (fallback) {
                            fallback.style.display = 'block';
                            fallback.innerHTML += '<br><br><span style="color: red; font-size: 0.9em;">Debug Error: ' + error.message + '</span>';
                        }
                        if (container) container.style.display = 'none';
                    });
                } else {
                    console.warn("PDFViewer: RESUME_URL is undefined");
                }
            } else {
                renderAllPages();
            }
        });
    }

    function renderAllPages() {
        // Ensure container is visible and fallback is hidden to prevent overlap
        if (container) container.style.display = 'block';
        if (fallback) fallback.style.display = 'none';

        if (!zoomWrapper) return;
        zoomWrapper.innerHTML = '';
        if (!pdfDoc) return;

        // Base Width = Container Width - Margins (20px * 2)
        baseWidth = container.clientWidth - 40;
        // Safety check for hidden container
        if (baseWidth <= 0) {
            console.log("PDFViewer: Container hidden, retrying...");
            setTimeout(renderAllPages, 100);
            return;
        }

        if (baseWidth < 300) baseWidth = 300;

        const renderScaleMultiplier = 2.0;

        for (let num = 1; num <= pdfDoc.numPages; num++) {
            createAndRenderPage(num, renderScaleMultiplier);
        }

        // Reset Zoom
        currentZoom = 1.0;
        zoomWrapper.style.width = baseWidth + 'px';
    }

    function createAndRenderPage(num, renderScaleMultiplier) {
        return new Promise((resolve) => {
            // Container
            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container';
            pageContainer.style.position = 'relative';
            pageContainer.style.width = '100%';
            pageContainer.style.marginBottom = '20px';
            pageContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            // Performance Optimizations
            pageContainer.style.contain = 'content';
            pageContainer.style.transform = 'translateZ(0)';
            pageContainer.style.willChange = 'transform';

            zoomWrapper.appendChild(pageContainer);

            // Canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'pdf-page-' + num;
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = 'auto';

            pageContainer.appendChild(canvas);

            // Layers
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            textLayerDiv.style.position = 'absolute';
            textLayerDiv.style.top = '0';
            textLayerDiv.style.left = '0';
            textLayerDiv.style.transformOrigin = '0 0';
            pageContainer.appendChild(textLayerDiv);

            const annotationLayerDiv = document.createElement('div');
            annotationLayerDiv.className = 'annotationLayer';
            annotationLayerDiv.style.position = 'absolute';
            annotationLayerDiv.style.top = '0';
            annotationLayerDiv.style.left = '0';
            annotationLayerDiv.style.transformOrigin = '0 0';
            // Pointer events for links
            annotationLayerDiv.style.pointerEvents = 'none';
            pageContainer.appendChild(annotationLayerDiv);

            const ctx = canvas.getContext('2d');

            pdfDoc.getPage(num).then(function (page) {
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                const fitScale = baseWidth / unscaledViewport.width;

                // Canvas Render at High Res
                const renderViewport = page.getViewport({ scale: fitScale * renderScaleMultiplier });
                canvas.height = renderViewport.height;
                canvas.width = renderViewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: renderViewport
                };

                // Viewport for Layers (at scale 1.0 relative to container baseWidth)
                const layerViewport = page.getViewport({ scale: fitScale });

                // Set Layer Dimensions
                textLayerDiv.style.width = Math.floor(layerViewport.width) + 'px';
                textLayerDiv.style.height = Math.floor(layerViewport.height) + 'px';
                annotationLayerDiv.style.width = Math.floor(layerViewport.width) + 'px';
                annotationLayerDiv.style.height = Math.floor(layerViewport.height) + 'px';

                // Render Page
                page.render(renderContext).promise.then(() => {
                    // Height at 1x
                    const heightAt1x = renderViewport.height / renderScaleMultiplier;
                    resolve(heightAt1x);
                });

                // Render Text Layer
                page.getTextContent().then(textContent => {
                    pdfjsLib.renderTextLayer({
                        textContent: textContent,
                        container: textLayerDiv,
                        viewport: layerViewport,
                        textDivs: []
                    });
                });

                // Render Annotations (Links)
                page.getAnnotations().then(annotations => {
                    annotations.forEach(annotation => {
                        if (annotation.subtype === 'Link' && annotation.rect) {
                            const rect = layerViewport.convertToViewportRectangle(annotation.rect);
                            const x = Math.min(rect[0], rect[2]);
                            const y = Math.min(rect[1], rect[3]);
                            const w = Math.abs(rect[0] - rect[2]);
                            const h = Math.abs(rect[1] - rect[3]);

                            const a = document.createElement('a');
                            a.href = annotation.url || '#';
                            if (annotation.url) a.target = '_blank';

                            a.style.position = 'absolute';
                            a.style.left = x + 'px';
                            a.style.top = y + 'px';
                            a.style.width = w + 'px';
                            a.style.height = h + 'px';
                            a.style.pointerEvents = 'auto'; // Re-enable clicks

                            annotationLayerDiv.appendChild(a);
                        }
                    });
                });

            });
        });
    }

    // --- Relative Delta Zoom Logic ---

    function updateLayout(newZoom, clientX, clientY) {
        if (newZoom < minZoom) newZoom = minZoom;
        if (newZoom > maxZoom) newZoom = maxZoom;
        if (Math.abs(newZoom - currentZoom) < 0.0001) return;

        const wrapperRect = zoomWrapper.getBoundingClientRect();
        let offsetX = 0;
        let offsetY = 0;

        if (clientX !== undefined && clientY !== undefined) {
            offsetX = clientX - wrapperRect.left;
            offsetY = clientY - wrapperRect.top;
        } else {
            const rect = container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            offsetX = cx - wrapperRect.left;
            offsetY = cy - wrapperRect.top;
        }

        const ratio = newZoom / currentZoom;

        currentZoom = newZoom;
        zoomWrapper.style.width = (baseWidth * currentZoom) + 'px';

        const layers = document.querySelectorAll('.textLayer, .annotationLayer');
        layers.forEach(layer => {
            layer.style.transform = `scale(${currentZoom})`;
        });

        const scrollDeltaX = offsetX * (ratio - 1);
        const scrollDeltaY = offsetY * (ratio - 1);

        container.scrollLeft += scrollDeltaX;
        container.scrollTop += scrollDeltaY;
    }


    // --- Wheel Logic ---

    container.addEventListener("wheel", function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
            const wrapperRect = zoomWrapper.getBoundingClientRect();
            if (e.clientX < wrapperRect.left || e.clientX > wrapperRect.right ||
                e.clientY < wrapperRect.top || e.clientY > wrapperRect.bottom) {
                return;
            }

            const delta = -e.deltaY;
            const factor = 0.003 * delta;
            let target = currentZoom + (currentZoom * factor);

            if (target < minZoom) target = minZoom;
            if (target > maxZoom) target = maxZoom;

            updateLayout(target, e.clientX, e.clientY);
        }
    }, { passive: false });

    // --- Touch Logic ---
    let initialDist = null;
    let initialZoomStart = 1.0;

    function getPinchDetails(touches) {
        const cx = (touches[0].clientX + touches[1].clientX) / 2;
        const cy = (touches[0].clientY + touches[1].clientY) / 2;
        const dist = Math.sqrt(Math.pow(touches[0].clientX - touches[1].clientX, 2) + Math.pow(touches[0].clientY - touches[1].clientY, 2));
        return { cx, cy, dist };
    }

    container.addEventListener("touchstart", function (e) {
        if (e.touches.length === 2) {
            const d = getPinchDetails(e.touches);
            initialDist = d.dist;
            initialZoomStart = currentZoom;
        }
    }, { passive: true });

    container.addEventListener("touchmove", function (e) {
        if (e.touches.length === 2 && initialDist) {
            e.preventDefault();
            const d = getPinchDetails(e.touches);
            const ratio = d.dist / initialDist;
            let target = initialZoomStart * ratio;

            if (target < minZoom) target = minZoom;
            if (target > maxZoom) target = maxZoom;

            updateLayout(target, d.cx, d.cy);
        }
    }, { passive: false });

    container.addEventListener("touchend", function (e) {
        initialDist = null;
    });

    // Resize
    let resizeTimeout;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (pdfDoc) {
                renderAllPages();
            }
        }, 300);
    });

});

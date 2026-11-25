// Panel preferences are local to this browser, independent of workspace data.
const panelLayout = (() => {
    const layout = document.querySelector('.app-layout');
    const explorer = document.querySelector('#explorer-pane');
    const evidence = document.querySelector('#evidence-pane');
    const explorerToggle = document.querySelector('#toggle-explorer');
    const evidenceToggle = document.querySelector('#toggle-evidence');
    const railWidth = 44;
    const storageKey = 'doctodata:panels';
    let preferences = {};
    try { preferences = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
    let leftCollapsed = preferences.leftCollapsed === true;
    let rightCollapsed = preferences.rightCollapsed === true;
    let mobileExplorerOpen = false;
    let mobileEvidenceOpen = false;
    const widths = {
        left: Number.isFinite(preferences.leftWidth) ? preferences.leftWidth : 252,
        right: Number.isFinite(preferences.rightWidth) ? preferences.rightWidth : null,
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const narrow = () => window.innerWidth <= 900;
    const mobile = () => window.innerWidth <= 600;
    const isLeftOpen = () => mobile() ? mobileExplorerOpen : !leftCollapsed;
    const isRightOpen = () => narrow() ? mobileEvidenceOpen : !rightCollapsed;
    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify({leftCollapsed, rightCollapsed, leftWidth: widths.left, rightWidth: widths.right})); } catch {}
    }
    function limits(side) {
        const width = layout.clientWidth;
        if (side === 'left') return [mobile() ? 165 : 180, mobile() ? Math.min(420, width - 40) : Math.min(420, width - 300 - (!narrow() && isRightOpen() ? evidence.offsetWidth : railWidth))];
        return [Math.min(290, width - 40), narrow() ? width - 40 : Math.min(width * .65, width - 300 - (isLeftOpen() && !mobile() ? explorer.offsetWidth : railWidth))];
    }
    function render() {
        const width = layout.clientWidth;
        const leftOpen = isLeftOpen(), rightOpen = isRightOpen();
        let left = clamp(widths.left, mobile() ? 165 : 180, mobile() ? Math.min(420, width - 40) : Math.min(420, width - 300 - (!narrow() && rightOpen ? 290 : railWidth)));
        let right = clamp(widths.right ?? (narrow() ? 520 : width * .36), Math.min(290, width - 40), narrow() ? width - 40 : Math.min(width * .65, width - 300 - (leftOpen && !mobile() ? left : railWidth)));
        layout.style.setProperty('--panel-left', `${left}px`);
        layout.style.setProperty('--panel-right', `${right}px`);
        layout.style.gridTemplateColumns = `${leftOpen && !mobile() ? left : railWidth}px minmax(0,1fr) ${rightOpen && !narrow() ? right : railWidth}px`;
        explorer.hidden = !leftOpen;
        evidence.hidden = !rightOpen;
        document.querySelector('#explorer-rail').hidden = leftOpen && !mobile();
        document.querySelector('#evidence-rail').hidden = rightOpen; 
        layout.classList.toggle('evidence-open', rightOpen);
        layout.classList.toggle('explorer-open', leftOpen);
        for (const [side, toggle, open, name, size] of [['left', explorerToggle, leftOpen, 'explorer', left], ['right', evidenceToggle, rightOpen, 'evidence', right]]) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-controls', `${name}-pane`);
            toggle.setAttribute('aria-label', t(open ? `Collapse ${name} panel` : `Expand ${name} panel`));
            toggle.title = toggle.getAttribute('aria-label');
            const handle = document.querySelector(`#resize-${name}`);
            const [min, max] = limits(side);
            handle.title = t('Drag to resize; use arrow keys when focused. Double-click to reset.');
            handle.setAttribute('aria-valuemin', Math.round(min));
            handle.setAttribute('aria-valuemax', Math.round(Math.max(min, max)));
            handle.setAttribute('aria-valuenow', Math.round(size));
            handle.setAttribute('aria-valuetext', t('{0} pixels', Math.round(size)));
        }
    }
    function setEvidenceOpen(open) {
        if (narrow()) mobileEvidenceOpen = open;
        else rightCollapsed = !open;
        if (mobile() && open) mobileExplorerOpen = false;
        render(); save();
    }
    explorerToggle.onclick = () => {
        if (mobile()) { mobileExplorerOpen = !mobileExplorerOpen; if (mobileExplorerOpen) mobileEvidenceOpen = false; }
        else leftCollapsed = !leftCollapsed;
        render(); save();
    };
    document.querySelector('#collapse-explorer').onclick = () => {
        if (mobile()) mobileExplorerOpen = false;
        else leftCollapsed = true;
        render(); save();
        explorerToggle.focus();
    };
    evidenceToggle.onclick = () => setEvidenceOpen(!isRightOpen());
    document.querySelector('#collapse-evidence').onclick = () => { setEvidenceOpen(false); evidenceToggle.focus(); };
    for (const [side, name, panel] of [['left', 'explorer', explorer], ['right', 'evidence', evidence]]) {
        const handle = document.querySelector(`#resize-${name}`);
        let drag = null;
        function resize(value) { const [min, max] = limits(side); widths[side] = clamp(value, min, max); render(); }
        handle.onpointerdown = event => {
            if (event.button !== 0) return;
            event.preventDefault(); handle.focus();
            drag = {x: event.clientX, width: panel.offsetWidth};
            handle.setPointerCapture(event.pointerId);
            document.body.classList.add('resizing-panels');
        };
        handle.onpointermove = event => { if (drag) resize(drag.width + (event.clientX - drag.x) * (side === 'left' ? 1 : -1)); };
        function finish() { if (!drag) return; drag = null; document.body.classList.remove('resizing-panels'); save(); }
        handle.onpointerup = event => { finish(); if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); };
        handle.onpointercancel = finish;
        handle.onlostpointercapture = finish;
        handle.onkeydown = event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const [min, max] = limits(side);
            resize(event.key === 'Home' ? min : event.key === 'End' ? max : panel.offsetWidth + (event.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 10));
            save();
        };
        handle.ondblclick = () => { widths[side] = side === 'left' ? 252 : null; render(); save(); };
    }
    window.addEventListener('resize', render);
    document.addEventListener('app-language-change', render);
    render();
    return {setEvidenceOpen};
})();

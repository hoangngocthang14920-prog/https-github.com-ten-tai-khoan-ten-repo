// STATE MANAGEMENT & INITIAL SEED DATA
const MOCK_CONTRACTS = [];


// APPLICATION STATE
let state = {
    contracts: [],
    currentTab: 'dashboard',
    selectedYearFolder: 'all',
    selectedContract: null,
    geminiKey: '',
    geminiModel: 'gemini-1.5-flash',
    geminiApiVersion: 'v1beta',
    gasUrl: '',
    uploadedFile: {
        base64: null,
        name: '',
        size: '',
        type: ''
    },
    uploadedFiles: [],
    isProcessingBatch: false,
    isBatchSaving: false,
    activeBatchFileId: null,
    theme: 'dark-theme',
    sortColumn: 'contractId',
    sortDirection: 'asc',
    isSettingsUnlocked: false
};

// CHART INSTANCES
let valueChart = null;
let statusChart = null;

// FOLDER MANAGEMENT STATE
let activeContextMenuFolderId = null;
let folderModalState = {
    mode: 'add',
    parentId: null,
    folderId: null,
    selectedColor: '#6366f1'
};

// APP INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    initSettings();
    initSettingsLock();
    initFolders();
    initFolderEvents();
    populateFolderDropdowns();
    initContracts();
    initTheme();
    initTabEvents();
    initUploadEvents();
    initFilterEvents();
    initModalEvents();
    initLucide();
    
    // Initial Render
    renderCurrentTab();
});

function initLucide() {
    lucide.createIcons();
}

// 1. SETTINGS & LOCAL STORAGE
function initSettings() {
    state.geminiKey = localStorage.getItem("gemini_key") || "";
    state.geminiModel = localStorage.getItem("gemini_model") || "gemini-1.5-flash";
    state.geminiApiVersion = localStorage.getItem("gemini_api_version") || "v1beta";
    state.gasUrl = localStorage.getItem("gas_url") || "";
    
    document.getElementById("settings-gemini-key").value = state.geminiKey;
    document.getElementById("settings-gas-url").value = state.gasUrl;
    
    const modelDropdown = document.getElementById("settings-gemini-model");
    const customInput = document.getElementById("settings-gemini-model-custom");
    const apiVersionDropdown = document.getElementById("settings-gemini-api-version");
    
    apiVersionDropdown.value = state.geminiApiVersion;
    
    const preDefinedModels = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];
    if (preDefinedModels.includes(state.geminiModel)) {
        modelDropdown.value = state.geminiModel;
        customInput.style.display = "none";
    } else {
        modelDropdown.value = "custom";
        customInput.value = state.geminiModel;
        customInput.style.display = "block";
    }
    
    modelDropdown.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
            customInput.style.display = "block";
        } else {
            customInput.style.display = "none";
        }
    });
    
    updateConnectionIndicators();
}

function initSettingsLock() {
    const passwordInput = document.getElementById("settings-admin-password");
    const unlockBtn = document.getElementById("btn-unlock-settings");
    const lockBtn = document.getElementById("btn-lock-settings");
    const toggleBtn = document.getElementById("btn-toggle-admin-password");
    const errorText = document.getElementById("settings-lock-error");

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener("click", () => {
            const eyeIcon = toggleBtn.querySelector("i");
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                eyeIcon.setAttribute("data-lucide", "eye-off");
            } else {
                passwordInput.type = "password";
                eyeIcon.setAttribute("data-lucide", "eye");
            }
            initLucide();
        });
    }

    const handleUnlock = () => {
        const password = passwordInput.value;
        if (password === "08042006") {
            state.isSettingsUnlocked = true;
            errorText.style.display = "none";
            renderSettingsLockState();
            showToast("Mở khóa cấu hình hệ thống thành công!", "success");
        } else {
            errorText.style.display = "block";
            passwordInput.focus();
            showToast("Mật khẩu không chính xác!", "error");
        }
    };

    if (unlockBtn) {
        unlockBtn.addEventListener("click", handleUnlock);
    }

    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                handleUnlock();
            }
        });
    }

    if (lockBtn) {
        lockBtn.addEventListener("click", () => {
            state.isSettingsUnlocked = false;
            renderSettingsLockState();
            showToast("Đã khóa cấu hình hệ thống!", "info");
        });
    }
}

function renderSettingsLockState() {
    const lockOverlay = document.getElementById("settings-lock-overlay");
    const mainGrid = document.getElementById("settings-main-grid");
    
    if (!lockOverlay || !mainGrid) return;
    
    if (state.isSettingsUnlocked) {
        lockOverlay.style.display = "none";
        mainGrid.style.display = "grid";
    } else {
        lockOverlay.style.display = "flex";
        mainGrid.style.display = "none";
        
        // Clear input and focus
        const passwordInput = document.getElementById("settings-admin-password");
        if (passwordInput) {
            passwordInput.value = "";
            passwordInput.type = "password";
            const eyeIcon = document.querySelector("#btn-toggle-admin-password i");
            if (eyeIcon) eyeIcon.setAttribute("data-lucide", "eye");
            setTimeout(() => passwordInput.focus(), 100);
        }
        document.getElementById("settings-lock-error").style.display = "none";
    }
    initLucide();
}

function initContracts() {
    const savedContracts = localStorage.getItem("contracts");
    if (savedContracts) {
        try {
            const parsed = JSON.parse(savedContracts);
            const mockIds = ["HD-2024-001", "HD-2024-002", "HD-2025-001", "HD-2025-002", "HD-2026-001", "HD-2026-002"];
            state.contracts = parsed
                .filter(c => !mockIds.includes(c.contractId))
                .map(c => ({
                    ...c,
                    contractId: c.contractId ? String(c.contractId) : "",
                    title: c.title ? String(c.title) : "",
                    partner: c.partner ? String(c.partner) : "",
                    summary: c.summary ? String(c.summary) : "",
                    year: c.year ? String(c.year) : ""
                }));
            saveContractsToLocal();
        } catch (e) {
            console.error("Lỗi khi load contracts:", e);
            state.contracts = [];
        }
    } else {
        state.contracts = [...MOCK_CONTRACTS];
        saveContractsToLocal();
    }
}

function saveContractsToLocal() {
    localStorage.setItem("contracts", JSON.stringify(state.contracts));
}

function initFolders() {
    const savedFolders = localStorage.getItem("folders");
    if (savedFolders) {
        state.folders = JSON.parse(savedFolders);
    } else {
        state.folders = [
            { id: '2024', name: 'Năm 2024', color: '#f97316', isSystem: true, parent: null },
            { id: '2025', name: 'Năm 2025', color: '#0ea5e9', isSystem: true, parent: null },
            { id: '2026', name: 'Năm 2026', color: '#a855f7', isSystem: true, parent: null },
            { id: 'Khác', name: 'Khác / Chưa phân loại', color: '#94a3b8', isSystem: true, parent: null }
        ];
        saveFoldersToLocal();
    }
}

function saveFoldersToLocal() {
    localStorage.setItem("folders", JSON.stringify(state.folders));
}

function initFolderEvents() {
    // Add Root Folder button click
    const btnAddFolder = document.getElementById("btn-add-folder");
    if (btnAddFolder) {
        btnAddFolder.onclick = () => {
            openAddFolderModal(null);
        };
    }
    
    // Context Menu item clicks
    const ctxAddSubfolder = document.getElementById("ctx-add-subfolder");
    if (ctxAddSubfolder) {
        ctxAddSubfolder.onclick = () => {
            if (activeContextMenuFolderId) {
                openAddFolderModal(activeContextMenuFolderId);
            }
        };
    }
    
    const ctxRenameFolder = document.getElementById("ctx-rename-folder");
    if (ctxRenameFolder) {
        ctxRenameFolder.onclick = () => {
            if (activeContextMenuFolderId) {
                openRenameFolderModal(activeContextMenuFolderId);
            }
        };
    }
    
    const ctxDeleteFolder = document.getElementById("ctx-delete-folder");
    if (ctxDeleteFolder) {
        ctxDeleteFolder.onclick = () => {
            if (activeContextMenuFolderId) {
                deleteFolder(activeContextMenuFolderId);
            }
        };
    }
    
    // Modal swatches click
    const swatches = document.querySelectorAll("#folder-color-picker .color-swatch");
    swatches.forEach(swatch => {
        swatch.onclick = () => {
            swatches.forEach(s => s.classList.remove("active"));
            swatch.classList.add("active");
            folderModalState.selectedColor = swatch.getAttribute("data-color");
        };
    });
    
    // Modal controls
    const btnCloseFolderModal = document.getElementById("btn-close-folder-modal");
    if (btnCloseFolderModal) {
        btnCloseFolderModal.onclick = () => {
            document.getElementById("folder-modal").classList.remove("active");
        };
    }
    
    const btnCancelFolderModal = document.getElementById("btn-cancel-folder-modal");
    if (btnCancelFolderModal) {
        btnCancelFolderModal.onclick = () => {
            document.getElementById("folder-modal").classList.remove("active");
        };
    }
    
    const btnSaveFolderModal = document.getElementById("btn-save-folder-modal");
    if (btnSaveFolderModal) {
        btnSaveFolderModal.onclick = () => {
            saveFolderModal();
        };
    }
}

function populateFolderDropdowns() {
    const extYearSelect = document.getElementById("ext-year");
    const manYearSelect = document.getElementById("man-year");
    const filterYearSelect = document.getElementById("filter-year-select");
    
    if (!extYearSelect || !manYearSelect || !filterYearSelect) return;
    
    let extOptions = '<option value="">Chọn năm...</option>';
    let manOptions = '';
    let filterOptions = '<option value="all">Tất cả các thư mục</option>';
    
    // System folders
    const systemFolders = state.folders.filter(f => f.isSystem);
    systemFolders.forEach(folder => {
        extOptions += `<option value="${folder.id}">${folder.name}</option>`;
        manOptions += `<option value="${folder.id}">${folder.name}</option>`;
        filterOptions += `<option value="${folder.id}">${folder.name}</option>`;
    });
    
    // Custom folders helper for tree
    const customFolders = state.folders.filter(f => !f.isSystem);
    
    const getDropdownOptionsHtml = (folder, level = 0) => {
        const prefix = '—'.repeat(level) + (level > 0 ? ' ' : '');
        let html = `<option value="${folder.id}">${prefix}${folder.name}</option>`;
        
        const children = customFolders.filter(child => child.parent === folder.id);
        children.forEach(child => {
            html += getDropdownOptionsHtml(child, level + 1);
        });
        return html;
    };
    
    const rootCustom = customFolders.filter(f => !f.parent || !customFolders.some(p => p.id === f.parent));
    rootCustom.forEach(folder => {
        const optHtml = getDropdownOptionsHtml(folder, 0);
        extOptions += optHtml;
        manOptions += optHtml;
        filterOptions += optHtml;
    });
    
    extYearSelect.innerHTML = extOptions;
    manYearSelect.innerHTML = manOptions;
    filterYearSelect.innerHTML = filterOptions;
}

function renderFolderList() {
    const container = document.getElementById("folder-list-container");
    if (!container) return;

    let html = '';

    // Render "Tất cả các năm"
    const allActive = state.selectedYearFolder === 'all' ? 'active' : '';
    html += `
        <div class="folder-item ${allActive}" data-year-folder="all">
            <div class="folder-icon icon-all">
                <i data-lucide="folder-open"></i>
            </div>
            <div class="folder-meta">
                <span class="folder-name">Tất cả các năm</span>
                <span class="folder-count">${state.contracts.length} hồ sơ</span>
            </div>
        </div>
    `;

    // Render system folders
    const systemFolders = state.folders.filter(f => f.isSystem);
    systemFolders.forEach(folder => {
        const active = state.selectedYearFolder === folder.id ? 'active' : '';
        const count = state.contracts.filter(c => c.year === folder.id).length;
        
        let iconClass = 'icon-other';
        if (folder.id === '2024') iconClass = 'icon-2024';
        if (folder.id === '2025') iconClass = 'icon-2025';
        if (folder.id === '2026') iconClass = 'icon-2026';

        html += `
            <div class="folder-item ${active}" data-year-folder="${folder.id}">
                <div class="folder-icon ${iconClass}">
                    <i data-lucide="folder"></i>
                </div>
                <div class="folder-meta">
                    <span class="folder-name">${folder.name}</span>
                    <span class="folder-count">${count} hồ sơ</span>
                </div>
            </div>
        `;
    });

    // Render custom folders
    const customFolders = state.folders.filter(f => !f.isSystem);
    if (customFolders.length > 0) {
        html += `
            <div class="folder-divider"></div>
            <div class="folder-divider-label">Thư mục tùy chỉnh</div>
        `;

        // Helper function to render a folder and its subfolders recursively
        const renderCustomFolderNode = (folder, level = 0) => {
            const active = state.selectedYearFolder === folder.id ? 'active' : '';
            const count = state.contracts.filter(c => c.year === folder.id).length;
            
            const paddingStyle = level > 0 ? `style="padding-left: ${14 + level * 20}px;"` : '';
            const subfolderClass = level > 0 ? 'subfolder' : '';

            let subHtml = `
                <div class="folder-item ${active} ${subfolderClass}" data-year-folder="${folder.id}" ${paddingStyle}>
                    <div class="folder-color-dot" style="color: ${folder.color}; background-color: ${folder.color}; margin-right: 4px;"></div>
                    <div class="folder-meta">
                        <span class="folder-name">${folder.name}</span>
                        <span class="folder-count">${count} hồ sơ</span>
                    </div>
                    <button class="folder-actions-btn" data-folder-id="${folder.id}" title="Thao tác thư mục">
                        <i data-lucide="more-vertical"></i>
                    </button>
                </div>
            `;

            // Find children
            const children = customFolders.filter(child => child.parent === folder.id);
            children.forEach(child => {
                subHtml += renderCustomFolderNode(child, level + 1);
            });

            return subHtml;
        };

        const rootCustomFolders = customFolders.filter(f => !f.parent || !customFolders.some(p => p.id === f.parent));
        rootCustomFolders.forEach(folder => {
            html += renderCustomFolderNode(folder, 0);
        });
    }

    container.innerHTML = html;
    initLucide();
    
    // Attach click handlers to folders
    const folderElements = container.querySelectorAll(".folder-item");
    folderElements.forEach(el => {
        el.onclick = (e) => {
            if (e.target.closest(".folder-actions-btn")) return;

            folderElements.forEach(f => f.classList.remove("active"));
            el.classList.add("active");
            state.selectedYearFolder = el.getAttribute("data-year-folder");
            renderFolderContents();
        };
    });

    // Attach click handlers to folder actions buttons
    const actionBtns = container.querySelectorAll(".folder-actions-btn");
    actionBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const folderId = btn.getAttribute("data-folder-id");
            showFolderContextMenu(e, folderId);
        };
    });

    // Enable right click on custom folders
    const customFolderItems = container.querySelectorAll(".folder-item:not([data-year-folder='all']):not([data-year-folder='2024']):not([data-year-folder='2025']):not([data-year-folder='2026']):not([data-year-folder='Khác'])");
    customFolderItems.forEach(item => {
        item.oncontextmenu = (e) => {
            e.preventDefault();
            const folderId = item.getAttribute("data-year-folder");
            showFolderContextMenu(e, folderId);
        };
    });
}

function showFolderContextMenu(e, folderId) {
    const menu = document.getElementById("folder-context-menu");
    if (!menu) return;
    
    activeContextMenuFolderId = folderId;
    
    menu.style.display = "block";
    menu.classList.add("active");
    
    const x = e.clientX;
    const y = e.clientY;
    
    const menuWidth = menu.offsetWidth || 200;
    const menuHeight = menu.offsetHeight || 150;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    if (x + menuWidth > windowWidth) {
        left = windowWidth - menuWidth - 10;
    }
    if (y + menuHeight > windowHeight) {
        top = windowHeight - menuHeight - 10;
    }
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    
    const closeMenu = () => {
        menu.style.display = "none";
        menu.classList.remove("active");
        document.removeEventListener("click", closeMenu);
    };
    
    setTimeout(() => {
        document.addEventListener("click", closeMenu);
    }, 50);
}

function openAddFolderModal(parentId = null) {
    folderModalState.mode = 'add';
    folderModalState.parentId = parentId;
    folderModalState.folderId = null;
    
    const modal = document.getElementById("folder-modal");
    const titleEl = document.getElementById("folder-modal-title");
    const nameInput = document.getElementById("folder-modal-name");
    const parentGroup = document.getElementById("folder-modal-parent-group");
    const parentNameInput = document.getElementById("folder-modal-parent-name");
    
    titleEl.textContent = parentId ? "Thêm thư mục con" : "Thêm thư mục mới";
    nameInput.value = "";
    
    if (parentId) {
        parentGroup.style.display = "block";
        const parentFolder = state.folders.find(f => f.id === parentId);
        parentNameInput.value = parentFolder ? parentFolder.name : "";
    } else {
        parentGroup.style.display = "none";
    }
    
    const swatches = document.querySelectorAll("#folder-color-picker .color-swatch");
    swatches.forEach(s => {
        if (s.getAttribute("data-color") === "#6366f1") {
            s.classList.add("active");
            folderModalState.selectedColor = "#6366f1";
        } else {
            s.classList.remove("active");
        }
    });
    
    modal.classList.add("active");
}

function openRenameFolderModal(folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    folderModalState.mode = 'rename';
    folderModalState.parentId = folder.parent;
    folderModalState.folderId = folderId;
    
    const modal = document.getElementById("folder-modal");
    const titleEl = document.getElementById("folder-modal-title");
    const nameInput = document.getElementById("folder-modal-name");
    const parentGroup = document.getElementById("folder-modal-parent-group");
    
    titleEl.textContent = "Chỉnh sửa thư mục";
    nameInput.value = folder.name;
    parentGroup.style.display = "none";
    
    const swatches = document.querySelectorAll("#folder-color-picker .color-swatch");
    swatches.forEach(s => {
        if (s.getAttribute("data-color") === folder.color) {
            s.classList.add("active");
            folderModalState.selectedColor = folder.color;
        } else {
            s.classList.remove("active");
        }
    });
    
    modal.classList.add("active");
}

function saveFolderModal() {
    const nameInput = document.getElementById("folder-modal-name");
    const name = nameInput.value.trim();
    if (!name) {
        showToast("Vui lòng nhập tên thư mục!", "error");
        return;
    }
    
    if (folderModalState.mode === 'add') {
        const newFolder = {
            id: 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            color: folderModalState.selectedColor,
            isSystem: false,
            parent: folderModalState.parentId
        };
        state.folders.push(newFolder);
        showToast(`Đã tạo thư mục "${name}"!`, "success");
    } else if (folderModalState.mode === 'rename') {
        const folder = state.folders.find(f => f.id === folderModalState.folderId);
        if (folder) {
            const oldName = folder.name;
            folder.name = name;
            folder.color = folderModalState.selectedColor;
            showToast(`Đã đổi tên thư mục "${oldName}" thành "${name}"!`, "success");
        }
    }
    
    saveFoldersToLocal();
    document.getElementById("folder-modal").classList.remove("active");
    
    renderFolderList();
    populateFolderDropdowns();
    renderFolderContents();
}

function deleteFolder(folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (folder.isSystem) {
        showToast("Không thể xóa thư mục hệ thống!", "error");
        return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa thư mục "${folder.name}"? Tất cả thư mục con cũng sẽ bị xóa. Các hợp đồng thuộc thư mục này sẽ được chuyển về "Chưa phân loại".`)) {
        const getDescendantFolderIds = (id) => {
            let ids = [id];
            const children = state.folders.filter(f => f.parent === id);
            children.forEach(child => {
                ids = ids.concat(getDescendantFolderIds(child.id));
            });
            return ids;
        };
        
        const folderIdsToDelete = getDescendantFolderIds(folderId);
        
        state.folders = state.folders.filter(f => !folderIdsToDelete.includes(f.id));
        
        state.contracts.forEach(c => {
            if (folderIdsToDelete.includes(c.year)) {
                c.year = 'Khác';
            }
        });
        
        saveFoldersToLocal();
        saveContractsToLocal();
        
        if (folderIdsToDelete.includes(state.selectedYearFolder)) {
            state.selectedYearFolder = 'all';
        }
        
        showToast(`Đã xóa thư mục "${folder.name}"!`, "info");
        
        renderFolderList();
        populateFolderDropdowns();
        renderFolderContents();
    }
}

// 2. THEME CONTROLLER
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark-theme";
    state.theme = savedTheme;
    document.body.className = savedTheme;
    
    const themeBtn = document.getElementById("theme-toggle-btn");
    const themeIcon = themeBtn.querySelector("i");
    
    if (savedTheme === 'light-theme') {
        themeBtn.innerHTML = '<i data-lucide="moon"></i>';
    } else {
        themeBtn.innerHTML = '<i data-lucide="sun"></i>';
    }
    initLucide();
    
    themeBtn.addEventListener("click", () => {
        if (state.theme === 'dark-theme') {
            state.theme = 'light-theme';
            themeBtn.innerHTML = '<i data-lucide="moon"></i>';
        } else {
            state.theme = 'dark-theme';
            themeBtn.innerHTML = '<i data-lucide="sun"></i>';
        }
        document.body.className = state.theme;
        localStorage.setItem("theme", state.theme);
        initLucide();
        
        // Redraw charts on theme change for appropriate colors
        if (state.currentTab === 'dashboard') {
            renderDashboardCharts();
        }
    });
}

// 3. TAB CONTROLLER
function initTabEvents() {
    const menuItems = document.querySelectorAll(".sidebar-menu li");
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
        });
    });
    
    // Quick upload button in topbar
    document.getElementById("btn-quick-upload").addEventListener("click", () => {
        openManualModal();
    });
}

function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Update Sidebar Active state
    document.querySelectorAll(".sidebar-menu li").forEach(li => {
        if (li.getAttribute("data-tab") === tabId) {
            li.classList.add("active");
        } else {
            li.classList.remove("active");
        }
    });
    
    // Update Tab Viewport
    document.querySelectorAll(".tab-content").forEach(tab => {
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });
    
    // Page Title updates
    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");
    
    switch (tabId) {
        case 'dashboard':
            titleEl.textContent = "Tổng quan hệ thống";
            subtitleEl.textContent = "Thống kê và báo cáo hồ sơ hợp đồng qua các năm";
            break;
        case 'ai-scanner':
            titleEl.textContent = "Số hóa & Phân loại AI";
            subtitleEl.textContent = "Tải lên hợp đồng scan để AI tự động trích xuất dữ liệu và phân loại ổ năm";
            break;
        case 'year-explorer':
            titleEl.textContent = "Kho lưu trữ theo Năm";
            subtitleEl.textContent = "Duyệt hồ sơ hợp đồng lưu trữ trong các ổ đĩa của năm tương ứng";
            break;
        case 'contracts-list':
            titleEl.textContent = "Bảng dữ liệu đồng bộ";
            subtitleEl.textContent = "Danh sách chi tiết toàn bộ hồ sơ hợp đồng công ty trên Google Sheets";
            break;
        case 'settings':
            titleEl.textContent = "Cấu hình hệ thống";
            subtitleEl.textContent = "Kết nối Gemini API và đồng bộ tài khoản Google Drive & Sheets";
            break;
    }
    
    renderCurrentTab();
}

function renderCurrentTab() {
    // Topbar Expiry warnings badge refresh
    updateExpiryWarnings();
    
    switch (state.currentTab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'ai-scanner':
            // Reset upload if no file is present
            if (!state.uploadedFile.base64) {
                resetUploadZone();
            }
            break;
        case 'year-explorer':
            renderYearExplorer();
            break;
        case 'contracts-list':
            renderContractsTable();
            break;
        case 'settings':
            renderSettingsLockState();
            break;
    }
}

// 4. CONNECTION INDICATORS & NOTIFICATIONS
function updateConnectionIndicators() {
    const googleInd = document.querySelector("#google-status .status-indicator");
    const googleLbl = document.querySelector("#google-status .status-label");
    
    if (state.gasUrl) {
        googleInd.className = "status-indicator online";
        googleLbl.textContent = "Google Sheet: Sẵn sàng";
    } else {
        googleInd.className = "status-indicator offline";
        googleLbl.textContent = "Google Sheet: Chưa kết nối";
    }
    
    const geminiInd = document.querySelector("#gemini-status .status-indicator");
    const geminiLbl = document.querySelector("#gemini-status .status-label");
    const keyWarning = document.getElementById("gemini-key-missing-warning");
    
    if (state.geminiKey) {
        geminiInd.className = "status-indicator online";
        geminiLbl.textContent = "Gemini AI: Kết nối live";
        if (keyWarning) keyWarning.style.display = "none";
    } else {
        geminiInd.className = "status-indicator warn";
        geminiLbl.textContent = "Gemini AI: Giả lập";
        if (keyWarning) keyWarning.style.display = "flex";
    }
}

function updateExpiryWarnings() {
    const today = new Date("2026-07-01"); // Simulate relative to current timestamp
    const warningDaysLimit = 30;
    
    const expiringContracts = state.contracts.filter(c => {
        if (!c.expiryDate) return false;
        const expiry = new Date(c.expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= warningDaysLimit;
    });
    
    const bellBadge = document.querySelector(".bell-badge");
    const dropdownList = document.getElementById("expiry-alert-list");
    
    if (expiringContracts.length > 0) {
        bellBadge.style.display = "flex";
        bellBadge.textContent = expiringContracts.length;
        
        dropdownList.innerHTML = expiringContracts.map(c => {
            const expiry = new Date(c.expiryDate);
            const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            return `
                <div class="dropdown-item" onclick="openContractDetail('${c.contractId}')">
                    <span class="dropdown-item-title">${c.title}</span>
                    <div class="dropdown-item-meta">
                        <span>Đ.Tác: ${c.partner}</span>
                        <span class="text-warning">Còn ${diffDays} ngày</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        bellBadge.style.display = "none";
        dropdownList.innerHTML = `<div class="dropdown-empty">Không có hợp đồng nào sắp hết hạn</div>`;
    }
    
    // Toggle dropdown on bell click
    const bell = document.getElementById("expiry-alert-bell");
    const dropdown = document.getElementById("expiry-dropdown");
    
    // Clear previous listener to avoid stack
    bell.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
    };
    
    document.addEventListener("click", () => {
        dropdown.classList.remove("active");
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "check-circle";
    if (type === 'error') icon = "alert-triangle";
    if (type === 'info') icon = "info";
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    initLucide();
    
    setTimeout(() => {
        toast.style.animation = "toastIn 0.3s reverse forwards";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// 5. TAB 1: DASHBOARD LAYOUT & CHARTS
function renderDashboard() {
    const totalCount = state.contracts.length;
    let totalValue = 0;
    let activeCount = 0;
    let warningCount = 0;
    
    const today = new Date("2026-07-01"); // Simulate relative to current timestamp
    
    // Year folder counts
    let count2024 = 0;
    let count2025 = 0;
    let count2026 = 0;
    
    state.contracts.forEach(c => {
        totalValue += Number(c.value) || 0;
        
        // Year categorisation
        if (c.year === "2024") count2024++;
        else if (c.year === "2025") count2025++;
        else if (c.year === "2026") count2026++;
        
        // Status tracking
        const expDate = c.expiryDate ? new Date(c.expiryDate) : null;
        const signDate = c.signDate ? new Date(c.signDate) : null;
        
        if (expDate) {
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                // Expired
            } else if (diffDays <= 30) {
                warningCount++;
                activeCount++;
            } else {
                activeCount++;
            }
        } else {
            activeCount++; // assume active if no expiry
        }
    });
    
    // Update elements
    document.getElementById("stat-total-contracts").textContent = totalCount;
    document.getElementById("stat-total-value").textContent = formatCurrency(totalValue);
    document.getElementById("stat-active-contracts").textContent = activeCount;
    document.getElementById("stat-warning-contracts").textContent = warningCount;
    
    const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
    document.getElementById("stat-active-percent").textContent = `${activePercent}% tổng số hợp đồng`;
    
    // Quick folders counts
    document.getElementById("count-year-2024").textContent = `${count2024} hợp đồng`;
    document.getElementById("count-year-2025").textContent = `${count2025} hợp đồng`;
    document.getElementById("count-year-2026").textContent = `${count2026} hợp đồng`;
    
    // Render recent contracts table
    const recentTbody = document.getElementById("recent-contracts-tbody");
    const sortedByDate = [...state.contracts].sort((a, b) => new Date(b.signDate || 0) - new Date(a.signDate || 0));
    const recents = sortedByDate.slice(0, 4);
    
    if (recents.length > 0) {
        recentTbody.innerHTML = recents.map(c => {
            const statusInfo = getContractStatus(c);
            const folder = state.folders.find(f => f.id === c.year);
            const folderName = folder ? folder.name : c.year;
            const folderColor = folder ? folder.color : '#94a3b8';
            
            return `
                <tr style="cursor: pointer;" onclick="openContractDetail('${c.contractId}')">
                    <td class="cell-code">${c.contractId}</td>
                    <td class="cell-title">${c.title}</td>
                    <td class="cell-partner"><span class="folder-badge" style="background-color: ${folderColor}; color: #ffffff;">${folderName}</span></td>
                    <td class="cell-value">${formatCurrency(c.value)}</td>
                    <td><span class="doc-status ${statusInfo.class}">${statusInfo.label}</span></td>
                </tr>
            `;
        }).join('');
    } else {
        recentTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Không có hợp đồng nào</td></tr>`;
    }
    
    renderDashboardCharts();
}

function renderDashboardCharts() {
    // 1. Calculate values by Year (including custom folders consolidated into "Khác")
    const yearValues = { "2024": 0, "2025": 0, "2026": 0, "Khác": 0 };
    state.contracts.forEach(c => {
        if (yearValues[c.year] !== undefined) {
            yearValues[c.year] += (Number(c.value) || 0) / 1000000; // in Millions VND
        } else {
            yearValues["Khác"] += (Number(c.value) || 0) / 1000000;
        }
    });
    
    // 2. Calculate status ratios
    let active = 0;
    let expired = 0;
    let warning = 0;
    const today = new Date("2026-07-01");
    
    state.contracts.forEach(c => {
        const status = getContractStatus(c);
        if (status.class === "status-active") active++;
        else if (status.class === "status-expired") expired++;
        else if (status.class === "status-warn") warning++;
    });
    
    // CSS properties colors extraction helper
    const getCssVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();
    
    const colorAccent = getCssVar('--color-accent') || '#6366f1';
    const colorPurple = getCssVar('--color-purple') || '#a855f7';
    const colorBlue = getCssVar('--color-blue') || '#0ea5e9';
    const colorEmerald = getCssVar('--color-emerald') || '#10b981';
    const colorOrange = getCssVar('--color-orange') || '#f97316';
    const colorDanger = getCssVar('--color-danger') || '#ef4444';
    const colorGray = getCssVar('--text-muted') || '#94a3b8';
    const textColor = getCssVar('--text-primary') || '#f1f5f9';
    
    // Render Bar Chart: Value by Year
    if (valueChart) valueChart.destroy();
    
    const valueCtx = document.getElementById("chart-value-by-year").getContext("2d");
    valueChart = new Chart(valueCtx, {
        type: 'bar',
        data: {
            labels: ['Năm 2024', 'Năm 2025', 'Năm 2026', 'Thư mục khác'],
            datasets: [{
                label: 'Giá trị hợp đồng (Triệu VND)',
                data: [yearValues["2024"], yearValues["2025"], yearValues["2026"], yearValues["Khác"]],
                backgroundColor: [colorOrange, colorBlue, colorPurple, colorGray],
                borderRadius: 8,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Giá trị: ${context.raw.toLocaleString()} Tr. VND`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
    
    // Render Doughnut Chart: Status
    if (statusChart) statusChart.destroy();
    
    const statusCtx = document.getElementById("chart-status-distribution").getContext("2d");
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Đang hiệu lực', 'Sắp hết hạn', 'Hết hiệu lực'],
            datasets: [{
                data: [active, warning, expired],
                backgroundColor: [colorEmerald, colorOrange, colorDanger],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 16,
                        font: { size: 12 }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Helper: Get status metadata
function getContractStatus(contract) {
    if (!contract.expiryDate) {
        return { label: "Đang hiệu lực", class: "status-active" };
    }
    const today = new Date("2026-07-01");
    const expiry = new Date(contract.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { label: "Hết hiệu lực", class: "status-expired" };
    } else if (diffDays <= 30) {
        return { label: "Sắp hết hạn", class: "status-warn" };
    } else {
        return { label: "Đang hiệu lực", class: "status-active" };
    }
}

// 6. TAB 2: UPLOAD & AI OCR EXTRACTOR
// 6. TAB 2: UPLOAD & AI OCR EXTRACTOR
function initUploadEvents() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const removeBtn = document.getElementById("btn-remove-file");
    const startScanBtn = document.getElementById("btn-start-scan");
    const startBatchBtn = document.getElementById("btn-start-batch-scan");
    const clearBatchBtn = document.getElementById("btn-clear-batch");
    
    // Click drop zone triggers file selector
    dropZone.addEventListener("click", () => {
        if (!state.isProcessingBatch) fileInput.click();
    });
    
    // File drag & drop states
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            if (!state.isProcessingBatch) dropZone.classList.add("dragover");
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
        }, false);
    });
    
    dropZone.addEventListener("drop", (e) => {
        if (state.isProcessingBatch) return;
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleMultipleFiles(files);
        }
    });
    
    fileInput.addEventListener("change", (e) => {
        if (state.isProcessingBatch) return;
        if (e.target.files.length > 0) {
            handleMultipleFiles(e.target.files);
        }
    });
    
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.isProcessingBatch) return;
        if (state.activeBatchFileId) {
            removeFileFromBatch(state.activeBatchFileId);
        }
    });
    
    startScanBtn.addEventListener("click", () => {
        if (state.isProcessingBatch) return;
        triggerSingleAIScan();
    });
    
    startBatchBtn.addEventListener("click", () => {
        startBatchScanning();
    });
    
    clearBatchBtn.addEventListener("click", () => {
        if (state.isProcessingBatch) return;
        clearBatchQueue();
    });
    
    // Extracted Form Submit
    document.getElementById("ai-extraction-form").addEventListener("submit", (e) => {
        e.preventDefault();
        saveExtractedContract();
    });
    
    // Batch Save Events
    document.getElementById("batch-select-all-checkbox").addEventListener("change", (e) => {
        toggleBatchSaveSelectAll(e.target.checked);
    });
    
    document.getElementById("btn-batch-save").addEventListener("click", () => {
        startBatchSaving();
    });
}

async function handleMultipleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        const isValidType = file.type.startsWith("image/") || file.type === "application/pdf";
        if (!isValidType) {
            showToast(`Tệp "${file.name}" không đúng định dạng hỗ trợ (PDF hoặc Ảnh)!`, "error");
        }
        return isValidType;
    });
    
    if (validFiles.length === 0) return;
    
    let filesToProcess = validFiles;
    if (state.uploadedFiles.length + validFiles.length > 100) {
        const allowedCount = 100 - state.uploadedFiles.length;
        if (allowedCount <= 0) {
            showToast("Hàng đợi đã đầy (tối đa 100 tệp tin cùng lúc). Vui lòng xóa bớt hoặc quét hàng đợi trước khi thêm!", "error");
            return;
        }
        showToast(`Hàng đợi chỉ hỗ trợ tối đa 100 tệp tin. Sẽ chỉ tải lên thêm ${allowedCount} tệp đầu tiên.`, "warning");
        filesToProcess = validFiles.slice(0, allowedCount);
    }
    
    showToast(`Đang tải và xử lý ${filesToProcess.length} tệp tin...`, "info");
    
    for (let file of filesToProcess) {
        try {
            const base64Data = await readFileAsBase64(file);
            const fileItem = {
                id: 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: formatBytes(file.size),
                type: file.type,
                base64: base64Data,
                status: 'pending',
                errorMsg: '',
                extractedData: null
            };
            state.uploadedFiles.push(fileItem);
        } catch (err) {
            console.error(err);
            showToast(`Lỗi đọc tệp "${file.name}": ${err.message}`, "error");
        }
    }
    
    // Auto-select the first file if none is active
    if (!state.activeBatchFileId && state.uploadedFiles.length > 0) {
        selectBatchFile(state.uploadedFiles[0].id);
    } else {
        renderBatchQueue();
    }
    
    // Reset file input
    document.getElementById("file-input").value = "";
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result.split(',')[1]);
        };
        reader.onerror = (e) => reject(new Error("Không thể đọc tệp"));
        reader.readAsDataURL(file);
    });
}

function renderBatchQueue() {
    const dropZone = document.getElementById("drop-zone");
    const batchContainer = document.getElementById("batch-queue-container");
    const previewCard = document.getElementById("file-preview-card");
    const fileListEl = document.getElementById("batch-file-list");
    
    if (state.uploadedFiles.length === 0) {
        dropZone.style.display = "flex";
        batchContainer.style.display = "none";
        previewCard.style.display = "none";
        document.getElementById("ai-console-card").style.display = "none";
        document.getElementById("scanning-bar").style.display = "none";
        document.getElementById("ai-extraction-form").reset();
        document.getElementById("btn-save-extracted").disabled = true;
        document.getElementById("scan-status-badge").textContent = "Chờ tải file";
        document.getElementById("scan-status-badge").className = "badge badge-accent";
        state.activeBatchFileId = null;
        return;
    }
    
    dropZone.style.display = "none";
    batchContainer.style.display = "block";
    
    // Update batch counts
    document.getElementById("batch-count").textContent = state.uploadedFiles.length;
    
    // Update progress bar
    const completedCount = state.uploadedFiles.filter(f => f.status === 'success' || f.status === 'error').length;
    const progressPercent = Math.round((completedCount / state.uploadedFiles.length) * 100);
    document.getElementById("batch-progress-fill").style.width = `${progressPercent}%`;
    
    if (state.isProcessingBatch) {
        document.getElementById("batch-progress-text").textContent = `Đang quét: ${completedCount} / ${state.uploadedFiles.length} tệp (${progressPercent}%)`;
    } else {
        document.getElementById("batch-progress-text").textContent = completedCount === state.uploadedFiles.length ? 
            `Hoàn tất quét hàng loạt (${completedCount} tệp)` : `Đã chờ quét: ${state.uploadedFiles.length - completedCount} tệp`;
    }
    
    // Populate file list
    fileListEl.innerHTML = state.uploadedFiles.map(file => {
        const isActive = file.id === state.activeBatchFileId ? 'active' : '';
        const isPdf = file.type === "application/pdf";
        const iconName = isPdf ? 'file-text' : 'image';
        const iconColor = isPdf ? '#ef4444' : '#38bdf8';
        
        let statusBadge = '';
        if (file.status === 'pending') {
            statusBadge = '<span class="batch-status-badge badge-pending">Chờ quét</span>';
        } else if (file.status === 'processing') {
            statusBadge = '<span class="batch-status-badge badge-processing"><i class="step-spinner" style="display:inline-block; width:10px; height:10px; margin-right:4px; border-width: 1.5px;"></i>Quét...</span>';
        } else if (file.status === 'success') {
            statusBadge = '<span class="batch-status-badge badge-success">Xong</span>';
        } else if (file.status === 'error') {
            statusBadge = `<span class="batch-status-badge badge-error" title="${file.errorMsg || 'Lỗi quét'}">Lỗi</span>`;
        }
        
        return `
            <div class="batch-file-item ${isActive}" onclick="if(!state.isProcessingBatch) selectBatchFile('${file.id}')">
                <div class="batch-file-left">
                    <div class="batch-item-icon" style="color: ${iconColor};">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <div class="batch-item-meta">
                        <div class="batch-item-name" title="${file.name}">${file.name}</div>
                        <div class="batch-item-size">${file.size}</div>
                    </div>
                </div>
                <div class="batch-file-right">
                    ${statusBadge}
                    ${!state.isProcessingBatch ? 
                        `<button class="btn-item-remove" onclick="event.stopPropagation(); removeFileFromBatch('${file.id}')" title="Xóa khỏi danh sách">
                            <i data-lucide="trash-2"></i>
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    }).join('');
    
    initLucide();
}

function selectBatchFile(fileId) {
    state.activeBatchFileId = fileId;
    const fileItem = state.uploadedFiles.find(f => f.id === fileId);
    if (!fileItem) return;
    
    // Copy to legacy file object so current functions can reference it
    state.uploadedFile = {
        base64: fileItem.base64,
        name: fileItem.name,
        size: fileItem.size,
        type: fileItem.type
    };
    
    // Render the file preview card on top
    const previewCard = document.getElementById("file-preview-card");
    previewCard.style.display = "block";
    document.getElementById("preview-file-name").textContent = fileItem.name;
    document.getElementById("preview-file-size").textContent = fileItem.size;
    
    const fileIcon = document.getElementById("file-preview-icon");
    if (fileItem.type === "application/pdf") {
        fileIcon.innerHTML = '<i data-lucide="file-text"></i>';
        fileIcon.style.color = '#ef4444';
    } else {
        fileIcon.innerHTML = '<i data-lucide="image"></i>';
        fileIcon.style.color = '#38bdf8';
    }
    
    // Setup actions
    const startScanBtn = document.getElementById("btn-start-scan");
    if (fileItem.status === 'success') {
        fillExtractedForm(fileItem.extractedData);
        document.getElementById("btn-save-extracted").disabled = false;
        document.getElementById("scan-status-badge").textContent = "Hoàn tất";
        document.getElementById("scan-status-badge").className = "badge badge-emerald";
        startScanBtn.style.display = "none";
    } else if (fileItem.status === 'processing') {
        document.getElementById("ai-extraction-form").reset();
        document.getElementById("btn-save-extracted").disabled = true;
        document.getElementById("scan-status-badge").textContent = "Đang xử lý...";
        document.getElementById("scan-status-badge").className = "badge badge-accent";
        startScanBtn.style.display = "none";
    } else if (fileItem.status === 'error') {
        document.getElementById("ai-extraction-form").reset();
        document.getElementById("btn-save-extracted").disabled = true;
        document.getElementById("scan-status-badge").textContent = "Lỗi trích xuất";
        document.getElementById("scan-status-badge").className = "badge badge-accent";
        startScanBtn.style.display = "block";
        startScanBtn.innerHTML = '<i data-lucide="refresh-cw"></i> Thử quét lại';
    } else {
        // Pending
        document.getElementById("ai-extraction-form").reset();
        document.getElementById("btn-save-extracted").disabled = true;
        document.getElementById("scan-status-badge").textContent = "Chờ quét";
        document.getElementById("scan-status-badge").className = "badge badge-accent";
        startScanBtn.style.display = "block";
        startScanBtn.innerHTML = '<i data-lucide="cpu"></i> Trích xuất & Phân loại bằng AI';
    }
    
    renderBatchQueue();
    renderBatchSaveSection();
}

function removeFileFromBatch(fileId) {
    const index = state.uploadedFiles.findIndex(f => f.id === fileId);
    if (index > -1) {
        state.uploadedFiles.splice(index, 1);
        if (state.activeBatchFileId === fileId) {
            state.activeBatchFileId = state.uploadedFiles.length > 0 ? state.uploadedFiles[0].id : null;
        }
        
        if (state.activeBatchFileId) {
            selectBatchFile(state.activeBatchFileId);
        } else {
            renderBatchQueue();
        }
    }
}

function clearBatchQueue() {
    state.uploadedFiles = [];
    state.activeBatchFileId = null;
    state.uploadedFile = { base64: null, name: '', size: '', type: '' };
    renderBatchQueue();
}

function resetUploadZone() {
    clearBatchQueue();
}

// Single manual scan
async function triggerSingleAIScan() {
    const fileItem = state.uploadedFiles.find(f => f.id === state.activeBatchFileId);
    if (!fileItem) return;
    
    const startScanBtn = document.getElementById("btn-start-scan");
    const consoleCard = document.getElementById("ai-console-card");
    const scanningBar = document.getElementById("scanning-bar");
    
    startScanBtn.disabled = true;
    consoleCard.style.display = "block";
    scanningBar.style.display = "block";
    document.getElementById("scan-status-badge").textContent = "Đang xử lý...";
    document.getElementById("scan-status-badge").className = "badge badge-accent";
    
    setConsoleStep(1, 'active');
    setConsoleStep(2, 'pending');
    setConsoleStep(3, 'pending');
    
    try {
        fileItem.status = 'processing';
        renderBatchQueue();
        
        let extractedData = null;
        if (state.geminiKey) {
            extractedData = await callGeminiAPI();
        } else {
            extractedData = await callMockAIService();
        }
        
        fileItem.status = 'success';
        fileItem.extractedData = extractedData;
        
        setTimeout(() => {
            scanningBar.style.display = "none";
            fillExtractedForm(extractedData);
            document.getElementById("btn-save-extracted").disabled = false;
            document.getElementById("scan-status-badge").textContent = "Hoàn tất";
            document.getElementById("scan-status-badge").className = "badge badge-emerald";
            startScanBtn.style.display = "none";
            renderBatchQueue();
            renderBatchSaveSection();
            showToast("AI đã trích xuất dữ liệu thành công! Hãy kiểm tra lại và nhấn Lưu.", "success");
        }, 1000);
        
    } catch (error) {
        fileItem.status = 'error';
        fileItem.errorMsg = error.message;
        
        scanningBar.style.display = "none";
        document.getElementById("scan-status-badge").textContent = "Lỗi trích xuất";
        document.getElementById("scan-status-badge").className = "badge badge-accent";
        showToast("Lỗi xử lý AI: " + error.message, "error");
        startScanBtn.disabled = false;
        renderBatchQueue();
    }
}

// Sequential Batch scanning loop
async function startBatchScanning() {
    if (state.isProcessingBatch) return;
    
    const pendingFiles = state.uploadedFiles.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) {
        showToast("Không có tệp nào ở trạng thái chờ quét trong hàng đợi!", "info");
        return;
    }
    
    state.isProcessingBatch = true;
    
    // Disable form fields and main buttons
    document.getElementById("btn-start-batch-scan").disabled = true;
    document.getElementById("btn-clear-batch").disabled = true;
    document.getElementById("btn-start-scan").style.display = "none";
    document.getElementById("btn-save-extracted").disabled = true;
    
    const consoleCard = document.getElementById("ai-console-card");
    const scanningBar = document.getElementById("scanning-bar");
    consoleCard.style.display = "block";
    scanningBar.style.display = "block";
    
    showToast(`Bắt đầu quét hàng loạt ${pendingFiles.length} tệp tin...`, "info");
    
    let processedCount = 0;
    let successCount = 0;
    
    for (let fileItem of state.uploadedFiles) {
        if (fileItem.status !== 'pending' && fileItem.status !== 'error') {
            continue; // Skip already succeeded files
        }
        
        selectBatchFile(fileItem.id);
        fileItem.status = 'processing';
        renderBatchQueue();
        
        setConsoleStep(1, 'active');
        setConsoleStep(2, 'pending');
        setConsoleStep(3, 'pending');
        
        try {
            let extractedData = null;
            if (state.geminiKey) {
                extractedData = await callGeminiAPI();
            } else {
                extractedData = await callMockAIService();
            }
            
            fileItem.status = 'success';
            fileItem.extractedData = extractedData;
            successCount++;
        } catch (err) {
            console.error("Batch file processing error:", err);
            fileItem.status = 'error';
            fileItem.errorMsg = err.message;
        }
        
        processedCount++;
        renderBatchQueue();
        await delay(1500); // 1.5 seconds delay for a smooth experience
    }
    
    state.isProcessingBatch = false;
    scanningBar.style.display = "none";
    
    document.getElementById("btn-start-batch-scan").disabled = false;
    document.getElementById("btn-clear-batch").disabled = false;
    
    // Refresh active file's form state
    if (state.activeBatchFileId) {
        selectBatchFile(state.activeBatchFileId);
    }
    
    showToast(`Đã quét xong ${successCount}/${pendingFiles.length} tệp! Vui lòng chọn từng tệp ở cột bên trái để duyệt dữ liệu và nhấn 'Lưu vào hệ thống'.`, "success");
    
    // Render batch save section after scanning completes
    renderBatchSaveSection();
}

function setConsoleStep(stepNumber, stateClass) {
    const stepEl = document.getElementById(`step-${stepNumber}`);
    const spinner = stepEl.querySelector(".step-spinner");
    const successIcon = stepEl.querySelector(".step-success-icon");
    
    stepEl.className = `console-step ${stateClass}`;
    
    if (stateClass === 'active') {
        spinner.style.display = "block";
        successIcon.style.display = "none";
    } else if (stateClass === 'success') {
        spinner.style.display = "none";
        successIcon.style.display = "block";
    } else {
        spinner.style.display = "none";
        successIcon.style.display = "none";
    }
}

// REAL LIVE GEMINI API REQUEST
async function callGeminiAPI() {
    setConsoleStep(1, 'active');
    await delay(2000); // UI visual sync
    setConsoleStep(1, 'success');
    
    setConsoleStep(2, 'active');
    
    const apiVersion = state.geminiApiVersion || "v1beta";
    const modelName = state.geminiModel || "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${state.geminiKey}`;
    
    const requestPayload = {
        contents: [
            {
                parts: [
                    {
                        text: "Hãy phân tích hình ảnh/tệp hợp đồng đính kèm này và trích xuất các thông tin sau dưới dạng JSON chuẩn. Trả về DUY NHẤT một chuỗi JSON hợp lệ, không thêm bớt markdown hay ký tự codeblock khác. Schema:\n{\n  \"contractId\": \"Mã số hợp đồng (nếu không có, hãy tạo mã theo định dạng HD-YYYY-XXX dựa trên đối tác và năm)\",\n  \"title\": \"Tên tiêu đề hợp đồng\",\n  \"partner\": \"Tên công ty/đối tác ký kết với chúng tôi\",\n  \"value\": \"Giá trị bằng số hợp đồng (ví dụ 100000000, nếu không có để 0)\",\n  \"signDate\": \"Ngày ký kết (YYYY-MM-DD)\",\n  \"expiryDate\": \"Ngày hết hạn (YYYY-MM-DD)\",\n  \"year\": \"Năm của hợp đồng (phải là 2024, 2025 hoặc 2026 dựa trên ngày ký hoặc nội dung hợp đồng)\",\n  \"summary\": \"Tóm tắt ngắn gọn các điều khoản chính và nghĩa vụ (khoảng 3 dòng)\"\n}"
                    },
                    {
                        inlineData: {
                            mimeType: state.uploadedFile.type || "application/pdf",
                            data: state.uploadedFile.base64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };
    
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText || "Lỗi cuộc gọi API"}`);
    }
    
    const resData = await response.json();
    
    setConsoleStep(2, 'success');
    setConsoleStep(3, 'active');
    await delay(1500);
    
    try {
        const textResponse = resData.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(textResponse.trim());
        setConsoleStep(3, 'success');
        return parsedJson;
    } catch (parseError) {
        throw new Error("Không thể phân tích phản hồi JSON từ Gemini. Dữ liệu thô: " + parseError.toString());
    }
}

// SMART MOCK AI SERVICE FALLBACK
async function callMockAIService() {
    setConsoleStep(1, 'active');
    await delay(1800);
    setConsoleStep(1, 'success');
    
    setConsoleStep(2, 'active');
    await delay(2000);
    setConsoleStep(2, 'success');
    
    setConsoleStep(3, 'active');
    await delay(1200);
    setConsoleStep(3, 'success');
    
    // Smart heuristic based on filename
    const filenameLower = state.uploadedFile.name.toLowerCase();
    
    let mockResult = {
        contractId: `HD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        title: "Hợp đồng Cung cấp Thiết bị Điện tử Văn phòng",
        partner: "Công ty Cổ phần Công nghệ Hoàng Hà",
        value: 175000000,
        signDate: "2025-06-15",
        expiryDate: "2026-06-15",
        year: "2025",
        summary: "Cung cấp hệ thống máy chiếu, màn hình tương tác và dàn loa hội thảo cho phòng họp trung tâm. Hỗ trợ lắp đặt thi công và căn chỉnh âm thanh miễn phí."
    };
    
    if (filenameLower.includes("thue") || filenameLower.includes("nha") || filenameLower.includes("vanphong")) {
        mockResult.title = "Hợp đồng Thuê Nhà làm Văn phòng Chi nhánh";
        mockResult.partner = "Công ty TNHH Bất động sản Vinhomes";
        mockResult.value = 540000000;
        mockResult.signDate = "2026-05-01";
        mockResult.expiryDate = "2029-05-01";
        mockResult.year = "2026";
        mockResult.summary = "Thuê mặt bằng văn phòng tầng 15. Tiền thuê thanh toán 6 tháng một lần. Thời hạn thuê cam kết tối thiểu 3 năm, hỗ trợ miễn phí phí quản lý 6 tháng đầu.";
    } else if (filenameLower.includes("cloud") || filenameLower.includes("software") || filenameLower.includes("phanmem")) {
        mockResult.title = "Hợp đồng Thuê bản quyền phần mềm ERP";
        mockResult.partner = "Công ty Cổ phần MISA";
        mockResult.value = 110000000;
        mockResult.signDate = "2024-11-20";
        mockResult.expiryDate = "2025-11-20";
        mockResult.year = "2024";
        mockResult.summary = "Mua bản quyền phần mềm quản lý tài chính doanh nghiệp MISA AMIS cho 15 users. Bảo trì hệ thống và đào tạo nhân sự sử dụng trong vòng 2 tuần.";
    } else if (filenameLower.includes("2024")) {
        mockResult.year = "2024";
        mockResult.signDate = "2024-03-10";
        mockResult.expiryDate = "2025-03-10";
    } else if (filenameLower.includes("2026")) {
        mockResult.year = "2026";
        mockResult.signDate = "2026-02-12";
        mockResult.expiryDate = "2027-02-12";
    }
    
    return mockResult;
}

function fillExtractedForm(data) {
    document.getElementById("ext-contract-id").value = data.contractId || "";
    document.getElementById("ext-title").value = data.title || "";
    document.getElementById("ext-partner").value = data.partner || "";
    document.getElementById("ext-value").value = data.value || 0;
    document.getElementById("ext-sign-date").value = data.signDate || "";
    document.getElementById("ext-expiry-date").value = data.expiryDate || "";
    
    // Map year
    const yearSelect = document.getElementById("ext-year");
    if (data.year === "2024" || data.year === "2025" || data.year === "2026") {
        yearSelect.value = data.year;
    } else {
        yearSelect.value = "Khác";
    }
    
    document.getElementById("ext-summary").value = data.summary || "";
}

// SAVE THE NEW CONTRACT DATA
async function saveExtractedContract() {
    const contractId = document.getElementById("ext-contract-id").value;
    const year = document.getElementById("ext-year").value;
    const title = document.getElementById("ext-title").value;
    const partner = document.getElementById("ext-partner").value;
    const value = Number(document.getElementById("ext-value").value) || 0;
    const signDate = document.getElementById("ext-sign-date").value;
    const expiryDate = document.getElementById("ext-expiry-date").value;
    const summary = document.getElementById("ext-summary").value;
    
    const syncCheckbox = document.getElementById("sync-to-google-checkbox").checked;
    
    let fileUrl = "Lưu trữ cục bộ - không tải lên Drive";
    let fileId = "";
    
    const saveBtn = document.getElementById("btn-save-extracted");
    const originalBtnHTML = saveBtn.innerHTML;
    
    // Local storage contract payload
    const newContract = {
        contractId,
        title,
        partner,
        value,
        signDate,
        expiryDate,
        year,
        fileUrl,
        summary,
        syncDate: formatDateString(new Date())
    };
    
    // Live synchronization with Google Drive and Sheet
    if (syncCheckbox && state.gasUrl) {
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="step-spinner" style="display:inline-block; vertical-align:middle; margin-right:6px;"></span> Đang đồng bộ Google...';
            
            const payload = {
                action: "addContract",
                contractId,
                title,
                partner,
                value,
                signDate,
                expiryDate,
                year,
                fileBase64: state.uploadedFile.base64,
                fileName: state.uploadedFile.name,
                fileMime: state.uploadedFile.type
            };
            
            // Post payload to Apps Script (avoiding JSON Content-Type headers that trigger CORS preflight OPTIONS error)
            const response = await fetch(state.gasUrl, {
                method: "POST",
                mode: "cors",
                body: JSON.stringify(payload)
            });
            
            const resJson = await response.json();
            
            if (resJson.status === "success") {
                newContract.fileUrl = resJson.fileUrl;
                showToast("Đồng bộ Google Drive & Sheets thành công!", "success");
            } else {
                throw new Error(resJson.message || "Lỗi phản hồi của script.");
            }
            
        } catch (syncError) {
            console.error(syncError);
            showToast("Lỗi đồng bộ Google: " + syncError.message + ". Hợp đồng sẽ chỉ được lưu cục bộ.", "error");
            newContract.fileUrl = "Đồng bộ thất bại, file lưu tạm.";
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHTML;
        }
    }
    
    // Check if duplicate ID exists, if so overwrite
    const existingIndex = state.contracts.findIndex(c => c.contractId === contractId);
    if (existingIndex > -1) {
        state.contracts[existingIndex] = newContract;
    } else {
        state.contracts.push(newContract);
    }
    
    saveContractsToLocal();
    showToast(`Đã lưu hợp đồng ${contractId} vào ổ đĩa năm ${year}!`, "success");
    
    // Remove the saved file from the queue
    if (state.activeBatchFileId) {
        removeFileFromBatch(state.activeBatchFileId);
    }
    
    // Switch to directory to see new entries if queue is empty
    if (state.uploadedFiles.length === 0) {
        switchTab('year-explorer');
    }
}

// SAVE A SINGLE FILE ITEM DIRECTLY (used by batch save)
async function saveFileItemContract(fileItem) {
    const data = fileItem.extractedData;
    if (!data) throw new Error("Không có dữ liệu trích xuất cho tệp này.");
    
    const contractId = data.contractId ? String(data.contractId) : `HD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const year = data.year ? String(data.year) : 'Khác';
    const syncCheckbox = document.getElementById("sync-to-google-checkbox").checked;
    
    let fileUrl = "Lưu trữ cục bộ - không tải lên Drive";
    
    const newContract = {
        contractId: contractId,
        title: data.title ? String(data.title) : '',
        partner: data.partner ? String(data.partner) : '',
        value: Number(data.value) || 0,
        signDate: data.signDate || '',
        expiryDate: data.expiryDate || '',
        year: year,
        fileUrl: fileUrl,
        summary: data.summary ? String(data.summary) : '',
        syncDate: formatDateString(new Date())
    };
    
    // Sync to Google if enabled
    if (syncCheckbox && state.gasUrl) {
        try {
            const payload = {
                action: "addContract",
                contractId: newContract.contractId,
                title: newContract.title,
                partner: newContract.partner,
                value: newContract.value,
                signDate: newContract.signDate,
                expiryDate: newContract.expiryDate,
                year: newContract.year,
                fileBase64: fileItem.base64,
                fileName: fileItem.name,
                fileMime: fileItem.type
            };
            
            const response = await fetch(state.gasUrl, {
                method: "POST",
                mode: "cors",
                body: JSON.stringify(payload)
            });
            
            const resJson = await response.json();
            
            if (resJson.status === "success") {
                newContract.fileUrl = resJson.fileUrl;
            } else {
                throw new Error(resJson.message || "Lỗi phản hồi script.");
            }
        } catch (syncError) {
            console.error("Batch sync error for", fileItem.name, syncError);
            newContract.fileUrl = "Đồng bộ thất bại, file lưu tạm.";
        }
    }
    
    // Save locally
    const existingIndex = state.contracts.findIndex(c => c.contractId === contractId);
    if (existingIndex > -1) {
        state.contracts[existingIndex] = newContract;
    } else {
        state.contracts.push(newContract);
    }
    
    saveContractsToLocal();
    return newContract;
}

// BATCH SAVE SECTION: Render the save selection list
function renderBatchSaveSection() {
    const section = document.getElementById("batch-save-section");
    const listEl = document.getElementById("batch-save-list");
    const countEl = document.getElementById("batch-save-count");
    const selectAllCb = document.getElementById("batch-select-all-checkbox");
    
    // Get files that have been successfully scanned
    const successFiles = state.uploadedFiles.filter(f => f.status === 'success');
    
    if (successFiles.length === 0) {
        section.style.display = "none";
        return;
    }
    
    section.style.display = "block";
    
    // Render the list of saveable files
    listEl.innerHTML = successFiles.map(file => {
        const isSelected = file.selectedForSave ? 'selected' : '';
        const isSaved = file.savedToSystem ? 'saved' : '';
        const isPdf = file.type === "application/pdf";
        const iconName = isPdf ? 'file-text' : 'image';
        const iconColor = isPdf ? '#ef4444' : '#38bdf8';
        
        let statusBadge = '';
        if (file.savedToSystem) {
            statusBadge = '<span class="batch-save-item-status status-saved">Đã lưu</span>';
        } else if (file.savingInProgress) {
            statusBadge = '<span class="batch-save-item-status status-saving">Đang lưu...</span>';
        } else if (file.saveError) {
            statusBadge = `<span class="batch-save-item-status status-save-error" title="${file.saveError}">Lỗi</span>`;
        } else {
            statusBadge = '<span class="batch-save-item-status status-ready">Sẵn sàng</span>';
        }
        
        return `
            <div class="batch-save-item ${isSelected} ${isSaved}" onclick="${!file.savedToSystem ? `toggleBatchSaveItem('${file.id}')` : ''}">
                <label class="custom-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" ${file.selectedForSave ? 'checked' : ''} ${file.savedToSystem ? 'disabled' : ''}
                        onchange="toggleBatchSaveItem('${file.id}')">
                    <span class="checkmark"></span>
                </label>
                <div class="batch-save-item-info">
                    <div class="batch-save-item-icon" style="color: ${iconColor}">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <span class="batch-save-item-name" title="${file.name}">${file.name}</span>
                </div>
                ${statusBadge}
            </div>
        `;
    }).join('');
    
    // Update count
    const selectedCount = successFiles.filter(f => f.selectedForSave && !f.savedToSystem).length;
    const availableCount = successFiles.filter(f => !f.savedToSystem).length;
    countEl.textContent = `${selectedCount} / ${availableCount} đã chọn`;
    
    // Update select-all checkbox state
    if (availableCount === 0) {
        selectAllCb.checked = false;
        selectAllCb.disabled = true;
    } else {
        selectAllCb.disabled = false;
        selectAllCb.checked = selectedCount === availableCount;
    }
    
    updateBatchSaveButton();
    initLucide();
}

// Toggle individual file selection for batch save
function toggleBatchSaveItem(fileId) {
    const fileItem = state.uploadedFiles.find(f => f.id === fileId);
    if (!fileItem || fileItem.savedToSystem) return;
    
    fileItem.selectedForSave = !fileItem.selectedForSave;
    renderBatchSaveSection();
}

// Toggle select all for batch save
function toggleBatchSaveSelectAll(checked) {
    const successFiles = state.uploadedFiles.filter(f => f.status === 'success' && !f.savedToSystem);
    successFiles.forEach(f => {
        f.selectedForSave = checked;
    });
    renderBatchSaveSection();
}

// Update the batch save button state
function updateBatchSaveButton() {
    const btnBatchSave = document.getElementById("btn-batch-save");
    const selectedFiles = state.uploadedFiles.filter(f => f.selectedForSave && f.status === 'success' && !f.savedToSystem);
    
    if (selectedFiles.length > 0 && !state.isBatchSaving) {
        btnBatchSave.disabled = false;
        btnBatchSave.innerHTML = `<i data-lucide="upload-cloud"></i><span>Lưu ${selectedFiles.length} mục đã chọn vào hệ thống</span>`;
    } else {
        btnBatchSave.disabled = true;
        if (state.isBatchSaving) {
            btnBatchSave.innerHTML = '<span class="step-spinner" style="display:inline-block; vertical-align:middle; margin-right:6px;"></span><span>Đang lưu hàng loạt...</span>';
        } else {
            btnBatchSave.innerHTML = '<i data-lucide="upload-cloud"></i><span>Lưu các mục đã chọn vào hệ thống</span>';
        }
    }
    initLucide();
}

// Execute batch save for all selected files
async function startBatchSaving() {
    const selectedFiles = state.uploadedFiles.filter(f => f.selectedForSave && f.status === 'success' && !f.savedToSystem);
    
    if (selectedFiles.length === 0) {
        showToast("Vui lòng chọn ít nhất 1 mục để lưu!", "warning");
        return;
    }
    
    state.isBatchSaving = true;
    
    const progressEl = document.getElementById("batch-save-progress");
    const progressFill = document.getElementById("batch-save-progress-fill");
    const progressText = document.getElementById("batch-save-progress-text");
    const progressPercent = document.getElementById("batch-save-progress-percent");
    const logEl = document.getElementById("batch-save-log");
    
    progressEl.style.display = "block";
    progressFill.style.width = "0%";
    progressText.textContent = `Đang lưu 0 / ${selectedFiles.length} mục...`;
    progressPercent.textContent = "0%";
    logEl.innerHTML = '';
    
    updateBatchSaveButton();
    
    let savedCount = 0;
    let errorCount = 0;
    
    showToast(`Bắt đầu lưu hàng loạt ${selectedFiles.length} mục...`, "info");
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const fileItem = selectedFiles[i];
        fileItem.savingInProgress = true;
        renderBatchSaveSection();
        
        // Add log entry: saving
        logEl.innerHTML += `
            <div class="batch-save-log-item log-saving" id="log-${fileItem.id}">
                <span class="step-spinner" style="display:inline-block; width:12px; height:12px; border-width:1.5px;"></span>
                <span>Đang lưu: ${fileItem.name}...</span>
            </div>
        `;
        logEl.scrollTop = logEl.scrollHeight;
        
        try {
            const savedContract = await saveFileItemContract(fileItem);
            fileItem.savedToSystem = true;
            fileItem.savingInProgress = false;
            fileItem.selectedForSave = false;
            savedCount++;
            
            // Update log entry: success
            const logItem = document.getElementById(`log-${fileItem.id}`);
            if (logItem) {
                logItem.className = 'batch-save-log-item log-success';
                logItem.innerHTML = `<i data-lucide="check-circle"></i><span>✓ ${savedContract.contractId} — ${fileItem.name}</span>`;
            }
        } catch (error) {
            fileItem.savingInProgress = false;
            fileItem.saveError = error.message;
            errorCount++;
            
            // Update log entry: error
            const logItem = document.getElementById(`log-${fileItem.id}`);
            if (logItem) {
                logItem.className = 'batch-save-log-item log-error';
                logItem.innerHTML = `<i data-lucide="x-circle"></i><span>✗ ${fileItem.name}: ${error.message}</span>`;
            }
        }
        
        // Update progress
        const completed = savedCount + errorCount;
        const percent = Math.round((completed / selectedFiles.length) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `Đã lưu ${savedCount} / ${selectedFiles.length} mục...`;
        progressPercent.textContent = `${percent}%`;
        
        renderBatchSaveSection();
        initLucide();
        logEl.scrollTop = logEl.scrollHeight;
        
        // Brief delay between saves for smoother UX
        if (i < selectedFiles.length - 1) {
            await delay(800);
        }
    }
    
    state.isBatchSaving = false;
    updateBatchSaveButton();
    
    // Final progress text
    progressText.textContent = `Hoàn tất! Đã lưu ${savedCount}/${selectedFiles.length} mục.`;
    if (errorCount > 0) {
        progressText.textContent += ` (${errorCount} lỗi)`;
    }
    
    renderBatchSaveSection();
    initLucide();
    
    // Show final toast
    if (errorCount === 0) {
        showToast(`Đã lưu thành công ${savedCount} hợp đồng vào hệ thống!`, "success");
    } else {
        showToast(`Đã lưu ${savedCount}/${selectedFiles.length} hợp đồng. ${errorCount} lỗi.`, "warning");
    }
    
    // Remove saved files from queue after a short delay
    setTimeout(() => {
        const savedIds = state.uploadedFiles.filter(f => f.savedToSystem).map(f => f.id);
        savedIds.forEach(id => {
            const index = state.uploadedFiles.findIndex(f => f.id === id);
            if (index > -1) {
                state.uploadedFiles.splice(index, 1);
            }
        });
        
        if (state.activeBatchFileId && !state.uploadedFiles.find(f => f.id === state.activeBatchFileId)) {
            state.activeBatchFileId = state.uploadedFiles.length > 0 ? state.uploadedFiles[0].id : null;
        }
        
        if (state.activeBatchFileId) {
            selectBatchFile(state.activeBatchFileId);
        } else {
            renderBatchQueue();
        }
        
        renderBatchSaveSection();
        
        // If all files processed, switch to explorer
        if (state.uploadedFiles.length === 0) {
            switchTab('year-explorer');
        }
    }, 2000);
}

// 7. TAB 3: YEAR EXPLORER CONTROLLER
function renderYearExplorer() {
    renderFolderList();
    renderFolderContents();
}

function renderFolderContents() {
    const grid = document.getElementById("folder-document-grid");
    const emptyState = document.getElementById("empty-folder-state");
    const titleEl = document.getElementById("current-folder-title");
    const iconEl = document.getElementById("current-folder-icon");
    const pathEl = document.getElementById("google-drive-path");
    
    // Reset any inline icon style
    iconEl.style.color = "";
    
    // Update folder header metadata
    let filtered = [];
    if (state.selectedYearFolder === 'all') {
        filtered = [...state.contracts];
        titleEl.textContent = "Tất cả các năm";
        iconEl.className = "folder-title-icon icon-all";
        iconEl.setAttribute("data-lucide", "folder-open");
        pathEl.textContent = "/Hồ Sơ Hợp Đồng - Quản Lý/";
    } else {
        filtered = state.contracts.filter(c => c.year === state.selectedYearFolder);
        
        const folder = state.folders.find(f => f.id === state.selectedYearFolder);
        const folderName = folder ? folder.name : state.selectedYearFolder;
        
        titleEl.textContent = folderName;
        
        let pathParts = [];
        let currentFolder = folder;
        while (currentFolder) {
            pathParts.unshift(currentFolder.name);
            currentFolder = state.folders.find(f => f.id === currentFolder.parent);
        }
        
        pathEl.textContent = `/Hồ Sơ Hợp Đồng - Quản Lý/${pathParts.join('/')}/`;
        
        const folderColor = folder ? folder.color : '#94a3b8';
        iconEl.className = "folder-title-icon";
        iconEl.style.color = folderColor;
        iconEl.setAttribute("data-lucide", "folder");
    }
    initLucide();
    
    if (filtered.length > 0) {
        grid.style.display = "grid";
        emptyState.style.display = "none";
        
        grid.innerHTML = filtered.map(c => {
            const statusInfo = getContractStatus(c);
            const contractFolder = state.folders.find(f => f.id === c.year);
            const contractFolderName = contractFolder ? contractFolder.name : c.year;
            const contractFolderColor = contractFolder ? contractFolder.color : '#94a3b8';
            
            return `
                <div class="document-card" onclick="openContractDetail('${c.contractId}')">
                    <div class="doc-card-header">
                        <span class="doc-code">${c.contractId}</span>
                        <span class="doc-badge-year" style="background-color: ${contractFolderColor}; color: #ffffff;">${contractFolderName}</span>
                    </div>
                    <h3 class="doc-title">${c.title}</h3>
                    <div class="doc-partner">
                        <i data-lucide="building-2"></i>
                        <span>${c.partner}</span>
                    </div>
                    <div class="doc-footer">
                        <span class="doc-value">${formatCurrency(c.value)}</span>
                        <span class="doc-status ${statusInfo.class}">${statusInfo.label}</span>
                    </div>
                </div>
            `;
        }).join('');
        initLucide();
    } else {
        grid.style.display = "none";
        emptyState.style.display = "flex";
    }
}

// 8. TAB 4: CONTRACTS LIST DATASHEET
function initFilterEvents() {
    document.getElementById("filter-search-input").addEventListener("input", renderContractsTable);
    document.getElementById("filter-year-select").addEventListener("change", renderContractsTable);
    document.getElementById("filter-status-select").addEventListener("change", renderContractsTable);
    
    // Quick search in topbar syncs with contracts list search
    document.getElementById("quick-search-input").addEventListener("input", (e) => {
        document.getElementById("filter-search-input").value = e.target.value;
        if (state.currentTab !== 'contracts-list') {
            switchTab('contracts-list');
        } else {
            renderContractsTable();
        }
    });
    
    // Sync Button
    document.getElementById("btn-sync-now").addEventListener("click", () => {
        syncContractsWithGoogleSheets();
    });
    
    // Export Excel/CSV Button
    document.getElementById("btn-export-csv").addEventListener("click", () => {
        exportContractsToCSV();
    });
    
    // Table Sorting headers click
    const headers = document.querySelectorAll(".table-main th.sortable");
    headers.forEach(th => {
        th.addEventListener("click", () => {
            const col = th.getAttribute("data-sort");
            if (state.sortColumn === col) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = col;
                state.sortDirection = 'asc';
            }
            renderContractsTable();
        });
    });
}

function renderContractsTable() {
    const tbody = document.getElementById("contracts-tbody");
    
    const searchVal = document.getElementById("filter-search-input").value.toLowerCase();
    const yearVal = document.getElementById("filter-year-select").value;
    const statusVal = document.getElementById("filter-status-select").value;
    
    let filtered = state.contracts.filter(c => {
        // Keyword Search
        const contractIdStr = String(c.contractId || '');
        const titleStr = String(c.title || '');
        const partnerStr = String(c.partner || '');
        const summaryStr = String(c.summary || '');

        const matchesSearch = contractIdStr.toLowerCase().includes(searchVal) || 
                              titleStr.toLowerCase().includes(searchVal) || 
                              partnerStr.toLowerCase().includes(searchVal) ||
                              summaryStr.toLowerCase().includes(searchVal);
        
        // Year filter
        const matchesYear = yearVal === 'all' || c.year === yearVal;
        
        // Status filter
        const statusMeta = getContractStatus(c);
        let matchesStatus = true;
        if (statusVal === 'active') matchesStatus = statusMeta.class === 'status-active';
        else if (statusVal === 'expired') matchesStatus = statusMeta.class === 'status-expired';
        else if (statusVal === 'expiring') matchesStatus = statusMeta.class === 'status-warn';
        
        return matchesSearch && matchesYear && matchesStatus;
    });
    
    // Sorting logic
    filtered.sort((a, b) => {
        let valA = a[state.sortColumn] || "";
        let valB = b[state.sortColumn] || "";
        
        // Numerical sort for value
        if (state.sortColumn === 'value') {
            valA = Number(valA);
            valB = Number(valB);
        }
        
        if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Render sorted & filtered data
    if (filtered.length > 0) {
        tbody.innerHTML = filtered.map(c => {
            const statusInfo = getContractStatus(c);
            const isGoogleLink = c.fileUrl.startsWith("http");
            const folder = state.folders.find(f => f.id === c.year);
            const folderName = folder ? folder.name : c.year;
            const folderColor = folder ? folder.color : '#94a3b8';
            
            return `
                <tr>
                    <td class="cell-code">${c.contractId}</td>
                    <td class="cell-title" title="${c.title}">${c.title}</td>
                    <td class="cell-partner">${c.partner}</td>
                    <td class="cell-value">${formatCurrency(c.value)}</td>
                    <td>${formatDateDisplay(c.signDate)}</td>
                    <td>${formatDateDisplay(c.expiryDate)}</td>
                    <td><span class="folder-badge" style="background-color: ${folderColor}; color: #ffffff;">${folderName}</span></td>
                    <td>
                        ${isGoogleLink ? 
                            `<a href="${c.fileUrl}" target="_blank" class="drive-link-btn" title="Mở file Drive"><i data-lucide="external-link"></i></a>` : 
                            `<span class="text-muted" style="font-size:11px;">Cục bộ</span>`
                        }
                    </td>
                    <td class="cell-actions">
                        <button class="btn btn-secondary-soft btn-sm" onclick="openContractDetail('${c.contractId}')">Xem</button>
                        <button class="btn btn-danger-soft btn-sm" onclick="deleteContract('${c.contractId}')"><i data-lucide="trash-2"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
        initLucide();
    } else {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px;">Không tìm thấy hợp đồng phù hợp</td></tr>`;
    }
    
    document.getElementById("pagination-info").textContent = `Tìm thấy ${filtered.length} trên tổng số ${state.contracts.length} hợp đồng`;
}

// Google Sheet Sync GET request
async function syncContractsWithGoogleSheets() {
    if (!state.gasUrl) {
        showToast("Vui lòng cấu hình URL Google Apps Script Web App trước khi đồng bộ!", "error");
        switchTab('settings');
        return;
    }
    
    const syncBtn = document.getElementById("btn-sync-now");
    const originalBtn = syncBtn.innerHTML;
    
    try {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i data-lucide="refresh-cw" class="step-spinner"></i> <span>Đang tải...</span>';
        initLucide();
        
        const response = await fetch(state.gasUrl, { method: "GET" });
        const resJson = await response.json();
        
        if (resJson.status === "success") {
            const externalData = resJson.data || [];
            if (externalData.length > 0) {
                // Map/merge back into LocalStorage database
                externalData.forEach(ext => {
                    const extContractId = ext.contractId ? String(ext.contractId) : "";
                    const localIdx = state.contracts.findIndex(c => String(c.contractId || '') === extContractId);
                    // Standardize formats
                    const contractObj = {
                        contractId: extContractId,
                        title: ext.title ? String(ext.title) : "",
                        partner: ext.partner ? String(ext.partner) : "",
                        value: Number(ext.value) || 0,
                        signDate: ext.signDate ? parseGASDate(ext.signDate) : "",
                        expiryDate: ext.expiryDate ? parseGASDate(ext.expiryDate) : "",
                        year: ext.year ? String(ext.year) : new Date().getFullYear().toString(),
                        fileUrl: ext.fileUrl || "",
                        summary: ext.summary ? String(ext.summary) : "",
                        syncDate: ext.syncDate || formatDateString(new Date())
                    };
                    
                    if (localIdx > -1) {
                        state.contracts[localIdx] = contractObj;
                    } else {
                        state.contracts.push(contractObj);
                    }
                });
                
                saveContractsToLocal();
                renderContractsTable();
                showToast(`Đồng bộ thành công! Đã cập nhật ${externalData.length} dòng dữ liệu từ Google Sheets.`, "success");
            } else {
                showToast("Google Sheet trống. Chưa có dữ liệu hợp đồng.", "info");
            }
        } else {
            throw new Error(resJson.message || "Lỗi phản hồi script.");
        }
        
    } catch (err) {
        console.error(err);
        showToast("Lỗi đồng bộ: " + err.message, "error");
    } finally {
        syncBtn.disabled = false;
        syncBtn.innerHTML = originalBtn;
        initLucide();
    }
}

// Convert GAS date format to YYYY-MM-DD
function parseGASDate(dateStr) {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch(e) {}
    return dateStr;
}

// Client Side CSV Generator
function exportContractsToCSV() {
    if (state.contracts.length === 0) {
        showToast("Không có dữ liệu hợp đồng để xuất báo cáo!", "error");
        return;
    }
    
    // CSV Header row
    let csvContent = "\uFEFF"; // UTF-8 BOM representation for Excel compliance
    csvContent += "Mã Hợp Đồng,Tên Hợp Đồng,Đối Tác,Giá Trị (VND),Ngày Ký,Ngày Hết Hạn,Năm Phân Loại,Đường dẫn Drive,Ngày Đồng Bộ\r\n";
    
    state.contracts.forEach(c => {
        // Escaping comma and quotes
        const row = [
            `"${c.contractId}"`,
            `"${c.title.replace(/"/g, '""')}"`,
            `"${c.partner.replace(/"/g, '""')}"`,
            c.value,
            c.signDate,
            c.expiryDate,
            c.year,
            `"${c.fileUrl}"`,
            `"${c.syncDate}"`
        ];
        csvContent += row.join(",") + "\r\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_HoSoHopDong_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống tệp báo cáo CSV!", "success");
}

// 9. TAB 5: SETTINGS CONFIGURATION SAVES
document.getElementById("btn-save-gemini-key").addEventListener("click", () => {
    const key = document.getElementById("settings-gemini-key").value.trim();
    const modelDropdown = document.getElementById("settings-gemini-model").value;
    const customInput = document.getElementById("settings-gemini-model-custom").value.trim();
    const apiVersion = document.getElementById("settings-gemini-api-version").value;
    
    let selectedModel = modelDropdown;
    if (modelDropdown === "custom") {
        if (!customInput) {
            showToast("Vui lòng nhập Model ID tùy chọn!", "error");
            return;
        }
        selectedModel = customInput;
    }
    
    state.geminiKey = key;
    state.geminiModel = selectedModel;
    state.geminiApiVersion = apiVersion;
    
    localStorage.setItem("gemini_key", key);
    localStorage.setItem("gemini_model", selectedModel);
    localStorage.setItem("gemini_api_version", apiVersion);
    
    updateConnectionIndicators();
    showToast("Đã lưu cấu hình Gemini API Key và Model!", "success");
});

document.getElementById("btn-save-gas-url").addEventListener("click", () => {
    const url = document.getElementById("settings-gas-url").value.trim();
    state.gasUrl = url;
    localStorage.setItem("gas_url", url);
    updateConnectionIndicators();
    showToast("Đã lưu URL kết nối Google Apps Script!", "success");
});

document.getElementById("btn-test-gas-connection").addEventListener("click", async () => {
    if (!state.gasUrl) {
        showToast("Vui lòng cấu hình URL Web App trước khi kiểm tra!", "error");
        return;
    }
    
    const testBtn = document.getElementById("btn-test-gas-connection");
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="step-spinner" style="display:inline-block; vertical-align:middle; margin-right:6px;"></span> Đang kiểm tra...';
    
    try {
        const response = await fetch(state.gasUrl, { method: "GET" });
        const resJson = await response.json();
        if (resJson.status === "success") {
            showToast("Kết nối thành công tới Google Sheets Web App!", "success");
        } else {
            showToast("Kết nối lỗi: " + (resJson.message || "Lỗi không xác định"), "error");
        }
    } catch(e) {
        showToast("Kiểm tra kết nối thất bại! Hãy xác nhận URL Web App có bật quyền truy cập 'Anyone'.", "error");
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = "Kiểm tra kết nối";
    }
});

document.getElementById("btn-toggle-gemini-key").addEventListener("click", () => {
    const keyInput = document.getElementById("settings-gemini-key");
    const eyeIcon = document.getElementById("btn-toggle-gemini-key").querySelector("i");
    if (keyInput.type === "password") {
        keyInput.type = "text";
        eyeIcon.setAttribute("data-lucide", "eye-off");
    } else {
        keyInput.type = "password";
        eyeIcon.setAttribute("data-lucide", "eye");
    }
    initLucide();
});

document.getElementById("btn-reset-db").addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn reset toàn bộ cơ sở dữ liệu cục bộ về mặc định? Mọi hợp đồng và thư mục mới lưu cục bộ sẽ bị xóa.")) {
        localStorage.removeItem("contracts");
        localStorage.removeItem("folders");
        initContracts();
        initFolders();
        populateFolderDropdowns();
        showToast("Đã khôi phục cơ sở dữ liệu hợp đồng mẫu và thư mục mặc định!", "info");
        if (state.currentTab === 'dashboard') renderDashboard();
        else switchTab('dashboard');
    }
});

// 10. MODALS & FORMS HANDLERS
function initModalEvents() {
    const detailModal = document.getElementById("contract-detail-modal");
    const manualModal = document.getElementById("manual-upload-modal");
    
    document.getElementById("btn-close-detail-modal").onclick = () => {
        detailModal.classList.remove("active");
    };
    
    document.getElementById("btn-close-manual-modal").onclick = () => {
        manualModal.classList.remove("active");
    };
    
    document.getElementById("btn-cancel-manual").onclick = () => {
        manualModal.classList.remove("active");
    };
    
    // Close on clicking backdrop
    detailModal.onclick = (e) => {
        if (e.target === detailModal) detailModal.classList.remove("active");
    };
    
    manualModal.onclick = (e) => {
        if (e.target === manualModal) manualModal.classList.remove("active");
    };
    
    // Manual Contract Form Submit
    document.getElementById("manual-contract-form").addEventListener("submit", (e) => {
        e.preventDefault();
        saveManualContract();
    });
}

function openContractDetail(contractId) {
    const contract = state.contracts.find(c => c.contractId === contractId);
    if (!contract) return;
    
    state.selectedContract = contract;
    
    const modal = document.getElementById("contract-detail-modal");
    
    document.getElementById("detail-contract-id").textContent = contract.contractId;
    document.getElementById("detail-title").textContent = contract.title;
    document.getElementById("detail-partner").textContent = contract.partner;
    document.getElementById("detail-value").textContent = formatCurrency(contract.value);
    document.getElementById("detail-sign-date").textContent = formatDateDisplay(contract.signDate);
    document.getElementById("detail-expiry-date").textContent = formatDateDisplay(contract.expiryDate);
    
    // Year badge
    const badge = document.getElementById("detail-badge-year");
    const folder = state.folders.find(f => f.id === contract.year);
    const folderName = folder ? folder.name : contract.year;
    const folderColor = folder ? folder.color : '#94a3b8';
    
    badge.textContent = folderName;
    badge.className = "folder-badge";
    badge.style.backgroundColor = folderColor;
    badge.style.color = '#ffffff';
    
    // Summary
    document.getElementById("detail-summary").textContent = contract.summary || "Không có tóm tắt điều khoản nào.";
    
    // Status display
    const statusMeta = getContractStatus(contract);
    const statusCard = document.getElementById("detail-status-card");
    const statusIcon = document.getElementById("detail-status-icon");
    const statusLabel = document.getElementById("detail-status-label");
    const timeRemaining = document.getElementById("detail-time-remaining");
    
    statusLabel.textContent = statusMeta.label.toUpperCase();
    
    if (statusMeta.class === 'status-expired') {
        statusCard.className = "timeline-status-card expired";
        statusIcon.setAttribute("data-lucide", "alert-circle");
        timeRemaining.textContent = "Hợp đồng đã quá hạn hiệu lực";
    } else if (statusMeta.class === 'status-warn') {
        statusCard.className = "timeline-status-card warn";
        statusIcon.setAttribute("data-lucide", "alert-triangle");
        
        const today = new Date("2026-07-01");
        const expiry = new Date(contract.expiryDate);
        const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        timeRemaining.textContent = `Sắp hết hạn! Còn ${days} ngày`;
    } else {
        statusCard.className = "timeline-status-card";
        statusIcon.setAttribute("data-lucide", "check-circle");
        
        if (contract.expiryDate) {
            const today = new Date("2026-07-01");
            const expiry = new Date(contract.expiryDate);
            const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            timeRemaining.textContent = `Còn hiệu lực: ${days} ngày`;
        } else {
            timeRemaining.textContent = "Có hiệu lực lâu dài";
        }
    }
    
    // Drive links block
    const fileSection = document.getElementById("detail-drive-file-section");
    const driveLinkBtn = document.getElementById("detail-btn-open-drive");
    const detailFileName = document.getElementById("detail-file-name");
    
    if (contract.fileUrl && contract.fileUrl.startsWith("http")) {
        fileSection.style.display = "block";
        driveLinkBtn.setAttribute("href", contract.fileUrl);
        detailFileName.textContent = `[${contract.contractId}] - ${contract.partner} - scan.pdf`;
    } else {
        fileSection.style.display = "none";
    }
    
    // Edit & delete callbacks
    const editBtn = document.getElementById("btn-edit-contract-detail");
    const deleteBtn = document.getElementById("btn-delete-contract-detail");
    
    editBtn.style.display = "inline-flex";
    deleteBtn.style.display = "inline-flex";
    
    editBtn.onclick = () => {
        modal.classList.remove("active");
        openEditManualForm(contract);
    };
    
    deleteBtn.onclick = () => {
        if (confirm(`Bạn có chắc chắn muốn xóa hợp đồng ${contract.contractId}?`)) {
            modal.classList.remove("active");
            deleteContract(contract.contractId);
        }
    };
    
    modal.classList.add("active");
    initLucide();
}

function openManualModal() {
    document.getElementById("manual-contract-form").reset();
    
    // default year input
    document.getElementById("man-year").value = new Date().getFullYear().toString();
    
    const modal = document.getElementById("manual-upload-modal");
    modal.querySelector("h3").textContent = "Thêm hồ sơ hợp đồng mới";
    modal.classList.add("active");
}

function openEditManualForm(contract) {
    const modal = document.getElementById("manual-upload-modal");
    modal.querySelector("h3").textContent = `Chỉnh sửa hợp đồng: ${contract.contractId}`;
    
    document.getElementById("man-contract-id").value = contract.contractId;
    document.getElementById("man-contract-id").readOnly = true; // Lock key on edit
    document.getElementById("man-year").value = contract.year;
    document.getElementById("man-title").value = contract.title;
    document.getElementById("man-partner").value = contract.partner;
    document.getElementById("man-value").value = contract.value;
    document.getElementById("man-sign-date").value = contract.signDate || "";
    document.getElementById("man-expiry-date").value = contract.expiryDate || "";
    document.getElementById("man-summary").value = contract.summary || "";
    
    modal.classList.add("active");
}

function saveManualContract() {
    const contractId = document.getElementById("man-contract-id").value;
    const year = document.getElementById("man-year").value;
    const title = document.getElementById("man-title").value;
    const partner = document.getElementById("man-partner").value;
    const value = Number(document.getElementById("man-value").value) || 0;
    const signDate = document.getElementById("man-sign-date").value;
    const expiryDate = document.getElementById("man-expiry-date").value;
    const summary = document.getElementById("man-summary").value;
    
    const existingIndex = state.contracts.findIndex(c => c.contractId === contractId);
    
    let fileUrl = "Lưu trữ cục bộ - không tải lên Drive";
    let syncDate = formatDateString(new Date());
    
    if (existingIndex > -1) {
        // preserve file details on edit
        fileUrl = state.contracts[existingIndex].fileUrl;
        syncDate = state.contracts[existingIndex].syncDate;
    }
    
    const contractObj = {
        contractId,
        title,
        partner,
        value,
        signDate,
        expiryDate,
        year,
        fileUrl,
        summary,
        syncDate
    };
    
    if (existingIndex > -1) {
        state.contracts[existingIndex] = contractObj;
        showToast(`Đã cập nhật hợp đồng ${contractId}!`, "success");
    } else {
        state.contracts.push(contractObj);
        showToast(`Đã thêm mới hợp đồng ${contractId}!`, "success");
    }
    
    saveContractsToLocal();
    document.getElementById("manual-upload-modal").classList.remove("active");
    
    // reload views
    renderCurrentTab();
}

function deleteContract(contractId) {
    const originalLength = state.contracts.length;
    state.contracts = state.contracts.filter(c => c.contractId !== contractId);
    
    if (state.contracts.length < originalLength) {
        saveContractsToLocal();
        showToast(`Đã xóa hợp đồng ${contractId} khỏi cơ sở dữ liệu cục bộ!`, "info");
        renderCurrentTab();
    }
}

// 11. GENERAL UTILITY FUNCTIONS
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return "-";
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    } catch(e) {}
    return dateStr;
}

function formatDateString(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




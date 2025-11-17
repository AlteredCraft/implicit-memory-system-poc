/**
 * Memory browser functionality
 */

// Animation duration constants (configurable)
const SLIDE_IN_ANIMATION_DURATION = 600;  // ms
const HDD_FLICKER_DURATION = 1500;        // ms
const LABEL_FLASH_DURATION = 1000;        // ms

// Enhanced state management for memory files
let memoryFilesState = {
    files: []
};

// Track currently viewed file for update notifications
let currentViewedFilePath = null;

// Legacy reference for backward compatibility
let currentMemoryFiles = [];

/**
 * Set up memory browser event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeMemoryViewer').addEventListener('click', closeMemoryViewer);
});

/**
 * Format a timestamp as relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

/**
 * Refresh memory files list
 */
async function refreshMemoryFiles(isInitialLoad = false) {
    try {
        const response = await fetch(`${API_BASE}/api/memory/files`);
        const data = await response.json();

        // Preserve existing state metadata
        const existingFiles = new Map(memoryFilesState.files.map(f => [f.path, f]));

        memoryFilesState.files = (data.files || []).map(file => {
            const existing = existingFiles.get(file.path);
            return {
                ...file,
                isNew: existing ? existing.isNew : false,  // Preserve isNew state
                lastOperation: existing ? existing.lastOperation : null,
                operationTimestamp: existing ? existing.operationTimestamp : null
            };
        });

        // Update legacy reference
        currentMemoryFiles = memoryFilesState.files;

        renderMemoryList();
    } catch (error) {
        console.error('Failed to load memory files:', error);
        document.getElementById('memoryList').innerHTML = `
            <div class="alert alert-danger">
                Failed to load memory files: ${escapeHtml(error.message)}
            </div>
        `;
    }
}

/**
 * Render memory files list
 */
function renderMemoryList() {
    const memoryList = document.getElementById('memoryList');

    if (memoryFilesState.files.length === 0) {
        memoryList.innerHTML = `
            <div class="text-muted text-center p-4">
                <i class="bi bi-folder2 fs-1"></i>
                <p class="mt-2">No memory files yet</p>
                <small>Claude will create memory files as you chat</small>
            </div>
        `;
        return;
    }

    const listHtml = memoryFilesState.files.map(file => {
        const sizeKb = (file.size / 1024).toFixed(1);
        const modifiedTime = formatRelativeTime(file.modified);
        const accessedTime = file.accessed ? formatRelativeTime(file.accessed) : null;

        return `
            <div class="memory-item list-group-item list-group-item-action"
                 data-path="${escapeHtml(file.path)}"
                 data-is-new="${file.isNew ? 'true' : 'false'}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-bold">
                            <i class="bi bi-file-text"></i> ${escapeHtml(file.name)}
                        </div>

                        <!-- Labels -->
                        ${file.isNew ? '<div class="memory-labels mt-1"><span class="badge bg-success">new</span></div>' : ''}

                        <!-- Timestamps -->
                        <div class="memory-timestamps mt-1">
                            <small class="memory-timestamp-label memory-timestamp-updated text-muted d-block">
                                Last updated: ${modifiedTime}
                            </small>
                            ${accessedTime ? `
                            <small class="memory-timestamp-label memory-timestamp-accessed text-muted d-block">
                                Last accessed: ${accessedTime}
                            </small>
                            ` : ''}
                        </div>

                        <small class="text-muted">${sizeKb} KB</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary view-file-btn" data-path="${escapeHtml(file.path)}">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    memoryList.innerHTML = `<div class="list-group">${listHtml}</div>`;

    // Add click handlers
    memoryList.querySelectorAll('.view-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.getAttribute('data-path');
            viewMemoryFile(path);
        });
    });

    memoryList.querySelectorAll('.memory-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.getAttribute('data-path');
            viewMemoryFile(path);
        });
    });
}

/**
 * View a memory file
 */
async function viewMemoryFile(path) {
    try {
        const response = await fetch(`${API_BASE}/api/memory/files/${encodeURIComponent(path)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Track currently viewed file
        currentViewedFilePath = path;

        // Mark file as no longer "new" when user views it
        const file = memoryFilesState.files.find(f => f.path === path);
        if (file && file.isNew) {
            file.isNew = false;
            renderMemoryList();
        }

        // Hide update notification banner when viewing fresh
        const banner = document.getElementById('updateNotificationBanner');
        if (banner) {
            banner.style.display = 'none';
        }

        // Show viewer
        const viewer = document.getElementById('memoryViewer');
        const fileName = document.getElementById('memoryFileName');
        const content = document.getElementById('memoryContent');

        fileName.textContent = path;
        content.textContent = data.content;

        viewer.style.display = 'block';

        // Highlight selected item
        document.querySelectorAll('.memory-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.memory-item[data-path="${path}"]`)?.classList.add('active');

    } catch (error) {
        console.error('Failed to load memory file:', error);
        addSystemMessage(`Failed to load file: ${error.message}`, 'danger');
    }
}

/**
 * Close memory viewer
 */
function closeMemoryViewer() {
    document.getElementById('memoryViewer').style.display = 'none';
    currentViewedFilePath = null;
    document.querySelectorAll('.memory-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * Reload the currently viewed file (after update notification)
 */
function reloadMemoryViewer() {
    if (currentViewedFilePath) {
        viewMemoryFile(currentViewedFilePath);
    }
}

/**
 * Handle memory operation events from SSE stream
 */
async function handleMemoryOperation(operation, path, timestamp) {
    console.log(`[MEMORY_EVENTS] handleMemoryOperation called: ${operation} on ${path}`);
    console.log(`[MEMORY_EVENTS] Current state has ${memoryFilesState.files.length} files`);

    switch(operation) {
        case 'create':
            // Fetch updated file list
            await refreshMemoryFiles();

            // Mark new file
            const newFile = memoryFilesState.files.find(f => f.path === path);
            if (newFile) {
                newFile.isNew = true;
                newFile.lastOperation = 'create';
                newFile.operationTimestamp = timestamp;
            }

            // Re-render to show new file with animation
            renderMemoryList();

            // Trigger slide-in animation
            setTimeout(() => {
                const fileElement = document.querySelector(`.memory-item[data-path="${path}"]`);
                if (fileElement) {
                    animateNewFile(fileElement);
                    flashTimestampLabel(fileElement, 'write');
                }
            }, 10);
            break;

        case 'read':
            // Update accessed timestamp in state
            const readFile = memoryFilesState.files.find(f => f.path === path);
            if (readFile) {
                // Fetch updated metadata to get new accessed time
                await refreshMemoryFiles();

                // Re-render
                renderMemoryList();

                // Flash the accessed label
                setTimeout(() => {
                    const fileElement = document.querySelector(`.memory-item[data-path="${path}"]`);
                    if (fileElement) {
                        flashTimestampLabel(fileElement, 'read');
                    }
                }, 10);

                // Trigger HDD light if file is open in viewer
                if (path === currentViewedFilePath) {
                    triggerHDDLight('read');
                }
            }
            break;

        case 'update':
            // Fetch updated file list
            await refreshMemoryFiles();

            const updatedFile = memoryFilesState.files.find(f => f.path === path);
            if (updatedFile) {
                // Remove "new" label
                updatedFile.isNew = false;
                updatedFile.lastOperation = 'update';
                updatedFile.operationTimestamp = timestamp;

                // Re-render
                renderMemoryList();

                // Flash the updated label
                setTimeout(() => {
                    const fileElement = document.querySelector(`.memory-item[data-path="${path}"]`);
                    if (fileElement) {
                        flashTimestampLabel(fileElement, 'write');
                    }
                }, 10);

                // If file is open in viewer, show notification and trigger HDD light
                if (path === currentViewedFilePath) {
                    const banner = document.getElementById('updateNotificationBanner');
                    if (banner) {
                        banner.style.display = 'block';
                    }
                    triggerHDDLight('write');
                }
            }
            break;

        case 'delete':
            // Remove file from state
            memoryFilesState.files = memoryFilesState.files.filter(f => f.path !== path);

            // Re-render
            renderMemoryList();

            // If file is open in viewer, close it
            if (path === currentViewedFilePath) {
                closeMemoryViewer();
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage(`File ${path} was deleted`, 'info');
                }
            }
            break;

        case 'rename':
            // For rename operations (handled differently - has new_path)
            await refreshMemoryFiles();
            renderMemoryList();
            break;
    }
}

/**
 * Animate a new file sliding in from top
 */
function animateNewFile(fileElement) {
    console.log('[MEMORY_ANIMATION] Triggering slide-in animation');
    fileElement.classList.add('new-file-animation');
    setTimeout(() => {
        fileElement.classList.remove('new-file-animation');
    }, SLIDE_IN_ANIMATION_DURATION);
}

/**
 * Flash timestamp label with glow effect
 */
function flashTimestampLabel(fileElement, operationType) {
    // operationType: 'read' or 'write'
    console.log(`[MEMORY_ANIMATION] Flashing ${operationType} label`);
    const labelClass = operationType === 'read'
        ? '.memory-timestamp-accessed'
        : '.memory-timestamp-updated';

    const label = fileElement.querySelector(labelClass);
    if (!label) {
        console.warn(`[MEMORY_ANIMATION] Label not found: ${labelClass}`);
        return;
    }

    const flashClass = operationType === 'read' ? 'flash-read' : 'flash-write';
    label.classList.add(flashClass);
    console.log(`[MEMORY_ANIMATION] Added class ${flashClass} to label`);

    setTimeout(() => {
        label.classList.remove(flashClass);
    }, LABEL_FLASH_DURATION);
}

/**
 * Trigger HDD light animation in viewer
 */
function triggerHDDLight(type) {
    console.log(`[MEMORY_ANIMATION] Triggering HDD ${type} light`);
    const lightClass = type === 'read' ? '.read-light' : '.write-light';
    const lightElement = document.querySelector(lightClass);

    if (!lightElement) {
        console.warn(`[MEMORY_ANIMATION] HDD light not found: ${lightClass}`);
        return;
    }

    lightElement.classList.add('active');
    console.log(`[MEMORY_ANIMATION] HDD ${type} light activated`);
    setTimeout(() => {
        lightElement.classList.remove('active');
    }, HDD_FLICKER_DURATION);
}

/**
 * Show loading skeleton for memory files
 */
function showMemoryLoadingSkeleton() {
    const memoryList = document.getElementById('memoryList');
    memoryList.innerHTML = `
        <div class="loading-skeleton">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
        </div>
    `;
}

(function () {
    const messagesWrap = document.getElementById('messagesWrap');
    const messagesList = document.getElementById('messagesList');
    const chatForm = document.getElementById('chatForm');
    const questionInput = document.getElementById('questionInput');
    const sendButton = document.getElementById('sendButton');
    const newChatButton = document.querySelector('.new-chat-btn');
    const historyList = document.getElementById('historyList');
    const sidebarSearch = document.getElementById('sidebarSearch');
    const deleteModal = document.getElementById('deleteModal');
    const confirmCancelDelete = document.getElementById('confirmCancelDelete');
    const confirmConfirmDelete = document.getElementById('confirmConfirmDelete');
    const toastContainer = document.getElementById('toastContainer');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (!messagesWrap || !chatForm || !questionInput || !sendButton || !historyList || !deleteModal || !confirmCancelDelete || !confirmConfirmDelete || !toastContainer) {
        return;
    }

    let submitting = false;
    let activeDeleteId = null;
    let autoScrollEnabled = true;

    // Configure marked to render code blocks with syntax highlighting and copy buttons
    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();
        renderer.code = function (codeText, infoString) {
            const lang = (infoString || 'plaintext').trim();
            const code = typeof codeText === 'object' ? codeText.text : codeText;
            
            let highlighted = code;
            try {
                if (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                    highlighted = hljs.highlight(code, { language: lang }).value;
                } else if (typeof hljs !== 'undefined') {
                    highlighted = hljs.highlightAuto(code).value;
                }
            } catch (e) {
                console.warn("Highlight error:", e);
            }

            return `<div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-block-lang">${lang}</span>
                    <button class="copy-code-btn" type="button">Copy</button>
                </div>
                <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
            </div>`;
        };
        marked.use({ renderer });
    }

    // Toast Notifications Utility
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Helper to check and render/remove Empty State
    function checkEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const hasMessages = messagesList.querySelectorAll('.message-row').length > 0;
        
        if (!hasMessages) {
            if (!emptyState) {
                const es = document.createElement('div');
                es.className = 'empty-state';
                es.id = 'emptyState';
                es.innerHTML = `
                    <div class="empty-logo">AI</div>
                    <h2>How can I help you today?</h2>
                    <div class="prompt-grid">
                        <div class="prompt-card" data-prompt="Explain Docker in simple terms">
                            <h3>Explain Docker</h3>
                            <p>Get a simple breakdown of containers and images</p>
                        </div>
                        <div class="prompt-card" data-prompt="Teach me Python step by step">
                            <h3>Teach me Python</h3>
                            <p>Start learning Python fundamentals with examples</p>
                        </div>
                        <div class="prompt-card" data-prompt="Build a Flask app with PostgreSQL">
                            <h3>Build a Flask app</h3>
                            <p>Create a backend boilerplate with DB integration</p>
                        </div>
                        <div class="prompt-card" data-prompt="Create a SQL query to fetch top records">
                            <h3>Create a SQL query</h3>
                            <p>Get custom database queries for your schema</p>
                        </div>
                    </div>
                `;
                messagesList.appendChild(es);
            }
        } else {
            if (emptyState) {
                emptyState.remove();
            }
        }
    }

    // Helper to get current active conversation ID
    function getActiveConversationId() {
        return chatForm.getAttribute('data-active-id');
    }

    // Helper to set active conversation ID
    function setActiveConversationId(id) {
        chatForm.setAttribute('data-active-id', id);
    }

    function scrollToBottom(behavior = "smooth") {
        messagesWrap.scrollTo({
            top: messagesWrap.scrollHeight,
            behavior
        });
    }

    function setLoadingState(isLoading) {
        sendButton.classList.toggle("is-loading", isLoading);
        sendButton.disabled = isLoading;
        questionInput.readOnly = isLoading;
        sendButton.setAttribute("aria-busy", String(isLoading));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    function applyMessageReveal(elements) {
        const rows = elements || document.querySelectorAll('.message-row');
        rows.forEach((row, index) => {
            row.style.opacity = "0";
            row.style.transform = "translateY(12px)";
            setTimeout(() => {
                row.style.transition = "all .25s ease";
                row.style.opacity = "1";
                row.style.transform = "translateY(0)";
            }, index * 40);
        });
    }

    // Appends a message bubble to the messages wrap list
    function appendMessage(role, content, id = null, skipScroll = false) {
        // Remove empty state if it's there
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.remove();
        }

        const row = document.createElement("div");
        row.className = `message-row ${role}`;
        if (id) {
            row.setAttribute('data-id', id);
        }
        
        const avatar = role === 'user' ? 'JY' : 'AI';
        const avatarClass = role === 'user' ? 'user-avatar' : 'ai-avatar';
        const senderName = role === 'user' ? 'You' : 'Nova AI';

        let innerContent = '';
        if (role === 'assistant') {
            innerContent = typeof marked !== 'undefined' ? marked.parse(content) : escapeHtml(content);
        } else {
            innerContent = escapeHtml(content);
        }

        const actionsHtml = role === 'user'
            ? `<div class="message-actions">
                <button class="action-btn edit-btn" type="button">✏ Edit</button>
                <button class="action-btn copy-btn" type="button">📋 Copy</button>
               </div>`
            : `<div class="message-actions">
                <button class="action-btn copy-btn" type="button">📋 Copy</button>
                <button class="action-btn regenerate-btn" type="button">↻ Regenerate</button>
               </div>`;

        row.innerHTML = `
            <div class="bubble ${role}">
                <div class="bubble-header">
                    <div class="avatar-mini ${avatarClass}">${avatar}</div>
                    ${senderName}
                </div>
                <div class="message-text">${innerContent}</div>
                ${actionsHtml}
            </div>
        `;
        messagesList.appendChild(row);
        applyMessageReveal([row]);

        if (!skipScroll && autoScrollEnabled) {
            scrollToBottom("auto");
        }
        return row;
    }

    // Parses all assistant messages currently rendered in the DOM
    function parseAllExistingAssistantMessages() {
        document.querySelectorAll('.message-row.assistant .message-text').forEach(el => {
            if (typeof marked !== 'undefined') {
                el.innerHTML = marked.parse(el.textContent);
            }
        });
    }

    // --- Mobile Drawer Toggle Logic ---
    if (sidebarToggle && sidebar && sidebarOverlay) {
        const toggleSidebar = () => {
            sidebar.classList.toggle('open');
            sidebarToggle.classList.toggle('active');
            sidebarOverlay.classList.toggle('show');
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            sidebarToggle.classList.remove('active');
            sidebarOverlay.classList.remove('show');
        };

        sidebarToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        
        // Close sidebar on item click on mobile
        historyList.addEventListener('click', (e) => {
            if (e.target.closest('.history-link') || e.target.closest('.delete-btn')) {
                closeSidebar();
            }
        });
    }

    // --- Dropdown Context Menu Helpers ---
    function closeAllDropdowns(exceptDropdown = null) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu !== exceptDropdown) {
                menu.classList.remove('show');
                const item = menu.closest('.history-item');
                if (item) item.classList.remove('menu-open');
            }
        });
    }

    // --- Inline Rename Logic ---
    function startRename(historyItem) {
        const id = historyItem.getAttribute('data-id');
        const link = historyItem.querySelector('.history-link');
        const titleSpan = historyItem.querySelector('.history-title');
        const actionsDiv = historyItem.querySelector('.history-actions');
        const originalTitle = titleSpan.textContent.trim();

        actionsDiv.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = originalTitle;

        link.innerHTML = '';
        link.appendChild(input);
        input.focus();
        input.select();

        let finished = false;

        function finishRename(saveValue) {
            if (finished) return;
            finished = true;

            actionsDiv.style.cssText = ''; 

            const newTitle = input.value.trim();

            if (saveValue && newTitle && newTitle !== originalTitle) {
                link.innerHTML = `<span class="history-title">${escapeHtml(newTitle)}</span>`;

                fetch(`/api/conversations/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title: newTitle })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        showToast("Renamed");
                    } else {
                        link.innerHTML = `<span class="history-title">${escapeHtml(originalTitle)}</span>`;
                        console.error("Rename failed on server:", data.error);
                    }
                })
                .catch(err => {
                    console.error("Rename network error:", err);
                    link.innerHTML = `<span class="history-title">${escapeHtml(originalTitle)}</span>`;
                });
            } else {
                link.innerHTML = `<span class="history-title">${escapeHtml(originalTitle)}</span>`;
            }
        }

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                finishRename(true);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                finishRename(false);
            }
        });

        input.addEventListener('blur', () => {
            finishRename(true);
        });
    }

    // --- Delete Modal Dialog Logic ---
    function showDeleteModal(id) {
        activeDeleteId = id;
        deleteModal.classList.add('show');
    }

    function hideDeleteModal() {
        activeDeleteId = null;
        deleteModal.classList.remove('show');
    }

    // Switches the conversation UI
    function switchConversation(conversationId, skipFetch = false) {
        const items = historyList.querySelectorAll('.history-item');
        items.forEach(item => {
            if (item.getAttribute('data-id') === String(conversationId)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        setActiveConversationId(conversationId);

        if (skipFetch) {
            messagesList.innerHTML = '';
            checkEmptyState();
            questionInput.focus();
            return;
        }

        fetch(`/api/conversations/${conversationId}/messages`)
            .then(res => res.json())
            .then(messages => {
                messagesList.innerHTML = '';
                messages.forEach(msg => {
                    appendMessage(msg.role, msg.content, msg.id, true);
                });
                
                checkEmptyState();
                applyMessageReveal();
                autoScrollEnabled = true;
                scrollToBottom("auto");
                questionInput.focus();
            })
            .catch(err => {
                console.error("Error loading messages:", err);
            });
    }

    // Handles submitting messages dynamically using EventSource streaming
    function submitChat() {
        if (submitting) return;

        const messageText = questionInput.value.trim();
        if (!messageText) return;

        submitting = true;
        setLoadingState(true);
        autoScrollEnabled = true;

        // Add user's message to the UI
        const userRow = appendMessage("user", messageText);

        questionInput.value = "";
        sendButton.classList.remove("has-text");

        const conversationId = getActiveConversationId();

        // 1. Create placeholder assistant row with loading skeletons
        const row = document.createElement("div");
        row.className = "message-row assistant";
        const avatarClass = "ai-avatar";
        const senderName = "Nova AI";

        row.innerHTML = `
            <div class="bubble assistant">
                <div class="bubble-header">
                    <div class="avatar-mini ${avatarClass}">AI</div>
                    ${senderName}
                </div>
                <div class="message-text">
                    <div class="skeleton-loader">
                        <div class="skeleton-line long"></div>
                        <div class="skeleton-line medium"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" type="button">📋 Copy</button>
                    <button class="action-btn regenerate-btn" type="button">↻ Regenerate</button>
                </div>
            </div>
        `;
        messagesList.appendChild(row);
        applyMessageReveal([row]);
        scrollToBottom("auto");

        const messageTextEl = row.querySelector('.message-text');

        // 2. Open EventSource for streaming
        const url = `/api/conversations/${conversationId}/stream?message=${encodeURIComponent(messageText)}`;
        const eventSource = new EventSource(url);

        let streamedText = "";
        let hasStarted = false;

        eventSource.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                if (data.error) {
                    eventSource.close();
                    submitting = false;
                    setLoadingState(false);
                    messageTextEl.innerHTML = `<span style="color: #ef4444;">Error: ${escapeHtml(data.error)}</span>`;
                    return;
                }

                if (data.token) {
                    if (!hasStarted) {
                        messageTextEl.innerHTML = "";
                        hasStarted = true;
                    }
                    streamedText += data.token;
                    
                    if (typeof marked !== 'undefined') {
                        messageTextEl.innerHTML = marked.parse(streamedText);
                    } else {
                        messageTextEl.innerHTML = escapeHtml(streamedText);
                    }

                    if (autoScrollEnabled) {
                        scrollToBottom("auto");
                    }
                }

                if (data.done) {
                    eventSource.close();
                    submitting = false;
                    setLoadingState(false);

                    // Update database IDs on elements
                    if (data.user_message_id) {
                        userRow.setAttribute('data-id', data.user_message_id);
                    }
                    if (data.assistant_message_id) {
                        row.setAttribute('data-id', data.assistant_message_id);
                    }

                    if (data.title_updated && data.new_title) {
                        const sidebarItem = historyList.querySelector(`.history-item[data-id="${conversationId}"]`);
                        if (sidebarItem) {
                            const titleSpan = sidebarItem.querySelector('.history-title');
                            if (titleSpan) {
                                titleSpan.textContent = data.new_title;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Error parsing event stream data:", err);
            }
        };

        eventSource.onerror = function (err) {
            console.error("EventSource error:", err);
            eventSource.close();
            submitting = false;
            setLoadingState(false);
            if (!hasStarted) {
                messageTextEl.innerHTML = `<span style="color: #ef4444;">Connection lost. Please try again.</span>`;
            }
        };
    }

    // Handles SSE regeneration response streaming
    function startRegenerationStream(conversationId) {
        submitting = true;
        setLoadingState(true);
        autoScrollEnabled = true;

        // Create placeholder assistant row with loading skeletons
        const row = document.createElement("div");
        row.className = "message-row assistant";
        const avatarClass = "ai-avatar";
        const senderName = "Nova AI";

        row.innerHTML = `
            <div class="bubble assistant">
                <div class="bubble-header">
                    <div class="avatar-mini ${avatarClass}">AI</div>
                    ${senderName}
                </div>
                <div class="message-text">
                    <div class="skeleton-loader">
                        <div class="skeleton-line long"></div>
                        <div class="skeleton-line medium"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" type="button">📋 Copy</button>
                    <button class="action-btn regenerate-btn" type="button">↻ Regenerate</button>
                </div>
            </div>
        `;
        messagesList.appendChild(row);
        applyMessageReveal([row]);
        scrollToBottom("auto");

        const messageTextEl = row.querySelector('.message-text');

        const url = `/api/conversations/${conversationId}/regenerate`;
        const eventSource = new EventSource(url);

        let streamedText = "";
        let hasStarted = false;

        eventSource.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                if (data.error) {
                    eventSource.close();
                    submitting = false;
                    setLoadingState(false);
                    messageTextEl.innerHTML = `<span style="color: #ef4444;">Error: ${escapeHtml(data.error)}</span>`;
                    return;
                }

                if (data.token) {
                    if (!hasStarted) {
                        messageTextEl.innerHTML = "";
                        hasStarted = true;
                    }
                    streamedText += data.token;
                    
                    if (typeof marked !== 'undefined') {
                        messageTextEl.innerHTML = marked.parse(streamedText);
                    } else {
                        messageTextEl.innerHTML = escapeHtml(streamedText);
                    }

                    if (autoScrollEnabled) {
                        scrollToBottom("auto");
                    }
                }

                if (data.done) {
                    eventSource.close();
                    submitting = false;
                    setLoadingState(false);

                    if (data.assistant_message_id) {
                        row.setAttribute('data-id', data.assistant_message_id);
                    }
                }
            } catch (err) {
                console.error("Error parsing event stream data:", err);
            }
        };

        eventSource.onerror = function (err) {
            console.error("EventSource error during regeneration:", err);
            eventSource.close();
            submitting = false;
            setLoadingState(false);
            if (!hasStarted) {
                messageTextEl.innerHTML = `<span style="color: #ef4444;">Connection lost. Please try again.</span>`;
            }
        };
    }

    // Keyboard Shortcuts Listener
    document.addEventListener('keydown', (event) => {
        // Ctrl + N: New Chat
        if (event.ctrlKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            if (newChatButton) {
                newChatButton.click();
            }
        }
        // Ctrl + K: Search
        if (event.ctrlKey && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            if (sidebarSearch) {
                sidebarSearch.focus();
                sidebarSearch.select();
            }
        }
        // Esc: Close delete modal and dropdowns
        if (event.key === 'Escape') {
            if (deleteModal && deleteModal.classList.contains('show')) {
                hideDeleteModal();
            }
            closeAllDropdowns();
        }
    });

    // Live filtering in search input
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', () => {
            const query = sidebarSearch.value.toLowerCase().trim();
            const items = historyList.querySelectorAll('.history-item');
            items.forEach(item => {
                const titleSpan = item.querySelector('.history-title');
                if (titleSpan) {
                    const text = titleSpan.textContent.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                }
            });
        });
    }

    // Context menu and navigation delegation on historyList
    historyList.addEventListener('click', (event) => {
        const trigger = event.target.closest('.menu-trigger-btn');
        if (trigger) {
            event.preventDefault();
            event.stopPropagation();
            const historyItem = trigger.closest('.history-item');
            const dropdown = historyItem.querySelector('.dropdown-menu');

            closeAllDropdowns(dropdown);

            dropdown.classList.toggle('show');
            historyItem.classList.toggle('menu-open', dropdown.classList.contains('show'));
            return;
        }

        const renameBtn = event.target.closest('.rename-btn');
        if (renameBtn) {
            event.preventDefault();
            event.stopPropagation();
            const historyItem = renameBtn.closest('.history-item');
            const dropdown = historyItem.querySelector('.dropdown-menu');
            dropdown.classList.remove('show');
            historyItem.classList.remove('menu-open');

            startRename(historyItem);
            return;
        }

        const deleteBtn = event.target.closest('.delete-btn');
        if (deleteBtn) {
            event.preventDefault();
            event.stopPropagation();
            const historyItem = deleteBtn.closest('.history-item');
            const dropdown = historyItem.querySelector('.dropdown-menu');
            dropdown.classList.remove('show');
            historyItem.classList.remove('menu-open');

            showDeleteModal(historyItem.getAttribute('data-id'));
            return;
        }

        const link = event.target.closest('.history-link');
        if (link) {
            event.preventDefault();
            const historyItem = link.closest('.history-item');
            const id = historyItem.getAttribute('data-id');

            if (historyItem.querySelector('.rename-input')) {
                return;
            }

            history.pushState(null, "", `/c/${id}`);
            switchConversation(id);
        }
    });

    // Close menus on outside clicks
    document.addEventListener('click', () => {
        closeAllDropdowns();
    });

    confirmCancelDelete.addEventListener('click', hideDeleteModal);

    deleteModal.addEventListener('click', (event) => {
        if (event.target === deleteModal) {
            hideDeleteModal();
        }
    });

    confirmConfirmDelete.addEventListener('click', () => {
        if (!activeDeleteId) return;
        const id = activeDeleteId;

        fetch(`/api/conversations/${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const item = historyList.querySelector(`.history-item[data-id="${id}"]`);
                if (item) {
                    item.remove();
                }
                showToast("Deleted");

                const activeId = getActiveConversationId();
                if (String(activeId) === String(id)) {
                    window.location.href = "/";
                }
            } else {
                alert("Error deleting conversation: " + (data.error || "Unknown error"));
            }
            hideDeleteModal();
        })
        .catch(err => {
            console.error("Delete call failed:", err);
            hideDeleteModal();
        });
    });

    // Message action buttons, code block copy, and suggested prompts delegation
    messagesList.addEventListener('click', (event) => {
        // 1. Suggested Prompts Click Handler
        const card = event.target.closest('.prompt-card');
        if (card) {
            const promptText = card.getAttribute('data-prompt');
            if (promptText) {
                questionInput.value = promptText;
                sendButton.classList.add("has-text");
                submitChat();
            }
            return;
        }

        // 2. Copy code block button
        const codeCopyBtn = event.target.closest('.copy-code-btn');
        if (codeCopyBtn) {
            const container = codeCopyBtn.closest('.code-block-container');
            if (container) {
                const code = container.querySelector('pre code');
                if (code) {
                    const codeText = code.textContent;
                    navigator.clipboard.writeText(codeText).then(() => {
                        codeCopyBtn.textContent = 'Copied!';
                        codeCopyBtn.classList.add('copied');
                        showToast("Copied!");
                        setTimeout(() => {
                            codeCopyBtn.textContent = 'Copy';
                            codeCopyBtn.classList.remove('copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy code: ', err);
                    });
                }
            }
            return;
        }

        // 3. Copy whole message content button
        const copyBtn = event.target.closest('.copy-btn');
        if (copyBtn) {
            event.preventDefault();
            event.stopPropagation();
            const bubble = copyBtn.closest('.bubble');
            if (bubble) {
                const textEl = bubble.querySelector('.message-text');
                if (textEl) {
                    const clone = textEl.cloneNode(true);
                    clone.querySelectorAll('.code-block-header').forEach(header => header.remove());
                    const copyText = clone.innerText || clone.textContent;
                    
                    navigator.clipboard.writeText(copyText.trim()).then(() => {
                        showToast("Copied!");
                    }).catch(err => {
                        console.error('Failed to copy message:', err);
                    });
                }
            }
            return;
        }

        // 4. Regenerate button
        const regenerateBtn = event.target.closest('.regenerate-btn');
        if (regenerateBtn) {
            event.preventDefault();
            event.stopPropagation();
            if (submitting) return;

            const conversationId = getActiveConversationId();
            if (!conversationId) return;

            const lastRow = messagesList.lastElementChild;
            if (lastRow && lastRow.classList.contains('assistant')) {
                lastRow.remove();
            }

            startRegenerationStream(conversationId);
            return;
        }

        // 5. Edit message button
        const editBtn = event.target.closest('.edit-btn');
        if (editBtn) {
            event.preventDefault();
            event.stopPropagation();
            if (submitting) return;

            const bubble = editBtn.closest('.bubble');
            const messageRow = bubble.closest('.message-row');
            const messageId = messageRow.getAttribute('data-id');
            const textEl = bubble.querySelector('.message-text');
            if (!textEl || !messageId) return;

            const originalContent = textEl.innerText;

            const headerEl = bubble.querySelector('.bubble-header');
            const actionsEl = bubble.querySelector('.message-actions');

            headerEl.style.display = 'none';
            textEl.style.display = 'none';
            if (actionsEl) actionsEl.style.display = 'none';

            const editContainer = document.createElement('div');
            editContainer.className = 'edit-message-container';
            editContainer.innerHTML = `
                <textarea class="edit-message-textarea"></textarea>
                <div class="edit-actions">
                    <button class="edit-btn cancel-btn" type="button">Cancel</button>
                    <button class="edit-btn save-btn" type="button">Save & Submit</button>
                </div>
            `;

            bubble.appendChild(editContainer);
            const textarea = editContainer.querySelector('.edit-message-textarea');
            textarea.value = originalContent;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            const cancelBtn = editContainer.querySelector('.cancel-btn');
            const saveBtn = editContainer.querySelector('.save-btn');

            function restoreOriginal() {
                editContainer.remove();
                headerEl.style.cssText = '';
                textEl.style.cssText = '';
                if (actionsEl) actionsEl.style.cssText = '';
            }

            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                restoreOriginal();
            });

            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    restoreOriginal();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    saveAndSubmit();
                }
            });

            function saveAndSubmit() {
                const newContent = textarea.value.trim();
                if (!newContent) {
                    restoreOriginal();
                    return;
                }

                if (newContent === originalContent) {
                    restoreOriginal();
                    return;
                }

                const conversationId = getActiveConversationId();
                if (!conversationId) return;

                fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: newContent })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        showToast("Saved");
                        textEl.textContent = newContent;
                        restoreOriginal();

                        // Truncate following messages in DOM
                        while (messageRow.nextElementSibling) {
                            messageRow.nextElementSibling.remove();
                        }

                        // Trigger regeneration for the updated history
                        startRegenerationStream(conversationId);
                    } else {
                        alert("Error saving message: " + (data.error || "Unknown error"));
                        restoreOriginal();
                    }
                })
                .catch(err => {
                    console.error("Save message request failed:", err);
                    restoreOriginal();
                });
            }

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                saveAndSubmit();
            });

            return;
        }
    });

    // Handle "New Chat" click
    if (newChatButton) {
        newChatButton.addEventListener("click", () => {
            newChatButton.animate(
                [
                    { transform: "scale(1)" },
                    { transform: "scale(.96)" },
                    { transform: "scale(1)" }
                ],
                { duration: 180 }
            );

            fetch('/api/conversations', {
                method: 'POST'
            })
            .then(res => res.json())
            .then(newConv => {
                const item = document.createElement("div");
                item.className = "history-item active";
                item.setAttribute("data-id", String(newConv.id));
                item.innerHTML = `
                    <a href="/c/${newConv.id}" class="history-link">
                        <span class="history-title">${escapeHtml(newConv.title)}</span>
                    </a>
                    <div class="history-actions">
                        <button class="menu-trigger-btn" type="button">⋯</button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item rename-btn" type="button">Rename</button>
                            <button class="dropdown-item delete-btn" type="button">Delete</button>
                        </div>
                    </div>
                `;

                const otherItems = historyList.querySelectorAll('.history-item');
                otherItems.forEach(oi => oi.classList.remove('active'));

                historyList.insertBefore(item, historyList.firstChild);

                history.pushState(null, "", `/c/${newConv.id}`);
                switchConversation(newConv.id, true);
            })
            .catch(err => {
                console.error("Error creating new chat:", err);
            });
        });
    }

    // Handle back/forward navigation
    window.addEventListener("popstate", () => {
        const match = window.location.pathname.match(/\/c\/(\d+)/);
        if (match) {
            const id = match[1];
            switchConversation(id);
        } else {
            window.location.reload();
        }
    });

    window.addEventListener("load", () => {
        parseAllExistingAssistantMessages();
        applyMessageReveal();
        autoScrollEnabled = true;
        scrollToBottom("auto");
        questionInput.focus();
        checkEmptyState();
    });

    chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitChat();
    });

    questionInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitChat();
        }
    });

    questionInput.addEventListener("input", () => {
        const hasText = questionInput.value.trim().length > 0;
        sendButton.classList.toggle("has-text", hasText);
    });

    messagesWrap.addEventListener("scroll", () => {
        // Smart Auto scroll detection
        const threshold = 50;
        const isAtBottom = messagesWrap.scrollHeight - messagesWrap.scrollTop - messagesWrap.clientHeight <= threshold;
        if (isAtBottom) {
            autoScrollEnabled = true;
        } else {
            autoScrollEnabled = false;
        }
    }, { passive: true });

})();
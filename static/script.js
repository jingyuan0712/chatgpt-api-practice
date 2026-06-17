(function () {
    const messagesWrap = document.getElementById('messagesWrap');
    const messagesList = document.getElementById('messagesList');
    const chatForm = document.getElementById('chatForm');
    const questionInput = document.getElementById('questionInput');
    const sendButton = document.getElementById('sendButton');

    if (!messagesWrap || !chatForm || !questionInput || !sendButton) {
        return;
    }

    let submitting = false;
    const messageContainer = messagesList && messagesList.classList.contains('messages') ? messagesList : messagesWrap;

    function scrollToBottom(behavior) {
        messagesWrap.scrollTo({
            top: messagesWrap.scrollHeight,
            behavior: behavior || 'auto'
        });
    }

    function applyMessageReveal() {
        const rows = messageContainer ? messageContainer.querySelectorAll('.message-row') : [];

        rows.forEach(function (row, index) {
            row.style.animationDelay = (index * 35) + 'ms';
        });
    }

    function createTypingIndicator() {
        const typingRow = document.createElement('div');
        typingRow.className = 'message-row assistant typing-row';
        typingRow.setAttribute('data-typing-indicator', 'true');
        typingRow.innerHTML = [
            '<div class="bubble assistant">',
            '  <div class="bubble-label">AI</div>',
            '  <div class="typing-indicator" aria-label="AI is typing" role="status">',
            '    <span class="typing-dot"></span>',
            '    <span class="typing-dot"></span>',
            '    <span class="typing-dot"></span>',
            '  </div>',
            '</div>'
        ].join('');

        return typingRow;
    }

    function setLoadingState(isLoading) {
        sendButton.classList.toggle('is-loading', isLoading);
        sendButton.setAttribute('aria-busy', String(isLoading));
        questionInput.readOnly = isLoading;
        sendButton.disabled = isLoading;
    }

    function ensureTypingIndicator() {
        if (!messageContainer || messageContainer.querySelector('[data-typing-indicator="true"]')) {
            return null;
        }

        const typingIndicator = createTypingIndicator();
        messageContainer.appendChild(typingIndicator);
        scrollToBottom('smooth');
        return typingIndicator;
    }

    function submitChat() {
        if (submitting) {
            return;
        }

        if (!chatForm.checkValidity()) {
            chatForm.reportValidity();
            return;
        }

        submitting = true;
        setLoadingState(true);
        ensureTypingIndicator();

        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                chatForm.submit();
            });
        });
    }

    window.addEventListener('load', function () {
        applyMessageReveal();
        window.requestAnimationFrame(function () {
            scrollToBottom('smooth');
        });
    });

    messagesWrap.addEventListener('scroll', function () {
        messagesWrap.dataset.scrolled = String(messagesWrap.scrollTop > 40);
    }, { passive: true });

    chatForm.addEventListener('submit', function (event) {
        event.preventDefault();
        submitChat();
    });

    questionInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submitChat();
        }
    });

    questionInput.addEventListener('input', function () {
        sendButton.classList.toggle('has-text', questionInput.value.trim().length > 0);
    });

    document.querySelectorAll('.message-row').forEach(function (row) {
        row.addEventListener('animationend', function () {
            row.style.animationDelay = '0ms';
        }, { once: true });
    });
})();

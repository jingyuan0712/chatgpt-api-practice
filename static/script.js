(function () {

    const messagesWrap = document.getElementById('messagesWrap');
    const messagesList = document.getElementById('messagesList');

    const chatForm = document.getElementById('chatForm');
    const questionInput = document.getElementById('questionInput');
    const sendButton = document.getElementById('sendButton');

    const newChatButton = document.querySelector('.new-chat-btn');

    if (
        !messagesWrap ||
        !chatForm ||
        !questionInput ||
        !sendButton
    ) {
        return;
    }

    let submitting = false;

    function scrollToBottom(behavior = "smooth") {

        messagesWrap.scrollTo({
            top: messagesWrap.scrollHeight,
            behavior
        });

    }

    function applyMessageReveal() {

        const rows = document.querySelectorAll('.message-row');

        rows.forEach((row, index) => {

            row.style.opacity = "0";
            row.style.transform = "translateY(12px)";

            setTimeout(() => {

                row.style.transition =
                    "all .25s ease";

                row.style.opacity = "1";
                row.style.transform =
                    "translateY(0)";

            }, index * 40);

        });

    }

    function createTypingIndicator() {

        const row =
            document.createElement("div");

        row.className =
            "message-row assistant typing-row";

        row.setAttribute(
            "data-typing-indicator",
            "true"
        );

        row.innerHTML = `
            <div class="bubble assistant">

                <div class="bubble-header">

                    <div class="avatar-mini ai-avatar">
                        AI
                    </div>

                    Nova AI

                </div>

                <div class="typing-indicator">

                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>

                </div>

            </div>
        `;

        return row;
    }

    function ensureTypingIndicator() {

        const existing =
            document.querySelector(
                '[data-typing-indicator="true"]'
            );

        if (existing) {
            return existing;
        }

        const indicator =
            createTypingIndicator();

        messagesList.appendChild(indicator);

        scrollToBottom();

        return indicator;
    }

    function removeTypingIndicator() {

        const indicator =
            document.querySelector(
                '[data-typing-indicator="true"]'
            );

        if (indicator) {
            indicator.remove();
        }
    }

    function setLoadingState(isLoading) {

        sendButton.classList.toggle(
            "is-loading",
            isLoading
        );

        sendButton.disabled =
            isLoading;

        questionInput.readOnly =
            isLoading;

        sendButton.setAttribute(
            "aria-busy",
            String(isLoading)
        );

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

        requestAnimationFrame(() => {

            requestAnimationFrame(() => {

                chatForm.submit();

            });

        });

    }

    window.addEventListener("load", () => {

        applyMessageReveal();

        scrollToBottom("auto");

        questionInput.focus();

    });

    chatForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            submitChat();

        }
    );

    questionInput.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                submitChat();

            }

        }
    );

    questionInput.addEventListener(
        "input",
        () => {

            const hasText =
                questionInput.value
                    .trim()
                    .length > 0;

            sendButton.classList.toggle(
                "has-text",
                hasText
            );

        }
    );

    messagesWrap.addEventListener(
        "scroll",
        () => {

            messagesWrap.dataset.scrolled =
                messagesWrap.scrollTop > 40;

        },
        { passive: true }
    );

    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            () => {

                newChatButton.animate(
                    [
                        {
                            transform:
                                "scale(1)"
                        },
                        {
                            transform:
                                "scale(.96)"
                        },
                        {
                            transform:
                                "scale(1)"
                        }
                    ],
                    {
                        duration: 180
                    }
                );

                console.log(
                    "New Chat Clicked"
                );

            }
        );

    }

})();
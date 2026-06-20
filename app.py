from db import (
    init_db,
    save_message,
    load_messages,
    create_conversation,
    load_conversations,
    update_conversation_title,
    get_message_count,
    delete_conversation,
    edit_message,
    delete_last_assistant_message
)
from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from dotenv import load_dotenv
from openai import OpenAI
import os
import json

load_dotenv()

# Initialize database tables
init_db()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

app = Flask(__name__)

def generate_title(first_message):
    """
    Calls the LLM to generate a short, friendly conversation title based on the user's first message.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a title generator. Generate an extremely short title (maximum 3-4 words, NO newlines, NO code blocks, NO markdown, in the same language as the user's message) that summarizes the user's input."
                },
                {
                    "role": "user",
                    "content": first_message
                }
            ],
            max_tokens=15,
            temperature=0.5
        )
        title = response.choices[0].message.content.strip()
        # Clean title from any newlines, quotes, or markdown formatting
        title = title.split('\n')[0]
        title = title.replace('"', '').replace("'", "").replace("`", "").replace("#", "").strip()
        return title if title else "New Chat"
    except Exception as e:
        print(f"Error generating title: {e}")
        return "New Chat"

@app.route("/", methods=["GET"])
def home():
    """
    Home route. Redirects to the most recent conversation, or creates a new one if none exist.
    """
    conversations = load_conversations()
    if conversations:
        return redirect(url_for("chat_view", conversation_id=conversations[0]["id"]))
    else:
        new_conv = create_conversation()
        return redirect(url_for("chat_view", conversation_id=new_conv["id"]))

@app.route("/c/<int:conversation_id>", methods=["GET", "POST"])
def chat_view(conversation_id):
    """
    Renders the page for a specific conversation. Supports standard form POST as fallback.
    """
    conversations = load_conversations()
    
    # Check if conversation exists
    active_conv = None
    for c in conversations:
        if c["id"] == conversation_id:
            active_conv = c
            break
            
    if not active_conv:
        return redirect(url_for("home"))
        
    # Support standard form POST as fallback
    if request.method == "POST":
        question = request.form.get("question")
        if question:
            is_first = (get_message_count(conversation_id) == 0)
            save_message(conversation_id, "user", question)
            
            chat_history = load_messages(conversation_id)
            api_history = [{"role": msg["role"], "content": msg["content"]} for msg in chat_history]
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=api_history
                )
                answer = response.choices[0].message.content
            except Exception as e:
                answer = f"Error communicating with AI: {e}"
                
            save_message(conversation_id, "assistant", answer)
            
            if is_first:
                title = generate_title(question)
                update_conversation_title(conversation_id, title)
                
        return redirect(url_for("chat_view", conversation_id=conversation_id))
        
    # GET: Load messages and render the page
    messages = load_messages(conversation_id)
    return render_template(
        "index.html",
        conversations=conversations,
        messages=messages,
        active_id=conversation_id
    )

# --- JSON API ENDPOINTS ---

@app.route("/api/conversations", methods=["GET"])
def api_get_conversations():
    """
    API to fetch all conversations in JSON.
    """
    return jsonify(load_conversations())

@app.route("/api/conversations", methods=["POST"])
def api_create_conversation():
    """
    API to create a new conversation.
    """
    new_conv = create_conversation()
    return jsonify(new_conv)

@app.route("/api/conversations/<int:conversation_id>/messages", methods=["GET"])
def api_get_messages(conversation_id):
    """
    API to get all messages for a specific conversation.
    """
    return jsonify(load_messages(conversation_id))

@app.route("/api/conversations/<int:conversation_id>", methods=["PUT"])
def api_update_conversation(conversation_id):
    """
    API to update a conversation title.
    """
    data = request.get_json() or {}
    title = data.get("title")
    if not title:
        return jsonify({"status": "error", "error": "Title is required"}), 400
    update_conversation_title(conversation_id, title)
    return jsonify({"status": "success", "id": conversation_id, "title": title})

@app.route("/api/conversations/<int:conversation_id>", methods=["DELETE"])
def api_delete_conversation(conversation_id):
    """
    API to delete a conversation.
    """
    delete_conversation(conversation_id)
    return jsonify({"status": "success", "id": conversation_id})

@app.route("/api/conversations/<int:conversation_id>/messages/<int:message_id>", methods=["PUT"])
def api_edit_message(conversation_id, message_id):
    """
    API to edit a specific message and truncate subsequent conversation history.
    """
    data = request.get_json() or {}
    new_content = data.get("content")
    if not new_content:
        return jsonify({"status": "error", "error": "Content is required"}), 400
    edit_message(conversation_id, message_id, new_content)
    return jsonify({"status": "success", "id": message_id})

# --- SSE STREAMING ENDPOINTS ---

@app.route("/api/conversations/<int:conversation_id>/stream", methods=["GET"])
def api_stream_message(conversation_id):
    """
    SSE endpoint to stream response token-by-token.
    Saves user message, loads history, streams AI tokens, saves complete response,
    and returns a done status with conversation title update if first message.
    """
    question = request.args.get("message")
    
    if not question:
        return jsonify({"status": "error", "error": "Message is required"}), 400

    def event_stream():
        # Check if first message
        is_first = (get_message_count(conversation_id) == 0)
        
        # Save user message
        user_msg_id = save_message(conversation_id, "user", question)
        
        # Get history (now includes user message)
        chat_history = load_messages(conversation_id)
        api_history = [{"role": msg["role"], "content": msg["content"]} for msg in chat_history]
        
        full_response = ""
        try:
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=api_history,
                stream=True
            )
            
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
            
        # Save assistant message
        assistant_msg_id = save_message(conversation_id, "assistant", full_response)
        
        title_updated = False
        new_title = None
        
        # Generate title if it was the first message
        if is_first:
            new_title = generate_title(question)
            update_conversation_title(conversation_id, new_title)
            title_updated = True
            
        yield f"data: {json.dumps({'done': True, 'title_updated': title_updated, 'new_title': new_title, 'user_message_id': user_msg_id, 'assistant_message_id': assistant_msg_id})}\n\n"
        
    return Response(event_stream(), mimetype="text/event-stream")

@app.route("/api/conversations/<int:conversation_id>/regenerate", methods=["GET"])
def api_regenerate_message(conversation_id):
    """
    SSE endpoint to delete the last assistant message and stream a new completion for the remaining history.
    """
    # Delete last assistant message
    deleted = delete_last_assistant_message(conversation_id)
    
    # Load remaining messages
    chat_history = load_messages(conversation_id)
    
    if not chat_history:
        return jsonify({"status": "error", "error": "No message history to regenerate from"}), 400
        
    def event_stream():
        api_history = [{"role": msg["role"], "content": msg["content"]} for msg in chat_history]
        full_response = ""
        try:
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=api_history,
                stream=True
            )
            
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
            
        # Save new assistant message
        assistant_msg_id = save_message(conversation_id, "assistant", full_response)
        yield f"data: {json.dumps({'done': True, 'assistant_message_id': assistant_msg_id})}\n\n"
        
    return Response(event_stream(), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(debug=True)
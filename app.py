from db import save_message, load_messages
from flask import Flask, render_template, request


from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

app = Flask(__name__)




@app.route("/", methods=["GET", "POST"])
def home():

    chat_history = load_messages()

    if request.method == "POST":

        question = request.form["question"]

        save_message(
            "user",
            question
        )

        chat_history = load_messages()

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=chat_history
        )

        answer = response.choices[0].message.content

        save_message(
            "assistant",
            answer
        )

        chat_history = load_messages()

    return render_template(
        "index.html",
        messages=chat_history
    )


if __name__ == "__main__":
    app.run(debug=True)
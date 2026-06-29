import time
import os
from flask import Flask, render_template, request, jsonify


app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.urandom(24)



@app.route('/')
def index():
    return render_template('index.html') #main page


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
#import app
from flask import Flask
from flask_socketio import SocketIO,emit, join_room, leave_room
from lib.utils import *
import argparse

app = Flask(__name__)
async_mode = None
socketio = SocketIO(app,ping_timeout=25,ping_interval=5,max_http_buffer_size=1e9,async_mode=async_mode)


parser = argparse.ArgumentParser( prog = 'SD-collage')
parser.add_argument('-s', '--startimage',action='store_true')
parser.add_argument('-ssl', '--runinssl',action='store_true')
args = parser.parse_args()

@app.route("/")
def hello():
    return "<h1 style='color:blue'>Hello There!</h1>"

if __name__ == "__main__":
    #app.run(host='0.0.0.0')
    socketio.run(app,debug=False,host="0.0.0.0")

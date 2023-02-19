from flask import Flask, render_template,session,request,send_from_directory
from flask_socketio import SocketIO,emit, join_room, leave_room
import glob,os
import threading
from threading import Timer
import time
import argparse
from PIL import Image

#defaults:::::::::::::::::::::::::::::::::::::::::::

defaults={
    "width":3600,
    "height":2800,
    "firstimagewait":0
}

#end defaults:::::::::::::::::::::::::::::::::::::::


TEMPLATE_DIR = os.path.abspath('frontend')
STATIC_DIR = os.path.abspath('frontend/static')

from backend.automatic1111 import imageGenerator
async_mode = None
app = Flask(__name__,template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
socketio = SocketIO(app,ping_timeout=25,ping_interval=5,max_http_buffer_size=1e9,async_mode=async_mode)

imagesfolder="images/"

IG=imageGenerator(imagesfolder)

users={}
images=[]

#load images from folder (doesn't take yet room into account)

imgs=glob.glob(imagesfolder+"*.jpg")
imgs.sort(key=str.lower)
print("IMAGESSS",imgs)
for file in imgs:
    img=file.split("_")
    newimage={"imguri":file,"x":img[1],"y":img[2].split(".")[0]} 
    images.append(newimage)
#print("IMAGES",images)

parser = argparse.ArgumentParser( prog = 'SD-collage')
parser.add_argument('-s', '--startimage',action='store_true')
parser.add_argument('-ssl', '--runinssl',action='store_true')
args = parser.parse_args()

if args.startimage:
    imgs=os.listdir(imagesfolder)
    imgs.sort(key=str.lower)
    firstimage=imgs[0]
    print("Grabbing the first image as background template:",firstimage)
    firstimagesize=Image.open(imagesfolder+firstimage).size
    defaults={
        "width":firstimagesize[0],
        "height":firstimagesize[1],
        "firstimagewait":300 #in milliseconds
    }



@app.route('/')
def main():
    mode = request.args.get('mode', default = "", type = str)
    defaults["mode"]=mode
    if args.runinssl:
        defaults["mode"]+=" ssl"
    return render_template('index.html',defaults=defaults)

@app.route('/images/<path:filename>')
def base_static(filename):
    return send_from_directory(app.root_path + '/images/', filename)

# ------- SOCKETS ----------

@socketio.on('joined')
def joined(message):
    print(message)
    print("JOINED!")
    """Sent by clients when they enter a room.
    A status message is broadcast to all people in the room."""
    sid=request.sid
    join_room(sid)
   
    session["sid"]=sid
    session['room']=sid

    users[sid]={"box":message["box"]}
    msg='user '+str(sid)+'has entered the room.'
    print(msg)
    print("")
    print("USERS")
    for u in users:
        print(u)
    print("")
    emit("yoursid",{"sid":sid})
    usersExceptMe()
    updateImages()

    #socketio.start_background_task(target=periodic_emit)
    #emit('status', users, room=room)

@socketio.on('ok')
def recieved():
    pass

@socketio.on('getupdates')
def getupdates():
    print("asked for updates from",request.sid)
    socketio.emit('update', users , room=request.sid)

@socketio.on('prompt')
def prompt(message):
    p=message["prompt"]
    x=message["x"]
    y=message["y"]
    sid=message["sid"]
    print("")
    print("KKKKKKKKKKKKKKKKKKKKKKKKKK")
    print("prompt:",p,"by:",sid)
    print("KKKKKKKKKKKKKKKKKKKKKKKKKK")
    print("SID",sid,"=======================================================")
    imageid=IG.generateImage(p,startimage=message["baseimg"],x=x,y=y,room=sid)
    print("new image",imageid)
    print("")
    newimage={"imguri":imagesfolder+imageid+".jpg","x":x,"y":y}
    images.append(newimage)
    del users[sid]["prompt"]
    emit("promptready",{"sid":sid},room=sid)
    updateImages()
    

@socketio.on('boxchange')
def text(message):
    sid=request.sid
    #move={"sid":sid,"box":message}
    users[sid]["box"]=message["box"]
    users[sid]["prompt"]=message["prompt"]
    usersExceptMe()


@socketio.on('ghostuser')
def setghostuser():
    del users[request.sid]

@socketio.on('left', namespace='/collage')
def left(message):
    """Sent by clients when they leave a room.
    A status message is broadcast to all people in the room."""

    leave_room(request.sid)
    emit('status', {'msg': session.get('name') + ' has left the room.'})


@socketio.on('disconnect')
def disconnect():
    print("user",request.sid," disconected")
    del users[request.sid]
    emit("disconected",{"sid":request.sid})


@socketio.on('ping')
def onping():
    print("PING!!")

@socketio.event
def my_ping():
    print("my ping")
    emit('my_pong')
## FUNCTIONS ::::::::::::::::::::::::::::::::::::::::::


"""
def periodic_emit():
    while True:
        print("updatee")
        socketio.sleep(25)
        usersExceptMe()
"""

def usersExceptMe():
    socketio.emit('update', users , broadcast=True,include_self=False)

def updateImages():
    emit('newimage', images,broadcast=True )

if __name__ == '__main__':
    if args.runinssl:
        socketio.run(app,debug=True,host="0.0.0.0",keyfile='key.pem', certfile='cert.pem')
    else:
        socketio.run(app,debug=True,host="0.0.0.0")

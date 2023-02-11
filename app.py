from flask import Flask, render_template,session,request,send_from_directory
from flask_socketio import SocketIO,emit, join_room, leave_room
import os

TEMPLATE_DIR = os.path.abspath('frontend')
STATIC_DIR = os.path.abspath('frontend/static')

from backend.automatic1111 import imageGenerator

app = Flask(__name__,template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
socketio = SocketIO(app,ping_timeout=5,ping_interval=1)

imagesfolder="images/"

IG=imageGenerator(imagesfolder)

users={}
images=[]

@app.route('/')
def main():
    return render_template('index.html')

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
    room="collage"
    join_room(room)
    sid=request.sid
    session["sid"]=sid
    session['room']=room
    print("room",room)

    users[sid]={"box":message["box"]}
    msg='user '+str(sid)+'has entered the room.'
    print(msg)
    print("")
    print("USERS")
    for u in users:
        print(u)
    print("")
    emit("yoursid",{"sid":sid})
    usersExceptMe(users,sid,room)
    #emit('status', users, room=room)

@socketio.on('ok')
def recieved():
    pass

@socketio.on('prompt')
def prompt(message):
    p=message["prompt"]
    x=message["x"]
    y=message["y"]
    sid=message["sid"]
    print("new prompt",message)
    imageid=IG.generateImage(p)
    print("new image",imageid)
    print("")
    newimage={"imguri":imagesfolder+imageid+".png","x":x,"y":y}
    images.append(newimage)
    room = session.get('room')
    emit("promptready",{"sid":sid},room=room)
    updateImages()
    

@socketio.on('boxchange')
def text(message):
    sid=request.sid
    
    """Sent by a client
    The message is sent to all people in the room."""
    room = session.get('room')
    
    move={"sid":sid,"box":message}
    print("boxmove",move)
    users[sid]["box"]=message["box"]
    users[sid]["prompt"]=message["prompt"]
    usersExceptMe(users,sid,room)
    #emit('message', move, room=room)


@socketio.on('left', namespace='/collage')
def left(message):
    """Sent by clients when they leave a room.
    A status message is broadcast to all people in the room."""
    room = session.get('room')
    leave_room(room)
    emit('status', {'msg': session.get('name') + ' has left the room.'}, room=room)


@socketio.on('disconnect')
def disconnect():
    print("user",request.sid," disconected")
    del users[request.sid]

def usersExceptMe(usrs,meid,room):
    u=usrs.copy()
    #if meid in u:
    #    del u[meid]
    #    print(u)
    emit('update', usrs , room=room,include_self=False)

def updateImages():
    room = session.get('room')
    emit('newimage', images , room=room)

if __name__ == '__main__':
    socketio.run(app,debug=True,host="0.0.0.0")

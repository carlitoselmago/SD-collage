from flask import Flask, render_template,session,request
from flask_socketio import SocketIO,emit, join_room, leave_room
import os

TEMPLATE_DIR = os.path.abspath('frontend')
STATIC_DIR = os.path.abspath('frontend/static')


app = Flask(__name__,template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
socketio = SocketIO(app,ping_timeout=5,ping_interval=1)


users={}


@app.route('/')
def main():
    return render_template('index.html')


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

if __name__ == '__main__':
    socketio.run(app,debug=True)

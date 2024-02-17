from flask import Flask, render_template,session,request,send_from_directory
from flask import Flask, request, render_template, redirect, url_for, flash, session
from flask_socketio import SocketIO,emit, join_room, leave_room
import glob,os
import threading
from threading import Timer
import time
import argparse
from PIL import Image
from lib.utils import *
from engineio.payload import Payload
from datetime import datetime
import requests
import shutil
from werkzeug.utils import secure_filename

Payload.max_decode_packets = 40
#defaults:::::::::::::::::::::::::::::::::::::::::::

#estimated max pixel area for desktop =117000000px (13000x9000)
#estimated max pixel are for mobile = 64000000px (8000x8000)

defaults={
    "width":8000,
    "height":8000,
    "firstimagewait":0
}

#end defaults:::::::::::::::::::::::::::::::::::::::


TEMPLATE_DIR = os.path.abspath('frontend')
STATIC_DIR = os.path.abspath('frontend/static')

from backend.automatic1111 import imageGenerator
async_mode = None
app = Flask(__name__,template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
socketio = SocketIO(app,ping_timeout=60,ping_interval=25,max_http_buffer_size=1e9,async_mode=async_mode)
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024 * 1024  # 1 GB limit
app.secret_key = str(os.getpid())
imagesfolder="images/"

users={}
images=[]

parser = argparse.ArgumentParser( prog = 'SD-collage')
parser.add_argument('-s', '--startimage',action='store_true',help='If true, use first image found as bg image')
parser.add_argument('-pass', '--password',action='store_true',default="12345",help='password for config page')
parser.add_argument('-ssl', '--runinssl',action='store_true')
parser.add_argument('-url', '--sdengineurl',help='Especifies the url of the sd generator')
args = parser.parse_args()

IG=imageGenerator(imagesfolder,args.sdengineurl,args.sdengineurl)
PASSWORD=args.password

defaults={}

def init_SDcollage():
    global defaults
    global args
    images=[]
    if args.startimage:
        imgs=os.listdir(imagesfolder)
        imgs.sort(key=str.lower)
        bgimage=imgs[0]
        #print("Grabbing the first image as background template:",bgimage)
        bgimage=Image.open(imagesfolder+bgimage)#args.startimage)
        #tileImage(bgimage)
        defaults={
            "width":bgimage.size[0],
            "height":bgimage.size[1],
            "firstimagewait":300 #in milliseconds
        }
        images=[bgimage]
        del bgimage


    imgs=glob.glob(imagesfolder+"*.jpg")
    imgs.sort(key=str.lower)
    #print("IMAGESSS",imgs)
    for file in imgs:
        img=file.split("_")
        newimage={"imguri":file,"x":img[1],"y":img[2].split(".")[0]}
        images.append(newimage)

init_SDcollage()


@app.route('/')
def main():
    mode = request.args.get('mode', default = "", type = str)
    defaults["mode"]=mode
    if args.runinssl:
        defaults["mode"]+=" ssl"
    
    
    if args.startimage:
        defaults["mode"]+=" startimage"
    return render_template('index.html',defaults=defaults)

@app.route('/images/<path:filename>')
def base_static(filename):
    return send_from_directory(app.root_path + '/images/', filename)


@app.route('/config', methods=['GET', 'POST'])
def config():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == PASSWORD:
            # Password is correct, proceed to file upload page
            return render_template('upload.html')
        else:
            flash('Incorrect password', 'danger')
            return redirect(url_for('config'))
    # Show password form
    return render_template('config.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('No file part', 'danger')
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        flash('No selected file', 'danger')
        return redirect(request.url)
    if file:
        # Generate a datetime-named folder inside "saved_collages"
        datetime_folder_name = datetime.now().strftime("%Y%m%d%H%M%S")
        new_folder_path = os.path.join('saved_collages', datetime_folder_name)
        os.makedirs(new_folder_path, exist_ok=True)

        # Move all files from "images" to the new folder
        images_folder_path = 'images'
        for filename in os.listdir(images_folder_path):
            source_path = os.path.join(images_folder_path, filename)
            destination_path = os.path.join(new_folder_path, filename)
            shutil.move(source_path, destination_path)

        # Save the uploaded file to "images" with the new name
        #new_filename = "00" + secure_filename(file.filename) + "_0_0"
        base_name, extension = os.path.splitext(secure_filename(file.filename))
        new_filename = f"00{base_name}_0_0{extension}"
        file.save(os.path.join(images_folder_path, new_filename))

        time.sleep(1)
        #reset backend
        init_SDcollage()

        #reset frontend
        socketio.emit("reset",{},broadcast=True)

        flash('File successfully uploaded and folders updated', 'success')
        return redirect(url_for('config'))
    return ''

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

@socketio.on('backendstatus')
def backendstatus():
    #x = threading.Thread(target=isUp, args=(args.sdengineurl,socketio,))
    #x.start()
    status=isUp(args.sdengineurl,socketio,request.sid)
    #socketio.emit('backendresponse', {"status":status})#, room=request.sid)

@socketio.on('getupdates')
def getupdates():
    #print("asked for updates from",request.sid)
    socketio.emit('update', users , room=request.sid)

@socketio.on('prompt')
def prompt(message):
    p=message["prompt"]
    x=message["x"]
    y=message["y"]
    sid=message["sid"]
    emit("newprompt",{"prompt":p,"x":x,"y":y},broadcast=True)
    #print("")
    #print("KKKKKKKKKKKKKKKKKKKKKKKKKK")
    #print("prompt:",p,"by:",sid)
    #print("KKKKKKKKKKKKKKKKKKKKKKKKKK")
    #print("SID",sid,"=======================================================")
    imageid=IG.generateImage(p,startimage=message["baseimg"],x=x,y=y,room=sid)
    #print("imageid",imageid)
    status=True
    if imageid=="":
        status=False
    else:
        print("new image",imageid)
        print("")
        newimage={"imguri":imagesfolder+imageid+".jpg","x":x,"y":y}
        images.append(newimage)

    #print("generated image status",status)
    del users[sid]["prompt"]
    emit("promptready",{"sid":sid,"status":status},room=sid)
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
    try:
        del users[request.sid]
    except:
        pass
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

def isUp(url,socketio,sid):
    url+="/docs"
    print(url)
    status=False
    try:
        response=requests.get(url,timeout=1)
        print("=====================",response,url)
        if response.status_code==200:
            status=True
    except:
        pass
    print("STATUS",status,"LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL")
    socketio.emit('backendresponse', {"status":status},room=sid)
    #return status

if __name__ == '__main__':
    if args.runinssl:
        socketio.run(app,debug=False,host="0.0.0.0",keyfile='key.pem', certfile='cert.pem')
    else:
        socketio.run(app,debug=False,host="0.0.0.0")

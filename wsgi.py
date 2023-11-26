"""
from app import app,socketio

if __name__ == "__main__":
    socketio.run(app)
"""
#from fakeapp import app
from app import app

if __name__ == "__main__":
    app.run()

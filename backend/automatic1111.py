import requests
import json
import base64
import time

class imageGenerator():



    def __init__(self,savefolder=""):
        self.savefolder=savefolder
        pass 

    def loadModel(self):
        pass 

    def generateImage(self,prompt="",steps=10):
        payload = {
            "prompt": prompt,
            "negative_prompt":"",
            "steps": steps,
            "width":512,
            "height":512
        }
        response = requests.post(url=f'http://127.0.0.1:7861/sdapi/v1/txt2img', json=payload)
        r=json.loads(response.text)
        img64=r["images"][0]
        imgdata = base64.b64decode(img64)
        filename=str(time.time() * 1000).replace('.', '')
        fileuri = self.savefolder+(filename)+'.png'  # I assume you have a way of picking unique filenames
        with open(fileuri, 'wb') as f:
            f.write(imgdata)
        return filename


if __name__ == "__main__":
    IG=imageGenerator()
    IG.generateImage("rounded-shaped pomeranian")
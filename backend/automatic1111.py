import requests
import json
import base64
import time
from PIL import Image,ImageOps,ImageFilter
import io
from io import BytesIO
import numpy as np
import skimage
import skimage.measure

import cv2

class imageGenerator():

    negative_prompt="text, letters"

    def __init__(self,savefolder="",url="",bgimage=False):
        if not url:
            url="http://127.0.0.1:7861"
        self.url=url
        self.savefolder=savefolder
        self.STATIC_MASK = Image.open("mask.png")
        self.bgimage=bgimage

        #self.STATIC_MASK=self.pil_to_base64(STATIC_MASK)

    def loadModel(self):
        pass

    def generateImage(self,prompt="",startimage="",steps=12,x=0,y=0,room=""):
        img=self.dataurl_to_pil(startimage)
        extrema = img.convert("L").getextrema()
        itssolid=False
        if not self.bgimage:
            if extrema[0] == extrema[1]:
                itssolid=True

        if itssolid:
            print("ITS A SOLID COLOR!!!!!!!!!!!!!!!!!!!!!!!!!")
            #This image is one solid color
            return self.generateImageText2Image(prompt,steps=steps,x=x,y=y,room=room)
        else:
            print("HAS PREV IMAGE!!!!!!!!!!!!!!!!!!!!!!!!!")
            #its an img 2 img
            return self.generateImage2Image(prompt,startimage=startimage,steps=steps,x=x,y=y,room=room)


    def generateImageText2Image(self,prompt="",steps=10,x=0,y=0,room=""):
        payload = {
            "prompt": prompt,
            "negative_prompt":self.negative_prompt,
            "steps": steps,
            "width":512,
            "height":512
        }
        response = requests.post(url=self.url+f'/sdapi/v1/txt2img', json=payload) #local

        r=json.loads(response.text)
        img64=r["images"][0]
        imgdata = base64.b64decode(img64)
        im=Image.open(BytesIO(imgdata))
        filename=str(time.time() * 1000).replace('.', '')+"_"+str(x)+"_"+str(y)
        fileuri = self.savefolder+(filename)+'.jpg'  # I assume you have a way of picking unique filenames
        im.save(fileuri)
        #with open(fileuri, 'wb') as f:
        #    f.write(imgdata)
        return filename

    def generateImage2Image(self,prompt="",startimage="",steps=15,x=0,y=0,room=""):

        seed= int(time.time())
        inpaint_full_res=False
        image_cfg_scale=15
        denoising_strength=0.6
        inpainting_fill=0

        preimage=startimage
        hasalpha=True
        if self.bgimage:
            hasalpha=False
        else:
            startimage=self.dataurl_to_pil(startimage)
            if self.count_alpha_pixels(startimage)<29800:
                hasalpha=False
        #if self.im_has_alpha(startimage):
        #if 1==2:
        if hasalpha:
            print("HAS SOME ALPHA")
            #startimage = np.array(startimage)
            #maskedimage=self.detect_white_mask(startimage)
            maskedimage=self.create_mask_fromRGBA(startimage)
            #startimage = startimage[:, :, 0:3]
            #startimage,maskedimage=self.applyMask(startimage)
            inpaint_full_res=False
            inpainting_fill=0
        else:
            print("DOESNT HAVE ANY ALPHA")
            #load a template mask
            maskedimage=self.STATIC_MASK
            #maskedimage_invert=(maskedimage.convert('L'))
            inpaint_full_res=True
            image_cfg_scale=25
            denoising_strength=0.7
            #steps=25
            inpainting_fill=1


        #startimage.save("test.png")
        #maskedimage.save("test2.png")

        payload = {
            "init_images": [preimage],#[self.pil_to_base64(startimage)],
            "mask":self.pil_to_base64(maskedimage),
            "mask_blur":8,
            #"initial_noise_multiplier":5,
           # "inpainting_fill": 0,
           "inpainting_fill":inpainting_fill,
            "inpaint_full_res": inpaint_full_res,
            #"inpaint_full_res_padding":52,
            "image_cfg_scale":image_cfg_scale,
            "seed":seed,
            "prompt": prompt,
            "negative_prompt":self.negative_prompt,
            "denoising_strength":denoising_strength,
            "steps": steps,
            "width":512,
            "height":512
        }
        try:
            response = requests.post(url=self.url+f'/sdapi/v1/img2img', json=payload)
            r=json.loads(response.text)
            img64=r["images"][0]
            imgdata = base64.b64decode(img64)
            im=Image.open(BytesIO(imgdata))
            filename=str(time.time() * 1000).replace('.', '')+"_"+str(x)+"_"+str(y)
            fileuri = self.savefolder+(filename)+'.jpg'  # I assume you have a way of picking unique filenames
            im.save(fileuri)
        except:
            filename=""
        return filename

    def applyMask(self,img):

        fill_mode="perlin"
        mask = np.array(self.STATIC_MASK)[:, :, 0]
        img, mask = self.perlin_noise(img, mask)
        init_image = Image.fromarray(img)
        mask = 255 - mask
        mask = skimage.measure.block_reduce(mask, (8, 8), np.max)
        mask = mask.repeat(8, axis=0).repeat(8, axis=1)
        mask_image = Image.fromarray(mask)
        return init_image,mask_image

    def pil_to_base64(self,pil_image):
        with BytesIO() as stream:
            pil_image.save(stream, "PNG", pnginfo=None)
            base64_str = str(base64.b64encode(stream.getvalue()), "utf-8")
            return "data:image/png;base64," + base64_str

    def dataurl_to_pil(self,data):
        print(data[0:200])
        data = data.replace('data:image/png;base64,', '')

        # Convert to bytes
        data = data.encode()

        # The data is encoded as base64, so we decode it.
        data = base64.b64decode(data)
        return Image.open(io.BytesIO(data))

    def detect_white_mask(self,image):
        # Convert the PIL image to a numpy array
        image = np.array(image)

        # Extract the red, green, and blue color channels
        b, g, r, a = cv2.split(image)

        # Combine the red, green, and blue channels into a single grayscale image
        gray = cv2.cvtColor(np.dstack((r, g, b)), cv2.COLOR_BGR2GRAY)

        # Threshold the image to isolate the white pixels
        _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)

        # Return the threshold image as a mask
        return Image.fromarray(thresh)

    def create_mask_fromRGBA(self,image,dilation=50,blur=8,threshold=127):
        mask = image.split()[3].point(lambda x: 255 if x > 0 else 0, '1')
        mask = ImageOps.invert(mask)
        mask = mask.filter(ImageFilter.MaxFilter(size=dilation * 2 + 1))

        # Convert the single-channel grayscale image to a 3-channel RGB image
        mask = mask.convert('RGB')
        mask = mask.filter(ImageFilter.GaussianBlur(radius=blur))
        return mask

    def im_has_alpha(self,img):
        if img.info.get("transparency", None) is not None:
            return True
        if img.mode == "P":
            transparent = img.info.get("transparency", -1)
            for _, index in img.getcolors():
                if index == transparent:
                    return True
        elif img.mode == "RGBA":

            extrema = img.getextrema()
            if extrema[3][0] < 255:
                return True

        return False

    def count_alpha_pixels(self,img):
        data = img.getdata()
        count = 0
        for pixel in data:
            if pixel[3] == 0:
                count += 1
        print("COUNT ALPHA",count)
        return count

    def rgba2rgb(self,rgba_image):
        img = Image.new("RGB", rgba_image.size, (255, 255, 255))
        img.paste(rgba_image, mask = rgba_image.split()[3])
        return img

if __name__ == "__main__":
    IG=imageGenerator()
    IG.generateImage("rounded-shaped pomeranian")

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
from patchmatch import patch_match
import cv2

class imageGenerator():



    def __init__(self,savefolder=""): 
        self.savefolder=savefolder
        self.STATIC_MASK = Image.open("mask.png")
        #self.STATIC_MASK=self.pil_to_base64(STATIC_MASK)

 
      

    def loadModel(self):
        pass 
    
    def generateImage(self,prompt="",startimage="",steps=12,x=0,y=0,room=""):
        img=self.dataurl_to_pil(startimage)
        extrema = img.convert("L").getextrema()
        if extrema[0] == extrema[1]:
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
            "negative_prompt":"",
            "steps": steps,
            "width":512,
            "height":512
        }
        response = requests.post(url=f'http://127.0.0.1:7861/sdapi/v1/txt2img', json=payload)
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
        preimage=startimage
        #startimage= base64.b64decode(startimage)
        #startimage=Image.open(BytesIO(imgdata))
        #startimage=Image.open(io.BytesIO(base64.b64decode(startimage.split(",",1)[0])))
        startimage=self.dataurl_to_pil(startimage)

        #if self.count_alpha_pixels(startimage)>19800:
        if self.im_has_alpha(startimage):
            print("HAS SOME ALPHA")
            #startimage = np.array(startimage)
            #maskedimage=self.detect_white_mask(startimage)
            maskedimage=self.create_mask_fromRGBA(startimage)
            #startimage = startimage[:, :, 0:3]
            #startimage,maskedimage=self.applyMask(startimage)
        else:
            print("doesnt have any alpha")
            #load a template mask
            maskedimage=self.STATIC_MASK
        
        #startimage.save("images/test.png")
        #maskedimage.save("images/test2.png")

        payload = {
            "init_images": [preimage],#[self.pil_to_base64(startimage)],
            "mask":self.pil_to_base64(maskedimage),
            #"mask_blur":8,
            
            #"initial_noise_multiplier":5,
            "inpainting_fill": 0,
            "inpaint_full_res": True,
            "inpaint_full_res_padding":52,
            "image_cfg_scale":15,
             
            "prompt": prompt,
            "negative_prompt":"",
            "denoising_strength":0.6,
            "steps": steps,
            "width":512,
            "height":512
        }
        response = requests.post(url=f'http://127.0.0.1:7861/sdapi/v1/img2img', json=payload)
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
        """
        # Open a bytes file object
        with io.BytesIO() as f:
            # write the svg data as a png to file object
            svg2png(bytestring=data, write_to=f)

            # read the file object with PIL and display
            return f
        """

    def patch_match_func(self,img, mask):
        ret = patch_match.inpaint(img, mask=255 - mask, patch_size=3)
        return ret, mask
    
    def perlin_noise(self,img, mask):
        lin = np.linspace(0, 5, mask.shape[0], endpoint=False)
        x, y = np.meshgrid(lin, lin)
        avg = img.mean(axis=0).mean(axis=0)
        # noise=[((perlin(x, y)+1)*128+avg[i]).astype(np.uint8) for i in range(3)]
        noise = [((self.perlin(x, y) + 1) * 0.5 * 255).astype(np.uint8) for i in range(3)]
        noise = np.stack(noise, axis=-1)
        # mask=skimage.measure.block_reduce(mask,(8,8),np.min)
        # mask=mask.repeat(8, axis=0).repeat(8, axis=1)
        # mask_image=Image.fromarray(mask)
        # mask_image=mask_image.filter(ImageFilter.GaussianBlur(radius = 4))
        # mask=np.array(mask_image)
        nmask = mask.copy()
        # nmask=nmask/255.0
        nmask[mask > 0] = 1
        img = nmask[:, :, np.newaxis] * img + (1 - nmask[:, :, np.newaxis]) * noise
        # img=img.astype(np.uint8)
        return img, mask

    def perlin(self,x, y, seed=0):
        # permutation table
        np.random.seed(seed)
        p = np.arange(256, dtype=int)
        np.random.shuffle(p)
        p = np.stack([p, p]).flatten()
        # coordinates of the top-left
        xi, yi = x.astype(int), y.astype(int)
        # internal coordinates
        xf, yf = x - xi, y - yi
        # fade factors
        u, v = self.fade(xf), self.fade(yf)
        # noise components
        n00 = self.gradient(p[p[xi] + yi], xf, yf)
        n01 = self.gradient(p[p[xi] + yi + 1], xf, yf - 1)
        n11 = self.gradient(p[p[xi + 1] + yi + 1], xf - 1, yf - 1)
        n10 = self.gradient(p[p[xi + 1] + yi], xf - 1, yf)
        # combine noises
        x1 = self.lerp(n00, n10, u)
        x2 = self.lerp(n01, n11, u)  # FIX1: I was using n10 instead of n01
        return self.lerp(x1, x2, v)  # FIX2: I also had to reverse x1 and x2 here
    
    def fade(self,t):
        "6t^5 - 15t^4 + 10t^3"
        return 6 * t ** 5 - 15 * t ** 4 + 10 * t ** 3

    def gradient(self,h, x, y):
        "grad converts h to the right gradient vector and return the dot product with (x,y)"
        vectors = np.array([[0, 1], [0, -1], [1, 0], [-1, 0]])
        g = vectors[h % 4]
        return g[:, :, 0] * x + g[:, :, 1] * y

    def lerp(self,a, b, x):
        "linear interpolation"
        return a + x * (b - a)

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

if __name__ == "__main__":
    IG=imageGenerator()
    IG.generateImage("rounded-shaped pomeranian")
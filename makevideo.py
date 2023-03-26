import cv2
import argparse
import glob,os
import moviepy.video.io.ImageSequenceClip
import shutil
from lib.utils import *
from moviepy.editor import *

parser = argparse.ArgumentParser( prog = 'collage-makevideo')
parser.add_argument('-f', '--imagesfolder',required=True)
parser.add_argument('-vw', '--width',nargs='?',default=3840,const=1,type=int)
parser.add_argument('-vh', '--height',nargs='?',default=2160,const=1,type=int)
args = parser.parse_args()

if not args.imagesfolder:
    print("Error, No image folder provided, see arguments with -h")

else:
    images=[]
    imgs=glob.glob(args.imagesfolder+"/*.jpg")
    imgs.sort(key=str.lower)
    for file in imgs:
        head, file = os.path.split(file)
        img=file.split("_")
        newimage={"imguri":file,"x":int(img[1]),"y":int(img[2].split(".")[0])}
        
        images.append(newimage)
    #print("IMAGESSS",images)

 
    tmpfolder=args.imagesfolder+"/tmp_frames"
    if not os.path.exists(tmpfolder):
        os.makedirs(tmpfolder)
    #write video
    #video = cv2.VideoWriter("collage", 0, 1, (args.width,args.height))

    bgimage=cv2.imread(args.imagesfolder+"/"+images[0]["imguri"])
    
    (bg_h, bg_w) = bgimage.shape[:2]

    #patchimage=cv2.imread(images[1]["imguri"])
    #(p_h, p_w) = patchimage.shape[:2]

    frame,dim=image_resize(bgimage,args.width,args.height)
    cv2.imwrite(tmpfolder+"/0.jpg",frame)

    canvas=frame.copy()

    uris=[]

    for i,image in enumerate(images):
        frame= cv2.imread(args.imagesfolder+"/"+image["imguri"])
        if i>0:
            #print("frame",i)
            scale=bg_w/dim[0]
            (p_h, p_w) = frame.shape[:2]
            w=int(p_w/scale)
            h=int(p_h/scale)
            resized=cv2.resize(frame, (w,h), interpolation = cv2.INTER_AREA)

            #put image in canvas
            x_offset=int(image["x"]/scale)
            y_offset=int(image["y"]/scale)
            try:
                canvas[y_offset:y_offset+resized.shape[0], x_offset:x_offset+resized.shape[1]] = resized
            except:
                print("error with",image["imguri"])
                print("resized shape",resized.shape,"x_offset",x_offset,"y_offset",y_offset)
            imguri=tmpfolder+"/"+str(i)+".jpg"
            cv2.imwrite(imguri,canvas)
            uris.append(imguri)

#add some static time at the end
end=ImageClip(imguri).set_duration(20)

print("")
print("frames ready, converting to movie, this might take a while")
fps=4
clip = moviepy.video.io.ImageSequenceClip.ImageSequenceClip(uris, fps=fps)
clip=concatenate_videoclips([clip, end])
clip.write_videofile(args.imagesfolder+'/collage.mp4')

#delete tmp folder
shutil.rmtree(tmpfolder)
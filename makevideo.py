import cv2
import argparse
import glob,os
import moviepy.video.io.ImageSequenceClip

def image_resize(image, width = None, height = None, inter = cv2.INTER_AREA):
    # initialize the dimensions of the image to be resized and
    # grab the image size
    dim = None
    (h, w) = image.shape[:2]

    # if both the width and height are None, then return the
    # original image
    if width is None and height is None:
        return image

    # check to see if the width is None
    if width is None:
        # calculate the ratio of the height and construct the
        # dimensions
        r = height / float(h)
        dim = (int(w * r), height)

    # otherwise, the height is None
    else:
        # calculate the ratio of the width and construct the
        # dimensions
        r = width / float(w)
        dim = (width, int(h * r))

    # resize the image
    resized = cv2.resize(image, dim, interpolation = inter)

    # return the resized image
    return resized,dim

parser = argparse.ArgumentParser( prog = 'collage-makevideo')
parser.add_argument('-f', '--imagesfolder')
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
        img=file.split("_")
        newimage={"imguri":file,"x":int(img[1]),"y":int(img[2].split(".")[0])} 
        images.append(newimage)
    #print("IMAGESSS",images)

 
    tmpfolder=args.imagesfolder+"/tmp_frames"
    if not os.path.exists(tmpfolder):
        os.makedirs(tmpfolder)
    #write video
    #video = cv2.VideoWriter("collage", 0, 1, (args.width,args.height))

    bgimage=cv2.imread(images[0]["imguri"])
    (bg_h, bg_w) = bgimage.shape[:2]

    #patchimage=cv2.imread(images[1]["imguri"])
    #(p_h, p_w) = patchimage.shape[:2]

    frame,dim=image_resize(bgimage,args.width,args.height)
    cv2.imwrite(tmpfolder+"/0.jpg",frame)

    canvas=frame.copy()

    uris=[]

    for i,image in enumerate(images):
        frame= cv2.imread(image["imguri"])
        if i>0:
            print("frame",i)
            scale=bg_w/dim[0]
            (p_h, p_w) = frame.shape[:2]
            w=int(p_w/scale)
            h=int(p_h/scale)
            resized=cv2.resize(frame, (w,h), interpolation = cv2.INTER_AREA)

            #put image in canvas
            x_offset=int(image["x"]/scale)
            y_offset=int(image["y"]/scale)
            canvas[y_offset:y_offset+resized.shape[0], x_offset:x_offset+resized.shape[1]] = resized
            imguri=tmpfolder+"/"+str(i)+".jpg"
            cv2.imwrite(imguri,canvas)
            uris.append(imguri)

        #video.write(frame)

    #cv2.destroyAllWindows()
    #video.release()

print("frames ready, converting to movie")
fps=4
clip = moviepy.video.io.ImageSequenceClip.ImageSequenceClip(uris, fps=fps)
clip.write_videofile(args.imagesfolder+'/collage.mp4')

"""
s_img = cv2.imread("smaller_image.png")
l_img = cv2.imread("larger_image.jpg")

"""
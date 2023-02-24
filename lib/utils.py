from PIL import Image
import os
import cv2

def tileImage(img,tile_size=1200,dest="images/"):
  
   # Get the width and height of the image
    width, height = img.size
    i=0
    # Loop through the image in tile_size increments
    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            # Define the coordinates of the current tile
            box = (x, y, x+tile_size, y+tile_size)

            # Crop the tile from the original image
            tile = img.crop(box)

            # Save the tile with the x and y position in the filename
            filename = f"00{i}_{x}_{y}.jpg"
            tile.save(dest+filename)
            i+=1

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
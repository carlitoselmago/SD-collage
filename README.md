# SD-collage
 simplier all local clone of stable-difussion-multiplayer


## Stable diffusion backend
Using https://github.com/AUTOMATIC1111/stable-diffusion-webui

run sd api before starting collage server (automatic111)
```
bash webui.sh --nowebui --port 7860 --listen --xformers
```

(process is running as a service)

then:
```
python app.py 
```
or 
```
python app.py -s #this will use the first image found's size as canvas size (for background mode)
python app.py -ssl #this will run the server in SSL mode (use certbot or similiar to create a SSL first and place key and cer as key.pem and cert.pem in root)
```

## Initial canvas image
Use an image that is max 8000 x 8000 px to avoid browser compatibility.
The filename of the canvas image should be the first alfabetical filename so use something like:
*00yourfile_0_0.jpg* the last 2 zeros represent the coordinates of the image as all the images will be using the same system for coordinate placement

## Implemented Feautures
add ?mode=streamer to your browser to enable auto zooming on prompting action and ghost mode (no prompter box active)

## Bugs / improvements
- Sometimes images never get back to frontend
- With padding active, images on border are wrongly generated (fixed temporarily with 0 padding)

## Future features
- Last prompt button: remember last prompt and put it on a button next to the prompt input
- Scaling mode: Prompter box starts big, and as time passes prompter box becomes smaller to focus on inpainting detail
- Some kind of planned subject that includes a prefix/sufix hidden prompt (e.g. Isometric)
- add a way to express some love to other users creations while happening
- Add mask brush?


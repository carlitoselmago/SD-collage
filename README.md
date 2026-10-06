# SD-collage
 simplier all local clone of stable-difussion-multiplayer based on an starting image
 https://huggingface.co/spaces/huggingface-projects/stable-diffusion-multiplayer


## Stable diffusion backend
A minimal headless API (A1111-compatible subset: `/sdapi/v1/txt2img` and `/sdapi/v1/img2img`) using
https://huggingface.co/stabilityai/sd-turbo (downloaded automatically on first run).
Run it on the machine with the GPU (creates its own venv, installs `backend/requirements.txt`):
```
backend/runserver.bat      (windows)
bash backend/runserver.sh  (linux)
```
It listens on port 7863 and also answers under the `/prompt` prefix (`http://host:7863/prompt/sdapi/v1/...`), so a reverse proxy can serve it at `https://domain/prompt/` with no extra software.

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

for local development run:
```
bash run_dev.sh
```

## Initial canvas image
Use an image that is max 8000 x 8000 px to avoid browser compatibility.
The filename of the canvas image should be the first alfabetical filename so use something like:
**00yourfile_0_0.jpg** the last 2 zeros represent the coordinates of the image as all the images will be using the same system for coordinate placement

## Implemented Feautures
add ?mode=follower to your browser to enable auto zooming on prompting action and ghost mode (no prompter box active)
add ?mode=streamer to add the same ghost mode but only text to speech on each prompt (chrome recomended)
You can combine both with ?mode=follower%20streamer

## Bugs / improvements
- Sometimes images never get back to frontend
- With padding active, images on border are wrongly generated (fixed temporarily with 0 padding)

## Future features
- Last prompt button: remember last prompt and put it on a button next to the prompt input
- Scaling mode: Prompter box starts big, and as time passes prompter box becomes smaller to focus on inpainting detail
- Some kind of planned subject that includes a prefix/sufix hidden prompt (e.g. Isometric)
- add a way to express some love to other users creations while happening
- Add mask brush?


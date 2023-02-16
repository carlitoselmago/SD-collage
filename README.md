# SD-collage
 simplier all local clone of stable-difussion-multiplayer


## Stable diffusion backend
Using https://github.com/AUTOMATIC1111/stable-diffusion-webui

run before starting collage server
bash webui.sh --nowebui --port 7861

then:

python app.py 

or 

python app.py -s #this will use the first image found's size as canvas size (for background mode)


## Feautures
add ?mode=streamer to your browser to enable auto zooming on prompting action and ghost mode

## Future features
- Last prompt button
- Scaling mode: Prompter box starts big, and as time passes prompter box becomes smaller to focus on inpainting detail
- Add mask brush?
- Some kind of planned subject that includes a prefix/sufix hidden prompt (e.g. Isometric)
window.sid = false;
window.firstpaint = true


const canvasContainer = document.getElementById('canvas');
const cont='2d';
const canvasWidth = $("body").attr("width");
const canvasHeight = $("body").attr("height");
const firstimagewait = parseInt($("body").attr("firstimagewait"));

const canvas = document.createElement('canvas');
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.setAttribute("id", "maincanvas");
const context = canvas.getContext(cont, { willReadFrequently: true });
window.streamer=false;
//check canvas size
var isValidCanvas = canvasSize.test({
    width : canvasWidth,
    height: canvasHeight
  });

if (!isValidCanvas){
    $("#killer h1").text("Your browser does not support this canvas size, please use a desktop browser like Firefox/Chrome/Edge")
    $("#killer").css({"display":"flex"});
}


const padding=0; //padding for adding context when inpainting
const baseSize=512; //size for the images generated

const updateinterval=15000; //in milliseconds

var gensize=baseSize;

if (padding>0){
    gensize+=(padding*2);
}

$("#main").css("width", canvasWidth + "px");
$("#main").css("height", canvasHeight + "px");

canvasContainer.appendChild(canvas);

var socket;
var loadedimages = {};
var firstloaded=false;

$(document).ready(function () {
    let initialScale=1.5;
    if ($("body").hasClass("streamer")){
        initialScale=1.1;
        
        console.log("streamer mode");
        window.streamer=$("#wrap").streamer({
            "watchClass":"otherbox",
            "triggerClass":"prompting",
            "maxTime":15
        });


        function setSpeech() {
            return new Promise(
                function (resolve, reject) {
                    let synth = window.speechSynthesis;
                    let id;

                    id = setInterval(() => {
                        if (synth.getVoices().length !== 0) {
                            resolve(synth.getVoices());
                            clearInterval(id);
                        }
                    }, 10);
                }
            )
        }

        function TTS_speak(newprompt){
            console.log("speak",newprompt);
            var randomIndex = Math.floor(Math.random() * voices.length);
            var randomVoice = voices[randomIndex];
            window.speech.voice = randomVoice;
            window.speech.text = newprompt.prompt;
            window.speechSynthesis.speak(speech);
        }
        
        function TTS_init(){
            window.promptqueue=[];
            window.speech = new SpeechSynthesisUtterance();
            var voices=[];
            setTimeout(() => {
                let s = setSpeech();
                s.then((v) => {
                    voices=v;
                    console.log("voices",voices);
                });
            });
            window.speech.volume = 1; // 0 to 1
            window.speech.rate = 1; // 0.1 to 10
            window.speech.pitch = 1; //0 to 2
            window.speech.lang = "en-US";
            window.speech.onend = function(event) {
               // console.log('Speech has finished after ' + event.elapsedTime + ' milliseconds.');
               if (window.promptqueue.length>0){
                window.promptqueue.push(newprompt);
              TTS_speak(window.promptqueue.shift());
               }
            };
        
          }
        
        
        document.getElementById('initstreamer').addEventListener('click', function(e) {
            e.preventDefault();
            TTS_init();
            $('#initstreamer').remove();
            });
    }

    $("#loading").css({"display":"flex"});
    $("#prompter .info.maininfo").show();
    let protocol="http";
    if ($("body").hasClass("ssl")){
        protocol="https";
    }

    window.addEventListener('wheel', function (e) {
        e.preventDefault();
    }, { passive: false })

    $("#minicanvas").css("width", gensize + "px");
    $("#minicanvas").css("height", gensize + "px");
    $("#minicanvas").attr("width", gensize);
    $("#minicanvas").attr("height",gensize);

    const minicanvas = document.getElementById('minicanvas');
    const minicontext = minicanvas.getContext(cont, { willReadFrequently: true });

   
    $("#prompt").focus();

    $("#prompter").on("click", function (e) {
        $("#inputs").removeClass("busy");
    });

    //init scale
    $("#main").panZoom({
        initialScale:initialScale,
        onstop: function () {
            $("#prompt").focus();
        }
    });

    $("#prompter").draggable({
        onstop: function () {
            boxChange();
            $("#prompt").focus();
        },
        onmove: function () {
            boxChange();
        }
    });

    $("#prompt").on("input", function () {
        boxChange();
    });

    $("#promptform").submit(function (e) {
        e.preventDefault();
        let box = $("#prompter");
        let target = $("#prompter");
        let x = parseInt(target.css("left"));
        let y = parseInt(target.css("top"));
        let prompt = $("#prompt").val();

        //boxSize = 512;

        //let baseimg = context.getImageData(x, y, boxSize, boxSize);
        let baseimg = context.getImageData(x-padding, y-padding, gensize, gensize);

        minicontext.putImageData(baseimg, 0, 0);

        //minicontext.drawImage(minicanvas, x,y,box.width(),box.height());
        var dataUrl = minicanvas.toDataURL('image/png');

        let newprompt = { "prompt": prompt, "x": x, "y": y, "sid": $("#sid").text(), "baseimg": dataUrl }
        socket.emit("prompt", newprompt);

        $("#prompter .info").toggle();
        $("#inputs").addClass("busy");
        return false;
    });

   

    //SOCKET:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    socket = io.connect(protocol+'://' + document.domain + ':' + location.port);

    socket.on('connect', function (data) {
        console.log("connected");
        boxChange("joined");
        setTimeout(() => {
          socket.emit("backendstatus");
        }, 1000);

        console.log("asking for status")
        const interval = setInterval(function() {
            socket.emit('getupdates');
          }, updateinterval);
    });
    socket.on('newprompt', function (newprompt) {
        console.log('newprompt',newprompt);
        //user just sent a prompt, the image is not ready yet
        if (window.streamer){

 
            if ("promptqueue" in window){
              window.promptqueue.push(newprompt);
              TTS_speak(window.promptqueue.shift());
            }
            
        }
    });
    socket.on('newimage', function (images) {
        //console.log("newimage!!!",images);
        console.log("new images socket")
        if (images.length==0){
            $("#loading").remove();
        }
        if (!firstloaded){
            preloadImages(images);
            firstloaded=true;
        } else {
            updateImages(images);
        }
    });

    socket.on('backendresponse', function (data) {
      //console.log("backend status response",data)
      console.log("backendresponse",data["status"]);
      if (data["status"]===false){
        engineDown();
      } else {
        engineUp();
      }

    });


    socket.on('promptready', function (data) {
        //finished prompting
        console.log("promptready",data,data["status"])
        if (!data["status"]) {
          console.log("MARK STATUS DOWN!!!!");
          $("#prompt").val("");
          engineDown();
        }
        if (data["sid"] === $("#sid").text()) {
            $("#prompter .info.maininfo").show();
            $("#prompter .info.busyinfo").hide();
            $("#inputs").removeClass("busy");
            console.log("its my prompt!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", data["sid"])
            $("#prompt").val("");
        } else {
            console.log("finished prompt for other",data["sid"])
            $("#"+data["sid"]+" .prompt").text("");
            $("#"+data["sid"]).removeClass("prompting");
        }
    });

    socket.on('status', function (data) {

    });
    socket.on('disconnect', function (data) {
        sid = data["sid"];
        deleteOtherBox(sid);

    });
    socket.on('yoursid', function (data) {
        if (!window.sid) {
            window.sid = data["sid"];
            $("#sid").text(data["sid"]);
            $("#me").text(sessionIdToEmoji(data["sid"]))
            if ($("body").hasClass("streamer")){
                socket.emit("ghostuser")
            }
        }
    });

    socket.on('update', function (data) {
        manageOthers(data);
        socket.emit('ok');
    });

    socket.on("disconnect", () => {
    //  console.log(socket.id); // undefined
    });

    function leave_room() {
        socket.emit('left', {}, function () {
            socket.disconnect();
        });
    }

});
function createOtherBox(sid, box) {
    if (sid !== $("#sid").text()) {
        $("#others").append('<div id="' + sid + '" class="box otherbox" style="left:' + box[0] + ';top:' + box[1] + '"><div class="you">' + sessionIdToEmoji(sid) + '</div><div class="prompt"></div></div>');
    }
}

function renderImages(images) {
    console.log("all preloaded");
    let c=0;
    images.forEach(imag => {
        if (c==0){
            //drawImage(context,imag["img"], imag["x"], imag["y"]);
            context.drawImage(imag["img"], imag["x"], imag["y"],canvasWidth,canvasHeight);
        } else{
            context.drawImage(imag["img"], imag["x"]-padding, imag["y"]-padding);
           // context.drawImage(imag["img"], imag["x"]-padding, imag["y"]-padding,gensize,gensize);
        }
        c++;
    });
    $("#loading").remove();
    delete images;
}

function preloadImages(topreload) {
    console.log("preloadimages")
    let images = [];
    let imageCount = 0;
    $("#loadcount").text("0/"+topreload.length);
    topreload.forEach(img => {  // for each image url
        if (loadedimages[img["imguri"]] === undefined) {
            loadedimages[img["imguri"]] = true;
            const image = new Image();
            image.src = img["imguri"];
            image.onload = () => {
                imageCount += 1;
                $("#loadcount").text((imageCount+1)+"/"+topreload.length);
                //console.log(imageCount,topreload.length);
                if (imageCount === topreload.length) { // have all loaded????
                    renderImages(images);
                }
            }
            images.push({ "img": image, "x": parseInt(img["x"]), "y": parseInt(img["y"]) }); // add loading image to images array
        }
    });
}

function updateImages(images) {
    images.forEach(img => {
        if (loadedimages[img["imguri"]] === undefined) {
            loadedimages[img["imguri"]] = true;
            putinCanvas(img);
        }
    });
    delete images;
}

function putinCanvas(newimage) {
    console.log(newimage["imguri"]);
    if (newimage["imguri"]) {
        base_image = new Image();
        base_image.src = newimage["imguri"];
        base_image.onload = function () {
            context.drawImage(this, newimage["x"]-padding, newimage["y"]-padding,gensize,gensize);
        }
    }
}

function deleteOtherBox(sid) {
    $("#others #" + sid).remove();
}

function manageOthers(boxes) {

    for (var sid in boxes) {
        let v = boxes[sid];
        let target = $("#" + sid);
        if (target.length) {
            target.css("left", v["box"][0]);
            target.css("top", v["box"][1]);
            if (v["prompt"] !== undefined){
                if (v["prompt"].length>0){
                    $(".prompt", target).text(v["prompt"]);
                    if (!target.hasClass("prompting")){
                        target.addClass("prompting");
                    }
                }
            } else{
                $("#"+sid).removeClass("prompting");
            }

        } else {
            createOtherBox(sid, v);
        }
    }

    //cleanup possible dead session boxes
    $(".otherbox").each(function (e) {
        let id = $(this).attr("id");
        if (!(id in boxes)) { console.log("removed ", id); $(this).remove(); }
    });
}

function boxChange(label = "boxchange") {
    let text = ($("#prompt").val());
    let target = $("#prompter");
    let x = target.css("left");
    let y = target.css("top");
    socket.emit(label, { "box": [x, y], "prompt": text });
}

function sessionIdToEmoji(sessionId) {
    let emojiCodePoint = 0;
    for (let i = 0; i < sessionId.length; i++) {
        emojiCodePoint += sessionId.charCodeAt(i);
    }
    let emojiList = [
        "🚀", "🌟", "🌙", "🌊", "🏞️", "🏙️", "🗽", "🌋", "🌄", "🌃",
        "🏙️", "🏰", "🗼", "🏯", "⛩️", "🚲", "🚂", "🚗", "✈️", "🛴", "🚁",
        "🚀", "🛸", "🌌", "🌊", "🌳", "🍁", "🌸", "🌺", "🍄", "🍎", "🍇",
        "🍓", "🍈", "🍌", "🌽", "🍔", "🍟", "🍕", "🥐", "🥑", "🥦", "🥒",
        "🥓", "🎃", "🎁", "🎂", "🎄", "🎅", "🎉", "🎊", "🎁", "🎂", "🎄",
        "🎅", "🎉", "🎊", "💡", "💻", "📱", "⌚️", "💾", "💿", "💰", "💳",
        "🔑", "🔨"

    ];
    let emojiIndex = emojiCodePoint % emojiList.length;
    let emoji = emojiList[emojiIndex];
    return emoji;
}

function engineUp(){
  if ($("body").hasClass("enginedown")){
    $("body").removeClass("enginedown");
    var toast = document.querySelector('.iziToast');
    if (toast){
      iziToast.hide({}, toast);
    }
    iziToast.show({
        //title: '',
        message: 'Image generator engine is restored, you can prompt now',
        position: "topCenter",
        //timeout:false,
        displayMode:"replace"
    });
  }
}

function engineDown(){

  if (!$("body").hasClass("enginedown")){
    iziToast.show({
        //title: '',
        message: 'Image generator engine is off',
        position: "topCenter",
        timeout:false,
        displayMode:"replace"
    });
  }
  $("body").addClass("enginedown");

  setTimeout(() => {
    console.log("checking again for backend status");
    socket.emit("backendstatus");
  }, 20000);
}
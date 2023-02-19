window.sid = false;
window.firstpaint = true

const canvasContainer = document.getElementById('canvas');

const canvasWidth = $("body").attr("width");
const canvasHeight = $("body").attr("height");
const firstimagewait = parseInt($("body").attr("firstimagewait"));

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d', { willReadFrequently: true });
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.setAttribute("id", "maincanvas");

const padding=0; //padding for adding context when inpainting
const baseSize=512; //size for the images generated

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

    let protocol="http";
    if ($("body").hasClass("ssl")){
        protocol="https";
    }

    window.addEventListener('wheel', function (e) {

        e.preventDefault()
        console.log("touchpad");

    }, { passive: false })

   
    $("#minicanvas").css("width", gensize + "px");
    $("#minicanvas").css("height", gensize + "px");
    $("#minicanvas").attr("width", gensize);
    $("#minicanvas").attr("height",gensize);

    const minicanvas = document.getElementById('minicanvas');
    const minicontext = minicanvas.getContext('2d', { willReadFrequently: true });

    let initialScale=1.5;
    if ($("body").hasClass("streamer")){
        console.log("streamer mode");
        initialScale=1.1;
    }
    
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

    if ($("body").hasClass("streamer")){
        console.log("streamer mode");
        $("#wrap").streamer({
            "watchClass":"otherbox",
            "triggerClass":"prompting",
            "maxTime":15
        });
    }


    //SOCKET:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    socket = io.connect(protocol+'://' + document.domain + ':' + location.port);
   
    socket.on('connect', function (data) {
        console.log("connected");
        boxChange("joined");
        

    });
    socket.on('newimage', function (images) {
        
        if (!firstloaded){
            preloadImages(images);
            firstloaded=true;
        } else {
            updateImages(images);
        }
      
    });

    socket.on('promptready', function (data) {
        //finished prompting

        sid = data["sid"];

        if (sid === $("#sid").text()) {
            $("#prompter .info.maininfo").show();
            $("#prompter .info.busyinfo").hide();
            $("#inputs").removeClass("busy");
            console.log("its my prompt!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", sid)
            $("#prompt").val("");
        } else {
            console.log("finished prompt for other",sid)
            $("#"+sid+" .prompt").text("");
            $("#"+sid).removeClass("prompting");
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
        // console.log("on update", data);
        manageOthers(data);
        socket.emit('ok');
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

        // putinCanvas(img);
        //console.log(imag);
        if (c==0){
            context.drawImage(imag["img"], imag["x"], imag["y"]);
        } else{
            context.drawImage(imag["img"], imag["x"]-padding, imag["y"]-padding,gensize,gensize);
        }
      
        c++;
    });
}

function preloadImages(topreload) {
    console.log("preloadimages")
    let images = [];
    let imageCount = 0;

    //console.log(topreload);
    topreload.forEach(img => {  // for each image url
        if (loadedimages[img["imguri"]] === undefined) {
            loadedimages[img["imguri"]] = true;
            const image = new Image();
            image.src = img["imguri"];
            image.onload = () => {
                imageCount += 1;
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

function getClients(roomId = "room") {
    var clients_in_the_room = io.sockets.adapter.rooms[roomId];
    for (var clientId in clients_in_the_room) {
        console.log('client: %s', clientId); // Seeing is believing
        var client_socket = io.sockets.connected[clientId]; // Do whatever you want with this
        console.log(client_socket);
    }


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
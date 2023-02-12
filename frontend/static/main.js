window.sid=false;

const canvasContainer = document.getElementById('canvas');

const canvasWidth = 2160;
const canvasHeight = 3054;

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d',{ willReadFrequently: true });
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.setAttribute("id","maincanvas");

$("#main").css("width",canvasWidth+"px");
$("#main").css("height",canvasHeight+"px");

canvasContainer.appendChild(canvas);

var socket;
var loadedimages={};

$(document).ready(function() {

    const minicanvas=document.getElementById('minicanvas');
    const minicontext = minicanvas.getContext('2d',{ willReadFrequently: true });

    $("#prompt").focus();

    //init scale
    $("#main").panZoom({
        onstop: function() {
            $("#prompt").focus();
          }});
   
    $("#prompter").draggable({
        onstop: function() {
            boxChange();
            $("#prompt").focus();
          },
        onmove:function(){
            boxChange();
        }  
    });

    $("#prompt").on("input", function() {
        boxChange();

     });
    $("#promptform").submit(function(e){
        e.preventDefault();
        let box=$("#prompter");
        let target=$("#prompter");
        let x=parseInt(target.css("left"));
        let y=parseInt(target.css("top"));
        let prompt=$("#prompt").val();
        //https://stackoverflow.com/questions/11196230/how-to-efficiently-deal-with-a-large-amount-of-html5-canvas-pixel-data-over-webs
        //https://stackoverflow.com/questions/24554830/canvas-how-to-convert-getimagedata-to-todataurl-format
        let baseimg= context.getImageData(x, y, box.width(), box.height());

        minicontext.putImageData(baseimg, 0, 0);

        //minicontext.drawImage(minicanvas, x,y,box.width(),box.height());
        var dataUrl =minicanvas.toDataURL('image/png');
    
        let newprompt={"prompt":prompt,"x":x,"y":y,"sid":window.sid,"baseimg":dataUrl}
        socket.emit("prompt", newprompt);

        $("#prompter .info").toggle();
        $("#inputs").addClass("busy");
        return false;
    });
 


    //SOCKET:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    socket = io.connect('http://' + document.domain + ':' + location.port );
    socket.on('connect', function(data) {
        console.log("connected");
        boxChange("joined");
       
    });
    socket.on('newimage', function(images) {
        updateImages(images);
    });

    socket.on('promptready', function(data) {
        //finished prompting
        $("#prompter .info").toggle();
        $("#inputs").removeClass("busy");
        sid=data["sid"];
        
        if (sid===$("#sid").text()){
            console.log("its my prompt!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            $("#prompt").val("");
        }
    });
    socket.on('status', function(data) {
        
    });
    socket.on('yoursid', function(data) {
        if (!window.sid){
            window.sid=data["sid"];
            $("#sid").text(data["sid"]);
        }
    });
    
    socket.on('update', function(data) {
        console.log("on update",data);
        manageOthers(data);
        socket.emit('ok');
    });



    function leave_room() {
        socket.emit('left', {}, function() {
            socket.disconnect();
        });
    }


  });
  function createOtherBox(sid,box){
    if (sid!==window.sid){
        $("#others").append('<div id="'+sid+'" class="box otherbox" style="left:'+box[0]+';top:'+box[1]+'"><div class="prompt"></div></div>');
    }
  }

    function updateImages(images){
        images.forEach(img =>{
            
            if (loadedimages[img["imguri"]] === undefined){
                loadedimages[img["imguri"]]=true;
                putinCanvas(img);
            }   
    });
    }

    function putinCanvas(newimage){
        console.log(newimage["imguri"]);
        base_image = new Image();
        base_image.src = newimage["imguri"];
        base_image.onload = function(){
            context.drawImage(this, newimage["x"], newimage["y"]);
        }
    }

  function manageOthers(boxes){
    console.log(boxes);
    
    console.log("boxes exists");
    for (var sid in boxes){
            let v=boxes[sid];
            let target=$("#"+sid);
            if (target.length){
                target.css("left",v["box"][0]);
                target.css("top",v["box"][1]);
                $(".prompt",target).text(v["prompt"])
            } else {
                createOtherBox(sid,v);
            }
    }

    //cleanup possible dead session boxes
    $(".otherbox").each(function(e){
        let id=$(this).attr("id");
        if (!(id in boxes)){ console.log("removed ",id);$(this).remove(); }
    });
  }



  function boxChange(label="boxchange"){
    let text=($("#prompt").val()); 
    let target=$("#prompter");
    let x=target.css("left");
    let y=target.css("top");
    socket.emit(label, {"box":[x,y],"prompt":text});
  }

  function getClients(roomId="room"){
    var clients_in_the_room = io.sockets.adapter.rooms[roomId];
    for (var clientId in clients_in_the_room ) {
    console.log('client: %s', clientId); // Seeing is believing
    var client_socket = io.sockets.connected[clientId]; // Do whatever you want with this
    console.log( client_socket);
    }
  }

 
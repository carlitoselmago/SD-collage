const canvasContainer = document.getElementById('canvas');

const canvasWidth = 512;
const canvasHeight = 512;

const canvas = document.createElement('canvas');
canvas.width = canvasWidth;
canvas.height = canvasHeight;

canvasContainer.appendChild(canvas);
var socket;

$(document).ready(function() {
    $("#prompter").draggable({
        stop: function() {
            boxChange();
          },
        drag:function(){
            boxChange();
        }  
    });

    $("#prompt").on("input", function() {
        boxChange();

     });


    //SOCKET:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    socket = io.connect('http://' + document.domain + ':' + location.port );
    socket.on('connect', function(data) {
        console.log("connected");
        boxChange("joined");
       
    });
    socket.on('status', function(data) {
        
    });
    socket.on('yoursid', function(data) {
        window.sid=data["sid"];
        $("#sid").text(data["sid"]);
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
    let pos=$("#prompter").position();
    socket.emit(label, {"box":[pos.left,pos.top],"prompt":text});
  }

  function getClients(roomId="room"){
    var clients_in_the_room = io.sockets.adapter.rooms[roomId];
    for (var clientId in clients_in_the_room ) {
    console.log('client: %s', clientId); // Seeing is believing
    var client_socket = io.sockets.connected[clientId]; // Do whatever you want with this
    console.log( client_socket);
    }
  }
(function ($) {
// Define the plugin name and default options
$.fn.streamer = function(options) {

   

   document.getElementById('initstreamer').addEventListener('click', function(e) {
    e.preventDefault();
    this.TTS_init();
   $('#initstreamer').remove();
   });

  // Merge the user options with the default options
  var settings = $.extend({
    //The base class for elements that will have listeners
    watchClass:"towatch",
    // The class of the elements that trigger the zoom
    triggerClass: "trigger",
    // The maximum time in seconds to zoom on an element
    maxTime: 5,
    // The scale factor to zoom on an element
    scaleFactor: 2,
    // The transition duration in milliseconds
    transitionDuration: 5000
  }, options);

  var promptqueue=[];

  // Return this to maintain chainability
  return this.each(function() {
    // Store a reference to the parent element
    var $parent = $(this);
    // Store the original transform of the parent element
    var originalTransform = $parent.css("transform");
    console.log(originalTransform);
    // Store a variable to keep track of the current element index
    var currentIndex = -1;
    // Store a variable to keep track of the timeout id
    var timeoutId = null;
   
    // Define a function to zoom on an element with a given index
    var zoomOnElement = function(index) {
      // Clear any previous timeout if exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Find all the elements with the watchClass inside
      // Find all the elements with the watchClass inside the parent element
      var $elements = $parent.find("." + settings.triggerClass);
      // If there are no elements, zoom out and return 
      if ($elements.length === 0) {
        zoomOut();
        return;
      }
      // If the index is out of range, wrap it around 
      if (index < 0 || index >= $elements.length) {
        index = (index + $elements.length) % $elements.length;
      }
      // Store the current index for later use 
      currentIndex = index;
      // Get the element at the given index and its position and size relative to 
      var $element = $($elements[index]);
      var position = $element.position();
      var width = $element.width();
      var height = $element.height();

      // Calculate the translation and scale values to center and zoom on the element 
      var translateX = ($parent.width() / 2 - position.left - width / 2) / settings.scaleFactor;
      var translateY = ($parent.height() / 2 - position.top - height / 2) / settings.scaleFactor;

      var scale = settings.scaleFactor;

      // Set the transition duration and transform properties of the parent element 
      $parent.css({
        transitionDuration: settings.transitionDuration + "ms",
        transform: "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")"
      });

      // Set a timeout to switch to another element after maxTime seconds 
      timeoutId = setTimeout(function () {
        zoomOnElement(currentIndex + 1);
      }, settings.maxTime * 1000);
    };

    // Define a function to zoom out and show all elements 
    var zoomOut = function () {
      // Clear any previous timeout if exists 
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Set the transition duration and transform properties of the parent element back to original values 
      $parent.css({
        transitionDuration: settings.transitionDuration + "ms",
        transform: originalTransform
      });
    };


    var  waitForElm = function(selector) {

      if (timeoutId==null){

      return new Promise(resolve => {
          if (document.querySelector(selector)) {
              return resolve(document.querySelector(selector));
          }
  
          const observer = new MutationObserver(mutations => {
              if (document.querySelector(selector)) {
                  resolve(document.querySelector(selector));
                  observer.disconnect();
              }
          });
  
          observer.observe(document.body, {
              childList: true,
              subtree: true
          });
      });
    }
  }

  

  var TTS_init= function(){
    window.promptqueue=[];
    window.speech = new SpeechSynthesisUtterance();
    window.speech.volume = 1; // 0 to 1
    window.speech.rate = 1; // 0.1 to 10
    window.speech.pitch = 1; //0 to 2
    window.speech.lang = "en-US";
    window.speech.onend = function(event) {
       // console.log('Speech has finished after ' + event.elapsedTime + ' milliseconds.');
       if (window.promptqueue.length>0){
        window.promptqueue.push(newprompt);
        this.TTS_speak(window.promptqueue.shift());
       }
    };

  }

  var TTS_speak= function(text){
      window.speech.text = text;
      window.speechSynthesis.speak(speech);
  }


  function handlenewprompt(newprompt){
    if ("promptqueue" in window){
      window.promptqueue.push(newprompt);
      this.TTS_speak(window.promptqueue.shift());
    }
  }

  // Boolean flag to indicate whether to keep looking for new elements
  var keepLooking = true;

  // Use setInterval to check for elements with the specific class
  var checkForClass = setInterval(function() {
    let target=$parent.find("."+settings.triggerClass);
    if (target.length && keepLooking) {
      // If elements with the specific class exist and keepLooking is true,
      // trigger console.log() and set keepLooking to false
      console.log('Elements with class "specific-class" were added.');
      zoomOnElement(target.index());

      keepLooking = false;
      setTimeout(function() {
        keepLooking = true;
      }, 5000); // Wait for 5 seconds before looking for new elements
    }
  }, 1000); // Check every 1 second


  /*
 // Select the parent element to watch for changes


  // Create a MutationObserver to watch for changes to the parent element
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // Loop through each added node in the mutation
      mutation.addedNodes.forEach(function(node) {
        // Check if the added node has the specific class we're looking for
        if ($(node).hasClass(settings.triggerClass)) {
          console.log('Element with class "specific-class" was added.');
        }
      });
    });
  });

  // Set up the MutationObserver to watch for changes to the parent element
  var config = { childList: true };
  observer.observe($("#others")[0], config);
*/
/*
  setInterval(function(){

    waitForElm("."+settings.triggerClass).then((elm) => {
      console.log('Element is ready');
      console.log(elm.textContent);
      zoomOnElement(0);

      
  });
}, 5000);
*/
/*
    // Attach a listener that waits for elements with trigger class inside parent div to appear using mutation observer 
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
       // if (mutation.type === "childList") {
        
           // if ($(node).hasClass(settings.watchClass)) {
             // console.log("found one");
             if (mutation.target.className ===settings.triggerClass) {
               console.log("triggered");
              zoomOnElement(index); // Zoom on element with trigger class based on index
            }
          //}
       
    //    }
      });
    });
    let target = document.querySelector("."+settings.watchClass);

    observer.observe(target, { childList: true, subtree: true,attributeFilter : ['style', 'class'] });
    */
    return  {
      onaddedPrompt:handlenewprompt
    }
  });

 
};
}(jQuery));
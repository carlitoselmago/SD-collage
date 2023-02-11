(function($) {
    $.fn.draggable = function(options) {
      var element = this,
          parent = element.parent(),
          startX, startY,
          startLeft, startTop,
          parentScale = parent.css("transform");
          settings = $.extend({
            onmove: function() {},
            onstop: function() {}
          }, options);
      
      if (!element.length) {
        console.error("No elements selected");
        return;
      }
      
      if (!parentScale) {
        console.error("Parent does not have a transform property");
        return;
      }
      
      parentScale = parseFloat(parentScale.split(",")[3]) || 1;
  
      element.css({
        position: "absolute",
        left: 0,
        top: 0
      });
  
      element.on("mousedown", function(e) {
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(element.css("left"));
        startTop = parseInt(element.css("top"));
  
        $(document).on("mousemove", function(e) {
          parentScale = parent.css("transform");
          parentScale = parseFloat(parentScale.split(",")[3]) || 1;
          
          element.css("left", (e.clientX - startX) / parentScale + startLeft);
          element.css("top", (e.clientY - startY) / parentScale + startTop);

          settings.onmove.call(element, e);
        });
  
        $(document).on("mouseup", function() {
          $(document).off("mousemove");
          $(document).off("mouseup");
          settings.onstop.call(element);
        });
      });
    };
  }(jQuery));
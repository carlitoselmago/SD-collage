(function($) {
  $.fn.draggable = function(options) {
    var element = this,
        parent = element.parent(),
        startX, startY,
        startLeft, startTop,
        steps=64,
        parentScale = parent.css("transform"),
        settings = $.extend({
          onmove: function() {},
          onstop: function() {}
        }, options);

    parentScale = parseFloat(parentScale.split(",")[3]) || 1;

    element.css({
      position: "absolute",
      left: 0,
      top: 0
    });

    // Handle touch events
    element.on("touchstart", function(e) {
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = parseInt(element.css("left"));
      startTop = parseInt(element.css("top"));

      $(document).on("touchmove", function(e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        parentScale = parent.css("transform");
        parentScale = parseFloat(parentScale.split(",")[3]) || 1;

        element.css("left", Math.round((touch.clientX - startX) / parentScale / steps) * steps + startLeft);
        element.css("top", Math.round((touch.clientY - startY) / parentScale / steps) * steps + startTop);

        settings.onmove.call(element, e);
      });

      $(document).on("touchend", function() {
        $(document).off("touchmove");
        $(document).off("touchend");
        settings.onstop.call(element);
      });
    });

    // Handle mouse events
    element.on("mousedown", function(e) {
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.css("left"));
      startTop = parseInt(element.css("top"));

      $(document).on("mousemove", function(e) {
        parentScale = parent.css("transform");
        parentScale = parseFloat(parentScale.split(",")[3]) || 1;

        element.css("left", Math.round((e.clientX - startX) / parentScale / steps) * steps + startLeft);
        element.css("top", Math.round((e.clientY - startY) / parentScale / steps) * steps + startTop);

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

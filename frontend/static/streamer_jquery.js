(function ($) {
  $.fn.streamer = function(options) {
    var settings = $.extend({
      watchClass: "towatch",
      triggerClass: "trigger",
      maxTime: 5,
      scaleFactor: 2,
      transitionDuration: 5000
    }, options);

    return this.each(function() {
      var $parent = $(this);
      var originalTransform = $parent.css("transform");
      var currentIndex = -1;
      var timeoutId = null;

      var zoomOnElement = function(index) {
        if (timeoutId) clearTimeout(timeoutId);

        var $elements = $parent.find("." + settings.watchClass);
        if ($elements.length === 0) {
          zoomOut();
          return;
        }

        if (index < 0 || index >= $elements.length) {
          index = 0; // Reset index to 0 if out of bounds
        }
        currentIndex = index;

        var $element = $($elements[index]);
        var elementOffset = $element.offset();
        var parentOffset = $parent.offset();
        var translateX = -((elementOffset.left - parentOffset.left) - ($parent.width() - $element.outerWidth()) / 2);
        var translateY = -((elementOffset.top - parentOffset.top) - ($parent.height() - $element.outerHeight()) / 2);

        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: `translate(${translateX}px, ${translateY}px) scale(${settings.scaleFactor})`
        });

        timeoutId = setTimeout(function() {
          zoomOnElement(currentIndex + 1);
        }, settings.maxTime * 1000);
      };

      var zoomOut = function() {
        if (timeoutId) clearTimeout(timeoutId);
        $parent.css({
          transition: `transform ${settings.transitionDuration}ms`,
          transform: originalTransform
        });
      };

      var observeDOM = function() {
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length || mutation.removedNodes.length) {
              zoomOnElement(currentIndex + 1);
            }
          });
        });

        observer.observe($parent[0], {
          childList: true,
          subtree: true
        });
      };

      observeDOM();
    });
  };
}(jQuery));

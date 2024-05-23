(function ($) {
  // Define the plugin name and default options
  $.fn.streamer = function (options) {
    // Merge the user options with the default options
    var settings = $.extend({
      // The base class for elements that will have listeners
      watchClass: "towatch",
      // The class of the elements that trigger the zoom
      triggerClass: "trigger",
      // The maximum time in seconds to zoom on an element
      maxTime: 5,
      // The scale factor to zoom on an element
      scaleFactor: 2,
      // The transition duration in milliseconds
      transitionDuration: 5000
    }, options);

    var $element = $(this);
    var targetScale = settings.scaleFactor;
    var transitionDuration = settings.transitionDuration;

    function zoomToElement($target) {
      // Calculate the center position of the target element relative to the parent
      var targetRect = $target[0].getBoundingClientRect();
      var parentRect = $element[0].getBoundingClientRect();

      var targetCenterX = targetRect.left + targetRect.width / 2;
      var targetCenterY = targetRect.top + targetRect.height / 2;
      var parentCenterX = parentRect.left + parentRect.width / 2;
      var parentCenterY = parentRect.top + parentRect.height / 2;

      // Calculate the translation needed to center the target element
      var translateX = (parentCenterX - targetCenterX) / targetScale;
      var translateY = (parentCenterY - targetCenterY) / targetScale;

      // Apply the transformation
      $element.css({
        'transform': 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + targetScale + ')',
        'transition': 'transform ' + transitionDuration + 'ms'
      });
    }

    var waitForElm = function (selector) {
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
    };

    // Function to continuously check for movement
    function observeMovement() {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.target.classList.contains(settings.triggerClass)) {
            zoomToElement($(mutation.target));
          }
        });
      });

      document.querySelectorAll('.' + settings.triggerClass).forEach(target => {
        observer.observe(target, { attributes: true, attributeFilter: ['style', 'class'] });
      });
    }

    // Observe elements with the trigger class
    waitForElm('.' + settings.triggerClass).then($target => {
      zoomToElement($($target));
      observeMovement(); // Start observing movement continuously
    });

    return this;
  };
}(jQuery));
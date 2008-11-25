(function($) {
  $.fn.commandLine = function(options) {
    return this.each(function(){
			if ( $(this).data('commandLine.instance') == undefined ) {
				$(this).data('commandLine.instance', new CommandLine(this, options));
			};
    });
  };
  
  function CommandLine(e, options){
    this.init(e, options);
  };
  
  $.extend( CommandLine.prototype , {
    defaults: {
      historyLimit: null
    },
    
    init: function(e, options){
      options = $.extend({}, this.defaults, options || {});
      this.options = options;
      this.container = $(e).addClass('console').append("<div class='log'/><input class='prompt'/>");
      this.prompt = $(this.container).find('input.prompt');
      this.logElement = $(this.container).find('div.log');
      this.history = new CommandHistory(options.historyLimit);
      
      var self = this;
      
      // Register listeners on prompt
      this.prompt.keyup(function(event){
        //console.log(event.which);
        if(event.which == 13){
          // ENTER
          var cmd = this.value;
          self.command(cmd);
        } else if(event.which == 38) {
          // UP
          if(self.history.isCurrent()){
            self.history.stash(this.value);
          }
          var value = self.history.back();
          this.value = value;
          
        } else if(event.which == 40) {
          // DOWN
          var value = self.history.forward();
          this.value = value;
        }
      });
    },
    
    command: function(cmd){
      this.history.record(cmd, true);
      
      this.log('command',cmd);
      try{
        var response = eval(cmd);        
        var reponseHandler = null;

        for(key in this.responseHandlers){
          var h = this.responseHandlers[key]
          if(h.handles(response)){ 
            reponseHandler = h;
            break; 
          }
        }
        
        this.log('response', reponseHandler.format(response));
      } catch(ex) {
        this.log('error', ex.toString() );
      }

      this.prompt.val('');
    },
    
    log: function(type, message){
      this.logElement.append($("<div class='entry "+type+"'/>").html(message));
    },
    
    responseHandlers: [
      { name:    "jQuery",
        handles: function(r){ return(r.jquery); },
        format:  function(r){ return("jQuery: " + r.length + " matches..."); }
      },

      { name:    "JavaScript",
        handles: function(r){ return(true); },
        format:  function(r){ return(r.toString()); }
      }
    ]
  });
  
  function CommandHistory(options){
    options = options || {};
    this.limit = options.limit;
    this.items = [];
  };
  $.extend( CommandHistory.prototype , {
    position: 0,
    currentCommand: '',
    
    record: function(cmd){
      this.currentCommand = '';
      
      this.items.push(cmd);
      if(this.limit && this.items.length > this.limit){
        this.items.pop();
      }
      this.position = this.items.length;
    },
    
    stash: function(cmd){
      this.currentCommand = cmd;
    },
    
    isCurrent: function(){
      return this.position == this.items.length;
    },
    
    back: function(){
      if(this.position > 0){
        this.position = this.position-1;
      }
      return this.items[this.position];
    },
    
    forward: function(){
      if(this.position < this.items.length){
        this.position = this.position+1;
      }
      return (this.isCurrent()) ? this.currentCommand : this.items[this.position];
    }
    
  });
})(jQuery);
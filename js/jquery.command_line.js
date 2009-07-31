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
      historyLimit: null,
      autoScroll: true
    },
    
    init: function(e, options){
      options = $.extend({}, this.defaults, options || {});
      this.options = options;
      this.container = $(e).addClass('console').append("<div class='log'/><input class='prompt'/>");
      this.prompt = $(this.container).find('input.prompt');
      this.logElement = $(this.container).find('div.log');
      this.history = new CommandHistory(options.historyLimit);
      this.library = new CommandLibrary();
      this.initCommands();
      this.responseHandlers = this.initResponseHandlers();
      
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
        var response = this.library.execute(cmd);
        
        if(response == undefined){
          this.log('response', 'undefined');
          
        } else {        
          this.formatResponse(response);
        }
      } catch(ex) {
        this.log('error', ex.toString() );
      }
      
      if(this.options.autoScroll){
        $('html,body').animate({scrollTop: $(this.prompt).offset().top}, 1000);
      }
      this.prompt.val('');
    },
    
    formatResponse: function(response){
      var responseHandler = this.responseHandlerFor(response);
      if(responseHandler.html){
        this.logHTML('response', responseHandler.format(response), {title: responseHandler.name});
      } else {
        this.log('response', responseHandler.format(response), {title: responseHandler.name});
      }
    },
    
    responseHandlerFor: function(response){
      var responseHandler = null;
      for(key in this.responseHandlers){
        var h = this.responseHandlers[key]
        if(h.handles(response)){ 
          responseHandler = h;
          break; 
        }
      }
      return responseHandler;
    },
    
    log: function(type, message, attributes){
      attributes = attributes || {};
      this.logElement.append($("<div class='entry "+type+"'/>").text(message).attr(attributes));
    },
    
    logHTML: function(type, message, attributes){
      attributes = attributes || {};
      this.logElement.append($("<div class='entry "+type+"'/>").html(message).attr(attributes));
    },
    
    initResponseHandlers: function(){ 
      var handlers = [];
      
      // Conditional support for XML
      if(typeof XML == 'function'){
        handlers.push({
          name:    "XML",
          handles: function(r){ return(( (typeof r === 'xml') && r.toXMLString) ); },
          format:  function(r){ return(r.toXMLString()); }
        })
      }
      
      handlers.push({ 
        name:    "jQuery",
        html:    true,
        handles: function(r){ return((typeof r != 'xml') && r.jquery); },
        format:  function(r){ 
          if(r.context || r.length == 0){
            return("jQuery: " + r.length + " matches..."); 
          } else {
            return r;
          }
        }
      });
      
      // Conditional support for JSON
      if((typeof JSON != 'undefined') && JSON.stringify){
        handlers.push({
          name:    "JSON",
          handles: function(r){ return(! (typeof r === 'function' || typeof r == "undefined") ); },
          format:  function(r){ return(JSON.stringify(r)); }
        });
      }
      
      handlers.push({ 
        name:    "JavaScript",
        handles: function(r){ return(true); },
        format:  function(r){ return(r.toString()); }
      });
      
      return handlers;
    },
    
    initCommands: function(){
      this.library.register('about', 'information about JQuery CommandLine', function(){
        return 'JQuery CommandLine -- Adam Sanderson (2009)';
      });
      
      this.library.register('commands', 'lists all commands', function(){
        var summaries = $('<div><h3>Commands</h3></div>');
        for(key in this.commands){
          var command = this.commands[key];
          if( typeof command == 'function' ){
            summaries.append($('<div></div>').text(key + ': '+command.description));
          }
        }
        return summaries;
      });
    }
  });
  
  function CommandLibrary(commands){}
  $.extend( CommandLibrary.prototype , {
    commands: {},
    register: function(name, description, f){
      f.description = description;
      this.commands[name] = f;
    },
    execute: function(string){
      var res = string.match(/^(\w+)(\s+.+)?\s*$/);
      if(res){
        var name = res[1];
        var argumentString = res[2];
        
        var command = this.commands[name];
        if (typeof command === 'function'){
          var arguments = argumentString ? eval('['+argumentString+']') : [];
          return(command.apply(this, arguments));
        }
      }
      
      return eval('('+string+')');
    }
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
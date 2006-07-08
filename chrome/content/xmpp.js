/**
 * This is a convenience stateless wrapper to the bare XPCOM service,
 * to allow using it more comfortably from javascript.
 *
 * Example of creating a channel that filters incoming events,
 * bringing a session up, and sending a message.
 *
 *     var channel = XMPP.createChannel();
 *     channel.on(
 *         {event: 'message', direction: 'in'},
 *         function(message) { alert(message.stanza); } );
 *     
 *     XMPP.up(
 *         'user@server.org/Resource',
 *         {password: 'secret'});
 *     
 *     XMPP.send(
 *         'user@server.org/Resource',
 *         <message to="contact@server.org">
 *         <body>hello</body>
 *         </message>);
 *     
 */

var XMPP = {
    _service: Components
    .classes['@hyperstruct.net/xmpp4moz/xmppservice;1']
    .getService(Components.interfaces.nsIXMPPClientService)
    .wrappedJSObject,

    _serializer: Components
    .classes['@mozilla.org/xmlextras/xmlserializer;1']
    .getService(Components.interfaces.nsIDOMSerializer),

    get activeSessionNames() {
        return this._service.getSessions().map(
            function(session) { return session.name; })
    },
    
    up: function(jid, opts) {
        this._service.signOn(jid, opts.password)
    },

    // could have a reference count mechanism

    down: function(jid) {
        this._service.signOff(jid);
    },

    send: function(jid, stanza) {
        this._service.send(jid, stanza);
    },

    createChannel: function(baseFilter) {
        var channel = {
            _watchers: [],

            // unused -- will be used for things like binding a
            // channel to a specific session, even after the event
            // handlers have already been defined
            
            _baseFilter: baseFilter,

            // unused
            
            set baseFilter(val) {
                this._baseFilter = val;
            },

            // unused

            get baseFilter() {
                return this._baseFilter;
            },

            // temporarily stop the channel from forwardin events to
            // the handlers

            pause: function() {
                // stub
            },

            restart: function() {
                // stub
            },            

            on: function(pattern, handler) {
                this._watchers.push({pattern: pattern, handler: handler});
            },

            handle: function(event) {
                this._handle1(event, this._watchers, this._match1);
            },

            observe: function(subject, topic, data) {
                switch(topic) {
                    case 'stream':
                    var session = subject;
                    var state = data;
                    this.handle({
                        event: 'stream',
                        session: session.name,
                        state: state
                        });
                    break;
                    case 'data-in':
                    case 'data-out':
                    this.handle({
                        event: 'data',
                        session: subject,
                        direction: topic == 'data-in' ? 'in' : 'out',
                        content: data
                        });
                    break;
                    case 'stanza-in':
                    case 'stanza-out':
                    var stanza = new XML(data);
                    this.handle({
                        event: stanza.name(),
                        session: subject,
                        direction: topic == 'stanza-in' ? 'in' : 'out',
                        stanza: stanza
                        });
                }
            },

            release: function() {
                XMPP._service.removeObserver(this);
            },

            // not relying on non-local state

            _handle1: function(object, watches, matcher) {
                for each(var watch in watches) {
                    if(matcher(object, watch.pattern))
                        watch.handler(object);
                }
            },

            // not relying on non-local state

            _match1: function(object, template) {
                var pattern, value;
                for(var member in template) {
                    value = object[member];
                    pattern = template[member];
        
                    if(pattern === undefined)
                        ;
                    else if(pattern && typeof(pattern) == 'function') {
                        if(!pattern(value))
                            return false;
                    }
                    else if(pattern && typeof(pattern.test) == 'function') {
                        if(!pattern.test(value))
                            return false;
                    }
                    else if(pattern && pattern.id) {
                        if(pattern.id != value.id)
                            return false;
                    }
                    else if(pattern != value)
                        return false;
                } 

                return true;
            },

            // not relying on non-local state

            _union: function(x, y) {
                var u = {};
                for(var name in x)
                    u[name] = x[name];
                for(var name in y)
                    u[name] = y[name];
                return u;    
            }
        }

        this._service.addObserver(channel)

        return channel;
    }
};
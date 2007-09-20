/*
 * Copyright 2006-2007 by Massimiliano Mirra
 * 
 * This file is part of xmpp4moz.
 * 
 * xmpp4moz is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 3 of the License, or (at your
 * option) any later version.
 * 
 * xmpp4moz is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>
 *  
 */


// GLOBAL DEFINITIONS
// ----------------------------------------------------------------------

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const srvSocketTransport = Cc["@mozilla.org/network/socket-transport-service;1"]
    .getService(Ci.nsISocketTransportService);


// INITIALIZATION
// ----------------------------------------------------------------------

function init(host, port, ssl) {
    this._host = host;
    this._port = port;
    this._ssl = ssl;
    this._observers = [];
    this._keepAliveTimer = Cc['@mozilla.org/timer;1']
    .createInstance(Ci.nsITimer);
}


// PUBLIC INTERFACE - SESSION MANAGEMENT AND DATA EXCHANGE
// ----------------------------------------------------------------------

function write(data) {
    try {
        return this._outstream.writeString(data);
    } catch(e if e.name == 'NS_BASE_STREAM_CLOSED') {
        this.closed();
    }
}

function isConnected() {
    return this._connected;
}

function connect() {
    if(this._connected)
        return;

    this._socketTransport = this._ssl ?
        srvSocketTransport.createTransport(
            ['ssl'], 1, this._host, this._port, null) :
        srvSocketTransport.createTransport(
            null, 0, this._host, this._port, null);

    var _this = this;
    this._socketTransport.setEventSink({
        onTransportStatus: function(transport, status, progress, progressMax) {
            if(status == Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
                _this._connected = true;
                _this.notifyObservers(_xpcomize('stub'), 'start', null);
                _this.startKeepAlive();
            }
        }
    }, getCurrentThreadTarget());
}

function asyncRead(listener) {
    var baseOutstream = this._socketTransport.openOutputStream(0,0,0);
    this._outstream = Cc['@mozilla.org/intl/converter-output-stream;1']
    .createInstance(Ci.nsIConverterOutputStream);
    this._outstream.init(baseOutstream, 'UTF-8', 0, '?'.charCodeAt(0));
    
    this._instream = this._socketTransport.openInputStream(0,0,0);
    var inputPump = Cc['@mozilla.org/network/input-stream-pump;1']
    .createInstance(Ci.nsIInputStreamPump);
    inputPump.init(this._instream, -1, -1, 0, 0, false);

    var _this = this;
    inputPump.asyncRead({
        onStartRequest: function(request, context) {
            listener.onStartRequest.apply(null, arguments);
        },
        onStopRequest: function(request, context, status) {
            listener.onStopRequest.apply(null, arguments);
            if(status != 0)
                dump('Error! ' + status);

            _this.closed();
        },
        onDataAvailable: function(request, context, inputStream, offset, count) {
           listener.onDataAvailable(request, context, inputStream, offset, count);
        }
    }, null);
}

function disconnect() {
    this.closed();
}

// XXX implement "topic" and "ownsWeak" parameters as per IDL interface
function addObserver(observer) {
    this._observers.push(observer);    
}

// XXX implement "topic" parameter as per IDL interface
function removeObserver(observer) {
    var index = this._observers.indexOf(observer);
    if(index != -1) 
        this._observers.splice(index, 1);    
}

function notifyObservers(subject, topic, data) {
    subject = _xpcomize(subject);

    for each(var observer in this._observers) 
        try {
            observer.observe(subject, topic, data);
        } catch(e) {
            Cu.reportError(e);
            // XXX possibly remove buggy observers
        }
}


// INTERNALS
// ----------------------------------------------------------------------

function startKeepAlive() {
    var transport = this;
    this._keepAliveTimer.initWithCallback({
        notify: function(timer) {
            transport.write(' ');
        }
    }, 30000, Ci.nsITimer.TYPE_REPEATING_SLACK);
}

function closed() {
    if(!this._connected)
        return;

    this._instream.close();
    this._outstream.close();
    this._keepAliveTimer.cancel();
    this._connected = false;
    this.notifyObservers(_xpcomize('stub'), 'stop', null);
}

function _xpcomize(string) {
    if(string instanceof Ci.nsISupportsString)
        return string;
    else if(typeof(string) == 'string') {
        var xpcomized = Cc["@mozilla.org/supports-string;1"]
            .createInstance(Ci.nsISupportsString);
        xpcomized.data = string;
        return xpcomized;
    } else
        throw new Error('Not an XPCOM nor a Javascript string. (' + string + ')');
}

function getCurrentThreadTarget() {
    if('@mozilla.org/thread-manager;1' in Cc)
        return Cc['@mozilla.org/thread-manager;1'].getService().currentThread;
    else
        return Cc['@mozilla.org/event-queue-service;1'].getService(Ci.nsIEventQueueService)
            .createFromIThread(
                Cc['@mozilla.org/thread;1'].getService(Ci.nsIThread), true)
}

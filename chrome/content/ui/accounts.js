/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is xmpp4moz.
 *
 * The Initial Developer of the Original Code is
 * Massimiliano Mirra <bard [at] hyperstruct [dot] net>.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


// GLOBAL DEFINITIONS
// ----------------------------------------------------------------------

var xmpp = xmpp || {};
xmpp.ui = xmpp.ui || {};


// GUI ACTIONS
// ----------------------------------------------------------------------

xmpp.ui.refreshAccounts = function(menuPopup) {
    var ns_muc = 'http://jabber.org/protocol/muc';

    while(menuPopup.firstChild &&
          menuPopup.firstChild.nodeName != 'menuseparator')
        menuPopup.removeChild(menuPopup.firstChild);

    XMPP.accounts.forEach(
        function(account) {
            var menuItem = document.createElement('menuitem');
            menuItem.setAttribute('label', account.jid);
            menuItem.setAttribute('value', account.jid);
            menuItem.setAttribute('class', 'menuitem-iconic');

            accountPresence =
                XMPP.cache.fetch({
                    event: 'presence',
                    direction: 'out',
                    account: account.jid,
                    stanza: function(s) { return s.ns_muc::x == undefined; }
                    })[0] ||
                { stanza: <presence type="unavailable"/> };

            menuItem.setAttribute('availability',
                                  accountPresence.stanza.@type == undefined ?
                                  'available' : 'unavailable')

                menuItem.setAttribute('show',
                                      accountPresence.stanza.show.toString());

            menuPopup.insertBefore(menuItem, menuPopup.firstChild);            
        })
};

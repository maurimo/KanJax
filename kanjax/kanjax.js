
String.prototype.regexIndexOf = function(regex, startpos) {
    var indexOf = this.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

var KanJax = {
    basePath: "kanjax/",
    
    loadStaticJSON: false,
    
    forcePopupPositionX: false,
    
    forcePopupPositionY: false,
    
    rubySkipGroupIf: function(node) {
        if(['RB','RUBY'].indexOf(node.tagName) >= 0)
            return true;
        if(node.tagName == 'SPAN' && 
            ['kanjax_ruby','kanjax_rt'].indexOf(node.className) >= 0)
            return true;
        return false;
    },
    
    useRubyElement: true,
    
    popupContent: "Couldn't load popup template.",

    popupCache: {
    },
    
    html: (function(){
        var entityMap = { "&": "&amp;",  "<": "&lt;",  ">": "&gt;",
                '"': '&quot;',  "'": '&#39;',  "/": '&#x2F;'  };

        return function(string) {
            return String(string).replace(/[&<>"'\/]/g, function (s) {
            return entityMap[s];
            });
        }
    })(),
    
    errorMessage: function(url, xhr) {
        return 'Loading "'+KanJax.html(url)+'": <br/>'+
            KanJax.html(xhr.status)+' ('+KanJax.html(xhr.statusText)+')';
    },

    // inserts into the DOM what is necessary to show the default popup.
    setupPopup: function() {
        var div, style, url;

        // load the template, if loading local data just put here a static version
        if(KanJax.loadStaticJSON)
            KanJax.iframeRequest(
                KanJax.basePath + "kanjax_popup_template.static.html",
                function(result) {
                    if(result.status == "OK")
                        KanJax.popupContent = result.data;
                    else
                        KanJax.showErrorPopup(result);
                });
        else {
            url = KanJax.basePath + "kanjax_popup_template.html";
            $.get(url,
                function(response) {
                    KanJax.popupContent = response;
            }).fail(function(xhr, msg) {
                KanJax.showErrorPopup({ "status": "AJAX_ERROR",
                    "message": KanJax.errorMessage(url, xhr)
                });
            });
        }

        // load the css
        if(!document.getElementById('kanjax_style')) {
            style = document.createElement("link");
            style.id = "kanjax_style";
            style.setAttribute("rel", "stylesheet");
            style.setAttribute("type", "text/css");
            style.setAttribute("href", KanJax.basePath + "kanjax_popup.css");
            document.head.appendChild(style);
        }

        // load the popup
        if(!document.getElementById('kanjax_popup')) {
            div = document.createElement("div");
            div.id = "kanjax_popup";
            div.className = 'kanjax_forbidden';
            div.style.display = 'none';
            document.body.appendChild(div);
        }
    },

    // cleans all the default popup stuff inserted in the DOM.
    cleanupPopup: function() {
        var el;
        if(el = document.getElementById('kanjax_popup'))
            KanJax.remove(el);
        if(el = document.getElementById('kanjax_style'))
            KanJax.remove(el);
    },

    // shows the popup
    showPopup: function(info, kanji) {
        var div, k, content, x, y, url;
        //console.log('showPop');
        div = document.getElementById("kanjax_popup");
        content = KanJax.popupContent.replace(
                /\{\{(\w+)\}\}/g,
            function(match, key) {
                if(key in info)
                    return info[key]
                else if(key == 'KANJAX_BASEPATH')
                    return KanJax.basePath;
                else
                    return "{unknown field "+key+"}";
            });
        div.innerHTML = content;

        // it not loading static local data, allow editing
        // for fields having "editable" class, the innerHTML will be edited.
        if(!KanJax.loadStaticJSON) {
            url = encodeURI(KanJax.basePath + "data.php?kanji=" + kanji);
            $("#kanjax_popup .editable").editable(url, {
                id        : "key",
                indicator : "<img style='height:1.15em' src='"+KanJax.basePath+"indicator.gif'>",
                tooltip   : "Click to edit...",
                style     : "display: inline; margin: 0px;",
                callback  : function(response, settings) {
                    response = $.parseJSON(response);
                    if(response.status == "OK") {
                        if(kanji in KanJax.popupCache)
                            KanJax.popupCache[kanji][response.key] = response.value;
                        $(this).html(response.value);
                    }
                    else {
                        KanJax.bPopup.close();
                        KanJax.showErrorPopup(response);
                    }
                },
                onerror : function(req, el, xhr) {
                    KanJax.bPopup.close();
                    KanJax.showErrorPopup({ "status": "AJAX_ERROR",
                        "message": KanJax.errorMessage(url, xhr)
                    });
                }
            });
        }
        
        if(!(typeof(KanJax.forcePopupPositionY)=='number')) {
            $(div).find('img').load(function() {
                var x,y;
                y = document.body.scrollTop + (document.body.clientHeight - $(div).height()) / 2;
                x = document.body.scrollLeft + (document.body.clientWidth - $(div).width()) / 2;
                //console.log('new: '+x+', '+y);
                $(div).css({left: x, top: y});
            });
        }
        $(div).css({
            position: "absolute", display: 'block', visibility: 'hidden',
            marginLeft: 0, marginTop: 0, top: 0, left: 0
        });
        setTimeout(function(){
            var x, y;
            y = (document.body.clientHeight - $(div).height()) / 2;
            x = (document.body.clientWidth - $(div).width()) / 2;
            if(typeof(KanJax.forcePopupPositionX)=='number')
                x = KanJax.forcePopupPositionX;
            if(typeof(KanJax.forcePopupPositionY)=='number')
                y = KanJax.forcePopupPositionY;
            //console.log('base: '+x+', '+y);
            $(div).css({ display: 'none', visibility: 'visible' });
            KanJax.bPopup = $(div).bPopup({ speed: 120, position: [x, y] });
        }, 10);
    },

    // show the popup, displaying an error message
    showErrorPopup: function(info) {
        //console.log('showErr');
        var div, content;
        div = document.getElementById("kanjax_popup");
        content = "<h2>Error!</h2>" + info.status;
        if(info.message)
            content += "<br/>" + info.message;
        div.innerHTML = content;
        $(div).css({
            position: "absolute", display: 'block', visibility: 'hidden',
            marginLeft: 0, marginTop: 0, top: 0, left: 0
        });
        setTimeout(function(){
            var x, y;
            //console.log('esize: '+$(div).height()+', '+$(div).width())
            y = (document.body.clientHeight - $(div).height()) / 2;
            x = (document.body.clientWidth - $(div).width()) / 2;
            if(typeof(KanJax.forcePopupPositionX)=='number')
                x = KanJax.forcePopupPositionX;
            if(typeof(KanJax.forcePopupPositionY)=='number')
                y = KanJax.forcePopupPositionY;
            //console.log('err: '+x+', '+y);
            $(div).css({ display: 'none', visibility: 'visible' });
            $(div).bPopup({ speed: 120, position: [x, y] });
        }, 10);
    },
    
    resetIframeRequest: function() {
        if(KanJax.showErrorTimeout) { //async mess??
            clearTimeout(KanJax.showErrorTimeout);
            delete KanJax.showErrorTimeout;
        }
        if(KanJax.cleanupMessageListener)
            KanJax.cleanupMessageListener();
    },

    iframeRequest: function(url, success) {
        var messageHandler;
        KanJax.resetIframeRequest();

        // set handler for inter-frame messages
        messageHandler = function(event) {
            //event.target.removeEventListener(event.type, arguments.callee);
            KanJax.resetIframeRequest();
            success(event.data);
        }
        KanJax.cleanupMessageListener = (function(messageHandler){
            return function() {
                window.removeEventListener("message", messageHandler);
                delete KanJax.cleanupMessageListener;
            }
        })(messageHandler);
        window.addEventListener("message", messageHandler, false);

        // create hidden iframe, that will later communicate and auto-remove
        i = document.createElement('iframe');
        i.style.display = 'none';

        i.onload = (function(messageHandler, url) {
            return function(e) {
                i.parentNode.removeChild(i);
                if(KanJax.showErrorTimeout) { //async mess??
                    clearTimeout(KanJax.showErrorTimeout);
                    delete KanJax.showErrorTimeout;
                }
                KanJax.showErrorTimeout = setTimeout(function(){
                    if(KanJax.cleanupMessageListener) {
                        KanJax.cleanupMessageListener();
                        KanJax.showErrorPopup({"status":"IFRAME_ERROR",
                            "message":"Couldn't load iframe '"+url+"'!"});
                        delete KanJax.showErrorTimeout;
                    }
                }, 1000);
            };
        })(messageHandler, url);
        i.src = url;
        document.body.appendChild(i);
    },

    // default click handler, uses jQuery + bPopup to show a nice popup
    activatePopup: function(e) {
        var kanji, info, img, w, url, i, messageHandler;

        if((e.type == "mousedown") && e.which != 2)
            return true;

        e.preventDefault();
        kanji = e.currentTarget.textContent || e.currentTarget.innerText;

        // test cache
        if(kanji in KanJax.popupCache) {
            if(KanJax.loadStaticJSON)
                KanJax.resetIframeRequest();
            KanJax.showPopup(KanJax.popupCache[kanji], kanji);
            return false;
        }

        // if not in cache, load via ajax
        if(KanJax.loadStaticJSON)
            KanJax.iframeRequest(
                encodeURI(KanJax.basePath + "static_data/" + kanji.charCodeAt(0) + ".html"),
                function(result) {
                    if(result.status == "OK") {
                        KanJax.popupCache[kanji] = result.data;
                        KanJax.showPopup(result.data, kanji);
                    }
                    else
                        KanJax.showErrorPopup(result);
                }
            );
        else {
            url = encodeURI(KanJax.basePath + "data.php?kanji=" + kanji);
            $.ajax({
                url: url,
                success: function(result) {
                    if(result.status == "OK") {
                        KanJax.popupCache[kanji] = result.data;
                        KanJax.showPopup(result.data, kanji);
                    }
                    else
                        KanJax.showErrorPopup(result);
                },
                error: function(xhr, msg) {
                    KanJax.showErrorPopup({ "status": "AJAX_ERROR",
                        "message": KanJax.errorMessage(url, xhr)
                    });
                }
            });
        }

        return false;
    },

    // Matches all starting chars that are not
    // punctuaction (\u3000-\u303f), hiragana (\u3040-\u309f), katakana (\u30a0-\u30ff), 
    // fw-roman and hw-katakana (\uff00-\uffef), kanji and ext kanji (\u4e00-\u9faf\u3400-\u4dbf)
    JP_REG:
        /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\u3400-\u4dbf]/,

    KANJI_REG:
        /[\u4e00-\u9faf\u3400-\u4dbf]/,

    // Matches a string starting with a kanji
    START_REG:
        /^[\u4e00-\u9faf\u3400-\u4dbf]/,

    // Looks for a string starting with a kanji, with empty match
    SPLIT_REG:
        /(?=[\u4e00-\u9faf\u3400-\u4dbf])/,

    // Utility for inserting node after a given one
    insertAfter: function(n, s) {
        n.parentNode.insertBefore(s, n.nextSibling);
    },

    remove: function(n) {
        if(n.remove)
            n.remove();
        else
            n.parentNode.removeChild(n);
    },

    // Utility to get all text nodes under a given element
    textNodesUnder : function(el, mark_links) {
        var n, p, list=[], forbid, i, forbid_list = [],
            links, links_list = [], walker, doc, inlink;

        doc = el.ownerDocument;

        forbid = el.getElementsByClassName("kanjax_forbidden");
        for(i = 0; i < forbid.length; ++i) {
            walker = doc.createTreeWalker(forbid[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode())
                forbid_list.push(n);
        }

        if(!mark_links) {
            walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode()) {
                if(forbid_list.indexOf(n) >= 0)
                    continue;
                list.push(n);
            }
            return list;
        }

        links = el.getElementsByTagName("A");
        for(i = 0; i < links.length; ++i) {
            walker = doc.createTreeWalker(links[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode())
                links_list.push(n);
        }

        walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        while(n = walker.nextNode()) {
            if(n.parentNode.tagName == "SPAN" && n.parentNode.className == "kanjax")
                continue;
            if(forbid_list.indexOf(n) >= 0)
                continue;
            inlink = !!(links_list.indexOf(n) >= 0);
            list.push([n, inlink]);
        }
        return list;
    },

    // Removes all links, and the text is again put in a text node
    removeLinks : function(el) {
        var els, i, text, tN;

        el = el || document.body;

        // make els an array, and NOT and HTMLCollection.
        // If it is left as HTMLCollection and we iterate while not empty,
        // it will trigger a slow behavior (bug?) in Chrome, and link
        // removal is made very very slow (probably because the whole
        // collection needs to be sorted at each step, or something).
        els = [].slice.call(el.getElementsByClassName("kanjax"));

        for(i = 0; i<els.length; i++) {
            text = els[i].textContent || els[i].innerText;
            if(els[i].previousSibling && els[i].previousSibling.nodeType == 3) {
                text = els[i].previousSibling.data + text;
                KanJax.remove(els[i].previousSibling);
            }
            if(els[i].nextSibling && els[i].nextSibling.nodeType == 3) {
                text = text + els[i].nextSibling.data;
                KanJax.remove(els[i].nextSibling);
            }
            tN = els[i].ownerDocument.createTextNode(text);
            els[i].parentNode.replaceChild(tN, els[i]);
        }
    },

    // Looks for all kanjis, and for each sets a link with a click function.
    addLinks : function(el) {
        var list, n, islink, parts, i, j, aN, tN, doc;

        el = el || document.body;
        list = KanJax.textNodesUnder(el, true);

        for(i = 0; i<list.length; i++) {
            n = list[i][0];
            islink = list[i][1];
            
            doc = n.ownerDocument;
            parts = n.data.split(KanJax.SPLIT_REG);

            if(parts[0].match(KanJax.START_REG))
                parts.unshift('');

            for(j = parts.length-1; j >= 1; j--) {
                if(parts[j].length > 1) {
                    tN = doc.createTextNode(parts[j].slice(1));
                    KanJax.insertAfter(n, tN);
                }

                aN = doc.createElement("SPAN");
                aN.className = "kanjax";
                if(!islink)
                    aN.onclick = KanJax.activatePopup;
                aN.onmousedown = KanJax.activatePopup;
                tN = doc.createTextNode(parts[j].slice(0,1));
                aN.appendChild(tN);
                KanJax.insertAfter(n, aN);
            }

            if(parts[0].length)
                n.data = parts[0];
            else
                KanJax.remove(n);
        }
    },

    findStringIn : function(a, b) {
        var i, j, start_a, start_b, new_a, new_b;
        i = start_a = a.regexIndexOf(KanJax.JP_REG, 0);
        if(i < 0)
            return [false, [0,0]];
        j = start_b = b.regexIndexOf(KanJax.JP_REG, 0);
        if(j < 0)
            return [[i,i], false];
        while(true) {
            if(a[i] != b[j])
                console.log('Mismatch: "'+a[i]+'" != "'+b[j]+'"');
            if(i+1 >= a.length || j+1 >= b.length)
                return [[start_a, i+1], [start_b, j+1]];
            new_a = a.regexIndexOf(KanJax.JP_REG, i + 1);
            new_b = b.regexIndexOf(KanJax.JP_REG, j + 1);
            if(new_a < 0 || new_b < 0)
                return [[start_a, i+1], [start_b, j+1]];
            i = new_a;
            j = new_b;
        }
    },
    
    appendText: function(text, node) {
        var el = node.ownerDocument.createTextNode(text);
        KanJax.insertAfter(node, el);
        return el;
    },

    addGroupReading : function(group, reading) {
        var i, j, text_to_add, text, added_elements, 
            is_simple_text, readtext, found, orig, node, el, el2;
        
        for(i = 0; i<group.length; ++i) {
            if(!group[i].parentNode) {
                console.log("ELEMENT REMOVED!! bailing out...");
                return;
            }
        }
        
        i = 0;
        j = 0;

        //text we skipped over, with no reading to add, to be added in the dom.
        text_to_add = '';
        added_elements = false;
        text = group[i].data;
        node = group[i];

        while(j < reading.length) {
            is_simple_text = (typeof(reading[j])=='string');
            readtext = is_simple_text ? reading[j] : reading[j][0];

            found = KanJax.findStringIn(text, readtext);

            //console.log("F with "+text+" ~~ "+readtext+" ~~ " 
            //    + found.toString() + " ~ "+is_simple_text);

            // no japanese text, go to the next text node
            if(!found[0]) {
                text_to_add += text;
                if(text_to_add) {
                    //console.log("T1: " + text_to_add);
                    if(added_elements)
                        node = KanJax.appendText(text_to_add, node);
                    // else, the text was entirely skipped!
                }
                text_to_add = '';
                i++;
                if(i >= group.length)
                    return;
                added_elements = false;
                text = group[i].data;
                node = group[i];
                continue;
            }

            // no japanese text in the reading string, skip this reading
            if(!found[1]) {
                j++;
                //console.log("NO JAP in the reading!");
                continue;
            }

            if(is_simple_text) {
                text_to_add += text.substr(0, found[0][1]);
                //console.log("more text...: " + text_to_add);
            }
            else {
                text_to_add += text.substr(0, found[0][0]);
                var has_text_to_add = !!text_to_add;
                if(has_text_to_add) {
                    //console.log("T2: " + text_to_add);
                    if(node == group[i]) added_beginning = true;
                    if(added_elements)
                        node = KanJax.appendText(text_to_add, node);
                    else
                        node.data = text_to_add;
                    text_to_add = '';
                }
                orig = text.substr(found[0][0], found[0][1]-found[0][0]);
                //console.log("R: " + orig + "["+reading[j][1]+"]");
                
                var old_node = node;
                doc = node.ownerDocument;

                if(KanJax.useRubyElement) {
                    el = doc.createElement("ruby");
                    el2 = doc.createElement("rb");
                    el2.appendChild(doc.createTextNode(orig));
                    el.appendChild(el2);

                    el2 = doc.createElement("rt");
                    el2.appendChild(doc.createTextNode(reading[j][1]));
                    el.appendChild(el2);
                }
                else {
                    el2 = doc.createElement("span");
                    el2.className = "kanjax_rt";
                    el2.appendChild(doc.createTextNode(reading[j][1]));
                    
                    el = doc.createElement("span");
                    el.className = "kanjax_ruby";
                    el.appendChild(el2);
                    el.appendChild(doc.createTextNode(orig));
                }

                KanJax.insertAfter(node, el);
                node = el;

                if(!has_text_to_add && !added_elements)
                    KanJax.remove(old_node);
                added_elements = true;
            }
            text = text.substr(found[0][1]); // new text removing what we saw

            // if the element was not containing the whole read text, add the
            // reamining part as simple text in the j+1-th position, so it will be skipped
            // later. This is not optimal as the reading will all be over the first part,
            // but will happen only if you break a word putting part of it in a link, etc.
            if(found[1][1] < readtext.length) {
                if(is_simple_text)
                    reading[j] = readtext.substr(0, found[1][1]);
                else
                    reading[j][0] = readtext.substr(0, found[1][1]);
                reading.splice(j+1, 0, readtext.substr(found[1][1]));
                //console.log("NEW: "+reading);
            }
            j++;
        }
        if(text_to_add) {
            //console.log("T3: "+text_to_add);
            if(added_elements)
                node = KanJax.appendText(text_to_add, node);
            // else, the text was entirely skipped!
        }
    },
    
    addRubiesStep : function(state) {
        var n, text, p, currp, currstr, currgr, totstr,
            strings, groups, skipthis, skipgroup, url;
        totstr = 0;
        strings = [];
        groups = [];
        currp = null;
        skipgroup = false;
        currstr = '';
        currgr = [];
        while(state.i <= state.list.length) {
            if(state.i < state.list.length) {
                n = state.list[state.i];
                p = n.parentNode;
                if(!p) {
                    console.log("ELEMENT REMOVED!! bailing out...");
                    return;
                }
                skipthis = false;
                while(["A","B","I","EM","SPAN","FONT","STRONG","RUBY","RT","RB"].indexOf(p.tagName) >= 0) {
                    if(!skipgroup && KanJax.rubySkipGroupIf(p))
                        skipgroup = true;
                    p = p.parentNode;
                }
            }
            else
                n = p = null;
            //console.log(n.data);
            if(currp && (currp != p)) {
                currstr = currstr.trim().replace(/\s+/g,' ');
                //console.log('adding...'+skipgroup+', '+currstr+', '+currstr.search(KanJax.KANJI_REG));
                if(!skipgroup && currstr && (currstr.search(KanJax.KANJI_REG) >= 0)) {
                    totstr += currstr.length+3;
                    strings.push(currstr);
                    groups.push(currgr);
                    if(totstr > 800)
                        break;
                }
                skipgroup = false;
                currstr = '';
                currgr = [];
            }
            if(state.i >= state.list.length)
                break;
            currp = p;
            currgr.push(n);
            currstr += n.data;
            state.i++;
        }

        //console.log(strings);
        if(!strings.length) {
            if(state.settings && state.settings.success)
                state.settings.success();
            return;
        }

        url = encodeURI(KanJax.basePath + "reading.php");
        $.ajax({
            type: "POST",
            data: { text : strings },
            url: url,
            success: function(result) {
                var i;
                if(result.status == "OK") {
                    for(i = 0; i < groups.length; ++i)
                        KanJax.addGroupReading(groups[i], result.data[i]);
                    KanJax.addRubiesStep(state);
                }
                else {
                    KanJax.showErrorPopup(result);  
                }
            },
            error: function(xhr, msg) {
                KanJax.showErrorPopup({ "status": "AJAX_ERROR",
                    "message": KanJax.errorMessage(url, xhr)
                });
            }
        });
    },

    addRubies : function(el, settings) {
        var el, list, status;
        el = el || document.body;
        list = KanJax.textNodesUnder(el, false);
        state = { list: list, i: 0, settings: settings };
        //console.log(state);
        KanJax.addRubiesStep(state);
    },

    removeRubies : function(el) {        
        var els, coll, i, j, rb, ch, chn, text, tN;

        el = el || document.body;

        // make els an array, and NOT and HTMLCollection.
        // If it is left as HTMLCollection and we iterate while not empty,
        // it will trigger a slow behavior (bug?) in Chrome, and link
        // removal is made very very slow (probably because the whole
        // collection needs to be sorted at each step, or something).
        coll = KanJax.useRubyElement ? el.getElementsByTagName("ruby") :
                    el.getElementsByClassName("kanjax_ruby");
        els = [].slice.call(coll);

        for(i = 0; i<els.length; i++) {
            if(KanJax.useRubyElement) {
                rb = els[i].getElementsByTagName('RB');
                if(rb.length == 0) {
                    console.log('No RB child in RUBY?');
                    continue;
                }
                ch = [].slice.call(rb[0].childNodes);
                for(j = 1; j < rb.length; j++)
                    ch += rb[i].childNodes;
            }
            else {
                ch = [];
                chn = els[i].childNodes;
                for(j = 0; j < chn.length; j++)
                    if(chn[j].nodeType != 1 || chn[j].className != "kanjax_rt")
                        ch.push(chn[j]);
            }
            if(ch[0].nodeType == 3 &&
                els[i].previousSibling && els[i].previousSibling.nodeType == 3) {
                ch[0].data = els[i].previousSibling.data + ch[0].data;
                KanJax.remove(els[i].previousSibling);
            }
            if(ch[ch.length-1].nodeType == 3 &&
                els[i].nextSibling && els[i].nextSibling.nodeType == 3) {
                ch[ch.length-1].data = ch[ch.length-1].data + els[i].nextSibling.data;
                KanJax.remove(els[i].nextSibling);
            }
            for(j = 0; j < ch.length; j++)
                els[i].parentNode.insertBefore(ch[j], els[i]);
            KanJax.remove(els[i]);
        }
    },

    setup : function(doc) {
        var style;
        doc = (doc || document);
        if(!doc.getElementById("kanjax_css")) {
            style = doc.createElement("link");
            style.id = "kanjax_css";
            style.setAttribute("rel", "stylesheet");
            style.setAttribute("type", "text/css");
            style.setAttribute("href", KanJax.basePath + "kanjax.css");
            doc.head.appendChild(style);
        }
    },

    cleanup: function(doc) {
        var el;
        doc = (doc || document);
        if(el = doc.getElementById('kanjax_css'))
            el.remove();
    },

    basicInstall: function() {
        KanJax.setupPopup();
        KanJax.setup();
        KanJax.addLinks();
    },

    fullUninstall: function() {
        KanJax.cleanupPopup();
        KanJax.cleanup();
        KanJax.removeLinks();
    }
};

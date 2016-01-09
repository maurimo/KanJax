
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
    
    // while increasing this limit, keep in mind that each japanese char
    // is expanded to about 9 ascii chars, so, the POST request must allow
    // a request of size at least postJPCharsSoftLimit * 9.
    postJPCharsSoftLimit: 10000,
    
    kanjiPopupTemplate: "Couldn't load popup template.",

    kanjiPopupCache: {
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
        if(KanJax.loadStaticJSON) {
            KanJax.iframeRequest(
                KanJax.basePath + "kanji_popup_template.static.html",
                function(result) {
                    if(result.status == "OK")
                        KanJax.kanjiPopupTemplate = result.data;
                    else
                        KanJax.showErrorPopup(result);
                });
            //dictionary and furigana are not supported in the static case
        }
        else {
            url = KanJax.basePath + "kanji_popup_template.html";
            $.get(url,
                function(response) {
                    KanJax.kanjiPopupTemplate = response;
            }).fail(function(xhr, msg) {
                KanJax.showErrorPopup({ "status": "AJAX_ERROR",
                    "message": KanJax.errorMessage(url, xhr)
                });
            });

            url = KanJax.basePath + "dict_popup_template.html";
            $.get(url,
                function(response) {
                    KanJax.dictPopupTemplate = response;
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
            style.setAttribute("href", KanJax.basePath + "popup.css");
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

    makePopupVisible: function(div) {
        $(div).find('img').load(function() {
            var x,y;
            y = document.body.scrollTop + (window.innerHeight - $(div).outerHeight()) / 2;
            x = document.body.scrollLeft + (window.innerWidth - $(div).outerWidth()) / 2;
            $(div).css({left: x, top: y});
        });
        $(div).css({
            position: "absolute", display: 'block', visibility: 'hidden',
            marginLeft: 0, marginTop: 0, top: 0, left: 0
        });
        setTimeout(function() {
            var x, y;
            y = (window.innerHeight - $(div).outerHeight()) / 2;
            x = (window.innerWidth - $(div).outerWidth()) / 2;
            if(typeof(KanJax.forcePopupPositionX)=='number')
                x = KanJax.forcePopupPositionX;
            if(typeof(KanJax.forcePopupPositionY)=='number')
                y = KanJax.forcePopupPositionY;
            $(div).css({ display: 'none', visibility: 'visible' });
            KanJax.bPopup = $(div).bPopup({ speed: 120, position: [x, y] });
        }, 10);        
    },
    
    // shows the popup
    showKanjiPopup: function(info, kanji) {
        var div, content, url;

        div = document.getElementById("kanjax_popup");
        div.innerHTML = KanJax.expandTemplate(
            KanJax.kanjiPopupTemplate, info);

        // it not loading static local data, allow editing
        // for fields having "editable" class, the innerHTML will be edited.
        if(!KanJax.loadStaticJSON) {
            url = encodeURI(KanJax.basePath + "data.php?kanji=" + kanji);
            $("#kanjax_popup .editable").editable(url, {
                id        : "key",
                indicator : "<img style='height:1.15em' src='"+
                                    KanJax.basePath+"indicator.gif'>",
                tooltip   : "Click to edit...",
                style     : "display: inline; margin: 0px;",
                callback  : function(response, settings) {
                    response = $.parseJSON(response);
                    if(response.status == "OK") {
                        if(kanji in KanJax.kanjiPopupCache)
                            KanJax.kanjiPopupCache[kanji][response.key] = response.value;
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

        div.className = 'kanji_popup';
        KanJax.makePopupVisible(div);
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
        div.className = 'error_popup';
        KanJax.makePopupVisible(div);
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

    activateKanjiPopupMiddle: function(e) {
        if((e.type == "mousedown") && e.which != 2)
            return true;
        return KanJax.activateKanjiPopup(e);
    },

    activateKanjiPopupLeftOrMiddle: function(e) {
        if((e.type == "mousedown") && e.which != 2 && e.which != 1)
            return true;
        return KanJax.activateKanjiPopup(e);
    },
        
    // default click handler, uses jQuery + bPopup to show a nice popup
    activateKanjiPopup: function(e) {
        var kanji, info, img, w, url, i, messageHandler;

        e.preventDefault();
        e.stopPropagation();
        kanji = e.currentTarget.textContent || e.currentTarget.innerText;

        // test cache
        if(kanji in KanJax.kanjiPopupCache) {
            if(KanJax.loadStaticJSON)
                KanJax.resetIframeRequest();
            KanJax.showKanjiPopup(KanJax.kanjiPopupCache[kanji], kanji);
            return false;
        }

        // if not in cache, load via ajax
        if(KanJax.loadStaticJSON)
            KanJax.iframeRequest(
                encodeURI(KanJax.basePath + "static_data/" + kanji.charCodeAt(0) + ".html"),
                function(result) {
                    if(result.status == "OK") {
                        KanJax.kanjiPopupCache[kanji] = result.data;
                        KanJax.showKanjiPopup(result.data, kanji);
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
                        KanJax.kanjiPopupCache[kanji] = result.data;
                        KanJax.showKanjiPopup(result.data, kanji);
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

    // Matches all starting chars that are one of:
    // * punctuaction (\u3000-\u303f) MINUS the 'IDEOGRAPHIC SPACE' \u3000,
    // * hiragana (\u3040-\u309f),
    // * katakana (\u30a0-\u30ff), 
    // * fullwidth-roman and halfwidth-katakana (\uff00-\uffef),
    // * kanji and kanji ext A (\u4e00-\u9faf\u3400-\u4dbf).
    JP_REG:
        /[\u3001-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\u3400-\u4dbf]/,

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
            links, links_list = [], walker, doc, inlink, inforbidden;

        doc = el.ownerDocument;

        forbid = el.getElementsByClassName("kanjax_forbidden");
        for(i = 0; i < forbid.length; ++i) {
            // skip if this node is contained in the previous one, 
            // so we will have a non-duplicated DOM-ordered list
            if(i > 0 && (forbid[i].compareDocumentPosition(forbid[i-1]) & 8))
                continue;
            walker = doc.createTreeWalker(forbid[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode()) {
                //if(forbid_list.length && !(forbid_list[forbid_list.length-1].compareDocumentPosition(n) & 4))
                //    console.log('Error, forbid_list is not ordered!');
                forbid_list.push(n);
            }
        }

        // just return a list of non-forbidden text nodes
        if(!mark_links) {
            walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode()) {
                if(forbid_list[0] == n) {
                    forbid_list.shift();
                    continue;
                }
                list.push(n);
            }
            return list;
        }

        // get text nodes in a link. By W3C links cannot be nested,
        // so no "is-contained" test is necessary
        links = el.getElementsByTagName("A");
        for(i = 0; i < links.length; ++i) {
            walker = doc.createTreeWalker(links[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode()) {
                //if(links_list.length && !(links_list[links_list.length-1].compareDocumentPosition(n) & 4))
                 //   console.log('Error, links_list is not ordered!');
                links_list.push(n);
            }
        }

        walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        while(n = walker.nextNode()) {
            inlink = false;
            if(links_list.length && links_list[0] == n) {
                links_list.shift();
                inlink = true;
            }
            if(forbid_list[0] == n) {
                forbid_list.shift();
                continue;
            }
            if(n.parentNode.tagName == "SPAN" && n.parentNode.className == "kanjax")
                continue;
            list.push([n, inlink]);
        }
        return list;
    },

    // Removes all links, and the text is again put in a text node
    removeKanjiInfo : function(el) {
        var els, i, text, tN;
        //var t1, t2;
        //t1 = new Date().getTime();

        el = el || document.body;

        // make els an array, and NOT and HTMLCollection.
        // If it is left as HTMLCollection and we iterate while not empty,
        // it will trigger a slow behavior (bug?) in Chrome, and link
        // removal is made very very slow (probably because the whole
        // collection needs to be sorted at each step, or something).
        els = [].slice.call(el.getElementsByClassName("kanjax"));
        
        //t3 = new Date().getTime();
        //console.log('rm: '+(t3-t1));

        for(i = 0; i<els.length; i++) {
            text = els[i].textContent || els[i].innerText;
            if(els[i].previousSibling && els[i].previousSibling.nodeType == 3) {
                if(els[i].nextSibling && els[i].nextSibling.nodeType == 3) {
                    els[i].previousSibling.data = els[i].previousSibling.data + text + els[i].nextSibling.data;
                    KanJax.remove(els[i].nextSibling);
                }
                else
                    els[i].previousSibling.data = els[i].previousSibling.data + text;
                KanJax.remove(els[i]);
            }
            else if(els[i].nextSibling && els[i].nextSibling.nodeType == 3) {
                els[i].nextSibling.data = text + els[i].nextSibling.data;
                KanJax.remove(els[i]);
            }
            else {
                tN = els[i].ownerDocument.createTextNode(text);
                els[i].parentNode.replaceChild(tN, els[i]);
            }
        }
        //t2 = new Date().getTime();
        //console.log('r2: '+(t2-t1));
    },

    // Looks for all kanjis, and for each sets a link with a click function.
    addKanjiInfo : function(el) {
        var list, n, islink, parts, i, j, aN, tN, doc;
        //var t1, t2, t3;
        //t1 = new Date().getTime();

        el = el || document.body;
        list = KanJax.textNodesUnder(el, true);

        //t2 = new Date().getTime();
        //console.log('t2: '+(t2-t1));

        for(i = 0; i<list.length; i++) {
            n = list[i][0];
            islink = list[i][1];
            
            doc = n.ownerDocument;
            parts = n.data.split(KanJax.SPLIT_REG);

            if(parts[0].search(KanJax.START_REG) >= 0)
                parts.unshift('');

            for(j = parts.length-1; j >= 1; j--) {
                if(parts[j].length > 1) {
                    tN = doc.createTextNode(parts[j].slice(1));
                    KanJax.insertAfter(n, tN);
                }

                aN = doc.createElement("SPAN");
                aN.className = "kanjax";
                aN.dataset['kanji'] = parts[j].slice(0,1);
                //if(!islink) aN.onclick = KanJax.activateKanjiPopup;
                aN.onmousedown = islink
                    ? KanJax.activateKanjiPopupMiddle
                    : KanJax.activateKanjiPopupLeftOrMiddle;
                tN = doc.createTextNode(parts[j].slice(0,1));
                aN.appendChild(tN);
                KanJax.insertAfter(n, aN);
            }

            if(parts[0].length)
                n.data = parts[0];
            else
                KanJax.remove(n);
        }

        //t3 = new Date().getTime();
        //console.log('t3: '+(t3-t2));
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
            if(a[i] != b[j]) {
                console.log('Mismatch: "'+a[i]+'" != "'+b[j]+'"');
                console.log(a);
                console.log(b);
                throw "Mismatch!";
            }
            if(i+1 >= a.length || j+1 >= b.length) {
                //console.log('Match: '+a.substr(start_a, i+1-start_a));
                return [[start_a, i+1], [start_b, j+1]];
            }
            new_a = a.regexIndexOf(KanJax.JP_REG, i + 1);
            new_b = b.regexIndexOf(KanJax.JP_REG, j + 1);
            if(new_a < 0 || new_b < 0) {
                //console.log('Match: '+a.substr(start_a, i+1-start_a));
                return [[start_a, i+1], [start_b, j+1]];
            }
            i = new_a;
            j = new_b;
        }
    },
    
    appendText: function(text, node) {
        var el = node.ownerDocument.createTextNode(text);
        KanJax.insertAfter(node, el);
        return el;
    },
    
    //KanJax.expandTemplate('{{%foo}} {{bar}} {{/foo}}',
    //    {'foo':[{'bar':'a'},{'bar':'b'}]})
    expandTemplate: function(template, obj) {
        var content = template.replace(
            /\{\{%(\w+)\}\}([\s\S]*)\{\{\/\1\}\}/g,
            function(match, key, inner) {
                var array, i, retv, item;
                if(!key in obj)
                    return "{unknown field "+key+"}";
                array = obj[key];
                if(!array)
                    return '';
                if(array.constructor != Array)
                    return "{field "+key+" is not an array!}";
                retv = '';
                for(i = 0; i < array.length; i++) {
                    item = array[i];
                    if(typeof(item)!='object')
                        item = {'THIS': item};
                    if(i!=0)
                        item.NOT_FIRST = true;
                    else
                        item.FIRST = true;
                    if(i!=array.length-1)
                        item.NOT_LAST = true;
                    else
                        item.LAST = true;
                    retv += KanJax.expandTemplate(inner, item);
                }
                return retv;
            });
        content = content.replace(
            /\{\{#(\w+)\}\}([\s\S]*)\{\{\/\1\}\}/g,
            function(match, key, inner) {
                return (key in obj) ? inner : '';
            });
        return content.replace(
            /\{\{(\w+)(?:\:(\w+))?\}\}/g,
            function(match, key, flags) {
                var val;
                if(key == 'KANJAX_BASEPATH')
                    return KanJax.basePath;
                if(!(key in obj))
                    return "{unknown field "+key+"}";
                val = obj[key];
                console.log(key)
                console.log(val)
                if(flags == 'furigana')
                    val = val.replace(/\[(\S+)\|(\S+)\]/g, function(m,k,r) {
                        return '<ruby><rb>'+k+'</rb><rt>'+r+'</rt></ruby>';
                    });
                return val;
            });
    },

    showDictPopup: function(info) {
        var div, exp;

        div = document.getElementById("kanjax_popup");
        info = info.sort(function(a,b) {
            return a.cm < b.cm;
        });
        exp = KanJax.expandTemplate(KanJax.dictPopupTemplate, {entries: info});
        console.log(exp);
        div.innerHTML = exp;
        div.className = 'dict_popup';
        KanJax.makePopupVisible(div);
    },
    
    activateDictPopupMiddle: function(e) {
        if((e.type == "mousedown") && e.which != 2)
            return true;
        return KanJax.activateDictPopup(e);
    },

    activateDictPopupLeftOrMiddle: function(e) {
        if((e.type == "mousedown") && e.which != 2 && e.which != 1)
            return true;
        return KanJax.activateDictPopup(e);
    },

    // default click handler, uses jQuery + bPopup to show a nice popup
    activateDictPopup: function(e) {
        var kanji, info, img, w, url, i, messageHandler;

        e.preventDefault();
        e.stopPropagation();
        word = e.currentTarget.dataset['lemma'];
        console.log(e.currentTarget.dataset['lemma']);

        $.ajax({
            url: KanJax.basePath + 'dict.php',
            data: { word: word },
            success: function(result) {
                if(result.status == "OK") {
                    KanJax.kanjiPopupCache[kanji] = result.data;
                    KanJax.showDictPopup(result.data);
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
    },

    addGroupReading : function(group, reading) {
        var i, j, text_to_add, text, added_elements, has_text_to_add, 
            is_simple_text, readtext, found, orig, node, el, el2, rj, inlink,
            old_node, container, lnode, rinfo, rstring, rinfo_array, ctext;
        
        for(i = 0; i<group.length; ++i) {
            if(!group[i][0].parentNode) {
                console.log("ELEMENT REMOVED!! bailing out...");
                return;
            }
        }
        
        i = 0;
        j = 0;

        //text we skipped over, with no reading to add, to be added in the dom.
        text_to_add = '';
        added_elements = false;
        node = group[i][0];
        inlink = group[i][1];
        text = node.data;
        //console.log('ntext: '+text);

        while(j < reading.length) {
            rj = reading[j];
            is_simple_text = (typeof(rj)=='string');
            readtext = is_simple_text ? rj : rj.f;

            found = KanJax.findStringIn(text, readtext);

            //console.log("F with " + text + " ~~ " + readtext + " ~~ " 
            //          + found.toString() + " ~ " + is_simple_text);

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
                node = group[i][0];
                inlink = group[i][1];
                text = node.data;
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
                has_text_to_add = !!text_to_add;
                if(has_text_to_add) {
                    //console.log("T2: " + text_to_add);
                    if(node == group[i][0])
                        added_beginning = true;
                    if(added_elements)
                        node = KanJax.appendText(text_to_add, node);
                    else
                        node.data = text_to_add;
                    text_to_add = '';
                }
                orig = text.substr(found[0][0], found[0][1]-found[0][0]);
                //console.log("R: " + orig);
                //console.log(reading[j]);

                old_node = node;
                doc = node.ownerDocument;

                rinfo = rj.r;
                rinfo_array = rinfo && (rinfo.constructor.name == 'Array');
                if(rinfo_array) {
                    if(rinfo[2] > orig.length)
                        rinfo[2] = orig.length
                    if(rinfo[1] >= rinfo[2])
                        rinfo[1] = rinfo[2]-1;
                    if(rinfo[1] == 0 && rinfo[2] == orig.length) {
                        rinfo = rinfo[0];
                        rinfo_array = false;
                    }
                }
                if(!rinfo || rinfo_array) {
                    //console.log('newcont');
                    container = doc.createElement("span");
                    if(!rinfo) {
                        //console.log("1< "+orig);
                        container.appendChild(doc.createTextNode(orig));
                    }
                    else if(rinfo[1] > 0) {
                        //console.log("2< "+rinfo[1]);
                        container.appendChild(doc.createTextNode(orig.substr(0,rinfo[1])));
                    }
                }

                rstring = rinfo_array ? rinfo[0] : rinfo;
                if(rstring) {
                    ctext = rinfo_array ? orig.substr(rinfo[1], rinfo[2]-rinfo[1]) : orig;
                    //console.log('ruby');
                    if(KanJax.useRubyElement) {
                        el = doc.createElement("ruby");

                        lnode = el2 = doc.createElement("rb");
                        //console.log("3< "+ctext);
                        el2.appendChild(doc.createTextNode(ctext));
                        el.appendChild(el2);

                        el2 = doc.createElement("rt");
                        el2.appendChild(doc.createTextNode(rstring));
                        el.appendChild(el2);

                    }
                    else {
                        el2 = doc.createElement("span");
                        el2.className = "kanjax_rt";
                        el2.appendChild(doc.createTextNode(rstring));
                        
                        lnode = el = doc.createElement("span");
                        el.className = "kanjax_ruby";
                        el.appendChild(el2);
                        el.appendChild(doc.createTextNode(ctext));
                    }
                }

                if(!rinfo || rinfo_array) {
                    if(rstring)
                        container.appendChild(el);
                    if(rinfo && rinfo[2] < orig.length) {
                        //console.log("5< "+orig.substr(rinfo[2]));
                        container.appendChild(doc.createTextNode(orig.substr(rinfo[2])));
                    }
                    KanJax.insertAfter(node, container);
                    node = container;
                    lnode = container;
                }
                else {
                    KanJax.insertAfter(node, el);
                    node = el;
                }
                if(rj.l) {
                    if(lnode.className)
                        lnode.className += ' kanjax_lemma';
                    else
                        lnode.className = 'kanjax_lemma';
                    lnode.dataset['lemma'] = rj.l;
                    lnode.dataset['pos'] = rj.p;
                    lnode.onmousedown = inlink
                        ? KanJax.activateDictPopupMiddle
                        : KanJax.activateDictPopupLeftOrMiddle;
                }

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
    
    display: function(el) {
        return el.currentStyle ? el.currentStyle.display : getComputedStyle(el, null).display;
    },
    
    addWordInfoStep : function(state) {
        var n, nl, text, p, currp, currstr, currgr, totstr,
            strings, groups, skipthis, skipgroup, url;
        //var t1, t2, t3;
        //t1 = new Date().getTime();

        totstr = 0;
        strings = [];
        groups = [];
        currp = null;
        skipgroup = false;
        currstr = '';
        currgr = [];
        while(state.i <= state.list.length) {
            if(state.i < state.list.length) {
                nl = state.list[state.i];
                n = nl[0];
                p = n.parentNode;
                if(!p) {
                    console.log("ELEMENT REMOVED!! bailing out...");
                    return;
                }
                skipthis = false;
                //while(["A","B","I","EM","SPAN","FONT","STRONG","RUBY","RT","RB"].indexOf(p.tagName) >= 0) {
                while(KanJax.display(p) == 'inline') {
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
                    totstr += currstr.length + 3;
                    strings.push(currstr);
                    groups.push(currgr);
                    if(totstr > KanJax.postJPCharsSoftLimit) {
                        //console.log('totstr: '+totstr);
                        break;
                    }
                }
                skipgroup = false;
                currstr = '';
                currgr = [];
            }
            if(state.i >= state.list.length)
                break;
            currp = p;
            currgr.push(nl);
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
                    console.log('Wall time: ' + result.wall_time);
                    console.log('CPU time: ' + result.cpu_time);
                    for(i = 0; i < groups.length; ++i)
                        KanJax.addGroupReading(groups[i], result.data[i]);
                    KanJax.addWordInfoStep(state);
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

        //t2 = new Date().getTime();
        //console.log('step1: '+(t2-t1));
    },

    addWordInfo : function(el, settings) {
        var el, list, status;
        el = el || document.body;
        list = KanJax.textNodesUnder(el, true);
        state = { list: list, i: 0, settings: settings };
        //console.log(state);
        KanJax.addWordInfoStep(state);
    },

    removeWordInfo : function(el) {        
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

    setup : function(el) {
        var style, doc;
        doc = el ? el.ownerDocument : document;
        if(!doc.getElementById("kanjax_css")) {
            style = doc.createElement("link");
            style.id = "kanjax_css";
            style.setAttribute("rel", "stylesheet");
            style.setAttribute("type", "text/css");
            style.setAttribute("href", KanJax.basePath + "kanjax.css");
            doc.head.appendChild(style);
        }
    },

    cleanup: function(el) {
        var doc, css;
        doc = el ? el.ownerDocument : document;
        if(css = doc.getElementById('kanjax_css'))
            css.remove();
    },

    basicInstall: function(el) {
        KanJax.setupPopup();
        el = el || document.body;
        KanJax.setup(el);
        KanJax.addWordInfo(el, { success: function() {
            KanJax.addKanjiInfo();
        }});
    },

    fullUninstall: function() {
        KanJax.cleanupPopup();
        el = el || document.body;
        KanJax.cleanup(el);
        KanJax.removeKanjiInfo(el);
        KanJax.removeWordInfo(el);
    }
};

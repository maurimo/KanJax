
KanJax = {
    basePath: "kanjax/",
    
    popupContent: "Couldn't load popup template.",

    popupCache: {
    },

    // inserts into the DOM what is necessary to show the default popup.
    setupPopup: function() {
        var div, style;

        // load the css
        var style = document.createElement("link")
        style.setAttribute("rel", "stylesheet")
        style.setAttribute("type", "text/css")
        style.setAttribute("href", KanJax.basePath + "kanjax_popup.css")
        document.head.appendChild(style);

        // load the template
        div = document.createElement("div");
        div.id = "kanjax_popup";
        div.className = 'kanjax_forbidden';
        document.body.appendChild(div);
        $.get(KanJax.basePath + "kanjax_popup_template.html", function(response) {
            KanJax.popupContent = response;
        });
    },

    // cleans all the default popup stuff inserted in the DOM.
    cleanupPopup: function() {
        var el;
        if(el = document.getElementById('kanjax_popup'))
            el.remove();
        if(el = document.getElementById('kanjax_style'))
            el.remove();
    },

    // shows the popup
    showPopup: function(info, kanji) {
        var div, k, content;
        div = document.getElementById("kanjax_popup");
        content = KanJax.popupContent.replace(
                /\{\{(\w+)\}\}/g,
            function(match, key) {
                if(key in info)
                    return info[key]
                else
                    return "{unknown field "+key+"}";
            });
        div.innerHTML = content;

        // allow editing for fields having "editable" class, the innerHTML will be edited.
        $("#kanjax_popup .editable").editable(
            encodeURI(KanJax.basePath + "data.php?kanji=" + kanji),
            {
                id        : "key",
                indicator : "<img style='height:1.15em' src='"+KanJax.basePath+"indicator.gif'>",
                tooltip   : "Click to edit...",
                style     : "display: inline; margin: 0px;",
                callback  : function(value, settings) {
                    var response = $.parseJSON(value);
                    if(response.status == "OK") {
                        if(kanji in KanJax.popupCache)
                            KanJax.popupCache[kanji][response.key] = response.value;
                        $(this).html(response.value);
                    }
                    else
                        KanJax.showErrorPopup(response);
                }
            });
        $(div).bPopup({ speed: 120 });
    },

    // show the popup, displaying an error message
    showErrorPopup: function(info) {
        var div, k, content;
        div = document.getElementById("kanjax_popup");
        content = "<h2>Error!</h2>" + info.status;
        if(info.message)
            content += "<br/>" + info.message;
        div.innerHTML = content;
        $(div).bPopup({ speed: 120 });
    },

    // default click handler, uses jQuery + bPopup to show a nice popup
    activatePopup: function(e) {
        var kanji, info, img, w;

        if((e.type == "mousedown") && e.which != 2)
            return true;

        e.preventDefault();
        kanji = e.currentTarget.textContent || e.currentTarget.innerText;

        // test cache
        if(kanji in KanJax.popupCache) {
            KanJax.showPopup(KanJax.popupCache[kanji], kanji);
            return false;
        }

        // if not in cache, load via ajax
        $.ajax({
            url: encodeURI(KanJax.basePath + "data.php?kanji=" + kanji),
            success: function(result){
                result = $.parseJSON(result);
                if(result.status == "OK") {
                    KanJax.popupCache[kanji] = result.data;
                    KanJax.showPopup(result.data, kanji);
                }
                else {
                    KanJax.showErrorPopup(result);  
                }
            }});

        return false;
    },

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
    textNodesUnder : function(el) {
        var n, p, list=[], forbid, i, forbid_list = [], links, links_list = [], walker, doc, inlink;

        doc = el.ownerDocument;

        forbid = el.getElementsByClassName("kanjax_forbidden");
        for(i = 0; i < forbid.length; ++i) {
            walker = doc.createTreeWalker(forbid[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode())
                forbid_list.push(n);
        }

        links = el.getElementsByTagName("A");
        for(i = 0; i < links.length; ++i) {
            walker = doc.createTreeWalker(links[i], NodeFilter.SHOW_TEXT, null, false);
            while(n = walker.nextNode())
                links_list.push(n);
        }

        walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        while(n = walker.nextNode()) {
            if(n.parentNode.tagName == "A" && n.parentNode.className == "kanjax")
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
        var elsc, i, text, tN;

        el = el || document.body;

        // make els an array, and NOT and HTMLCollection.
        // If it is left as HTMLCollection and we iterate while not empty,
        // it will trigger a slow behavior (bug?) in Chrome, and link
        // removal is made very very slow (probably because the whole
        // collection needs to be sorted at each step, or something).
        els = [].slice.call(el.getElementsByClassName("kanjax"));

        for(i = 0; i<els.length; i++) {
            if(els.length % 200 == 0)
                console.log(els.length);
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
        list = KanJax.textNodesUnder(el);

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

                aN = doc.createElement("a");
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
                n.remove();
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
            //style.setAttribute("href", KanJax.basePath + "kanjax.css");
            style.setAttribute("href", "/~maurizio/kanjax/kanjax/" + "kanjax.css");
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

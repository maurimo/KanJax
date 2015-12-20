
KanJax = {
		popupContent: "Couldn't load popup template.",

		popupCache: {},

		// inserts into the DOM what is necessary to show the default popup.
		setupDefaultPopup: function() {
				var div, style;

				var style = document.createElement("link")
        style.setAttribute("rel", "stylesheet")
        style.setAttribute("type", "text/css")
        style.setAttribute("href", "kanjax/kanjax_popup.css")
				document.head.appendChild(style);

				div = document.createElement("div");
				div.id = "kanjax_popup";
			  div.className = 'kanjax_forbidden';
				document.body.appendChild(div);
				$.get("kanjax/kanjax_popup_template.html", function(response) {
						KanJax.popupContent = response;
				});
		},

		// cleans all the default popup stuff inserted in the DOM.
		cleanupDefaultPopup: function() {
				var el;
				if(el = document.getElementById('kanjax_popup'))
						el.remove();
				if(el = document.getElementById('kanjax_style'))
						el.remove();
		},

		showDefaultPopup: function(info) {
				var div, k, content;
				div = document.getElementById("kanjax_popup");
				content = KanJax.popupContent.replace(
								/\{\{(\w+)\}\}/g,
						function(match, key) {
								return info[key] || ("{unknown field "+key+"}");
						});
				div.innerHTML = content;
				$(div).bPopup({ speed: 120 });
		},

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
		activateDefaultPopup: function(e) {
				var kanji, info, img, w;
				e.preventDefault();
				kanji = e.currentTarget.innerText;
				if(kanji in KanJax.popupCache) {
						KanJax.showDefaultPopup(KanJax.popupCache[kanji]);
						return;
				}

				$.ajax({url: "kanjax/data.php?kanji="+kanji, success: function(result){
						result = $.parseJSON(result);
						if(result.status == "OK") {
								KanJax.popupCache[kanji] = result.data;
								KanJax.showDefaultPopup(result.data);
						}
						else {
								KanJax.showErrorPopup(result);	
						}
				}});
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

		// Utility to get all text nodes under a given element
		textNodesUnder : function(el) {
				var n, p, list=[], forbid, i, forbid_list = [], walker;

				forbid = el.getElementsByClassName("kanjax_forbidden");
				for(i = 0; i < forbid.length; ++i) {
						walker = document.createTreeWalker(forbid[i], NodeFilter.SHOW_TEXT, null, false);
						while(n = walker.nextNode())
								if(n.parentNode.tagName != "A")
										forbid_list.push(n);
				}

				walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
				while(n = walker.nextNode())
				if(forbid_list.indexOf(n) < 0 && (n.parentNode.tagName != "A"))
						list.push(n);
				return list;
		},

		// Removes all links, and the text is again put in a text node
		removeLinks : function(el) {
				var els, text, tN;

				el = el || document;
				els = el.getElementsByClassName("kanjax");
				while(els.length) {
						text = els[0].innerText;
						if(els[0].previousSibling && els[0].previousSibling.nodeType == 3) {
								text = els[0].previousSibling.data + text;
								els[0].previousSibling.remove();
						}
						if(els[0].nextSibling && els[0].nextSibling.nodeType == 3) {
								text = text + els[0].nextSibling.data;
								els[0].nextSibling.remove();
						}
						tN = document.createTextNode(text);
						els[0].parentNode.replaceChild(tN, els[0]);
				}
		},

		// Looks for all kanjis, and for each sets a link with a click function.
		addLinks : function(el) {
				var list, n, parts, i, j, aN, tN;

				el = el || document.body;
				list = KanJax.textNodesUnder(el);
				
				for(i = 0; i<list.length; i++) {
						n = list[i];
						parts = n.data.split(KanJax.SPLIT_REG);

						if(parts[0].match(KanJax.START_REG))
								parts.unshift('');

						for(j = parts.length-1; j >= 1; j--) {
								if(parts[j].length > 1) {
										tN = document.createTextNode(parts[j].slice(1));
										KanJax.insertAfter(n, tN);
								}

								aN = document.createElement("a");
								aN.className = "kanjax";
								aN.onclick = KanJax.activateDefaultPopup;
								tN = document.createTextNode(parts[j].slice(0,1));
								aN.appendChild(tN);
								KanJax.insertAfter(n, aN);
						}

						if(parts[0].length)
								n.data = parts[0];
						else
								n.remove();
				}
		},

		setup : function() {
				var style;
				if(!document.getElementById("kanjax_css")) {
						style = document.createElement("link");
						style.id = "kanjax_css";
						style.setAttribute("rel", "stylesheet");
						style.setAttribute("type", "text/css");
						style.setAttribute("href", "kanjax/kanjax.css");
						document.head.appendChild(style);
				}
		},

		cleanup: function() {
				var el;
				if(el = document.getElementById('kanjax_css'))
						el.remove();
		}
};

(function($) {

		// DOM Ready
		$(function() {
				KanJax.setupDefaultPopup();
				KanJax.setup();
				KanJax.addLinks();
		});

})(jQuery);

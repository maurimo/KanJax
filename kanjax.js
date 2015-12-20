
kanji_info = {
	"昼": [
    "ore diurne",
    "ore diurne, a mezzogiorno",
    "Roosters in Japan are very civilised, they play the shakuhachi at nightbreak to signify the beginning of daytime.",
    "E698BC.png",
    "チュウ",
    "ひる"
	],
	"御": [
    "onorevole",
    "onorevole, manipolare, governare",
    "Una persona ONOREVOLE per nessuna ragione salta la FILA alle casse della VENDITA ALL'INGROSSO per ANDARE avanti!",
    "E5BEA1.png",
    "ギョ、ゴ",
    "おん-、お-、み-"
  ],
	"飯": [
    "pasto",
    "pasto, riso bollito",
    "I´m anti-fastfood. Sit down and eat a real meal!",
    "E9A3AF.png",
    "ハン",
    "めし"
  ]
};

KanJax = {
		DEFAULT_POPUP_CSS:
		    '.kanjax {\n' +
				'  color: #a00000;\n' +
				'  cursor: hand;\n' +
				'}\n' +
				'#kanjax_popup {\n' +
				'  width: 700px;\n' +
				'  display:none;\n' +
				'  background-color: #e0e0ff;\n' +
				'  border: 1px solid #8080ff;\n' +
				'  padding: 1.2em;\n' +
				'  border-radius: 0.8em;\n' +
				'  text-align: center;\n' +
				'}\n' +
				'#kanjax_p2opup #strokes {\n' +
				'  width: 700px;\n' +
				'}\n' +
				'#kanjax_popup #on {\n' +
				'  font-style: normal;\n' +
				'  font-size: 24px;\n' +
				'}\n' +
				'#kanjax_popup #kun {\n' +
				'  font-style: normal;\n' +
				'  font-size: 24px;\n' +
				'}\n' +
				'#kanjax_popup #kanji {\n' +
				'  padding-right: 0.6em;\n' +
				'}\n' +
				'#kanjax_popup #keyword {\n' +
				'  padding-left: 0.6em;\n' +
				'}\n' +
				'#kanjax_popup .japanese {font-family: "Kochi Mincho";}\n' +
				'#kanjax_popup .small {font-size: 20px;}\n' +
				'#kanjax_popup .medium {font-size: 24px;}\n' +
				'#kanjax_popup .large {font-size: 32px;}\n' +
				'#kanjax_popup .huge {font-size: 50px;}\n' +
				'#kanjax_popup .bold {font-weight: bold;}\n' +
				'#kanjax_popup .italic {font-style: italic;}\n',

		DEFAULT_POPUP_INNERHTML:
				'<table border="0" align="center"><tr><td style="text-align: center">\n' +
				'  <span class="huge japanese" id="kanji"></span>\n' +
				'</td><td style="text-align: center">\n' +
				'  <span class="large bold" id="keyword"></span>\n' +
				'</td></tr></table>\n' +
				'<div class="medium italic" id="meaning"></div></br>\n' +
				'<div class="small italic">\n' +
				'  On: <span id="on" class="japanese"></span>,\n' +
				'  Kun: <span id="kun" class="japanese"></span></div></br>\n' +
				'<div class="medium" id="story"></div></br>\n' +
				'<img id="strokes"/></br>\n' +
				'<div class="medium" style="margin-top:0.5em">\n' +
				'  <a href="" id="jisho">Jisho</a>\n' +
				'  <a href="" id="koohii">Koohii</a>\n' +
				'</div>',

		// inserts into the DOM what is necessary to show the default popup.
		setupDefaultPopup: function() {
				var div, head, style;
				
				head = document.head || document.getElementsByTagName('head')[0],
				style = document.createElement('style');
				style.id = 'kanjax_style';

				style.type = 'text/css';
				if (style.styleSheet)
						style.styleSheet.cssText = KanJax.DEFAULT_POPUP_CSS;
				else
						style.appendChild(document.createTextNode(KanJax.DEFAULT_POPUP_CSS));

				head.appendChild(style);
				
				div = document.createElement("div");
				div.id = "kanjax_popup";
			  div.className = 'kanjax_forbidden';
				div.innerHTML = KanJax.DEFAULT_POPUP_INNERHTML;
				document.body.appendChild(div);
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
				$('#kanjax_popup #kanji').prop('innerText', info.kanji);
				$('#kanjax_popup #keyword').prop('innerText', info.keyword);
				$('#kanjax_popup #meaning').prop('innerText', info.meaning);
				$('#kanjax_popup #story').prop('innerText', info.desc);
				img = new Image();
				img.onload = function() {
						$('#kanjax_popup #strokes').prop('src', this.src);
						w = Math.min(700, 100*this.width/this.height);
						$('#kanjax_popup #strokes').css({width: w+'px'});     
				}
				img.src = 'kanjax/images/'+info.strokes;
				$('#kanjax_popup #on').prop('innerText', info.onyomi);
				$('#kanjax_popup #kun').prop('innerText', info.kunyomi);
				$('#kanjax_popup #jisho').prop('href', 'http://jisho.org/search/%23kanji%20'+kanji);
				$('#kanjax_popup #koohii').prop('href', 'http://kanji.koohii.com/study/kanji/'+kanji);
				$('#kanjax_popup').bPopup({
						speed: 120, 
						position: ['auto', document.body.clientHeight/2-200]
				});
		},

		// default click handler, uses jQuery + bPopup to show a nice popup
		// FIX-ME: transform hardcoded sizes into settings
		activateDefaultPopup: function(e) {
				var kanji, info, img, w;
				e.preventDefault();
				kanji = e.currentTarget.innerText;
				
				$.ajax({url: "kanjax/data.php?kanji="+kanji, success: function(result){
						result = $.parseJSON(result);
						if(result.status == "OK")
								KanJax.showDefaultPopup(result.data);
				}});
				//info = kanji_info[kanji] || ['?', '?', '?', '', '?', '?'];				
				//KanJax.showDefaultPopup(kanji, info);
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
		}
};

(function($) {

		// DOM Ready
		$(function() {
				KanJax.setupDefaultPopup();
				KanJax.addLinks();
		});

})(jQuery);

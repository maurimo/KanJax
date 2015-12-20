# KanJax #
## Automatically display Kanji info ##

This project provides a script that searches all kanji's in a web page, adding a clickable link on
all kanjis appearing on a web page. You can display the result on
[this page](http://im.ufrj.br/~maurizio.monge/kanjax/test.html).

This library was inspired by MathJax, that automatically formats mathematical formulas in web pages.

## Running the test ##

For the test.html to work, a database must be present in kanjax/db/kanji.db, be readable by the web
user, and the whole directory kanjax/db with its content must be writable if you want editing to
work. The images referenced in the database must be in kanjax/images. For short, you can just
download a sample database with Heisig stories and the image set
 * Database [joyo_kanji_db.tar.gz](http://im.ufrj.br/~maurizio.monge/kanjax/joyo_kanji_db.tar.gz),
 * Image set [joyo_strokes.tar.gz](http://im.ufrj.br/~maurizio.monge/kanjax/joyo_strokes.tar.gz)
 
and unpack then in the root kanjax directory.
More detailed information on how you can build your own database can be found below.

## Dependencies ##

KanJax depends on, on the server side:
 * PHP SQLite3,
 * PHP pcre support,
and on the client side:
 * [jQuery](https://jquery.com/), MIT license,
 * [bPopup](http://dinbror.dk/bpopup/), A very free license, see the page,
 * [Jeditable](http://www.appelsiini.net/projects/jeditable), (no license info?).
For convenience a copy of these libraries is included in the repository.

## Basic Api

Javascript functions are provided to add or remove links from a custom element (or the whole the
page), and calling twice the link adding function will not duplicate the link data:
```
KanJax.basicInstall();
... later ...
KanJax.addLinks(myDiv);
```
KanJax will not enter into an element having "kanjax_forbidden" among its classes. However you can
add links calling addLinks(el) directly on such an element, or an element contained in a forbidden
element.

You can optionally remove all links created by KanJax from an element, or completely
cleanup the page also removing all css and popup elements:
```
KanJax.removeLinks(myDiv);
... later ...
KanJax.fullUninstall();
```

## Api ##

 * [string] **KanJax.basePath**: the path to kanjax, set to "kanjax/" by default.
 * [function] **KanJax.basicInstall()**: sets up KanJax, and adds links to the whole page.
 * [function] **KanJax.fullUninstall()**: completely removes the links, styles, and elements from the page.
 * [function] **KanJax.addLinks(el)**: adds links to the element el, if el is not specified then the
  whole page is intended. Calling may times this function on the same element is save.
 * [function] **KanJax.removeLinks(el)**: remove all links from the element el, if el is not
  specified then the whole page is intended.

## Building your own database ##

You can build your own database from a tabbed text file (that is, a CSV file having tab as a
separator) using the create_db.rb Ruby script. The dependencies are:
 * Ruby,
 * sqlite3 ruby gem (gem install sqlite3).

You need to edit the script to specify the column index corresponding to each field in the tabbed
file, setting F_KANJI, F_KEYWORD, etc.... Then just run
```
./create_db.rb tabbed_text_file.txt sqlite.db [images_origin_dir] [images_dest_dir]
```

The optional "images_origin_dir", "images_dest_dir" directory are directories for copying referenced
images contained in "images_origin_dir" to "images_dest_dir".

It is very to used this script on a set of Anki notes, you just need to export notes as a CVS filed
with tab as separator, and specify the correct field index in the script.

## Customizing ##

KanJax is highly customizable, to customize your popup just edit the kanjax/kanjax_popup.css and
kanjax/kanjax_popup_template.html In the template the expressions {{myfield}} will be replaced with
the corresponding field obtained from the database. This is exactly the same basic template type
used by the Anki program.

All fields having the "editable" class are made editable by clicking on them, is such a case their
id should correspond to the field name (in the database) that will be edited.

## License ##

You are free to do what you want with this library, buy if you find it useful
and feel like, you may give a donation on my github page!

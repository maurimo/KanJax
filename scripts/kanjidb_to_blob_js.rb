#!/usr/bin/env ruby
# coding: utf-8

require 'json'
require 'sqlite3'
require 'open-uri'

if ARGV.length < 2 then
puts <<EOF
Export the database into a directory of .html files containing json,
that can be loaded via the hidden-iframe trick. Creates a (read-only)
data set that can be used locally (no web server, nor php necessary,
and allows for instance to use KanJax in Anki's cards.

Usage: #{File.basename($0)} sqlite.db target_dirctory
EOF
exit
end

pre = %q[<script language="JavaScript" type="text/javascript">
window.parent.postMessage(]
post = %q[, "*");
</script>
]

# Open a database
db = SQLite3::Database.new(ARGV[0],
                           :readonly => true)

blob = {}
db.execute( "SELECT * FROM KanjiInfo") do |row|
    blob[row[0]] = row[1..-1]
end

blob_fields = ["kanji", "keyword", "meaning", "desc", "strokes", "onyomi", "kunyomi"]

File.open(ARGV[1],'w') { |o|
    o.puts "KanjaxBlob = #{JSON.generate(blob)};"
    o.puts "KanjaxBlobFields = #{JSON.generate(blob_fields)};"
    o.puts "KanjaxPopupTemplate = " +
        File.read("../mobile/kanji_popup_template.html").inspect+";";
    o.puts "KanjaxPopupCss = " +
        File.read("../mobile/popup.css").inspect+";";
    o.puts "KanjaxCss = " +
        File.read("../mobile/kanjax.css").inspect+";";
    o.puts "KanjaxRubyCss = " +
        File.read("../mobile/ruby.css").inspect+";";
}

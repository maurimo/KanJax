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

pre = %q[<script language="JavaScript" type="text/javascript">
window.parent.postMessage(]
post = %q[, "*");
</script>
]

# Open a database
db = SQLite3::Database.new(ARGV[0],
                           :readonly => true,
                           :results_as_hash => true)

db.execute( "SELECT * FROM KanjiIinfo") do |row|
    row.reject!{|k| k.class == Fixnum }
    hash = { "status" => "OK", "data" => row }
    text = pre + JSON.generate(hash, :ascii_only => true) + post
    #puts json
    #name = URI::encode(row["kanji"])
    name = row["kanji"].ord
    File.write("#{ARGV[1]}/#{name}.html", text);
end

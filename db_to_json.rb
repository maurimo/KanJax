#!/usr/bin/env ruby
# coding: utf-8

require 'json'
require 'sqlite3'
require 'open-uri'

if ARGV.length < 2 then
puts <<EOF
Usage: ./db_to_json.rb sqlite.db target_dirctory
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

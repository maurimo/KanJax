#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'

F_KANJI=1
F_KEYWORD=2
F_MEANING=3
F_DESC=4
#F_KEYWORD=8
#F_MEANING=7
#F_DESC=16
F_STROKES=11
F_ONYOMI=22
F_KUNYOMI=23

def unquote(text)
  text =~ /^"(.*)"$/ ? $1.gsub('""','"') : text
end

def quote(text)
  text =~ /"/ ? '"'+text.gsub('"','""')+'"' : text
end

if ARGV.length < 3 then
puts <<EOF
Merges into a tabbed text file (Anki export) the database, saving it
as a new tabbed text file (that can be imported back into Anki). It
allows to import back into Anki the edits done in the database via the
web interface.

Usage: #{File.basename($0)} tabbed_text_file.txt sqlite.db new_tabbed_text.txt
EOF
exit
end

# Open a database
db = SQLite3::Database.new(ARGV[1],
                           :readonly => true,
                           :results_as_hash => true)

nchanged=0
File.open(ARGV[2],'w'){ |o|
File.open(ARGV[0]).each_line.each_with_index{ |l, ridx|
  fields = l.gsub(/\n$/,'').split("\t",-1).collect{ |f| unquote(f) }
  rows = db.execute( "SELECT * FROM KanjiInfo WHERE kanji = ?", fields[F_KANJI])
  newfields = fields.dup
  unless rows.empty? then
    row = rows[0]
    newfields[F_KEYWORD] = row["keyword"]
    newfields[F_MEANING] = row["meaning"]
    newfields[F_DESC] = row["desc"]
    #newfields[F_STROKES] = "\"<img src=\"\"" + row["strokes"] + "\"\" />\""
    #newfields[F_ONYOMI] = row["onyomi"]
    #newfields[F_KUNYOMI] = row["kunyomi"]
  end
  if newfields != fields then
    nchanged += 1
    fields.length.times{ |i|
      if fields[i] != newfields[i] then
        puts "#{ridx+1}:#{i} #{fields[i].inspect} => #{newfields[i].inspect}"
      end
    }
  end
  o.puts newfields.collect{|f| quote(f)}.join("\t")
}
}

puts "#{n} rows updated"

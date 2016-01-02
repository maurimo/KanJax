#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'
require 'nokogiri'

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

def cleanup_html(text)
  Nokogiri::HTML(text).text
end

def unquote(text)
  text =~ /^"(.*)"$/ ? $1.gsub('""','"') : text
end

if ARGV.length < 2 then
puts <<EOF
Usage: ./create_db.rb tabbed_text_file.txt sqlite.db [images_origin_dir] [images_dest_dir]
EOF
exit
end

# Open a database
db = SQLite3::Database.new ARGV[1]

# Create a database
rows = db.execute <<-SQL
  CREATE TABLE KanjiIinfo (
    kanji TEXT(1) PRIMARY KEY,
    keyword TEXT(32),
    meaning TEXT(128),
    desc TEXT(512),
    strokes TEXT(15),
    onyomi TEXT(32),
    kunyomi TEXT(32)
  );
SQL

# Execute a few inserts
db.transaction
File.open(ARGV[0]).each_line.each_with_index{ |l, i|
  fields = l.gsub(/\n$/,'').split("\t",-1).collect{ |f| unquote(f) }
  kanji = fields[F_KANJI][0]
  keyword = cleanup_html(fields[F_KEYWORD])
  meaning = cleanup_html(fields[F_MEANING])
  desc = cleanup_html(fields[F_DESC])
  strokes = fields[F_STROKES].sub(/^.*"([^"]*.png)".*$/,'\1')
  onyomi = fields[F_ONYOMI]
  kunyomi = fields[F_KUNYOMI]
  if ARGV.length >= 4 then
    File.write("#{ARGV[3]}/#{strokes}", File.read("#{ARGV[2]}/#{strokes}"))
  end
  #desc = "Il RE della LOGICA\" è' il COMPUTER."
  db.execute("INSERT INTO KanjiIinfo VALUES ( ?, ?, ?, ?, ?, ?, ? )", 
             [kanji, keyword, meaning, desc, strokes, onyomi, kunyomi])
  if((i+1) % 500 == 0) then
    db.commit
    db.transaction
  end
  puts(i)
}
db.commit

# Find a few rows
db.execute( "SELECT * FROM KanjiIinfo WHERE kanji = ?", '料') do |row|
  p row
end

#!/usr/bin/env ruby
# coding: utf-8

require "sqlite3"

F_KANJI=1
F_KEYWORD=2
F_MEANING=3
F_DESC=4
F_STOKES=11
F_ONYOMI=22
F_KUNYOMI=23

if ARGV.length < 2 then
puts <<EOF
Usage: ./create_db.rb tabbed_text_file.txt sqlite.db
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
  fields = l.gsub(/\n$/,'').split("\t",-1)
  kanji = fields[F_KANJI]
  keyword = fields[F_KEYWORD].gsub('&nbsp;',' ')
  meaning = fields[F_MEANING].gsub('&nbsp;',' ')
  desc = fields[F_DESC].gsub('&nbsp;',' ')
  strokes = fields[F_STROKES].sub(/^.*"([^"]*.png)".*$/,'\1')
  onyomi = fields[F_ONYOMI]
  kunyomi = fields[F_KUNYOMI]
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
db.execute( "SELECT * FROM KanjiIinfo WHERE kanji = ?", "昼") do |row|
  p row
end

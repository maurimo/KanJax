#!/usr/bin/env ruby
# coding: utf-8

require "sqlite3"

# Open a database
db = SQLite3::Database.new "kanji_it.db"

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
File.open("/home/maurizio/JP/L_KANJI.txt").each_line.each_with_index{ |l, i|
  fields = l.gsub(/\n$/,'').split("\t",-1)
  kanji = fields[1]
  keyword = fields[2].gsub('&nbsp;',' ')
  meaning = fields[3].gsub('&nbsp;',' ')
  story = fields[4].gsub('&nbsp;',' ')
  onyomi = fields[22]
  kunyomi = fields[23]
  img = fields[11].sub(/^.*"([^"]*.png)".*$/,'\1')
  db.execute("INSERT INTO KanjiIinfo VALUES ( ?, ?, ?, ?, ?, ?, ? )", 
             [kanji, keyword, meaning, story, img, onyomi, kunyomi])
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

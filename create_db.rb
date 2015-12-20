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
KS = [
["昼",
    "ore diurne",
    "ore diurne, a mezzogiorno",
    "Roosters in Japan are very civilised, they play the shakuhachi at nightbreak to signify the beginning of daytime.",
    "E698BC.png",
    "チュウ",
    "ひる"
	],
	["御",
    "onorevole",
    "onorevole, manipolare, governare",
    "Una persona ONOREVOLE per nessuna ragione salta la FILA alle casse della VENDITA ALL'INGROSSO per ANDARE avanti!",
    "E5BEA1.png",
    "ギョ、ゴ",
    "おん-、お-、み-"
        ],
	["飯",
    "pasto",
    "pasto, riso bollito",
    "I´m anti-fastfood. Sit down and eat a real meal!",
    "E9A3AF.png",
    "ハン",
    "めし"
  ]
]
# Execute a few inserts
KS.each do |pair|
  db.execute "INSERT INTO KanjiIinfo VALUES ( ?, ?, ?, ?, ?, ?, ? )", pair
end

# Find a few rows
db.execute( "SELECT * FROM KanjiIinfo WHERE kanji = ?", "昼") do |row|
  p row
end

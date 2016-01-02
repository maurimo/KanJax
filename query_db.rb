#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'

# Open a database
db = SQLite3::Database.new(ARGV[0],
                           :readonly => true,
                           :results_as_hash => true)

db.execute( "SELECT * FROM KanjiIinfo WHERE kanji = ?", ARGV[1]) do |row|
    row.reject!{|k| k.class == Fixnum }
    puts row.inspect
end

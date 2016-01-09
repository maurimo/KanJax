#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'

# Open a database
db = SQLite3::Database.new(ARGV[0],
                           :readonly => true,
                           :results_as_hash => true)

db.execute( "SELECT entry FROM Entries INNER JOIN Words on Words.id=Entries.id WHERE word = ?", ARGV[1]) do |row|
    puts row['entry'].inspect
end

#!/usr/bin/env ruby
# coding: utf-8

require 'json'
require 'sqlite3'
require 'open-uri'

# Open a database
db = SQLite3::Database.new(ARGV[0],
                           :readonly => true,
                           :results_as_hash => true)

db.execute( "SELECT * FROM KanjiIinfo") do |row|
    row.reject!{|k| k.class == Fixnum }
    hash = { "status" => "OK", "data" => row }
    json = JSON.generate(hash, :ascii_only => true)
    #puts json
    #name = URI::encode(row["kanji"])
    name = row["kanji"].ord
    File.write("#{ARGV[1]}/#{name}.json", json);
end

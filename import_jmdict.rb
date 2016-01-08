#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'
require 'libxml'
require 'json'

def ptor(kj,read)
    l = 0
    m = [kj.length, read.length].min
    while l < m and kj[l] == read[l]
        l += 1
    end
    r = 0
    m -= l
    while r < m and kj[-r-1] == read[-r-1]
        r -= 1
    end
    (l>0 ? read[0..(l-1)] : '') +
    "{#{kj[l..(-r-1)]}}[#{read[l..(-r-1)]}]" +
    (r > 0 ? read[(-r)..-1] : '')
end

def process(el)
    id = el.find('./ent_seq')[0].content
    kebs = el.find('./k_ele/keb').collect{|x| x.content}
    rebs = []
    wrrd = []
    el.find('./r_ele').each{ |r_ele|
        reb = r_ele.find('./reb')[0].content
        rebs.push(reb)
        kwritings = r_ele.find('./re_restr').collect{|x| x.content}
        i = reb
        kwritings = kwritings.empty? ? kebs :  kwritings
        if kwritings.empty? then
            wrrd.push(i)
        else
            wrrd += kwritings.collect{|k| ptor(k,i) }
        end
    }
    senses = []
    el.find('./sense').each{ |sense|
        pos = sense.find('./pos').collect{|x| x.content}.join(', ')
        gloss = sense.find('./gloss').collect{|x| x.content}.join('; ')
        misc = (sense.find('./misc').collect{|x| x.content} + 
                sense.find('./s_inf').collect{|x| x.content}).join(', ')
        refs = sense.find('./xref').collect{|x| x.content}.join(', ')
        sense = { :gloss => gloss }
        sense[:pos] = pos unless pos.empty?
        sense[:misc] = misc unless misc.empty?
        sense[:refs] = refs unless refs.empty?
        senses.push(sense)
    }

    if false then
        puts 'id............: '+id
        puts 'kanji forms...: '+kebs.inspect
        puts 'kana forms....: '+rebs.inspect
        puts 'write/readings: '+wrrd.inspect
        puts 'senses........: '+senses.inspect
    end

    return {
        :id => id,
        :kebs => kebs,
        :rebs => rebs,
        :wrrd => wrrd,
        :senses => senses
    }
end


puts 'creating db...'
db = SQLite3::Database.new 'dict.db'

rows = db.execute <<-SQL
  CREATE TABLE Words (
    id TEXT(16),
    word TEXT(16)
  );
SQL

rows = db.execute <<-SQL
  CREATE TABLE Entries (
    id TEXT(16) PRIMARY KEY,
    entry TEXT(1024)
  );
SQL

#puts db.execute("SELECT name FROM sqlite_master WHERE type='table';").inspect

puts 'loading xml file...'
parser = LibXML::XML::Parser.file('../JMdict_e')
doc = parser.parse()

#el = doc.find('//entry').to_a[19222]
#el = doc.find('//entry').to_a[55112]
#process(el)

tot_entries = doc.find('//entry').count

puts 'putting entries in the db...'
i = 0
db.transaction
doc.find('//entry').each {|el|
    entry = process(el)
    
    db.execute("INSERT INTO Entries VALUES (?, ?)", 
                [entry[:id], JSON.generate(entry)])
    words = entry[:kebs] + entry[:rebs]
    words.each{|w|
        db.execute("INSERT INTO Words VALUES (?, ?)", 
                [entry[:id], w])
    }
    i += 1
    if i % 5000 == 0 then
        db.commit
        db.transaction
        puts "#{i}/#{tot_entries} done."
    end
}

puts 'creating index...'
rows = db.execute <<-SQL
  CREATE INDEX windex ON Words (word);
SQL
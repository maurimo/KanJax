#!/usr/bin/env ruby
# coding: utf-8

require 'sqlite3'
require 'libxml'
require 'json'
require 'mojinizer'
require 'set'

def ptor(kj,read)
    l = 0
    m = [kj.length, read.length].min
    while l < m and kj[l] == read[l]
        l += 1
    end
    r = 0
    m -= l
    while r < m and kj[-r-1] == read[-r-1]
        r += 1
    end
    (l>0 ? read[0..(l-1)] : '') +
    "[#{kj[l..(-r-1)]}|#{read[l..(-r-1)]}]" +
    (r > 0 ? read[(-r)..-1] : '')
end
#puts ptor('も物寂しい','もものさびしい'); exit

def xref(w)
    w.sub!(/・\d+$/,'')
    ws = w.split('・', -1)
    if ws.length != 2 or
        not ws[0].japanese? or
        not ws[1].japanese? or
        not ws[0].gsub(/[ー]/,'').contains_moji_type?(Moji::KANJI|
                        Moji::ZEN_ALNUM|Moji::ZEN_SYMBOL) or
        ws[1].contains_kanji? then
        #puts "XREF: "+w
        return w
    end
    ptor(ws[0], ws[1])
end

HPRI=Set['ichi1','news1','spec1','gai1']

def process(el)
    id = el.find('./ent_seq')[0].content
    #puts id
    #puts el.to_s
    kebs = []
    hkebs = []
    el.find('./k_ele').each{ |k_ele|
        keb = k_ele.find('./keb')[0].content
        kebs.push(keb)
        pris = k_ele.find('./ke_pri').collect{ |pri| pri.content }
        #puts 'pris:'+pris.inspect
        hkebs.push(keb) unless (HPRI & pris).empty?
    }
    #puts 'hk:'+hkebs.inspect
    rebs = []
    hrebs = []
    wrrd = []
    el.find('./r_ele').each{ |r_ele|
        reb = r_ele.find('./reb')[0].content
        rebs.push(reb)

        pris = r_ele.find('./re_pri').collect{ |pri| pri.content }
        hrebs.push(reb) unless (HPRI & pris).empty?

        kwritings = r_ele.find('./re_restr').collect{|x| x.content}
        i = reb
        kwritings = kwritings.empty? ? kebs :  kwritings
        if kwritings.empty? then
            wrrd.push(i)
        else
            wrrd += kwritings.collect{|k| [k,i] }
        end
    }
    if kebs.empty? then
        mainform = hrebs.empty? ? rebs[0] : hrebs[0]
    else
        #puts wrrd.inspect
        candidates = wrrd
        if !hkebs.empty? then
            tmp = candidates.select{|k,r| hkebs.member?(k) }
            candidates = tmp unless tmp.empty?
        end
        if !hrebs.empty? then
            tmp = candidates.select{|k,r| hrebs.member?(r) }
            candidates = tmp unless tmp.empty?
        end
        mainform = ptor(candidates[0][0], candidates[0][1])
    end
    wrrd = wrrd.collect{|x|
        x.class == Array ? ptor(x[0], x[1]) : x
    }
    othf = wrrd.select{ |x| x != mainform }
    iscommon = (not hkebs.empty?) or (not hrebs.empty?)

    senses = []
    el.find('./sense').each{ |sense|
        pos = sense.find('./pos').collect{|x| x.content}.join(', ')
        gloss = sense.find('./gloss').collect{|x| x.content}.join('; ')
        misc = (sense.find('./misc').collect{|x| x.content} + 
                sense.find('./s_inf').collect{|x| x.content}).join(', ')
        refs = sense.find('./xref').collect{|x| xref(x.content) }.join(', ')
        sense = { :gloss => gloss }
        sense[:pos] = pos unless pos.empty?
        sense[:misc] = misc unless misc.empty?
        sense[:refs] = refs unless refs.empty?
        senses.push(sense)
    }

    if false then
        puts 'id............: '+id
        puts 'iscommon......: '+iscommon.to_s
        puts 'mainform......: '+mainform
        puts 'kanji forms...: '+kebs.inspect
        puts 'kana forms....: '+rebs.inspect
        puts 'write/readings: '+wrrd.inspect
        puts 'senses........: '+senses.inspect
    end

    retv = {
        :id => id,
        :main => mainform,
        :cm => iscommon ? 1 : 0,
        :kebs => kebs,
        :rebs => rebs,
        :senses => senses
    }
    retv[:othf] = othf unless othf.empty?
    return retv
end

if ARGV.length < 2 then
puts <<EOF
Imports the JMdict file into a database. Currently only imports the
english definitions, it should be straighforward editing it import another
language.

Usage: #{File.basename($0)} jmdict.xml sqlite.db
EOF
exit
end

puts 'creating db...'
db = SQLite3::Database.new ARGV[1]

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
parser = LibXML::XML::Parser.file(ARGV[0])
doc = parser.parse()

#el = doc.find('//entry').to_a[19222]
#el = doc.find('//entry').to_a[55112]
#process(el)
#exit

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
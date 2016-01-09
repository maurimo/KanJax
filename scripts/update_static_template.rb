#!/usr/bin/env ruby
# coding: utf-8

# Regenerates the static template (after editing the template),
# the can be loaded locally via hidden-iframe trick.
#
# Run from main dir as
#   scrips/update_static_template.rb

require 'json'

orig = 'kanjax/kanjax_popup_template.html'
dest = 'kanjax/kanjax_popup_template.static.html'

pre = %q[<script language="JavaScript" type="text/javascript">
window.parent.postMessage(]
post = %q[, "*");
</script>
]

data = File.read(orig)
hash = { "status" => "OK", "data" => data }
text = pre + JSON.generate(hash, :ascii_only => true) + post
File.write(dest, text);
puts "File '#{dest}' regenerated."
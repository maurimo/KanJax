<?php

// A very simple PHP Proxy, author Maurizio Monge but heavily
// inspired by Rob Thomson's and Ben Alman simple PHP proxy scripts.
//
// Links are rewritten to load the link via the proxy.
// Redirections are supported and rewritten to load via the proxy.
// Links to images, css script and javascripts are rewritten in order
// to be loaded from the original web site.
// Forms are rewritten adding hidden input fields to specify the original
// url, this allows simple forms (like Wikipedia search) to work.
//
// Limitations: of course everything is done via simple regular expressions,
// and for instance will mess up with text strings contained in javascript,
// and everything done via ajax will most likely not work.
// Note also that most forms probably will not work.


error_reporting(-1);
ini_set('display_errors', 'On');

$postinfo = false;
if(!empty($_GET['__method__']) and !empty($_GET['__url__'])) {
    $method = $_GET['__method__'];
    $url = $_GET['__url__'];
    $params = array();
    foreach($_GET as $key=>$value) {
        if($key != '__method__' and $key != '__url__')
            $params[] .= $key.'='.urlencode($value);
    }
    $params = implode('&', $params);
    if(strtolower($method) == "post")
        $postinfo = $params;
    else
        $url .= '?' . $params;
}
else {
    if(empty($_GET['url']))
        exit("Error, url parameter not specified!");
    $method = false;
    $url = $_GET['url'];
}

$myurl = preg_replace("/[\\?#].+/",'',$_SERVER['REQUEST_URI']);
$urlbase = preg_replace("/^((?:\w+:\\/\\/)?[^\\/]+)(?:\\/.*)?$/", "\\1", $url);
$cookiedomain = preg_replace("/^(?:https?:\\/\\/)?(?:www\\.)?([^\\/]+)(?:\\/.*)?$/", "\\1", $url);

if ( !$url )
    exit('ERROR: url not specified');

$ch = curl_init( $url );

if ( strtolower($_SERVER['REQUEST_METHOD']) == 'post' ) {
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, $_POST );
} else if($postinfo) {
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, $postinfo);
}

// Cookies
$cookie = array();
foreach ( $_COOKIE as $key => $value ) {
    if(is_array($value))
        $value = serialize($value);
    $cookie[] = "$key=$value; domain=.$cookiedomain; path=/";
}
//$cookie[] = SID;
$cookie = implode( '; ', $cookie );
    
curl_setopt( $ch, CURLOPT_COOKIE, $cookie );


curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, false );
curl_setopt( $ch, CURLOPT_HEADER, true );
curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
  
curl_setopt( $ch, CURLOPT_USERAGENT, 
     !empty($_GET['user_agent']) ? $_GET['user_agent'] : $_SERVER['HTTP_USER_AGENT'] );


$response = curl_exec( $ch );

//$status = curl_getinfo( $ch );
if(empty($response))
    exit("Error, could not access URL \"$url\".");

curl_close( $ch );


//clean duplicate header that seems to appear on fastcgi with output buffer on some servers!
$response = str_replace("HTTP/1.1 100 Continue\r\n\r\n","",$response);

list( $header, $contents ) = preg_split('/([\r\n][\r\n])\\1/', $response, 2 );


// Split header text into an array.
$header_entries = preg_split( '/[\r\n]+/', $header );

$header_entries = preg_replace_callback("/^(location:)\s+(.*)/i", function($match) use($myurl, $urlbase) {
    $address = $match[2];
    if(preg_match("/^\\/[^\\/]/", $address)) //relative?
        $address = $urlbase . $address;
    $newurl = htmlentities($myurl . "?url=" . urlencode($address));
    return $match[1] . $newurl;
}, $header_entries);


foreach($header_entries as $v) {
    
    //echo $v . "\n";
    if(!preg_match("/^Transfer-Encoding/i",$v)) {
        //$v = str_replace($base, $mydomain, $v); //header rewrite if needed
        header(trim($v));
    }
}


// fix relative <link href=..., <image src=..., <script src=...
//$contents = preg_replace_callback('/(<(?:use|link|img|script)\s(?:[^<>]+\s)?(?:xlink\\:href|href|src)=(["\']))(\\/[^"\'\\/][^"\']+)(\2)/',
$contents = preg_replace_callback('/(<(?:use|link|img|script)\s(?:[^<>]+\s)?(?:xlink\\:href|href|src)=(["\']))([^"\'#][^"]+)(\2)/',
function ($match) use($urlbase, $myurl) {
    if(preg_match('/\\.svg(?:$|#)/', $match[3])) {
        $address = $match[3];
        $extra = '';
        if(preg_match('/^(.+)(#.*)$/',$address, $m)) {
            $address = $m[1];
            $extra = $m[2];
        }
        if(preg_match("/^\\/[^\\/]/", $address)) //relative?
            $address = $urlbase . $address;
        $newurl = htmlentities($myurl . "?url=" . urlencode($address)) . $extra;
        return $match[1] . $newurl . $match[4];
    }
    else if(preg_match("/^\\/[^\\/]/", $match[3]))
        return $match[1] . $urlbase . $match[3] . $match[4];
    else
        return $match[0];
}, $contents);

// fix all non-anchor <a href=...>
$contents = preg_replace_callback('/(<a\s(?:[^<>]+\s)?href=(["\']))([^"\'#][^"]+)(\2)/',
function ($match) use($urlbase, $myurl) {
    $address = $match[3];
    $extra = '';
    if(preg_match('/^(.+)(#.*)$/',$address, $m)) {
        $address = $m[1];
        $extra = $m[2];
    }
    if(preg_match("/^\\/[^\\/]/", $address)) //relative?
        $address = $urlbase . $address;
    $newurl = htmlentities($myurl . "?url=" . urlencode($address)) . $extra;
    return $match[1] . $newurl . $match[4];
}, $contents);

// fix all non-anchor <form action=...>
$contents = preg_replace_callback('/(<form\s(?:[^<>\s]+\s|method=(["\'])([^<>"\']+)\2\s+)*action=(["\']))([^"\'#][^"]+)(\4(?:\s+method=(["\']+)([^<>"\']+)\7|\s+[^<>\s]+)*>)/',
function ($match) use($urlbase, $myurl) {
    //print_r($match); exit;
    $method = (!empty($math[8]) and $match[8]!=='') ? $match[8] : 
              ((!empty($math[3]) and $match[3]!='') ? $match[3] : "GET");
    $address = $match[5];
    if(preg_match("/^\\/[^\\/]/", $address)) //relative?
        $address = $urlbase . $address;
    $address = htmlentities($address);
    //$newurl = htmlentities($myurl . "?__method__=1&__url__=" . urlencode($address));
    $retv = $match[1] . $myurl . $match[6];
    $retv .= "<input type=\"hidden\" name=\"__method__\" value=\"$method\"/>";
    $retv .= "<input type=\"hidden\" name=\"__url__\" value=\"$address\"/>";
    return $retv;
}, $contents);

// hijack XMLHttpRequest
$srv = $_SERVER['REQUEST_URI'];
$urlpath = preg_replace('/\\/[^\\/]+$/', '', $url);
$repl = <<<EOD
<head>
<script language="JavaScript" type="text/javascript">
(function(open) {
  XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    if(!url.match(/^[a-z]+:\/\//)) {
      if(!url.startsWith('/'))
        url = "$urlpath/" + url;
      else
        url = "$urlbase" + url;
    }
    url = "$myurl?url=" + encodeURIComponent(url);
    console.log(url);
    open.call(this, method, url, async, user, pass);
  };
})(XMLHttpRequest.prototype.open);
</script>
EOD;
$contents = preg_replace('/<head>/', $repl, $contents);

print $contents;

?>
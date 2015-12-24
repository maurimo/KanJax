<?php

// A very simple PHP Proxy, author Maurizio Monge but heavily
// inspired by Rob Thomson's and Ben Alman simple PHP proxy scripts.
//
// Links are rewritten to load the link via the proxy.
// Redirections are supported and rewritten to load via the proxy.
// Links to images, css script and javascripts are rewritten in order
// to be loaded from the original web site.
//
// Limitations: of course everything is done via simple regular expressions,
// and for instance will mess up with text strings contained in javascript,
// and everything done via ajax will most likely not work.
// Also forms will not work (at the moment).


error_reporting(-1);
ini_set('display_errors', 'On');


if(empty($_GET['url']))
    exit("Error, url parameter not specified!");

$myurl = preg_replace("/\\?.+/",'',$_SERVER['REQUEST_URI']);
$url = $_GET['url'];
$urlbase = preg_replace("/^((?:\w+:\\/\\/)?[^\\/]+)(?:\\/.*)?$/", "\\1", $url);
//exit($urlbase);
$cookiedomain = preg_replace("/^(?:https?:\\/\\/)?(?:www\\.)?([^\\/]+)(?:\\/.*)?$/", "\\1", $url);

if ( !$url )
    exit('ERROR: url not specified');

$ch = curl_init( $url );

if ( strtolower($_SERVER['REQUEST_METHOD']) == 'post' ) {
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, $_POST );
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
    //echo $address."\n";
    //echo $urlbase."\n";
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
$contents = preg_replace_callback('/(<(?:link|img|script)\s(?:[^<>]+\s)?(?:href|src)=(["\']))(\\/[^"\'\\/][^"\']+)(\2)/',
function ($match) use($urlbase) {
    return $match[1] . $urlbase . $match[3] . $match[4];
}, $contents);

// fix all non-anchor <a href=...>
$contents = preg_replace_callback('/(<a\s(?:[^<>]+\s)?href=(["\']))([^"\'#][^"]+)(\2)/',
function ($match) use($urlbase, $myurl) {
    $address = $match[3];
    if(preg_match("/^\\/[^\\/]/", $address)) //relative?
        $address = $urlbase . $address;
    $newurl = htmlentities($myurl . "?url=" . urlencode($address));
    return $match[1] . $newurl . $match[4];
}, $contents);


print $contents;
  
?>
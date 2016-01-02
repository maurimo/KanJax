<?php

//exit("ciao");
error_reporting(-1);
ini_set('display_errors', 'On');

mb_internal_encoding("UTF-8");

function kata_to_hira($str, $enc) {
    return mb_convert_kana($str,"c", $enc);
}

function array_add_string(&$array, $val) {
    if(!empty($array) && is_string($val) && is_string(end($array)))
        $array[key($array)] .= $val;
    else
        array_push($array, $val);
}

$descriptorspec = array(
    0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
    1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
    2 => array("pipe", "w") // stderr is a file to write to
);
$process = proc_open('mecab "--node-format=%m[%f[7]] " "--eos-format=\n" "--unk-format=%m[] "',
                      $descriptorspec, $pipes);
if(!is_resource($process)) {
    echo "Error!\n";
    exit;
}

function process($text, $pipes) {
    fwrite($pipes[0], $text . "\n");
    //echo fgets($pipes[1]);
    $reply = preg_split('/\s+/u', fgets($pipes[1]), NULL, PREG_SPLIT_NO_EMPTY);
    $retv = array();
    foreach($reply as $token) {
        //echo 'T: '.$token."\n";
        if(preg_match('/^(.*)\\[([^\\]\\[]*)\\]$/u', $token, $m)) {
            $form = mb_convert_encoding($m[1], 'UTF-32', 'UTF-8');
            $rkata = mb_convert_encoding($m[2], 'UTF-32', 'UTF-8');
            $rhira = kata_to_hira($rkata, 'UTF-32');
            //echo $form .'/'.$rkata.'/'.$rhira."\n";
            $leq = 0;
            $req = 0;
            $l = mb_strlen($form, 'UTF-32');
            $rl = mb_strlen($rkata, 'UTF-32');
            //echo $l."~".$rl."\n";
            while($leq < $l && $leq < $rl &&
                (mb_substr($form, $leq, 1, 'UTF-32') == mb_substr($rkata, $leq, 1, 'UTF-32') 
                    || mb_substr($form, $leq, 1, 'UTF-32') == mb_substr($rhira, $leq, 1, 'UTF-32')) )
                $leq++;
            while($req < $l-$leq && $req < $rl-$leq &&
                (mb_substr($form, $l-1-$req, 1, 'UTF-32') == mb_substr($rkata, $rl-1-$req, 1, 'UTF-32')
                || mb_substr($form, $l-1-$req, 1, 'UTF-32') == mb_substr($rhira, $rl-1-$req, 1, 'UTF-32')) )
                $req++;
            if($leq > 0) {
                $left = mb_convert_encoding(mb_substr($form, 0, $leq, 'UTF-32'),
                                                                        'UTF-8', 'UTF-32');
                array_add_string($retv, $left);
            }
            if($leq + $req < $l) {
                $middle = mb_convert_encoding(mb_substr($form, $leq, $l-$req-$leq, 'UTF-32'),
                                                                            'UTF-8', 'UTF-32');
                $reading = mb_convert_encoding(mb_substr($rhira, $leq, $rl-$req-$leq, 'UTF-32'),
                                                                            'UTF-8', 'UTF-32');
                //echo $middle .'<->'.$reading."\n";
                if(empty($reading)) {
                array_add_string($retv, $middle);   
                    }
                    else
                array_push($retv, array($middle, $reading));
            }
            if($req > 0) {
                $right = mb_convert_encoding(mb_substr($form, $l-$req, $l, 'UTF-32'),
                                                                        'UTF-8', 'UTF-32');
                array_add_string($retv, $right);
            }
        }
    }
    return $retv;
}

header('Content-type:application/json;charset=utf-8');

$text = $_POST["text"];
//$text = array()
//$text[] = "カリン、自分でまいた種は自分で刈り取[qw]";
//$text[] = 'モーラ、モラ（mora）とは、音韻論上、一定の時間的長さをもった音の分節単位。古典詩における韻律用語であるラテン語のmŏra（モラ）の転用（日本語における「モーラ」という表記は英語からの音訳であり、「モラ」という表記はラテン語からの音訳）。拍（はく）と訳される。';
$retv = array();
foreach($text as $key => $v)
    $retv[] = process($v, $pipes);
//print_r($retv);
echo json_encode(array("status" => "OK", "data" => $retv));

?>
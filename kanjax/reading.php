<?php

//exit("ciao");
error_reporting(-1);
ini_set('display_errors', 'On');

require_once('settings.php');

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

$mecab_args = array(
    "--node-format=%m[%f[7]] ",
    "--eos-format=\n",
    "--unk-format=%m[] "
);

$cmd = MECAB_CMD;
foreach($mecab_args as $arg)
    $cmd .= ' ' . escapeshellarg($arg);

$descriptorspec = array(
    0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
    1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
    2 => array("pipe", "w") // stderr is a file to write to
);

$process = proc_open($cmd, $descriptorspec, $pipes);    

if(!is_resource($process)) {
    echo "Error!\n";
    exit;
}

class Processor {
    const Readings = 0;
    const Lemmas = 1;
    const ReadingsAndLemmas = 2;
    
    //self::Readings

    const MecabArgsProcess = array(
        "--node-format=%m[%f[7]] ", // only readings
        "--node-format=%m[%f[6],%f[0]] ", // lemma and pos
        "--node-format=%m[%f[7],%f[6],%f[0]] " // reading, lemma and pos
    );
    const MecabArgsExtra = array(
        "--eos-format=\n",
        "--unk-format=%m[] "
    );
    var $pipes;
    var $process;

    const Pos = array(
        '形容詞' => 'Adjective',      // keiyōshi
        '連体詞' => 'Attributive',    // rentaishi
        '副詞'   => 'Adverb',         // fukushi
        '判定詞' => 'Judgment',       // hanteishi
        '助動詞' => 'Auxiliary verb', // jodōshi
        '接続詞' => 'Conjunction',    // setsuzokushi
        '指示詞' => 'Demonstrative',  // shijishi
        '感動詞' => 'Interjection',   // kandōshi
        '名詞'   => 'Noun',           // meishi
        '動詞'   => 'Verb',           // dōshi
        '助詞'   => 'Particle',       // joshi
        '接頭辞' => 'Prefix',         // settōji
        '接尾辞' => 'Suffix',         // setsuoji
        '特殊'   => 'Special',        // tokushu
        '未定義語' => 'Undefined language' // miteigi-go
    );
    var $settings;
    
    Processor() {
    
    }
}

function process($text, $pipes, $process, $lemmas) {
    fwrite($pipes[0], $text . "\n");
    $response = fgets($pipes[1]);

    // test if the program exited unexpectedly, if so somethings is wrong on the server side
    $status = proc_get_status ( $process );
    if(!$status['running'])
        exit(json_encode(Array(
            "status" => "SERVER_ERROR",
            "message" => "Command exited unexpectedly: <br/>".htmlspecialchars($status['command'])
        )));

    $reply = preg_split('/\s+/u', $response, NULL, PREG_SPLIT_NO_EMPTY);
    $retv = array();
    foreach($reply as $token) {
        //echo 'T: '.$token."\n";
        if(!preg_match('/^(.*)\\[([^\\]\\[]*)\\]$/u', $token, $m))
            continue;

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
            
        if($req + $leq < $rl)
            $reading = mb_convert_encoding(mb_substr($rhira, $leq, $rl-$req-$leq, 'UTF-32'),
                                                                            'UTF-8', 'UTF-32');

        if($lemmas) {
            if($req + $leq >= $rl)
                array_add_string($retv, $m[1]);
            else
                array_push($retv, array('f' => $m[1],
                    'r' => $reading,
                    'a' => $leq,
                    'b' => $l-$leq-$req,
                    'l' => $m[1])
                    );
            continue;
        }
        if($leq > 0) {
            $left = mb_convert_encoding(mb_substr($form, 0, $leq, 'UTF-32'),
                                                            'UTF-8', 'UTF-32');
            array_add_string($retv, $left);
        }
        if($leq + $req < $l) {
            $middle = mb_convert_encoding(mb_substr($form, $leq, $l-$req-$leq, 'UTF-32'),
                                                                        'UTF-8', 'UTF-32');
            //echo $middle .'<->'.$reading."\n";
            if(empty($reading))
                array_add_string($retv, $middle);
            else
                array_push($retv, array($middle, $reading));
        }
        if($req > 0) {
            $right = mb_convert_encoding(mb_substr($form, $l-$req, $l, 'UTF-32'),
                                                                    'UTF-8', 'UTF-32');
            array_add_string($retv, $right);
        }
    }
    return $retv;
}

header('Content-type:application/json;charset=utf-8');

$text = $_POST["text"];
//$text = array();
//$text[] = "カリン、自分でまいた種は自分で刈り取[qw]";
//$text[] = 'モーラ、モラ（mora）とは、音韻論上、一定の時間的長さをもった音の分節単位。古典詩における韻律用語であるラテン語のmŏra（モラ）の転用（日本語における「モーラ」という表記は英語からの音訳であり、「モラ」という表記はラテン語からの音訳）。拍（はく）と訳される。';

$retv = array();
foreach($text as $key => $v)
    $retv[] = process($v, $pipes, $process, true);

//print_r($retv);
echo json_encode(array("status" => "OK", "data" => $retv));

?>
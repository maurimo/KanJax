<?php

$ru_start = getrusage();
$time_start = microtime(true);

function rutime($ru, $rus, $index) {
    return ($ru["ru_$index.tv_sec"] + $ru["ru_$index.tv_usec"]/1000000.0)
     -  ($rus["ru_$index.tv_sec"] + $rus["ru_$index.tv_usec"]/1000000.0);
}

error_reporting(-1);
ini_set('display_errors', 'On');

require_once('settings.php');

mb_internal_encoding("UTF-8");

function jexit($obj) {
    exit(json_encode($obj, JSON_UNESCAPED_UNICODE));
    exit(json_encode($obj)); //, JSON_UNESCAPED_UNICODE));
}

function kata_to_hira($str, $enc) {
    return mb_convert_kana($str,"c", $enc);
}

function array_add_string(&$array, $val) {
    if(!empty($array) && is_string($val) && is_string(end($array)))
        $array[key($array)] .= $val;
    else
        array_push($array, $val);
}

function u32ch($str, $len) {
    return substr($str, $len * 4, 4);
}

function is_one_of($x, $a, $b) {
    return ($x == $a) or ($x == $b);
}

class Processor {
    const Lemmas = 1;
    const Rubies = 2;
    const FullReadings = 4;

    const MecabArgsReadingLemmaPos = "--node-format=%m[%f[7],%f[6],%f[0]] ";
    const MecabArgsLemmaPos = "--node-format=%m[%f[6],%f[0]] ";
    const MecabArgsReading  = "--node-format=%m[%f[7]] ";

    var $MecabArgsExtra = array(
        "--eos-format=\n",
        "--unk-format=%m[] "
    );
    const ResponseRegReadingLemmaPos =
                '/^(.*)\\[([^,\\]\\[]*),?([^,\\]\\[]*),?([^,\\]\\[]*)\\]$/u';
    const ResponseRegLemmaPos = '/^(.*)\\[([^,\\]\\[]*),?([^,\\]\\[]*)\\]$/u';
    const ResponseRegReading = '/^(.*)\\[([^\\]\\[]*)\\]$/u';
    var $response_reg;

    var $pipes;
    var $process;

    var $Pos = array(
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
        '接頭詞' => 'Prefix',         // settōshi
        '接尾辞' => 'Suffix',         // setsuoji
        '特殊'   => 'Special',        // tokushu
        '記号'   => 'Symbol',         // kigō
        '未定義語' => 'Undefined language', // miteigi-go
        'フィラー' => 'Filler'         // firā
    );
    var $ForbiddenPos = array(
        '未定義語' => true, //undefined
        '助詞' => true, //particle
        '記号' => true, //symbol
        '未定義語' => true, //undefined language
        'フィラー' => true //filler
    );
    
    var $settings;
    
    function Processor($_settings) {
        $this->settings = $_settings;

        $cmd = MECAB_CMD;
        if($this->settings == self::Lemmas) {
            $cmd .= ' ' . escapeshellarg(self::MecabArgsLemmaPos);
            $this->response_reg = self::ResponseRegLemmaPos;
        }
        else if(!($this->settings & self::Lemmas)) {
            $cmd .= ' ' . escapeshellarg(self::MecabArgsReading);
            $this->response_reg = self::ResponseRegReading;
        }
        else {
            $cmd .= ' ' . escapeshellarg(self::MecabArgsReadingLemmaPos);
            $this->response_reg = self::ResponseRegReadingLemmaPos;
        }
        foreach($this->MecabArgsExtra as $arg)
            $cmd .= ' ' . escapeshellarg($arg);

        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
            1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
            2 => array("pipe", "w") // stderr is a file to write to
        );

        $this->process = proc_open($cmd, $descriptorspec, $this->pipes);

        if(!is_resource($this->process))
            jexit(Array(
                "status" => "SERVER_ERROR",
                "message" => "Couldn't create process object!"
            ));
    }

    function send_text($text) {
        fwrite($this->pipes[0], $text . "\n");
    }

    function get_response() {
        $response = fgets($this->pipes[1]);

        // test if the program exited unexpectedly, 
        // if so somethings is wrong on the server side
        $status = proc_get_status ( $this->process );
        if(!$status['running'])
            jexit(Array(
                "status" => "SERVER_ERROR",
                "message" => "Command exited unexpectedly: <br/>" .
                              htmlspecialchars($status['command'])
            ));

        $reply = preg_split('/\s+/u', $response, NULL, PREG_SPLIT_NO_EMPTY);
        $retv = array();
        foreach($reply as $token) {
            //echo "$token\n";
            if(!preg_match($this->response_reg, $token, $m))
                jexit(Array(
                    "status" => "SERVER_ERROR",
                    "message" => "Can't parse token: <br/>" . htmlspecialchars($token)
                ));

            $form8 = $m[1];
            if(empty($m[2])) {
                array_add_string($retv, $form8);
                continue;
            }
            if($this->settings == self::Lemmas) {
                $lemma8 = $m[2];
                $pos8 = $m[3];
            }
            else if(!($this->settings & self::Lemmas))
                $fullreading8 = $m[2];
            else {
                $fullreading8 = $m[2];
                $lemma8 = $m[3];
                $pos8 = $m[4];
            }
            if( ($this->settings & self::Lemmas) and
                    !array_key_exists($pos8, $this->Pos) )
                jexit(array(
                    "status" => "SERVER_ERROR",
                    "message" => "Unknown POS: '".htmlspecialchars($pos8)."'"
                ));

            if(!($this->settings & self::Rubies)) {
                if(($this->settings & self::Lemmas) and
                    array_key_exists($pos8, $this->ForbiddenPos))
                    array_add_string($retv, $form8);
                else {
                    $obj = array('f' => $form8);
                    if($this->settings & self::FullReadings)
                        $obj['c'] = kata_to_hira($fullreading8, 'UTF-8');
                    if($this->settings & self::Lemmas) {
                        $obj['l'] = $lemma8;
                        $obj['p'] = $this->Pos[$pos8];
                    }
                    array_push($retv, $obj);
                }
                continue;
            }

            $form32 = mb_convert_encoding($form8, 'UTF-32', 'UTF-8');
            $rkata32 = mb_convert_encoding($fullreading8, 'UTF-32', 'UTF-8');
            $rhira32 = kata_to_hira($rkata32, 'UTF-32');

            $leq = 0;
            $req = 0;
            $l = mb_strlen($form32, 'UTF-32');
            $rl = mb_strlen($rkata32, 'UTF-32');
            while($leq < $l && $leq < $rl &&
                is_one_of(u32ch($form32, $leq),
                    u32ch($rkata32, $leq),
                    u32ch($rhira32, $leq)) )
                $leq++;
            while($req < $l-$leq && $req < $rl - $leq &&
                is_one_of(u32ch($form32, $l-1-$req),
                    u32ch($rkata32, $rl-1-$req),
                    u32ch($rhira32, $rl-1-$req)) )
                $req++;

            if($req + $leq < $rl)
                $reading8 = mb_convert_encoding( ($leq == 0 and $req == 0) 
                    ? $rhira32 : mb_substr($rhira32, $leq, $rl-$req-$leq, 'UTF-32'),
                    'UTF-8', 'UTF-32');

            if( ($this->settings & (self::Lemmas|self::FullReadings)) and
                    !array_key_exists($pos8, $this->ForbiddenPos) ) {
                $obj = array('f' => $form8);
                if($req == 0 && $leq == 0)
                    $obj['r'] = $reading8;
                else if($req + $leq < $rl)
                    $obj['r'] = array($reading8, $leq, $l-$req);
                if($this->settings & self::Lemmas) {
                    $obj['l'] = $lemma8;
                    $obj['p'] = $this->Pos[$pos8];
                }
                if($this->settings & self::FullReadings) {
                    $obj['c'] = ($req == 0 && $leq == 0) ? $reading8
                        : mb_convert_encoding($rhira32, 'UTF-8', 'UTF-32');
                }
                array_push($retv, $obj);
                continue;
            }

            if($req + $leq >= $rl) {
                array_add_string($retv, $form8);
                continue;
            }

            if($leq > 0) {
                $left8 = mb_convert_encoding(mb_substr($form32, 0, $leq, 'UTF-32'),
                                                                'UTF-8', 'UTF-32');
                array_add_string($retv, $left8);
            }
            if($leq + $req < $l) {
                $middle8 = ($leq == 0 and $req == 0) ? $form8 :
                    mb_convert_encoding(mb_substr($form32, $leq,
                                        $l-$req-$leq, 'UTF-32'), 'UTF-8', 'UTF-32');
                if($req + $leq >= $rl)
                    array_add_string($retv, $middle8);
                else
                    array_push($retv, array(
                        'f' => $middle8,
                        'r' => $reading8
                    ));
            }
            if($req > 0) {
                $right8 = mb_convert_encoding(mb_substr($form32, $l-$req, $l, 'UTF-32'),
                                                                        'UTF-8', 'UTF-32');
                array_add_string($retv, $right8);
            }
        }
        return $retv;
    }
}

header('Content-type:application/json;charset=utf-8');

$text = $_POST["text"];
//$text = array();
//$text[] = "カリン、自分でまいた種は自分で刈り取[qw]";
//$text[] = 'モーラ、モラ（mora）とは、音韻論上、一定の時間的長さをもった音の分節単位。古典詩における韻律用語であるラテン語のmŏra（モラ）の転用（日本語における「モーラ」という表記は英語からの音訳であり、「モラ」という表記はラテン語からの音訳）。拍（はく）と訳される。';

$type = 0;
if($_POST["dict"])
    $type |= Processor::Lemmas;
if($_POST["rubies"])
    $type |= Processor::Rubies;
if($_POST["full_reading"])
    $type |= Processor::FullReadings;
//$type = Processor::ReadingsAndLemmas;
$proc = new Processor($type);

$retv = array();

$sent = 0;
foreach($text as $v) {
    $proc->send_text($v);
    $sent++;
    if($sent >= 3) {
        $retv[] = $proc->get_response();
        $sent--;
    }
}
while($sent) {
    $retv[] = $proc->get_response();
    $sent--;
}

jexit(array(
    "status" => "OK",
    "wall_time" => (microtime(true) - $time_start),
    "cpu_time" => rutime(getrusage(), $ru_start, "utime"),
    "data" => $retv
));

?>

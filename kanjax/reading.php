<?php

//exit("ciao");

function kata_to_hira($str) {
    return mb_convert_kana($str,"c");
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
  $reply = preg_split('/\s+/', fgets($pipes[1]), NULL, PREG_SPLIT_NO_EMPTY);
  $retv = array();
  foreach($reply as $token) {
    //echo 'T<'.$token.">\n";
    if(preg_match('/^(.*)\\[([^\\]\\[]*)\\]$/', $token, $m)) {
      $form = $m[1];
      $rkata = $m[2];
      $rhira = kata_to_hira($rkata);
      $leq = 0;
      $req = 0;
      $l = strlen($form);
      $rl = strlen($rkata);
      //echo $l."~".$rl."\n";
      while($leq < $l && $leq < $rl &&
        ($form[$leq] == $rkata[$leq] || $form[$leq] == $rhira[$leq]) )
          $leq++;
      while($req < $l-$leq && $req < $rl-$leq &&
        ($form[$l-1-$req] == $rkata[$rl-1-$req] || $form[$l-1-$req] == $rhira[$rl-1-$req]) )
          $req++;
      if($leq > 0)
        array_add_string($retv, substr($form,0,$leq));
      if($leq + $req < $l) {
        $middle = substr($form, $leq, $l-$req-$leq);
        $reading = substr($rhira, $leq, $rl-$req-$leq);
        if(empty($reading)) {
          array_add_string($retv, $middle);   
        }
        else
          array_push($retv, array($middle, $reading));
      }
      if($req > 0)
        array_add_string($retv, substr($form,$l-$req));
      //echo $m[2].$rhira."\n";
    }
  }
  return $retv;
}

//$text = "カリン、自分でまいた種は自分で刈り取[qw]";
$text = $_GET["text"];
$retv = process($text, $pipes);
echo json_encode(array("status" => "OK", "data" => $retv));
//print_r(preg_split('/\s+/', 'asd a    asd  ', NULL, PREG_SPLIT_NO_EMPTY));
//print_r(explode(" ","asd  asd asd"));
?>
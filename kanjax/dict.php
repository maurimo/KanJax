<?php

// Settings
$DATABASE = "db/dict.db";
$DEBUG = true;

if($DEBUG) {
    error_reporting(-1);
    ini_set('display_errors', 'On');
}

function jexit($obj) {
    exit(json_encode($obj)); //, JSON_UNESCAPED_UNICODE));
}

header('Content-type:application/json;charset=utf-8');

if(empty($_GET["word"]))
    exit(json_encode(Array(
        "status" => "ERR_WRONG_QUERY",
        "message" => "Variable \"word\" not set"
    )));

try {
    $db_handle  = new SQLite3($DATABASE, SQLITE3_OPEN_READONLY);
} catch (Exception $e) {
    jexit(array(
        "status" => "ERR_CANT_READ_DB",
        "message" => $e->getMessage()
    ));
}
$statement = $db_handle->prepare(
    "SELECT entry FROM Entries INNER JOIN Words on Words.id=Entries.id WHERE word = :word"
);
$statement->bindValue(':word', $_GET["word"]);
$result = $statement->execute();

$data = array();
while($row = $result->fetchArray(SQLITE3_ASSOC))
    $data[] = json_decode($row["entry"]);
$result->finalize();

if(empty($data))
    jexit(array(
        "status" => "ERR_NOT_FOUND",
        "message" => "Key \"" . $_GET["word"] . "\" not found in DB."
    ));

$response = Array("status" => "OK", "data" => $data);
jexit($response);

//$db_handle->close();

?>

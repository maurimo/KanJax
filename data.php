<?php

// Settings
$DATABASE = "kanji_it.db";
$DEBUG = true;

if($DEBUG) {
    error_reporting(-1);
    ini_set('display_errors', 'On');
}

if(empty($_GET["kanji"]))
    exit(json_encode(Array(
        "status" => "ERR_WRONG_QUERY",
        "message" => "Variable \"kanji\" not set"
    )));

try {
    $db_handle  = new SQLite3($DATABASE, SQLITE3_OPEN_READONLY);
} catch (Exception $e) {
    exit(json_encode(Array(
        "status" => "ERR_CANT_READ_DB",
        "message" => $e->getMessage()
    )));
}
$statement = $db_handle->prepare('SELECT * FROM KanjiIinfo WHERE kanji = :kanji;');
$statement->bindValue(':kanji', $_GET["kanji"]);
$result = $statement->execute();
$row = $result->fetchArray(SQLITE3_ASSOC);
if(!$row)
    exit(json_encode(Array(
        "status" => "ERR_NOT_FOUND",
        "message" => "Key \"" . $_GET["kanji"] . "\" not found in DB."
    )));
$response = Array("status" => "OK", "data" => $row);
echo json_encode($response);
?>
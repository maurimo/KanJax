<?php

// Settings
$DATABASE = "db/kanji.db";
$DEBUG = true;

if($DEBUG) {
    error_reporting(-1);
    ini_set('display_errors', 'On');
}

header('Content-type:application/json;charset=utf-8');

if(empty($_GET["kanji"]))
    exit(json_encode(Array(
        "status" => "ERR_WRONG_QUERY",
        "message" => "Variable \"kanji\" not set"
    )));

if(!empty($_POST["key"])) {
    if(!preg_match("/^\w+$/",$_POST["key"]) and $_POST["key"] != "kanji")
        exit(json_encode(Array(
            "status" => "ERR_INVALID_KEY",
            "message" => "Invalid key \"".htmlspecialchars($_POST["key"])."\"."
        )));

    try {
        $db_handle  = new SQLite3($DATABASE, SQLITE3_OPEN_READWRITE);
    } catch (Exception $e) {
        exit(json_encode(Array(
            "status" => "ERR_CANT_WRITE_DB",
            "message" => $e->getMessage()
        )));
    }
    try {
        $statement = $db_handle->prepare(
            'UPDATE KanjiIinfo SET '.$_POST["key"].' = :value WHERE kanji = :kanji;');
        $statement->bindValue(':value', $_POST["value"]);
        $statement->bindValue(':kanji', $_GET["kanji"]);
        $result = @$statement->execute();
        if($result)
            exit(json_encode(Array(
                "status" => "OK",
                "key" => $_POST["key"],
                "value" => $_POST["value"]
            )));
        else
            throw new Exception("execute: " . $db_handle->lastErrorMsg());
    } catch (Exception $e) {
        exit(json_encode(Array(
            "status" => "ERR_CANT_WRITE_DB",
            "message" => $e->getMessage()
        )));
    }
}

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

$result->finalize();
$db_handle->close();

?>

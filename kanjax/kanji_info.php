<?php

// Settings
$DATABASE = "db/kanji.db";
$DEBUG = true;

header("Access-Control-Allow-Origin: *");

if($DEBUG) {
    error_reporting(-1);
    ini_set('display_errors', 'On');
}

function jexit($obj) {
    exit(json_encode($obj)); //, JSON_UNESCAPED_UNICODE));
}

header('Content-type:application/json;charset=utf-8');

if(empty($_GET["kanji"]))
    jexit(array(
        "status" => "ERR_WRONG_QUERY",
        "message" => "Variable \"kanji\" not set"
    ));

if(!empty($_POST["key"])) {
    if(!preg_match("/^\w+$/",$_POST["key"]) and $_POST["key"] != "kanji")
        jexit(array(
            "status" => "ERR_INVALID_KEY",
            "message" => "Invalid key \"".htmlspecialchars($_POST["key"])."\"."
        ));

    try {
        $db_handle  = new SQLite3($DATABASE, SQLITE3_OPEN_READWRITE);
    } catch (Exception $e) {
        jexit(array(
            "status" => "ERR_CANT_WRITE_DB",
            "message" => $e->getMessage()
        ));
    }
    try {
        $statement = $db_handle->prepare(
            'UPDATE KanjiInfo SET '.$_POST["key"].' = :value WHERE kanji = :kanji;');
        $statement->bindValue(':value', $_POST["value"]);
        $statement->bindValue(':kanji', $_GET["kanji"]);
        $result = @$statement->execute();
        if($result)
            jexit(array(
                "status" => "OK",
                "key" => $_POST["key"],
                "value" => $_POST["value"]
            ));
        else
            throw new Exception("execute: " . $db_handle->lastErrorMsg());
    } catch (Exception $e) {
        jexit(array(
            "status" => "ERR_CANT_WRITE_DB",
            "message" => $e->getMessage()
        ));
    }
}

try {
    $db_handle  = new SQLite3($DATABASE, SQLITE3_OPEN_READONLY);
} catch (Exception $e) {
    jexit(array(
        "status" => "ERR_CANT_READ_DB",
        "message" => $e->getMessage()
    ));
}
$statement = $db_handle->prepare('SELECT * FROM KanjiInfo WHERE kanji = :kanji;');
$statement->bindValue(':kanji', $_GET["kanji"]);
$result = $statement->execute();
$row = $result->fetchArray(SQLITE3_ASSOC);
$result->finalize();

if(!$row)
    jexit(array(
        "status" => "ERR_NOT_FOUND",
        "message" => "Key \"" . $_GET["kanji"] . "\" not found in DB."
    ));

jexit(array(
    "status" => "OK",
    "data" => $row
));

//$db_handle->close();

?>

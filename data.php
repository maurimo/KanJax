<?php
  error_reporting(-1);
  ini_set('display_errors', 'On');
  try {
    $db_handle  = new SQLite3('kanji_it.db', SQLITE3_OPEN_READONLY);
  } catch (Exception $e) {
    exit(json_encode(Array("status" => "ERR_CANT_READ_DB", "message" => $e->getMessage())));
  }
  $statement = $db_handle->prepare('SELECT * FROM KanjiIinfo WHERE kanji = :kanji;');
  $statement->bindValue(':kanji', $_GET["kanji"]);
  $result = $statement->execute();
  $row = $result->fetchArray(SQLITE3_ASSOC);
  if(!$row)
    exit(json_encode(Array("status" => "ERR_NOT_FOUND")));
  $response = Array("status" => "OK", "data" => $row);
  echo json_encode($response);
?>
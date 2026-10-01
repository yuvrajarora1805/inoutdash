<?php
$host = "127.0.0.1";
$user = "root";
$pass = "";
$db = "licence_db";

try {
    $conn = new PDO("mysql:host=$host", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("CREATE DATABASE IF NOT EXISTS `$db`");
    $conn->exec("USE `$db`");
    
    $sql = file_get_contents("db/init.sql");
    $conn->exec($sql);
    echo "Database created successfully\n";
} catch(PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
?>

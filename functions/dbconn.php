<?php
// declare(strict_types=1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$username = "root";
$password = "";
$db = "inout";

// Koha Database Credentials (Fallback for testing)
$koha_db = "koha_library";
$koha_user = "koha_library";
$koha_pass = "u7#TY9mt8,R70(gs";

date_default_timezone_set("Asia/Kolkata");

try {
    // Connection to InOut Database
    $conn = new mysqli($servername, $username, $password, $db);
    $conn->set_charset("utf8mb4");

    // Connection to Koha Database
    $koha = new mysqli($servername, $koha_user, $koha_pass, $koha_db);
    $koha->set_charset("utf8mb4");

} catch (mysqli_sql_exception $e) {
    die("Database connection failed: " . $e->getMessage());
}

if (!function_exists('sanitize')) {
    function sanitize(mysqli $conn, string|null $str): string {
        return $str !== null ? $conn->real_escape_string($str) : '';
    }
}

// Helper to get Server MAC Address on Linux
if (!function_exists('getServerMacAddress')) {
    function getServerMacAddress() {
        $files = glob('/sys/class/net/*/address');
        if ($files) {
            foreach($files as $file) {
                if (strpos($file, 'lo') === false) {
                    return trim(file_get_contents($file));
                }
            }
        }
        return '';
    }
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$current_page = basename($_SERVER['PHP_SELF']);
$allowed_pages = ['amc.php', 'amc_expired.php', 'login.php', 'login_verify.php', 'signout.php'];

if (!in_array($current_page, $allowed_pages)) {
    // Only check the license server once every 3 seconds per session for testing
    if (!isset($_SESSION['license_last_checked']) || (time() - $_SESSION['license_last_checked'] > 3)) {
        try {
            $licenseQuery = $conn->query("SELECT license_key FROM licenses LIMIT 1");
            if ($licenseQuery && $licenseQuery->num_rows > 0) {
                $row = $licenseQuery->fetch_assoc();
                $key = $row['license_key'];
                
                if (!empty($key)) {
                    $mac = getServerMacAddress();
                    $domain = $_SERVER['HTTP_HOST'] ?? 'localhost';
                    
                    // Set your live server IP or domain here
                    $LICENSE_SERVER = "https://inout.omvky.com"; 
                    
                    $verify_url = $LICENSE_SERVER . "/api/verify?" . http_build_query([
                        'key' => $key,
                        'mac' => $mac,
                        'domain' => $domain,
                        'product' => 'inout'
                    ]);
                    
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $verify_url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    $response = curl_exec($ch);
                    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($response !== false) {
                        $json = json_decode($response, true);
                        if ($json && isset($json['status']) && $json['status'] === 'success') {
                            // License is valid
                            $_SESSION['license_last_checked'] = time();
                            $_SESSION['license_plan'] = $json['plan'];
                            $_SESSION['license_max_users'] = $json['max_users'];
                            $_SESSION['license_features'] = $json['features'];
                        } else {
                            // Invalid, Revoked, Expired, or MAC Mismatch
                            $_SESSION['license_error'] = $json['message'] ?? 'License invalid';
                            $reason = urlencode($_SESSION['license_error']);
                            if(headers_sent()){ echo "<script>window.location.href='amc_expired.php?reason=$reason';</script>"; } else { header("Location: amc_expired.php?reason=$reason"); }
                            exit();
                        }
                    } else {
                        // License server down, fail open or fail closed. We fail closed.
                        if(headers_sent()){ echo "<script>window.location.href='amc_expired.php?reason=server_down';</script>"; } else { header("Location: amc_expired.php?reason=server_down"); }
                        exit();
                    }
                } else {
                    if(headers_sent()){ echo "<script>window.location.href='amc_expired.php?reason=no_key';</script>"; } else { header("Location: amc_expired.php?reason=no_key"); }
                    exit();
                }
            } else {
                if(headers_sent()){ echo "<script>window.location.href='amc_expired.php?reason=not_installed';</script>"; } else { header("Location: amc_expired.php?reason=not_installed"); }
                exit();
            }
        } catch (Exception $e) {
            // Table probably doesn't exist, ignore for initial setup
        }
    }
}
?>

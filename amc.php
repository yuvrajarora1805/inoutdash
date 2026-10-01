<?php
	session_start();
	$title = "AMC & License Management";
	$acc_code = "S01"; // Require setup permission to access this page
	require "./functions/access.php";
	require_once "./template/header.php";
	require_once "./template/sidebar.php";
	require "functions/dbconn.php";

	// Create table if it doesn't exist
	$createTableQuery = "CREATE TABLE IF NOT EXISTS `licenses` (
		`id` INT(11) NOT NULL AUTO_INCREMENT,
		`license_key` TEXT NOT NULL,
		`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
	$conn->query($createTableQuery);

	$msg = "";
	$msgType = "";

	if (isset($_POST['update_license'])) {
		$new_key = sanitize($conn, $_POST['license_key']);
		$check = $conn->query("SELECT id FROM licenses LIMIT 1");
		if ($check->num_rows > 0) {
			$conn->query("UPDATE licenses SET license_key = '$new_key'");
		} else {
			$conn->query("INSERT INTO licenses (license_key) VALUES ('$new_key')");
		}
		$msg = "License key updated successfully.";
		$msgType = "success";
	}

	$licenseQuery = $conn->query("SELECT license_key FROM licenses LIMIT 1");
	$current_key = "";
	$decoded_license = null;
	$status = "Not Installed";
	$expiry = "N/A";
	$plan = "N/A";
	
	if ($licenseQuery && $licenseQuery->num_rows > 0) {
		$row = $licenseQuery->fetch_assoc();
		$current_key = $row['license_key'];
		if (!empty($current_key)) {
			// Extract payload from the key (format: payload.signature)
			$parts = explode('.', $current_key);
			$payloadPart = $parts[0] ?? '';
			
			// First, do an offline decode to get plan and expiry
			$b64 = strtr($payloadPart, '-_', '+/');
			$b64_padded = str_pad($b64, strlen($b64) % 4 === 0 ? strlen($b64) : strlen($b64) + 4 - (strlen($b64) % 4), '=', STR_PAD_RIGHT);
			
			$decoded_json = base64_decode($b64_padded);
			$decoded = json_decode($decoded_json, true);
			
			if ($decoded && isset($decoded['expiry_date'])) {
				$decoded_license = $decoded;
				$expiry = $decoded['expiry_date'];
				$plan = isset($decoded['plan']) ? $decoded['plan'] : "Standard";
				
				// Now perform a live ping to the server to get the REAL-TIME status (Suspended, Revoked, etc)
				$mac = "";
				$domain = $_SERVER['HTTP_HOST'] ?? 'localhost';
				$LICENSE_SERVER = "https://inout.omvky.com"; // Set your live server IP or domain here
				$verify_url = $LICENSE_SERVER . "/api/verify?" . http_build_query([
					'key' => $current_key,
					'mac' => $mac,
					'domain' => $domain,
					'product' => 'inout'
				]);
				
				$ch = curl_init();
				curl_setopt($ch, CURLOPT_URL, $verify_url);
				curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
				curl_setopt($ch, CURLOPT_TIMEOUT, 3);
				curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
				$response = curl_exec($ch);
				curl_close($ch);
				
				if ($response !== false) {
					$json = json_decode($response, true);
					if ($json && isset($json['status']) && $json['status'] === 'success') {
						$status = "Active";
					} else {
						// Extract the specific error (e.g., "License is suspended")
						$errorMsg = $json['message'] ?? 'Invalid';
						if (strpos(strtolower($errorMsg), 'suspended') !== false) {
							$status = "Suspended";
						} else if (strpos(strtolower($errorMsg), 'revoked') !== false) {
							$status = "Revoked";
						} else if (strpos(strtolower($errorMsg), 'expired') !== false) {
							$status = "Expired";
						} else {
							$status = "Inactive ($errorMsg)";
						}
					}
				} else {
					$status = "Server Offline (Using Offline Key)";
					$expiry_date = strtotime($expiry);
					if (time() > $expiry_date) $status = "Expired";
				}
			} else {
				$status = "Invalid Key Format";
			}
		}
	}
?>
<!-- MAIN CONTENT START -->
<div class="content" style="min-height: calc(100vh - 160px);">
	<div class="container-fluid">
	  <div class="row">
	    <div class="col-md-6">
	    	<div class="card">
	        <div class="card-header card-header-icon card-header-rose">
	          <div class="card-icon">
	            <i class="material-icons">vpn_key</i>
	          </div>
	          <h4 class="card-title">License Management -
	            <small class="category">In Out System</small>
	          </h4>
	        </div>
	        <div class="card-body">
	        	<?php if($msg != ""): ?>
	        		<div class="alert alert-<?php echo $msgType; ?>"><?php echo $msg; ?></div>
	        	<?php endif; ?>
	          <form action="" method="POST">
	            <div class="row">
	            	<div class="col-md-12">
	                <div class="form-group">
	                  <label class="bmd-label-floating">AMC License Key (Base64 Encoded)</label>
	                  <textarea name="license_key" class="form-control" rows="4" required><?php echo htmlspecialchars($current_key); ?></textarea>
	                </div>
	              </div>
	            </div>
	            <input type="submit" value="Update License" name="update_license" class="btn btn-success">
	          </form>
	        </div>
	      </div>
	    </div>
	    <div class="col-md-6">
	    	<div class="card">
	        <div class="card-header card-header-icon card-header-info">
	          <div class="card-icon">
	            <i class="material-icons">info</i>
	          </div>
	          <h4 class="card-title">AMC Details -
	            <small class="category">Current Plan</small>
	          </h4>
	        </div>
	        <div class="card-body">
            <div class="row">
            	<div class="col-md-12">
            		<h3>Status</h3>
            		<h4>
						<?php 
						if($status == 'Active') {
							echo "<span class='text-success'><strong>$status</strong></span>";
						} else if($status == 'Expired' || $status == 'Invalid Key') {
							echo "<span class='text-danger'><strong>$status</strong></span>";
						} else {
							echo "<span>$status</span>";
						}
						?>
					</h4>
            	</div>
            </div>
            <div class="row">
            	<div class="col-md-12">
            		<h3>Plan</h3>
            		<h4><?php echo htmlspecialchars($plan); ?></h4>
            	</div>
            </div>
            <div class="row">
            	<div class="col-md-12">
            		<h3>Expiry Date</h3>
            		<h4><?php echo htmlspecialchars($expiry); ?></h4>
            	</div>
            </div>
	        </div>
	      </div>
	    </div>
	  </div>              
	</div>
</div>
<!-- MAIN CONTENT ENDS -->
<?php
	require_once "./template/footer.php";
?>

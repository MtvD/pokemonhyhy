<?php

declare(strict_types=1);

// Đọc từ environment variables (Docker truyền vào)
// Fallback về giá trị mặc định nếu không có env var
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'pokelipi_db');
define('DB_USER', getenv('DB_USER') ?: 'pokelipi_mtvd');
define('DB_PASS', getenv('DB_PASS') ?: 'Vienduong@1001');

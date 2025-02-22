CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    netflix_id VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    rating ENUM('kiff', 'aime', 'pas_top') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rating (netflix_id, ip_address)
);

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    netflix_id VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(50) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
